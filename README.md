# The Notorious Cast

Public site for [Dean Linder-Leighton](https://www.thenotoriouscast.com/about)’s podcast — conversations on leadership and faith, training and nutrition, business and brand.

Live site: [https://www.thenotoriouscast.com](https://www.thenotoriouscast.com)  
Workers preview: [https://thenotoriouscast.dlinderleighton.workers.dev](https://thenotoriouscast.dlinderleighton.workers.dev)

Both custom domains are attached to this Worker (`thenotoriouscast.com` and `www.thenotoriouscast.com`). The Worker 301s apex traffic to `www`.

The Worker fetches the Riverside RSS feed at request time (`RIVERSIDE_RSS_URL`, ~10 minute edge cache). New Riverside uploads appear without a redeploy. Episodes are never invented.

## Local

```bash
npm install
npm test
npm run typecheck
npm run deploy:dry-run
npm run dev
```

Dev server defaults to `http://localhost:8787`.

## Deploy

This is a Cloudflare Worker with static assets (`wrangler.toml`).

```bash
npx wrangler login
npx wrangler deploy
```

Required account permission: Workers deploy. If credentials are missing, deploy stops at login — the site is still fully in this repo.

`wrangler.toml` declares both custom domains:

```toml
[[routes]]
pattern = "thenotoriouscast.com"
custom_domain = true

[[routes]]
pattern = "www.thenotoriouscast.com"
custom_domain = true
```

Those hostnames are already attached. The Worker issues a **301** from `thenotoriouscast.com` → `https://www.thenotoriouscast.com` (same path and query). The workers.dev URL remains [https://thenotoriouscast.dlinderleighton.workers.dev](https://thenotoriouscast.dlinderleighton.workers.dev).

## Environment

Set in `[vars]` or overridden per environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RIVERSIDE_RSS_URL` | `https://api.riverside.com/hosting/VYqtCBp6.rss` | Live episode feed |
| `SITE_URL` | `https://www.thenotoriouscast.com` | Canonical / Open Graph origin |
| `APPLE_PODCASTS_URL` | empty | Directory link (placeholder until listed) |
| `SPOTIFY_URL` | empty | Directory link (placeholder until listed) |
| `YOUTUBE_URL` | empty | Directory link (placeholder until listed) |

## Routes

- `/` — hero, cover, featured latest episode + HTML5 audio, remaining episode list
- `/episodes` — full archive from the feed
- `/episodes/[slug]` — notes, seekable chapters, transcript, PodcastEpisode JSON-LD
- `/subscribe` — Apple / Spotify / YouTube placeholders + copyable Riverside RSS
- `/about` — short host bio
- `/sitemap.xml`, `/robots.txt`

## Stack

Cloudflare Worker (`src/index.ts`) + static assets in `public/` (`styles.css`, `player.js`, `favicon.svg`). TypeScript, Vitest, Wrangler. `npm install` regenerates `worker-configuration.d.ts`.
