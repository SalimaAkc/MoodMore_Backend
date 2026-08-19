// ===================================================================
// MOOD SYSTEM - Search queries for each mood
// ===================================================================

// ===================================================================
// MOOD DEFINITIONS
// ===================================================================

// We ask for single songs, not compilations. Words like "playlist" or
// "mix" bring back one hour long videos, so we use "official video"
// and recent years instead to get real tracks by real artists.
export const MOOD_QUERIES = {
  Happy: [
    'happy pop song official music video 2025',
    'feel good pop hit official video',
    'upbeat pop single official audio 2024',
    'happy dance pop song official video'
  ],
  Energetic: [
    'high energy pop song official music video 2025',
    'hype rap song official video',
    'edm dance single official video 2024',
    'workout hit song official audio'
  ],
  Calm: [
    'chill pop song official music video 2025',
    'calm acoustic song official video',
    'soft indie pop single official audio',
    'mellow rnb song official video 2024'
  ],
  Romantic: [
    'romantic love song official music video 2025',
    'love ballad official video',
    'rnb love song official audio 2024',
    'slow romantic single official video'
  ],
  Melancholic: [
    'melancholic indie song official music video',
    'bittersweet indie pop single official video',
    'emotional indie folk song official audio 2024',
    'moody alternative song official video 2025'
  ],
  Sad: [
    'sad song official music video 2025',
    'heartbreak ballad official video',
    'emotional pop single official audio 2024',
    'sad acoustic song official video'
  ]
}

// ===================================================================
// PUBLIC API
// ===================================================================

export function isMood(name) {
  return Object.hasOwn(MOOD_QUERIES, name)
}

// get random search term for mood
export function randomQuery(mood) {
  const options = MOOD_QUERIES[mood]
  if (!options) return null

  const randomIndex = Math.floor(Math.random() * options.length)
  return options[randomIndex]
}