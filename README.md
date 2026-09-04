# Stub

Static HTML/CSS/JS frontend for Stub. Lives in its own repo (e.g. under a
GitHub organization) and is deployed via GitHub Pages — it doesn't need
Render, Node, or a build step. It talks to the backend (deployed
separately) purely over the network via `fetch`.

```
stub/
├── index.html
├── style.css
└── script.js
```

## Before deploying: point it at your backend

Open `script.js` and set:
```js
const API_BASE_URL = 'https://textvault-api-xxxx.onrender.com/api/entries';
```
Use the real URL Render gave your backend service (see the backend repo's
README). Nothing else in this repo needs to change.

## Local development

Any static file server works — no build step:
```bash
python3 -m http.server 8080   # or `npx serve`, VS Code Live Server, etc.
```
While testing locally against a local backend, point `API_BASE_URL` at
`http://localhost:3000/api/entries` instead, then switch it back before
deploying.

## Deploying to GitHub Pages (organization repo)

1. Push this repo to your organization's GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_ORG/stub-frontend.git
   git push -u origin main
   ```
2. On GitHub, go to this repo's **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a
   branch**, branch `main`, folder `/ (root)` (since `index.html` is
   already at the repo root here). Save.
4. GitHub builds and gives you a URL, typically:
   `https://YOUR_ORG.github.io/stub-frontend/`
   — note the `/stub-frontend/` subpath. Organization Pages sites only
   serve at the bare `https://YOUR_ORG.github.io/` root if the repo is
   literally named `YOUR_ORG.github.io`; otherwise you get a project-page
   subpath like this one. Nothing in this frontend needs adjusting either
   way — all asset references here are relative.
5. Visit the URL and confirm the page loads. It won't be able to save or
   retrieve anything yet — see the next step.

## Closing the loop with the backend (CORS)

The backend only accepts requests from origins you've explicitly allowed.
Once you have your GitHub Pages URL from step 4:

1. Go to the backend's Render dashboard → `textvault-api` → **Environment**.
2. Set `FRONTEND_ORIGIN` to **just the origin — no path, no trailing
   slash**: `https://YOUR_ORG.github.io`
   (not `https://YOUR_ORG.github.io/stub-frontend/`). CORS checks scheme +
   host only, so including the subpath would make it fail to match.
3. Save — the backend redeploys automatically.
4. Reload the frontend and try saving something. If it works, both sides
   are correctly connected.

## Troubleshooting

- **"Failed to fetch" / network error in the browser console**: usually
  `API_BASE_URL` in `script.js` is still pointing at `localhost`, or is
  simply wrong — double-check it matches the backend's real Render URL.
- **CORS error in the console** (mentions "blocked by CORS policy"):
  `FRONTEND_ORIGIN` on the backend either isn't set yet, or doesn't
  exactly match this site's origin (check for a stray trailing slash or
  an included subpath).
- **Fonts or the PDF button don't work**: both load from public CDNs
  (Google Fonts, cdnjs) at runtime — if your organization's network
  blocks those domains, they'll silently fail. Works fine on a normal
  connection.
