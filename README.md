# Mood&More — Backend

The server part of the Mood&More app. It handles:
- Getting songs from YouTube
- Saving the YouTube API key securely
- Remembering search results (cache)
- Tracking how many YouTube requests we've made today

The frontend talks to this backend to get songs for each mood.

---

## What It Does

- **Fetches songs from YouTube** for different moods
- **Keeps the API key safe** (not in the browser)
- **Saves results** so we don't ask YouTube for the same songs twice
- **Counts API usage** (Google only gives us ~99 searches per day for free)
- **Deletes accounts** securely

---

## How to Run It Locally

### 1. Install it

You need Node 20 or newer.

```bash
npm install
cp .env.example .env
```

### 2. Add your YouTube API key

1. Go to Google Cloud Console
2. Get your YouTube Data API v3 key
3. Put it in `.env` file:

```
YOUTUBE_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 3. Start it

```bash
npm run dev
```

The server runs on **http://localhost:3000**

---

## Database Setup

The database files are in `supabase/` folder.

**In Supabase SQL Editor, run these in order:**

1. **schema.sql** — creates tables and moods
2. **rls-policies.sql** — adds security rules

⚠️ Don't skip step 2! Without security rules, anyone can see everyone's playlists.

---

## File Structure

| File | What it does |
|------|------------|
| `server.js` | Main server with all routes |
| `lib/youtube.js` | Talks to YouTube API |
| `lib/cache.js` | Remembers search results |
| `lib/quota.js` | Counts how many requests we've made |
| `lib/moods.js` | Search words for each mood |

---

## API Routes (What the Frontend Uses)

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Check if server is running |
| `GET /api/playlist/:mood` | Get 50 songs for a mood |
| `GET /api/search?q=song` | Search for songs |
| `GET /api/stats` | See quota and cache info |
| `DELETE /api/account` | Delete user account |

---

## Running Tests

```bash
npm test
```

Tests check:
- Song duration parsing
- Cache system
- Quota counting
- YouTube search

---

## Important Notes

- **Restart after changing `.env`** — server reads it on startup only
- **Never commit `.env`** — it's in `.gitignore` already
- **One mood page costs ~101 quota units** — check `/api/stats` to see what's left
- **Quota resets at midnight LA time** — that's when Google resets it
- **Cache clears on deploy** — first mood after deploy will be slow

---

## Deploying

See [DEPLOY.md](DEPLOY.md) for instructions on deploying to Render.

---

## License

MIT, see [LICENSE](LICENSE).
