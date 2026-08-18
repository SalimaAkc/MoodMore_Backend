// ===================================================================
// CACHE SYSTEM - Remember YouTube search results
// ===================================================================

import fs from 'node:fs'
import path from 'node:path'

// ===================================================================
// CONFIGURATION
// ===================================================================

const CACHE_FILE = path.join(process.cwd(), '.cache', 'youtube.json')

export const PLAYLIST_TTL = 24 * 60 * 60 * 1000 // 1 day
export const SEARCH_TTL = 6 * 60 * 60 * 1000   // 6 hours
const EXTRA_HOLD_TIME = 7 * 24 * 60 * 60 * 1000 // 1 week buffer

const cache = new Map()

// ===================================================================
// INITIALIZATION - Load cache from disk
// ===================================================================

if (fs.existsSync(CACHE_FILE)) {
  try {
    const rawData = fs.readFileSync(CACHE_FILE, 'utf8')
    const parsedData = JSON.parse(rawData)

    for (const key in parsedData) {
      cache.set(key, parsedData[key])
    }
  } catch (error) {
    console.error('Failed to load cache file:', error)
  }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

// save cache to disk
function saveCache() {
  try {
    const folderPath = path.dirname(CACHE_FILE)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }

    const obj = {}
    cache.forEach((value, key) => {
      obj[key] = value
    })

    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2))
  } catch (error) {
    console.error('Error writing cache file:', error)
  }
}

// remove expired items
function cleanExpired() {
  const now = Date.now()

  cache.forEach((item, key) => {
    if (now > item.expiresAt + EXTRA_HOLD_TIME) {
      cache.delete(key)
    }
  })
}

// ===================================================================
// PUBLIC API
// ===================================================================

// get item from cache
export function get(key) {
  const item = cache.get(key)
  if (!item) return null

  const now = Date.now()

  if (now > item.expiresAt + EXTRA_HOLD_TIME) {
    cache.delete(key)
    return null
  }

  return {
    data: item.data,
    isFresh: now < item.expiresAt
  }
}

// store item in cache
export function set(key, data, ttl) {
  cache.set(key, {
    data: data,
    expiresAt: Date.now() + ttl
  })

  cleanExpired()
  saveCache()
}

// get cache statistics
export function stats() {
  const now = Date.now()
  let freshCount = 0

  cache.forEach((item) => {
    if (now < item.expiresAt) {
      freshCount = freshCount + 1
    }
  })

  return {
    total: cache.size,
    fresh: freshCount,
    old: cache.size - freshCount
  }
}