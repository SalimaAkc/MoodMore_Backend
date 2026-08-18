# M&M — backend

Small Express server that fetches music from YouTube for
[M&M — Mood & More](https://github.com/SalimaAkc/M-M_Frontend).

This half exists so the YouTube API key stays on the server instead of in the
browser, and so it can remember answers. YouTube only allows about 99 searches
per day for free.

The Vue app talks to Supabase directly, with no backend in between. That is safe
because the database has its own Row Level Security rules that stop one user
from reading another user's playlists. So this server only handles YouTube, plus
the one thing the browser must not be trusted with: deleting an account.

## Setup

You need Node 20 or newer.

```bash
npm install
cp .env.example .env
```

Put your YouTube Data API v3 key in `.env`. You get one from the Google Cloud
Console.

```bash
npm run dev
```

The server listens on port 3000.

## The database

The SQL lives in `supabase/`. In the Supabase SQL Editor, run the two files in
this order:

1. `supabase/schema.sql` — makes the tables and adds the 8 moods
2. `supabase/rls-policies.sql` — adds the security rules

Do not skip the second one. Without it anyone can read and delete every user's
playlists, because the app talks to the database straight from the browser.

Both files are safe to run more than once. If your database was set up before
mood 8 existed, run `schema.sql` again or the + button on a track cannot make
a playlist.

The same two files are in the frontend repo. They are the same schema, kept in
both places so either half can be set up on its own. If you change one, change
the other.

Three tables:

| Table       | Columns                                                    |
| ----------- | ---------------------------------------------------------- |
| `moods`     | `id`, `name`                                               |
| `playlists` | `id`, `user_id`, `mood_id`, `name`, `songs`, `created_at`  |
| `profiles`  | `id`, `email`, `full_name`, `avatar_url`, `created_at`     |

Accounts themselves live in `auth.users`, which Supabase manages. `profiles` is
our own copy of the bits we need, filled in by a trigger when someone signs up.
Its `id` is the same id as in `auth.users`.

`songs` is a JSON list of tracks stored inside the playlist row:

```json
[{ "videoId": "UtF6Jej8yb4", "title": "Avicii - The Nights",
   "artist": "AviciiOfficialVEVO", "duration": "3:11", "thumbnail": "https://…" }]
```

## Where things are

| File             | What it does                   |
| ---------------- | ------------------------------ |
| `server.js`      | the routes                     |
| `lib/youtube.js` | talks to the YouTube API       |
| `lib/cache.js`   | remembers answers              |
| `lib/quota.js`   | counts how much we used today  |
| `lib/moods.js`   | the search words for each mood |

## API routes

| Route                     | What it gives back            |
| ------------------------- | ----------------------------- |
| `GET /api/health`         | says the server is up         |
| `GET /api/playlist/:mood` | 50 tracks for that mood       |
| `GET /api/search?q=…`     | 50 tracks for a search        |
| `GET /api/stats`          | quota and cache numbers       |
| `DELETE /api/account`     | deletes the account that asks |

Both track routes also take `pageToken` to load the next 50.

`GET /api/health` is the one for hosting platforms to ping. It skips the rate
limit and never touches YouTube, so watching it costs no quota.

`DELETE /api/account` needs the user's login token in an `Authorization: Bearer …`
header, and their password in a JSON body. The token says which account it is;
the password says the person sending it is the owner and not somebody who got
hold of the token. It needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`SUPABASE_ANON_KEY` in `.env`. Without all three the route answers 503 and
deletes nothing.

## Sensitive actions

Three things cannot be taken back: changing the email, changing the password,
and deleting the account. All three ask for the password that is in use now,
because a login token only says which account something belongs to, not who is
sitting at the keyboard. Losing any of the three means losing the account:

- whoever holds the email address can reset the password
- whoever changes the password shuts the owner out
- whoever deletes the account takes every saved playlist with it

The delete route checks the password on the server as well as in the browser, so
calling it straight from a script with a stolen token gets nowhere. The other
two happen in the browser against Supabase, so there the check is a speed bump
rather than a wall. Two settings in the Supabase Dashboard close that gap and
are worth turning on, under Authentication -> Providers -> Email:

- **Secure email change**, which asks both the old and the new address to
  confirm. Without it, one confirmation in the new inbox is enough to take the
  account, and the real owner never hears about it.
- **Secure password change**, which makes Supabase itself demand a recent
  login before a password is replaced.

## Tests

```bash
npm test
```

They cover the pieces that are easy to get quietly wrong: the duration and HTML
decoding in `lib/youtube.js`, the three states of the cache, and the daily quota
rollover.

## Notes

- The `&` in the `Mood&More` folder name breaks the `.cmd` shims npm creates
  for tools like `vitest`. cmd.exe pastes the folder path into the command line
  before it splits the line on `&`, so the command tears in half and you get
  `... is not recognized as an internal or external command`. That is why the
  test scripts call `node node_modules/vitest/vitest.mjs` instead of plain
  `vitest`: going straight to node skips the shim. It behaves the same on
  Linux, so CI is unaffected. Please keep new scripts in that style.
- One page of tracks costs 101 of the 9000 units we allow per day. Check
  http://localhost:3000/api/stats to see what is left. It resets at midnight
  Los Angeles time, because that is when Google resets it.
- Restart after changing `.env`. The server only reads that file when it starts.
- Never commit `.env`. It is already in `.gitignore`.
- `ALLOWED_ORIGIN` takes more than one address, separated by commas, for when
  a preview deploy has its own.
- The cache and the quota counter are files in `.cache/`. On hosts that give you
  a fresh disk on every deploy, both start empty again, so the counter can let
  through more than a day's worth of requests. Somewhere that keeps its disk is
  the fix.

## Putting it online

See [DEPLOY.md](DEPLOY.md).

## License

MIT, see [LICENSE](LICENSE).
