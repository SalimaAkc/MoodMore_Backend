// ===================================================================
// YOUTUBE API INTEGRATION
// ===================================================================

import { SEARCH_COST, DETAILS_COST } from './quota.js'

// ===================================================================
// HELPER FUNCTIONS - API & TEXT PROCESSING
// ===================================================================

// get API key
function getApiKey() {
  return process.env.YOUTUBE_API_KEY
}

// decode HTML entities
function decodeHtml(text) {
  if (!text) return ''

  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(code))
}

// turn ISO time like PT4M13S into 4:13 format
function formatDuration(isoTime) {
  if (!isoTime) return '0:00'

  const match = isoTime.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return '0:00'

  const hours = parseInt(match[1] || 0)
  const minutes = parseInt(match[2] || 0)
  const seconds = parseInt(match[3] || 0)

  // add 0 to seconds if it's single digit
  const formattedSeconds = seconds < 10 ? '0' + seconds : seconds

  if (hours > 0) {
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${formattedMinutes}:${formattedSeconds}`
  }

  return `${minutes}:${formattedSeconds}`
}

// turn ISO time like PT4M13S into a plain number of seconds
function durationSeconds(isoTime) {
  if (!isoTime) return 0

  const match = isoTime.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || 0)
  const minutes = parseInt(match[2] || 0)
  const seconds = parseInt(match[3] || 0)

  return (hours * 3600) + (minutes * 60) + seconds
}

// a real song is roughly between one and ten minutes
const MIN_SONG_SECONDS = 60
const MAX_SONG_SECONDS = 600

// titles that give away an hour long compilation instead of one song
const COMPILATION_WORDS = /\b(mix|megamix|compilation|playlist|full album|album completo|nonstop|non-stop|best of|top \d+|greatest hits|\d+\s*(hours?|hrs?|mins?|minutes?)|live set|dj set|radio)\b/i

// decide if a result is a single song we want to keep
function looksLikeSong(title, seconds) {
  if (COMPILATION_WORDS.test(title)) return false

  // when the length is unknown we only have the title to go on
  if (!seconds) return true

  return seconds >= MIN_SONG_SECONDS && seconds <= MAX_SONG_SECONDS
}

// get all video lengths in one API call
async function fetchDurations(videoIds, onSpend) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${getApiKey()}`

  const response = await fetch(url)
  const data = await response.json()

  // if the API says no, throw error instead of returning 0:00 for everything
  if (data.error) {
    throw new Error(data.error.message)
  }

  onSpend(DETAILS_COST)

  const durationMap = {}

  if (data.items) {
    data.items.forEach(video => {
      durationMap[video.id] = {
        text: formatDuration(video.contentDetails.duration),
        seconds: durationSeconds(video.contentDetails.duration)
      }
    })
  }

  return durationMap
}


// songsOnly is used for the mood playlists: it asks YouTube for the music
// category and then throws away anything that is not a single song
export async function searchTracks(query, pageToken = null, onSpend = () => {}, songsOnly = false) {
  let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=50&q=${encodeURIComponent(query)}&key=${getApiKey()}`

  if (songsOnly) {
    apiUrl += '&videoCategoryId=10'
  }

  if (pageToken) {
    apiUrl += `&pageToken=${pageToken}`
  }

  const response = await fetch(apiUrl)
  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  onSpend(SEARCH_COST)

  if (!data.items || data.items.length === 0) {
    return { tracks: [], nextPageToken: null, partial: false }
  }

  // only keep results that have a video ID
  const validVideos = data.items.filter(item => item.id && item.id.videoId)

  if (validVideos.length === 0) {
    return { tracks: [], nextPageToken: data.nextPageToken || null, partial: false }
  }

  // grab all the video IDs and get their lengths
  const videoIds = validVideos.map(item => item.id.videoId)

  let durationMap = {}
  let partial = false

  try {
    durationMap = await fetchDurations(videoIds, onSpend)
  } catch (error) {


    console.warn('Could not fetch durations:', error.message)
    partial = true
  }

  // make track objects with the info we have
  let tracks = validVideos.map(item => {
    const id = item.id.videoId
    const snippet = item.snippet
    const length = durationMap[id]

    return {
      videoId: id,
      title: decodeHtml(snippet.title),
      artist: decodeHtml(snippet.channelTitle),
      thumbnail: snippet.thumbnails.medium ? snippet.thumbnails.medium.url : '',
      duration: length ? length.text : '0:00',
      seconds: length ? length.seconds : 0
    }
  })

  // for mood playlists, drop the hour long mixes and keep real songs
  if (songsOnly) {
    tracks = tracks.filter(track => looksLikeSong(track.title, track.seconds))
  }

  return {
    tracks: tracks,
    nextPageToken: data.nextPageToken || null,
    partial: partial
  }
}

// let tests use these functions
export const internals = { decodeHtml, formatDuration, durationSeconds, looksLikeSong }
