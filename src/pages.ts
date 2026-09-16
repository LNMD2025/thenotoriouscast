import {
  HOST_NAME,
  PITCH,
  SHOW_NAME,
  coverFigure,
  episodeCard,
  episodeJsonLd,
  episodeLabel,
  escapeHtml,
  excerpt,
  formatDate,
  formatTranscript,
  htmlResponse,
  layout,
  player,
  seriesJsonLd,
  siteOrigin,
  subscribeLinks,
  xmlResponse,
} from "./html";
import { findEpisode, loadPodcast, loadTranscript } from "./rss";
import type { Episode, Podcast } from "./types";

function emptyPodcast(): Podcast {
  return {
    title: SHOW_NAME,
    descriptionHtml: "",
    summary: PITCH,
    link: "",
    language: "en",
    author: HOST_NAME,
    imageUrl: "",
    categories: [],
    episodes: [],
  };
}

export async function safePodcast(env: Env, ctx: ExecutionContext): Promise<{ podcast: Podcast; error: string | null }> {
  try {
    return { podcast: await loadPodcast(env, ctx), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed unavailable";
    return { podcast: emptyPodcast(), error: message };
  }
}

function feedNotice(error: string | null): string {
  if (!error) return "";
  return `<p class="banner" role="status">Live episodes could not be loaded just now. Nothing here is invented — try again shortly.</p>`;
}

export function renderHome(env: Env, requestUrl: URL, podcast: Podcast, error: string | null): Response {
  const origin = siteOrigin(env, requestUrl);
  const featured = podcast.episodes[0];
  const rest = podcast.episodes.slice(1);

  const body = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">A ${HOST_NAME} show</p>
        <h1>${SHOW_NAME}</h1>
        <p class="lede">${escapeHtml(podcast.summary || PITCH)}</p>
        <div class="hero-actions">
          <a class="btn" href="${featured ? `/episodes/${escapeHtml(featured.slug)}` : "/episodes"}">Play latest</a>
          <a class="btn ghost" href="/subscribe">Subscribe</a>
        </div>
      </div>
      ${coverFigure(podcast.imageUrl, podcast.title || SHOW_NAME)}
    </section>
    ${feedNotice(error)}
    ${
      featured
        ? `<section class="panel">
            <p class="eyebrow">Featured</p>
            <h2>Latest episode</h2>
            ${episodeCard(featured, true)}
          </section>`
        : `<section class="panel"><p>No episodes in the Riverside feed yet.</p></section>`
    }
    ${
      rest.length
        ? `<section>
            <div class="section-head">
              <h2>More episodes</h2>
              <a class="text-link" href="/episodes">View all</a>
            </div>
            <div class="episode-list">${rest.map((episode) => episodeCard(episode)).join("")}</div>
          </section>`
        : ""
    }
  `;

  return htmlResponse(
    layout(
      {
        title: `${SHOW_NAME} — ${PITCH}`,
        description: podcast.summary || PITCH,
        canonical: `${origin}/`,
        image: podcast.imageUrl,
        jsonLd: seriesJsonLd(podcast, origin, subscribeLinks(env).rss),
        active: "home",
      },
      body,
    ),
  );
}

export function renderEpisodes(env: Env, requestUrl: URL, podcast: Podcast, error: string | null): Response {
  const origin = siteOrigin(env, requestUrl);
  const body = `
    <section class="page-hero">
      <p class="eyebrow">The archive</p>
      <h1>Episodes</h1>
      <p class="lede">Every published Riverside episode, listed as the feed sends it. No fillers.</p>
    </section>
    ${feedNotice(error)}
    ${
      podcast.episodes.length
        ? `<div class="episode-list">${podcast.episodes.map((episode) => episodeCard(episode)).join("")}</div>`
        : `<p>No episodes are in the feed yet.</p>`
    }
  `;

  return htmlResponse(
    layout(
      {
        title: "Episodes",
        description: `Every published episode of ${SHOW_NAME}.`,
        canonical: `${origin}/episodes`,
        image: podcast.imageUrl,
        active: "episodes",
      },
      body,
    ),
  );
}

export async function renderEpisode(
  env: Env,
  ctx: ExecutionContext,
  requestUrl: URL,
  podcast: Podcast,
  slug: string,
): Promise<Response> {
  const origin = siteOrigin(env, requestUrl);
  const episode = findEpisode(podcast, slug);
  if (!episode) {
    return renderNotFound(env, requestUrl, podcast);
  }

  const transcript = episode.transcriptUrl ? await loadTranscript(episode.transcriptUrl, ctx) : null;

  const body = `
    <article class="episode-page">
      <p class="eyebrow">${escapeHtml(episodeLabel(episode))}${episode.duration ? ` · ${escapeHtml(episode.duration.replace(/^00:/, ""))}` : ""}</p>
      <h1>${escapeHtml(episode.title)}</h1>
      <p class="meta">${escapeHtml(formatDate(episode.pubDate))}${episode.season ? ` · Season ${episode.season}` : ""}</p>
      <div class="episode-layout">
        ${coverFigure(episode.imageUrl || podcast.imageUrl, episode.title)}
        <div>
          ${player(episode)}
        </div>
      </div>
      <section>
        <h2>Notes</h2>
        <div class="prose">${episode.notesHtml || `<p>${escapeHtml(episode.summary)}</p>`}</div>
      </section>
      <section>
        <h2>Transcript</h2>
        ${
          transcript
            ? `<div class="prose transcript">${formatTranscript(transcript)}</div>`
            : `<p class="muted">No transcript was published for this episode.</p>`
        }
      </section>
    </article>
  `;

  return htmlResponse(
    layout(
      {
        title: episode.title,
        description: excerpt(episode.summary, 160) || PITCH,
        canonical: `${origin}/episodes/${episode.slug}`,
        image: episode.imageUrl || podcast.imageUrl,
        jsonLd: episodeJsonLd(episode, origin, podcast),
        active: "episodes",
      },
      body,
    ),
  );
}

export function renderSubscribe(env: Env, requestUrl: URL, podcast: Podcast): Response {
  const origin = siteOrigin(env, requestUrl);
  const links = subscribeLinks(env);

  const platform = (name: string, href: string) => {
    if (href) {
      return `<a class="platform" href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">
        <strong>${escapeHtml(name)}</strong>
        <span>Open in ${escapeHtml(name)}</span>
      </a>`;
    }
    return `<div class="platform pending">
      <strong>${escapeHtml(name)}</strong>
      <span>Coming soon — directory listing in progress</span>
    </div>`;
  };

  const body = `
    <section class="page-hero">
      <p class="eyebrow">Listen wherever you already are</p>
      <h1>Subscribe</h1>
      <p class="lede">Apple Podcasts, Spotify, and YouTube listings will land here when they go live. The Riverside RSS is live now.</p>
    </section>
    <div class="platforms">
      ${platform("Apple Podcasts", links.apple)}
      ${platform("Spotify", links.spotify)}
      ${platform("YouTube", links.youtube)}
    </div>
    <section class="panel rss-panel">
      <h2>Riverside RSS</h2>
      <p>Add this feed in any podcast app. New Riverside uploads show up on the site automatically.</p>
      <div class="rss-row">
        <input id="rss-url" readonly value="${escapeHtml(links.rss)}" data-rss>
        <button type="button" class="btn" data-copy-rss>Copy</button>
      </div>
    </section>
  `;

  return htmlResponse(
    layout(
      {
        title: "Subscribe",
        description: `Subscribe to ${SHOW_NAME} via Apple Podcasts, Spotify, YouTube, or the Riverside RSS feed.`,
        canonical: `${origin}/subscribe`,
        image: podcast.imageUrl,
        active: "subscribe",
      },
      body,
    ),
  );
}

export function renderAbout(env: Env, requestUrl: URL, podcast: Podcast): Response {
  const origin = siteOrigin(env, requestUrl);
  const body = `
    <section class="page-hero">
      <p class="eyebrow">The host</p>
      <h1>${HOST_NAME}</h1>
    </section>
    <div class="about-grid">
      ${coverFigure(podcast.imageUrl, SHOW_NAME)}
      <div class="prose">
        <p>${HOST_NAME} is an operator, athlete, and multi-brand founder. ${SHOW_NAME} is the long-form room for the conversations that sit underneath the work — leadership and faith, training and nutrition, business and brand, and whatever else is worth sitting with.</p>
        <p>The show is not a highlight reel. Episodes are published as they are recorded on Riverside, then listed here from the live feed.</p>
        <p><a class="text-link" href="/subscribe">Follow the feed</a></p>
      </div>
    </div>
  `;

  return htmlResponse(
    layout(
      {
        title: "About",
        description: `${HOST_NAME} — operator, athlete, and multi-brand founder. Host of ${SHOW_NAME}.`,
        canonical: `${origin}/about`,
        image: podcast.imageUrl,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Person",
          name: HOST_NAME,
          jobTitle: "Host",
          url: `${origin}/about`,
          knowsAbout: ["Leadership", "Faith", "Training", "Nutrition", "Business", "Brand"],
        },
        active: "about",
      },
      body,
    ),
  );
}

export function renderNotFound(env: Env, requestUrl: URL, podcast: Podcast): Response {
  const origin = siteOrigin(env, requestUrl);
  const body = `
    <section class="page-hero">
      <p class="eyebrow">404</p>
      <h1>That page is not on the feed.</h1>
      <p class="lede">Check the <a href="/episodes">episode list</a> or go back <a href="/">home</a>.</p>
    </section>
  `;
  return htmlResponse(
    layout(
      {
        title: "Not found",
        description: `This page does not exist on ${SHOW_NAME}.`,
        canonical: `${origin}${requestUrl.pathname}`,
        image: podcast.imageUrl,
      },
      body,
    ),
    404,
  );
}

export function renderSitemap(env: Env, requestUrl: URL, podcast: Podcast): Response {
  const origin = siteOrigin(env, requestUrl);
  const paths = ["/", "/episodes", "/subscribe", "/about", ...podcast.episodes.map((episode: Episode) => `/episodes/${episode.slug}`)];
  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${escapeHtml(`${origin}${path}`)}</loc>
  </url>`,
    )
    .join("\n");

  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    "application/xml; charset=utf-8",
  );
}

export function renderRobots(env: Env, requestUrl: URL): Response {
  const origin = siteOrigin(env, requestUrl);
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
