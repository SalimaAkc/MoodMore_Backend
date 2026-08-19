// The two conversions in lib/youtube.js. Both take whatever YouTube sends
// and turn it into something we can show, so both are worth pinning down.

import { describe, it, expect } from 'vitest'
import { internals } from '../lib/youtube.js'

const { formatDuration, decodeHtml, durationSeconds, looksLikeSong } = internals

describe('formatDuration', () => {
  it('turns minutes and seconds into 4:13', () => {
    expect(formatDuration('PT4M13S')).toBe('4:13')
  })

  it('puts a zero in front of single seconds', () => {
    expect(formatDuration('PT3M5S')).toBe('3:05')
  })

  it('adds the hours in front for a long video', () => {
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03')
  })

  it('handles a piece that is missing', () => {
    expect(formatDuration('PT45S')).toBe('0:45')
    expect(formatDuration('PT2M')).toBe('2:00')
  })

  it('falls back to 0:00 for nothing or nonsense', () => {
    expect(formatDuration('')).toBe('0:00')
    expect(formatDuration(null)).toBe('0:00')
    expect(formatDuration('banana')).toBe('0:00')
  })
})

describe('decodeHtml', () => {
  it('puts the normal characters back', () => {
    expect(decodeHtml('Rock &amp; Roll')).toBe('Rock & Roll')
    expect(decodeHtml('&quot;Hello&quot;')).toBe('"Hello"')
    expect(decodeHtml('Don&#39;t Stop')).toBe("Don't Stop")
  })

  it('understands the numbered ones, in both spellings', () => {
    expect(decodeHtml('Don&#x27;t Stop')).toBe("Don't Stop")
    expect(decodeHtml('&#8211;')).toBe('–')
  })

  it('leaves normal text alone', () => {
    expect(decodeHtml('Avicii - The Nights')).toBe('Avicii - The Nights')
  })

  it('gives back an empty string for nothing', () => {
    expect(decodeHtml('')).toBe('')
    expect(decodeHtml(undefined)).toBe('')
  })
})

describe('durationSeconds', () => {
  it('counts minutes and seconds', () => {
    expect(durationSeconds('PT4M13S')).toBe(253)
  })

  it('counts the hours too', () => {
    expect(durationSeconds('PT1H2M3S')).toBe(3723)
  })

  it('gives back 0 for nothing or nonsense', () => {
    expect(durationSeconds('')).toBe(0)
    expect(durationSeconds(null)).toBe(0)
  })
})

describe('looksLikeSong', () => {
  it('keeps a normal song', () => {
    expect(looksLikeSong('Dua Lipa - Levitating (Official Video)', 203)).toBe(true)
  })

  it('throws away the hour long videos', () => {
    expect(looksLikeSong('Chill songs to study to', 3600)).toBe(false)
  })

  it('throws away the very short clips', () => {
    expect(looksLikeSong('Some song teaser', 20)).toBe(false)
  })

  it('throws away compilations by their title', () => {
    expect(looksLikeSong('Best Pop Mix 2024', 240)).toBe(false)
    expect(looksLikeSong('Top 50 Sad Songs', 240)).toBe(false)
    expect(looksLikeSong('Greatest Hits Of All Time', 240)).toBe(false)
    expect(looksLikeSong('2 hours of calm piano', 240)).toBe(false)
  })

  it('still keeps a song when the length is unknown', () => {
    expect(looksLikeSong('Adele - Easy On Me', 0)).toBe(true)
  })
})
