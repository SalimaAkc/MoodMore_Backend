# Putting the backend online

The backend is a running program, so it needs a server host. This guide uses
Render, which is free and deploys from GitHub. Railway or Fly.io work the same
way.

The frontend is hosted separately, from its own repository. See
[its DEPLOY.md](https://github.com/SalimaAkc/MoodMore_Frontend/blob/main/DEPLOY.md).

Each side needs to know the other's address, so the order is: this one first,
then the frontend, then back here to tell it where the frontend is.

## Step 1: the service

1. render.com -> New -> Web Service -> connect this repository
2. Settings:
   - Root Directory: leave empty. The repository root is the app.
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Environment variables (Advanced -> Add Environment Variable):

   | Key                         | Value                                        |
   | --------------------------- | -------------------------------------------- |
   | `YOUTUBE_API_KEY`           | your key from Google Cloud Console            |
   | `ALLOWED_ORIGIN`            | `http://localhost:5173` for now, fixed later  |
   | `SUPABASE_URL`              | same as in your local `.env`                  |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings -> API -> service_role       |
   | `SUPABASE_ANON_KEY`         | Project Settings -> API -> anon public        |

   The last three are what let people delete their own account. Leave any of
   them out and that button answers "not set up on this server" instead.

   The service_role key ignores every security rule in the database. It belongs
   only here, never in a `VITE_` variable in the frontend.

   Do not set `PORT`. Render provides it and `server.js` already reads it.
4. Health Check Path: `/api/health`. Render pings it to see whether the service
   is alive. It skips the rate limit and never calls YouTube, so being watched
   costs no quota.
5. Deploy and copy the address, something like
   `https://m-m-backend.onrender.com`

Open `<that address>/api/health` in your browser to check it works. You should
see `{"ok":true,...}`.

## Step 2: deploy the frontend

Follow the DEPLOY.md in the frontend repository, using the Render address above
as its `VITE_API_URL`. Then come back here for step 3.

## Step 3: let the frontend in

Change `ALLOWED_ORIGIN` on Render to the frontend's address, with no slash at
the end:

```
ALLOWED_ORIGIN=https://m-m-frontend.vercel.app
```

Render restarts automatically. Without this the browser blocks every request to
the backend, because the backend only allows the origin it was told about.

More than one address is allowed, separated by commas and no spaces. Vercel
gives every branch its own preview address, so if you want those to work too:

```
ALLOWED_ORIGIN=https://m-m-frontend.vercel.app,https://m-m-frontend-git-dev.vercel.app
```

## Things to know once it is live

Free servers fall asleep. Render stops the service after about 15 minutes with
no visitors, and the next request takes around 30 seconds while it wakes up. The
first mood page after a quiet period feels slow. This is normal on the free tier.

The cache starts empty after every deploy. The cache lives in `.cache/`, and
that folder disappears when the service restarts. So the first visit to each
mood after a deploy costs YouTube quota again.

The daily counter lives in that same folder, which means it is forgotten too.
Deploy several times in one day and the app can spend more than the daily budget
it thinks it is keeping to, because each restart believes nothing has been spent
yet. Google's own limit still stops it at 10000. A host with a disk that
survives restarts, or keeping the counter in Supabase, is the real fix.

Restrict the YouTube key. Google Cloud Console -> Credentials -> your key -> API
restrictions -> allow only "YouTube Data API v3". The key sits on the server and
is not handed to visitors, but restricting it limits the damage if it leaks.

Quota is shared by everyone. The daily budget is for the whole app, not per
visitor. That is about 89 uncached pages of tracks per day, which is fine for
showing your project but not enough for real traffic.
