// The remembering in lib/cache.js. The point of these tests is the three
// states an entry can be in: fresh, stale but still usable as a fallback,
// and old enough to throw away.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let cache
let tempFolder
let startFolder

const HOUR = 60 * 60 * 1000

beforeAll(async () => {
  startFolder = process.cwd()
  tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'moodandmore-cache-'))

  process.chdir(tempFolder)
  cache = await import('../lib/cache.js')
})

afterAll(() => {
  vi.useRealTimers()
  process.chdir(startFolder)
  fs.rmSync(tempFolder, { recursive: true, force: true })
})

describe('cache', () => {
  it('gives nothing back for a key it never saw', () => {
    expect(cache.get('missing')).toBe(null)
  })

  it('gives a just saved answer back as fresh', () => {
    cache.set('one', { tracks: [1, 2] }, HOUR)

    const found = cache.get('one')

    expect(found.isFresh).toBe(true)
    expect(found.data).toEqual({ tracks: [1, 2] })
  })

  it('keeps an expired answer, but marks it as no longer fresh', () => {
    cache.set('two', { tracks: [3] }, HOUR)

    // Two hours later, so the one hour it was good for has passed
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 2 * HOUR)

    const found = cache.get('two')

    expect(found.isFresh).toBe(false)
    expect(found.data).toEqual({ tracks: [3] })

    vi.useRealTimers()
  })

  it('throws an answer away once even the extra week is over', () => {
    cache.set('three', { tracks: [4] }, HOUR)

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 8 * 24 * HOUR)

    expect(cache.get('three')).toBe(null)

    vi.useRealTimers()
  })

  it('counts the fresh ones apart from the old ones', () => {
    const stats = cache.stats()

    expect(stats.total).toBe(stats.fresh + stats.old)
  })

  it('writes what it remembers to disk', () => {
    const saved = JSON.parse(fs.readFileSync(path.join(tempFolder, '.cache', 'youtube.json'), 'utf8'))

    expect(saved.one.data).toEqual({ tracks: [1, 2] })
  })
})
