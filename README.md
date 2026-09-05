# Stub

Static HTML/CSS/JS frontend for Stub. Lives in its own repo (e.g. under a
GitHub organization) and is deployed via GitHub Pages — it doesn't need
Render, Node, or a build step. It talks to the backend (deployed
separately) purely over the network via `fetch`.

```
stub-frontend/
├── index.html
├── style.css
└── script.js
```

## Before deploying: point it at your backend

Open `script.js` and set:
```js
const API_BASE_URL = 'https://textvault-api-xxxx.onrender.com/api/entries';
```

## Closing the loop with the backend (CORS)

The backend only accepts requests from origins you've explicitly allowed.
Once you have your GitHub Pages URL:

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
