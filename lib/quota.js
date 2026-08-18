// ===================================================================
// YOUTUBE API QUOTA TRACKING
// ===================================================================

import fs from 'node:fs'
import path from 'node:path'

// ===================================================================
// CONFIGURATION
// ===================================================================

export const SEARCH_COST = 100
export const DETAILS_COST = 1
export const PAGE_COST = SEARCH_COST + DETAILS_COST

const DAILY_BUDGET = 9000
const STATE_FILE = path.join(process.cwd(), '.cache', 'quota.json')

// ===================================================================
// DATE & TIME
// ===================================================================

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

// get today's date in LA time
function getToday() {
  return DAY_FORMATTER.format(new Date())
}

// ===================================================================
// STATE MANAGEMENT
// ===================================================================

let state = {
  day: getToday(),
  used: 0
}

// validate saved quota data
function isUsable(saved) {
  if (!saved || typeof saved !== 'object') return false
  if (saved.day !== state.day) return false

  return Number.isFinite(saved.used) && saved.used >= 0
}

// ===================================================================
// INITIALIZATION - Load quota from disk
// ===================================================================

if (fs.existsSync(STATE_FILE)) {
  try {
    const rawData = fs.readFileSync(STATE_FILE, 'utf8')
    const savedState = JSON.parse(rawData)

    if (isUsable(savedState)) {
      state = savedState
    } else if (savedState && savedState.day === state.day) {
      console.warn('Quota file did not make sense, starting the day at zero')
    }
  } catch (error) {
    console.error('Failed to load quota file:', error)
  }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

// save quota to disk
function saveState() {
  try {
    const folderPath = path.dirname(STATE_FILE)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error('Error writing quota file:', error)
  }
}

// check if it's a new day
function checkNewDay() {
  const currentDay = getToday()

  if (state.day !== currentDay) {
    state = {
      day: currentDay,
      used: 0
    }

    saveState()
  }
}

// ===================================================================
// PUBLIC API
// ===================================================================

// check if we have enough quota
export function canSpend(units) {
  checkNewDay()
  return state.used + units <= DAILY_BUDGET
}

// record quota usage
export function spend(units) {
  checkNewDay()
  state.used = state.used + units
  saveState()
}

// get quota statistics
export function stats() {
  checkNewDay()

  const left = DAILY_BUDGET - state.used

  return {
    day: state.day,
    used: state.used,
    budget: DAILY_BUDGET,
    left: left,
    pagesLeft: Math.floor(left / PAGE_COST)
  }
}
