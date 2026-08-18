
import { SEARCH_COST, DETAILS_COST } from './quota.js'

// get the YouTube API key from .env
function getApiKey() {
  return process.env.YOUTUBE_API_KEY
}

// turn HTML stuff like &amp; into normal characters
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
      durationMap[video.id] = formatDuration(video.contentDetails.duration)
    })
  }

  return durationMap
}


export async function searchTracks(query, pageToken = null, onSpend = () => {}) {
  let apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=50&q=${encodeURIComponent(query)}&key=${getApiKey()}`

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
  const tracks = validVideos.map(item => {
    const id = item.id.videoId
    const snippet = item.snippet

    return {
      videoId: id,
      title: decodeHtml(snippet.title),
      artist: decodeHtml(snippet.channelTitle),
      thumbnail: snippet.thumbnails.medium ? snippet.thumbnails.medium.url : '',
      duration: durationMap[id] || '0:00'
    }
  })

  return {
    tracks: tracks,
    nextPageToken: data.nextPageToken || null,
    partial: partial
  }
}

// let tests use these functions
export const internals = { decodeHtml, formatDuration }
