// The daily counter in lib/quota.js. It writes a file next to wherever the
// server was started, so the test moves into an empty folder first and only
// then loads the module, because the module reads that file on import.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// A full address for the module. Loading it by a plain relative path with a
// label glued on does not work, because the test runner wants to know at
// build time exactly which files can be imported.
const HERE = path.dirname(fileURLToPath(import.meta.url))
const QUOTA_URL = pathToFileURL(path.join(HERE, '..', 'lib', 'quota.js')).href

let quota
let tempFolder
let startFolder

beforeAll(async () => {
  startFolder = process.cwd()
  tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'moodandmore-quota-'))

  process.chdir(tempFolder)
  quota = await import('../lib/quota.js')
})

afterAll(() => {
  process.chdir(startFolder)
  fs.rmSync(tempFolder, { recursive: true, force: true })
})

// Loads the module afresh with a quota.json we wrote ourselves, so we can
// see what it makes of a file it did not write. The label makes each load a
// separate module, otherwise the second call gets the first one back.
async function loadWithFile(contents, label) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'moodandmore-quota-' + label + '-'))
  const cacheFolder = path.join(folder, '.cache')

  fs.mkdirSync(cacheFolder, { recursive: true })
  fs.writeFileSync(path.join(cacheFolder, 'quota.json'), contents)

  process.chdir(folder)

  // The label makes each load a separate module, otherwise the second call
  // would get the first one handed back
  const loaded = await import(/* @vite-ignore */ `${QUOTA_URL}?case=${label}`)

  process.chdir(tempFolder)
  fs.rmSync(folder, { recursive: true, force: true })

  return loaded
}

describe('quota costs', () => {
  it('adds a page up out of the two calls it is made of', () => {
    expect(quota.PAGE_COST).toBe(quota.SEARCH_COST + quota.DETAILS_COST)
  })

  it('charges a hundred for the search and one for the lengths', () => {
    expect(quota.SEARCH_COST).toBe(100)
    expect(quota.DETAILS_COST).toBe(1)
  })
})

describe('quota', () => {
  it('starts the day at nothing spent', () => {
    const stats = quota.stats()

    expect(stats.used).toBe(0)
    expect(stats.left).toBe(stats.budget)
  })

  it('counts what we spend', () => {
    quota.spend(quota.PAGE_COST)

    const stats = quota.stats()

    expect(stats.used).toBe(quota.PAGE_COST)
    expect(stats.left).toBe(stats.budget - quota.PAGE_COST)
  })

  it('says how many more pages fit in what is left', () => {
    const stats = quota.stats()

    expect(stats.pagesLeft).toBe(Math.floor(stats.left / quota.PAGE_COST))
  })

  it('allows a spend that fits and refuses one that does not', () => {
    expect(quota.canSpend(quota.PAGE_COST)).toBe(true)
    expect(quota.canSpend(quota.stats().budget + 1)).toBe(false)
  })

  it('writes the count down, so a restart does not forget it', () => {
    const saved = JSON.parse(fs.readFileSync(path.join(tempFolder, '.cache', 'quota.json'), 'utf8'))

    expect(saved.used).toBe(quota.stats().used)
    expect(saved.day).toBe(quota.stats().day)
  })

  it('ignores a saved count from another day', async () => {
    const old = await loadWithFile(JSON.stringify({ day: '2000-01-01', used: 8500 }), 'old')

    expect(old.stats().used).toBe(0)
  })

  it('picks up today\'s count after a restart', async () => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())

    const restarted = await loadWithFile(JSON.stringify({ day: today, used: 404 }), 'restart')

    expect(restarted.stats().used).toBe(404)
  })
})

// These are the files that parse but cannot be counted with. Taking any of
// them would make every sum NaN, and since the counter is only rebuilt when
// the day changes, the app would turn every request away until tomorrow.
describe('a quota file that does not make sense', () => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  const badFiles = {
    text: JSON.stringify({ day: today, used: 'abc' }),
    missing: JSON.stringify({ day: today }),
    nothing: JSON.stringify(null),
    negative: JSON.stringify({ day: today, used: -50 }),
    notFinite: '{"day":"' + today + '","used":1e999}',
    broken: '{ this is not json'
  }

  Object.keys(badFiles).forEach((label) => {
    it(`starts the day at zero for the ${label} one`, async () => {
      const loaded = await loadWithFile(badFiles[label], label)

      expect(loaded.stats().used).toBe(0)

      // The real damage was here: everything would be refused
      expect(loaded.canSpend(loaded.PAGE_COST)).toBe(true)
      expect(Number.isFinite(loaded.stats().left)).toBe(true)
    })
  })
})
