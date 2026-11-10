# Deploying Ground & Grain

Everything here is free tier. Total time: about 15 minutes.

The system is two pieces plus a database:

| Piece | What it is | Where it goes |
| --- | --- | --- |
| `client/` | React single-page app | Vercel (or Netlify) |
| `server/` | Express REST API | Render |
| Database | Redis key-value store | Upstash (or Render Key Value) |

**Deploy in this order: database → API → client → wire CORS.** The client needs the API URL at
build time, and the API needs the client URL before it will accept browser requests.

---

## 0. Push the code to GitHub

Render and Vercel both deploy from a Git repository.

```bash
cd projects/coffee-shop
git add .
git commit -m "chore: prepare deployment"
git remote add origin https://github.com/<you>/coffee-shop.git
git push -u origin main
```

> If the repo is already on GitHub, just `git push`.

---

## 1. Database — Upstash Redis

1. Sign up at <https://upstash.com> (GitHub login works).
2. **Create Database** → name it `ground-and-grain` → pick the region closest to you.
3. Open the database → **REST API / Redis** section → copy the **`rediss://` URL**
   (the TLS one, ending in `:6379`). It looks like:

   ```
   rediss://default:AbCdEf123456@eu1-xxx-12345.upstash.io:6379
   ```

Keep that string handy. Do not commit it.

**Alternative:** Render's own **Key Value** service also works — copy its *Internal* Redis URL
if the API is on Render, or the *External* one otherwise.

---

## 2. API — Render

### Option A: Blueprint (one click, uses `render.yaml`)

1. <https://dashboard.render.com> → **New** → **Blueprint**.
2. Connect the repo. Render reads `render.yaml` and shows one web service.
3. Fill in the values it asks for:
   - `REDIS_URL` → the `rediss://` URL from step 1
   - `FRONTEND_URL` → put `http://localhost:5180` for now, you will change it in step 4
   - `STAFF_PASSWORD_HASH` → see below
4. **Apply**. First build takes 2–3 minutes.

### Option B: Manual web service

1. **New** → **Web Service** → connect the repo.
2. Settings:

   | Field | Value |
   | --- | --- |
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/health` |
   | Instance Type | Free |

3. **Environment** → add:

   ```
   NODE_ENV=production
   REDIS_URL=rediss://default:...@....upstash.io:6379
   FRONTEND_URL=http://localhost:5180
   JWT_SECRET=<paste a long random string>
   JWT_EXPIRES_IN=8h
   STAFF_USERNAME=staff
   STAFF_PASSWORD_HASH=<bcrypt hash, see below>
   ```

### Generating the staff password hash

Run this locally and paste the output into Render. Never put the plain password in an env var.

```bash
cd server
npm install
npm run hash -- "YourStrongPassword"
```

It prints a `$2b$10$...` string. On Windows PowerShell, wrap the password in double quotes.

> If you leave `STAFF_PASSWORD_HASH` empty, the demo password `coffee123` works. Change it —
> the app logs a warning about this on every boot.

### Generating `JWT_SECRET`

Any long random string. Locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Verify the API

```bash
curl https://<your-service>.onrender.com/api/health
```

Expected: `200` with `"store":{"driver":"redis","ok":true}`.

Then check the menu is not empty:

```bash
curl https://<your-service>.onrender.com/api/menu
```

You should get 16 items. The API seeds the starting menu automatically the first time it boots
against an empty database (`AUTO_SEED=false` disables this).

---

## 3. Client — Vercel

1. <https://vercel.com> → **Add New** → **Project** → import the same repo.
2. Configure:

   | Field | Value |
   | --- | --- |
   | Framework Preset | Vite |
   | Root Directory | `client` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

3. **Environment Variables** → add:

   ```
   VITE_API_URL=https://<your-service>.onrender.com
   ```

   No trailing slash. This is baked in at build time — if you change it, you must redeploy.

4. **Deploy**. You get a URL like `https://ground-and-grain.vercel.app`.

> **Netlify instead?** Same settings; `client/public/_redirects` already handles SPA routing.
> `client/vercel.json` does the same job for Vercel.

---

## 4. Wire CORS (the step everyone forgets)

The API rejects browser requests from unknown origins with `403 CORS_BLOCKED`.

1. In Render → your service → **Environment** → set:

   ```
   FRONTEND_URL=https://ground-and-grain.vercel.app
   ```

   Use the exact origin: `https`, no trailing slash, no path.

2. Save. Render restarts the service automatically.

3. If you also want Vercel **preview** deployments to work, comma-separate the origins:

   ```
   FRONTEND_URL=https://ground-and-grain.vercel.app,https://ground-and-grain-git-dev-you.vercel.app
   ```

   Wildcards are not supported — list each origin.

---

## 5. Smoke test

Open the Vercel URL and check, in this order:

- [ ] Menu shows 16 items with prices.
- [ ] Search and the category filters narrow the list.
- [ ] Add two items → cart badge updates → refresh the page → cart survives.
- [ ] Checkout returns an order number like `ORD-0001`.
- [ ] The confirmation page shows the status tracker.
- [ ] `/staff` → log in with `staff` + your password → dashboard loads.
- [ ] Advance the order to *Preparing* → the customer page shows it within 10 seconds.
- [ ] Toggle dark mode; resize to phone width — no horizontal scrolling.
- [ ] `https://<api>.onrender.com/api/health` returns `ok`.

If the menu is empty or every request fails, jump to Troubleshooting.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Browser console: `403 CORS_BLOCKED` | `FRONTEND_URL` does not match the site origin exactly | Set it to the exact origin, no trailing slash. Check for `www` vs no `www` |
| `Cannot reach the API at https://...` | Wrong `VITE_API_URL`, or the API is asleep | Confirm the URL, redeploy the client after changing the env var, wait ~60s for a cold start |
| Menu loads but is empty | Database was seeded before, then emptied; or seeding failed | Render shell: `npm run seed`. Check boot logs for `[seed]` |
| Staff login returns `401` | Wrong password, or hash has a line break | Regenerate with `npm run hash -- "..."` and paste the whole single line |
| Login works, then `401` on every request | `JWT_SECRET` changed (each deploy with a generated value) | Set a fixed `JWT_SECRET` and log in again |
| Deep link `/order/ORD-0001` gives 404 | SPA rewrite missing | `client/vercel.json` (Vercel) or `client/public/_redirects` (Netlify) must be deployed |
| First request after 15 min takes ~50s | Render free instances sleep | Open `/api/health` a minute before your demo |
| Orders disappear after a restart | `REDIS_URL` unset, so the file store is used on an ephemeral disk | Set `REDIS_URL` and confirm health reports `"driver":"redis"` |

Logs: Render → your service → **Logs**. Every failed request is logged with a status code.

---

## Free tier notes

- **Render free** — spins down after ~15 minutes of inactivity and cold-starts on the next request.
  Fine for a demo, not for a real café. Check the current limits on Render's pricing page.
- **Upstash free** — a monthly command quota and a small storage cap. This app's traffic is tiny,
  but confirm the current numbers on Upstash's pricing page before relying on them.
- **Vercel / Netlify free** — plenty for a static SPA. No cold starts.

Nothing here requires a credit card on the free plans at time of writing; providers change this,
so verify when you sign up.

---

## Updating the deployment

`render.yaml` sets `autoDeploy: true`, and Vercel watches the repo too. Push to `main` and both
redeploy. Client changes that touch `VITE_API_URL` need a fresh build — Vercel does that
automatically on push.

---

## After deploying

Replace the placeholder table at the top of `README.md` with the three real URLs. That table is
part of the submission.
