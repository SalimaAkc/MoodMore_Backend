# How to Deploy the Backend

The backend is a program that runs on a server. We use **Render** (it's free!) to host it.

**Important:** Deploy the backend first, then the frontend. They need to know each other's addresses.

---

## Step 1: Create the Server on Render

1. Go to **render.com**
2. Click **New → Web Service**
3. Connect this GitHub repository
4. Configure it:
   - **Root Directory:** leave empty
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Deploy**
6. Wait a few minutes and copy the URL (looks like: `https://your-app.onrender.com`)

---

## Step 2: Add Environment Variables

Go back to Render settings and add these variables (click **Advanced → Add Environment Variable**):

| Variable | Value |
|----------|-------|
| `YOUTUBE_API_KEY` | From Google Cloud Console |
| `ALLOWED_ORIGIN` | `http://localhost:5173` (we'll change this later) |
| `SUPABASE_URL` | Same as in your `.env` file |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | From Supabase → Settings → API |

**Don't add `PORT`** - Render sets it automatically.

---

## Step 3: Test Your Backend

Open this in your browser:
```
https://your-app.onrender.com/api/health
```

You should see:
```json
{"ok": true, ...}
```

If you see this, your backend is live! ✅

---

## Step 4: Get the Frontend Running

Now go to the frontend's DEPLOY.md and follow those steps.

See: [Frontend DEPLOY.md](https://github.com/SalimaAkc/MoodMore_Frontend/blob/main/DEPLOY.md)

---

## Step 5: Connect Frontend to Backend

After the frontend is deployed:

1. Go back to Render settings for the backend
2. Find `ALLOWED_ORIGIN` and change it to your frontend URL
3. Example: `https://your-frontend.vercel.app`
4. **No slash at the end!**

Render will restart automatically.

---

## Things to Know

### Free servers fall asleep
- After 15 minutes with no visitors, Render pauses the server
- First request after that takes 20-30 seconds to "wake up"
- This is normal and free

### Cache gets cleared on restart
- Every time you deploy, the cached songs disappear
- First mood page after deployment costs YouTube quota
- This is fine for testing

### YouTube quota is shared
- Everyone using the app shares one quota limit
- About 89 pages of songs per day
- Good for testing, not good for lots of users

### Secure your YouTube key
- Go to Google Cloud Console
- Find your key → API restrictions
- Allow only "YouTube Data API v3"
- This limits damage if the key leaks
