// ===================================================================
// MOOD & MORE BACKEND SERVER
// ===================================================================

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

import * as cache from './lib/cache.js'
import * as quota from './lib/quota.js'
import { isMood, randomQuery } from './lib/moods.js'
import { searchTracks } from './lib/youtube.js'

// ===================================================================
// SETUP & VALIDATION
// ===================================================================

if (!process.env.YOUTUBE_API_KEY) {
  console.error('Missing YOUTUBE_API_KEY in .env')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3000

// ===================================================================
// SECURITY & MIDDLEWARE CONFIGURATION
// ===================================================================

// allowed websites that can talk to us
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.set('trust proxy', 1)

// ===================================================================
// DATABASE CLIENTS (Supabase)
// ===================================================================

// admin client for account deletion
let adminClient = null

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
} else {
  console.warn('No SUPABASE_SERVICE_ROLE_KEY, deleting accounts is switched off')
}

// client for password verification
let passwordClient = null

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  passwordClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
} else {
  console.warn('No SUPABASE_ANON_KEY, deleting accounts is switched off')
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

// verify a password by attempting login
async function passwordIsRight(email, password) {
  const result = await passwordClient.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (!result.error) {
    await passwordClient.auth.signOut()
  }

  return !result.error
}

// get tracks from cache or YouTube
async function getTracks(cacheKey, query, pageToken, ttl) {
  const cachedData = cache.get(cacheKey)

  if (cachedData && cachedData.isFresh) {
    return cachedData.data
  }

  if (quota.canSpend(quota.PAGE_COST)) {
    try {
      const result = await searchTracks(query, pageToken, quota.spend)

      const answer = {
        tracks: result.tracks,
        nextPageToken: result.nextPageToken
      }

      if (!result.partial) {
        cache.set(cacheKey, answer, ttl)
      }

      return answer
    } catch (error) {
      console.error('YouTube request failed:', error.message)
    }
  }

  if (cachedData) {
    console.warn('Using old cached data for:', cacheKey)
    return cachedData.data
  }

  throw new Error('Could not get any tracks')
}

// ===================================================================
// MIDDLEWARE SETUP
// ===================================================================

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'))
  }
}))

// limit request body size
app.use(express.json({ limit: '4kb' }))

// ===================================================================
// RATE LIMITING
// ===================================================================

const MAX_PER_MINUTE = 30
const SWEEP_EVERY = 5 * 60 * 1000
const visitors = new Map()

function rateLimit(req, res, next) {
  const ip = req.ip
  const now = Date.now()
  const visitorData = visitors.get(ip)

  if (!visitorData || now > visitorData.resetAt) {
    visitors.set(ip, { count: 1, resetAt: now + 60000 })
    return next()
  }

  if (visitorData.count >= MAX_PER_MINUTE) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' })
  }

  visitorData.count = visitorData.count + 1
  next()
}

// clean up old visitor data
const sweepTimer = setInterval(() => {
  const now = Date.now()

  visitors.forEach((visitorData, ip) => {
    if (now > visitorData.resetAt) {
      visitors.delete(ip)
    }
  })
}, SWEEP_EVERY)

sweepTimer.unref()

// ===================================================================
// API ROUTES
// ===================================================================

// health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()) })
})

// get playlist for a mood
app.get('/api/playlist/:mood', rateLimit, async (req, res) => {
  const mood = req.params.mood
  const pageToken = req.query.pageToken
  const query = req.query.query

  if (!isMood(mood)) {
    return res.status(400).json({ error: 'Unknown mood' })
  }

  const searchQuery = query || randomQuery(mood)
  const token = pageToken || ''
  const key = 'playlist:' + mood + ':' + searchQuery + ':' + token

  try {
    const result = await getTracks(key, searchQuery, pageToken, cache.PLAYLIST_TTL)
    const responseData = Object.assign({}, result, { query: searchQuery })
    res.json(responseData)
  } catch (error) {
    res.status(503).json({ error: 'Music is not available right now. Try again later.' })
  }
})

// search for songs
app.get('/api/search', rateLimit, async (req, res) => {
  const searchInput = req.query.q ? req.query.q.trim() : ''
  const pageToken = req.query.pageToken

  if (!searchInput) {
    return res.json({ tracks: [], nextPageToken: null, query: '' })
  }

  if (searchInput.length > 100) {
    return res.status(400).json({ error: 'Search is too long' })
  }

  const token = pageToken || ''
  const key = 'search:' + searchInput.toLowerCase() + ':' + token

  try {
    const result = await getTracks(key, searchInput, pageToken, cache.SEARCH_TTL)
    const responseData = Object.assign({}, result, { query: searchInput })
    res.json(responseData)
  } catch (error) {
    res.status(503).json({ error: 'Search is not available right now. Try again later.' })
  }
})

// delete user account
app.delete('/api/account', rateLimit, async (req, res) => {
  if (!adminClient || !passwordClient) {
    return res.status(503).json({ error: 'Deleting accounts is not set up on this server.' })
  }

  const header = req.headers.authorization || ''
  const token = header.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'You are not logged in.' })
  }

  const userResult = await adminClient.auth.getUser(token)

  if (userResult.error || !userResult.data.user) {
    return res.status(401).json({ error: 'You are not logged in.' })
  }

  const user = userResult.data.user
  const password = req.body ? req.body.password : ''

  if (!password) {
    return res.status(401).json({ error: 'Type your password to confirm.' })
  }

  const confirmed = await passwordIsRight(user.email, password)

  if (!confirmed) {
    return res.status(401).json({ error: 'That password is not right.' })
  }

  const userId = user.id
  const deleteResult = await adminClient.auth.admin.deleteUser(userId)

  if (deleteResult.error) {
    console.error('Could not delete account:', deleteResult.error.message)
    return res.status(500).json({ error: 'Could not delete the account. Try again later.' })
  }

  res.json({ deleted: true })
})

// server stats
app.get('/api/stats', rateLimit, (req, res) => {
  res.json({
    quota: quota.stats(),
    cache: cache.stats()
  })
})

// ===================================================================
// ERROR HANDLING
// ===================================================================

// 404 - route not found
app.use((req, res) => {
  res.status(404).json({ error: 'Unknown address' })
})

// error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

// ===================================================================
// START SERVER
// ===================================================================

app.listen(PORT, () => {
  const quotaStats = quota.stats()
  console.log(`Mood&More backend running on http://localhost:${PORT}`)
  console.log(`YouTube quota today: ${quotaStats.used}/${quotaStats.budget} used (${quotaStats.pagesLeft} pages left)`)
})
