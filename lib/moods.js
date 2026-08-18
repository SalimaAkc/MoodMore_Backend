// ===================================================================
// MOOD SYSTEM - Search queries for each mood
// ===================================================================

// ===================================================================
// MOOD DEFINITIONS
// ===================================================================

export const MOOD_QUERIES = {
  Happy: [
    'happy uplifting feel good pop music',
    'best happy songs playlist',
    'upbeat positive pop songs',
    'feel good music mix'
  ],
  Energetic: [
    'energetic workout pump up music',
    'high energy gym motivation songs',
    'best pump up songs workout',
    'fast energy electronic music'
  ],
  Calm: [
    'calm relaxing peaceful music',
    'relaxing ambient chill music',
    'peaceful acoustic guitar music',
    'soft piano relaxing music'
  ],
  Romantic: [
    'romantic love songs playlist',
    'best romantic ballads',
    'sweet love songs',
    'slow romantic songs playlist'
  ],
  Melancholic: [
    'melancholic indie music playlist',
    'bittersweet emotional indie songs',
    'sad beautiful indie folk music',
    'introspective emotional music'
  ],
  Sad: [
    'sad emotional music playlist',
    'heartbreak songs playlist',
    'best sad songs ever',
    'emotional slow sad ballads'
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