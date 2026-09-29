# Deploying GeoGuessr-Free (100% free)

The app is a **single Node service**: Express serves both the API (`/api/*`) and the built
React client from `dist/`. Any Node host works. Two free paths below.

---

## Path A — GitHub + Render (recommended, auto-deploys)

### 1. Push the code to GitHub

Create an empty repo at https://github.com/new (name it e.g. `geoguessr-free`), then:

```bash
git init
git add .
git commit -m "GeoGuessr-Free: initial version"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/geoguessr-free.git
git push -u origin main
```

### 2. Create the Render service

1. Go to https://dashboard.render.com → **New** → **Web Service**
2. **Connect your GitHub repo** (authorize GitHub when asked)
3. Settings (mostly pre-filled from `render.yaml`):
   - Runtime: **Node**
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
4. Under **Environment variables**, add:
   - `VITE_MAPILLARY_TOKEN` = your Mapillary token
5. Click **Create Web Service** — first deploy takes ~3–5 min
6. You get a URL like `https://geoguessr-free.onrender.com` — **that's your real website** 🎉

Notes:
- Render's free tier spins down after 15 min idle; first visitor waits ~30–60 s. Paid plans remove this.
- The Mapillary client token is public by design (same as GeoGuessr's own maps keys) — rate limits live on the Mapillary side.
- In-memory game sessions reset when Render redeploys or spins the service — fine for casual play.

### 3. Seed the pool (optional but recommended)

In the Render dashboard → **Shell** tab:

```bash
npm run seed
```

This rebuilds `server/seeds/locations.json` on the server, making round starts instant.

---

## Path B — Vercel CLI (no GitHub needed)

```bash
npm i -g vercel
npx vercel        # first time: answer the prompts, accept defaults
vercel --prod     # deploys to production
```

Then in the Vercel dashboard add `VITE_MAPILLARY_TOKEN`. The default Vercel Node setup may
need the Express server wired via `api/` folder — **Path A is simpler for this app**; use
Path B only if you already know Vercel.

---

## After deploying

- Open your Render URL → you should see the start screen.
- No token set? The server falls back to DEMO MODE (simulated locations).
- Add the token in the Render dashboard → **Environment** → it redeploys automatically.
