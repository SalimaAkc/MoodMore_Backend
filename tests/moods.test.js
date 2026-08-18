// lib/moods.js decides which mood names the API accepts, so it is what
// stops a made up address from reaching YouTube.

import { describe, it, expect } from 'vitest'
import { isMood, randomQuery, MOOD_QUERIES } from '../lib/moods.js'

describe('isMood', () => {
  it('says yes to the moods we have', () => {
    expect(isMood('Happy')).toBe(true)
    expect(isMood('Sad')).toBe(true)
  })

  it('says no to anything else, capitals included', () => {
    expect(isMood('Banana')).toBe(false)
    expect(isMood('happy')).toBe(false)
    expect(isMood('')).toBe(false)
  })

  it('says no to the things every object has', () => {
    // "in" would find these on the prototype if the check were careless
    expect(isMood('toString')).toBe(false)
    expect(isMood('constructor')).toBe(false)
  })
})

describe('randomQuery', () => {
  it('picks one of the search words of that mood', () => {
    const query = randomQuery('Calm')

    expect(MOOD_QUERIES.Calm).toContain(query)
  })

  it('gives back nothing for a mood we do not have', () => {
    expect(randomQuery('Banana')).toBe(null)
  })
})
