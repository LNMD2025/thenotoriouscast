import type { Episode, Podcast, SubscribeLinks } from "./types";

export const HOST_NAME = "Dean Linder-Leighton";
export const SHOW_NAME = "The Notorious Cast";
export const PITCH =
  "Conversations on Leadership & Faith, Training and Nutrition, Business and Brand, plus other interesting topics.";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function siteOrigin(env: Env, requestUrl?: URL): string {
  const configured = env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (requestUrl) return requestUrl.origin;
  return "https://www.thenotoriouscast.com";
}

export function subscribeLinks(env: Env): SubscribeLinks {
  return {
    apple: env.APPLE_PODCASTS_URL ?? "",
    spotify: env.SPOTIFY_URL ?? "",
    youtube: env.YOUTUBE_URL ?? "",
    rss: env.RIVERSIDE_RSS_URL || "https://api.riverside.com/hosting/VYqtCBp6.rss",
  };
}

export function formatDate(pubDate: string): string {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function episodeLabel(episode: Episode): string {
  if (episode.episodeNumber) return `EP ${episode.episodeNumber}`;
  return "Episode";
}

export function excerpt(text: string, length = 180): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).replace(/\s+\S*$/, "")}…`;
}

export function htmlResponse(html: string, status = 200, extra: HeadersInit = {}): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=120",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; media-src https:; connect-src 'self'; base-uri 'self'; form-action 'self'",
      ...extra,
    },
  });
}

export function xmlResponse(xml: string, contentType: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=0, s-maxage=120",
    },
  });
}

interface LayoutOptions {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  jsonLd?: unknown;
  active?: "home" | "episodes" | "subscribe" | "about";
}

export function layout(options: LayoutOptions, body: string): string {
  const pageTitle = options.title.includes(SHOW_NAME) ? options.title : `${options.title} · ${SHOW_NAME}`;
  const jsonLd = options.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(options.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(options.description)}">
  <link rel="canonical" href="${escapeHtml(options.canonical)}">
  <meta name="theme-color" content="#070707">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SHOW_NAME}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(options.description)}">
  <meta property="og:url" content="${escapeHtml(options.canonical)}">
  ${options.image ? `<meta property="og:image" content="${escapeHtml(options.image)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(options.description)}">
  ${options.image ? `<meta name="twitter:image" content="${escapeHtml(options.image)}">` : ""}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Cormorant+Garamond:ital,wght@0,500;1,500;1,600&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  ${jsonLd}
</head>
<body>
  <div class="grain" aria-hidden="true"></div>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="wordmark" href="/">${SHOW_NAME}</a>
    <nav aria-label="Primary">
      <a href="/"${options.active === "home" ? ' aria-current="page"' : ""}>Home</a>
      <a href="/episodes"${options.active === "episodes" ? ' aria-current="page"' : ""}>Episodes</a>
      <a href="/subscribe"${options.active === "subscribe" ? ' aria-current="page"' : ""}>Subscribe</a>
      <a href="/about"${options.active === "about" ? ' aria-current="page"' : ""}>About</a>
    </nav>
  </header>
  <main id="main">
    ${body}
  </main>
  <footer class="site-footer">
    <p>${SHOW_NAME} · Hosted by ${HOST_NAME}</p>
    <p class="muted">Episodes are pulled live from Riverside. New uploads appear here without a redeploy.</p>
  </footer>
  <script src="/player.js" defer></script>
</body>
</html>`;
}

export function seriesJsonLd(podcast: Podcast, origin: string, rssUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: podcast.title || SHOW_NAME,
    url: origin,
    description: podcast.summary || PITCH,
    inLanguage: podcast.language || "en",
    author: {
      "@type": "Person",
      name: HOST_NAME,
    },
    image: podcast.imageUrl || undefined,
    webFeed: rssUrl,
  };
}

export function episodeJsonLd(episode: Episode, origin: string, podcast: Podcast) {
  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    url: `${origin}/episodes/${episode.slug}`,
    datePublished: episode.pubDate || undefined,
    description: episode.summary,
    duration: episode.durationIso,
    episodeNumber: episode.episodeNumber ?? undefined,
    partOfSeason: episode.season
      ? {
          "@type": "PodcastSeason",
          seasonNumber: episode.season,
        }
      : undefined,
    associatedMedia: episode.audioUrl
      ? {
          "@type": "MediaObject",
          contentUrl: episode.audioUrl,
          encodingFormat: episode.audioType,
        }
      : undefined,
    image: episode.imageUrl || podcast.imageUrl || undefined,
    partOfSeries: {
      "@type": "PodcastSeries",
      name: podcast.title || SHOW_NAME,
      url: origin,
    },
  };
}

export function player(episode: Episode): string {
  if (!episode.audioUrl) {
    return `<p class="muted">Audio is not available for this episode yet.</p>`;
  }

  const chapters = episode.chapters.length
    ? `<div class="chapter-block">
        <h3>Chapters</h3>
        <p class="muted">Tap a chapter to seek.</p>
        <ol class="chapters" data-chapters>
        ${episode.chapters
          .map(
            (chapter) =>
              `<li>
                <button type="button" class="chapter" data-start="${chapter.start}">
                  <span class="chapter-time">${escapeHtml(chapter.label)}</span>
                  <span>${escapeHtml(chapter.title)}</span>
                </button>
              </li>`,
          )
          .join("")}
        </ol>
      </div>`
    : "";

  return `
    <div class="player" data-player>
      <audio controls preload="metadata" src="${escapeHtml(episode.audioUrl)}">
        Your browser does not support the audio element.
      </audio>
      ${chapters}
    </div>
  `;
}

export function episodeCard(episode: Episode, featured = false): string {
  const href = `/episodes/${escapeHtml(episode.slug)}`;
  return `
    <article class="episode-card${featured ? " featured" : ""}">
      <p class="kicker">${escapeHtml(episodeLabel(episode))}${episode.duration ? ` · ${escapeHtml(episode.duration.replace(/^00:/, ""))}` : ""}</p>
      <h3><a href="${href}">${escapeHtml(episode.title)}</a></h3>
      <p class="meta">${escapeHtml(formatDate(episode.pubDate))}</p>
      <p>${escapeHtml(excerpt(episode.summary))}</p>
      ${featured ? player(episode) : `<a class="text-link" href="${href}">Listen and read notes</a>`}
    </article>
  `;
}

export function coverFigure(imageUrl: string, title: string): string {
  if (!imageUrl) return "";
  return `
    <figure class="cover">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)} cover art" width="640" height="640">
    </figure>
  `;
}

export function formatTranscript(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    const sentences = text.replace(/\s+/g, " ").trim();
    return `<p>${escapeHtml(sentences)}</p>`;
  }

  return blocks.map((block) => `<p>${escapeHtml(block)}</p>`).join("");
}
