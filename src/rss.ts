import type { Chapter, Episode, Podcast } from "./types";

export const DEFAULT_RSS_URL = "https://api.riverside.com/hosting/VYqtCBp6.rss";
export const RSS_CACHE_TTL_SECONDS = 600;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "a",
  "blockquote",
  "h2",
  "h3",
  "h4",
]);

export function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeHtml(html: string): string {
  const withoutDanger = html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

  return withoutDanger.replace(/<\/?([a-zA-Z0-9]+)([^>]*)\/?>/g, (match, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    const closing = match.startsWith("</");
    const selfClosing = name === "br";
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return `</${name}>`;
    if (name === "a") {
      const href = rawAttrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)')/i);
      const url = href ? (href[2] ?? href[3] ?? "") : "";
      if (!/^https?:\/\//i.test(url)) return "<a>";
      return `<a href="${escapeAttr(url)}" rel="noopener noreferrer" target="_blank">`;
    }
    return selfClosing ? `<${name}>` : `<${name}>`;
  });
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "episode";
}

export function timestampToSeconds(stamp: string): number {
  const parts = stamp.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

export function parseDurationSeconds(duration: string): number {
  const trimmed = duration.trim();
  if (!trimmed) return 0;
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  return timestampToSeconds(trimmed);
}

export function durationToIso8601(duration: string): string {
  const total = parseDurationSeconds(duration);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  let iso = "PT";
  if (hours) iso += `${hours}H`;
  if (minutes) iso += `${minutes}M`;
  if (seconds || iso === "PT") iso += `${seconds}S`;
  return iso;
}

export function parseChapters(html: string): Chapter[] {
  const withBreaks = html
    .replace(/<\/(?:li|p|div|h\d)>/gi, "\n")
    .replace(/<(?:br|li|p|div|h\d)\b[^>]*>/gi, "\n");
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n");
  const chaptersIndex = text.search(/\bchapters\b/i);
  const slice = chaptersIndex >= 0 ? text.slice(chaptersIndex) : text;
  const chapters: Chapter[] = [];
  const seen = new Set<number>();
  const pattern = /(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(slice))) {
    const start = timestampToSeconds(match[1]);
    const title = match[2].replace(/^[-–—]\s*/, "").trim();
    if (!title || seen.has(start)) continue;
    seen.add(start);
    chapters.push({ title, start, label: match[1] });
  }
  return chapters;
}

export function notesHtml(descriptionHtml: string): string {
  const withoutChapters = descriptionHtml.replace(
    /<p>\s*Chapters\s*<\/p>\s*<ul>[\s\S]*?<\/ul>/i,
    "",
  );
  return sanitizeHtml(withoutChapters).replace(/<p>\s*<\/p>/g, "");
}

function firstTag(xml: string, name: string): string {
  const escaped = name.replace(/:/g, "\\:");
  const cdata = xml.match(new RegExp(`<${escaped}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${escaped}>`, "i"));
  if (cdata) return decodeEntities(cdata[1].trim());
  const plain = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, "i"));
  if (!plain) return "";
  return decodeEntities(plain[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}

function attr(xml: string, tagName: string, attribute: string): string {
  const escaped = tagName.replace(/:/g, "\\:");
  const match = xml.match(new RegExp(`<${escaped}[^>]*\\s${attribute}="([^"]*)"`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function channelHead(xml: string): string {
  const start = xml.search(/<channel[\s>]/i);
  const item = xml.search(/<item[\s>]/i);
  if (start < 0) return xml;
  return xml.slice(start, item < 0 ? undefined : item);
}

function uniqueSlugs(episodes: Episode[]): Episode[] {
  const used = new Map<string, number>();
  return episodes.map((episode) => {
    const base = episode.slug;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    if (count === 0) return episode;
    const suffix = episode.guid.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
    return { ...episode, slug: `${base}-${suffix || count + 1}` };
  });
}

export function parseRss(xml: string): Podcast {
  if (!/<rss[\s>]|<channel[\s>]/i.test(xml)) {
    throw new Error("Not a podcast RSS feed");
  }

  const head = channelHead(xml);
  const imageUrl =
    attr(head, "itunes:image", "href") ||
    firstTag(head, "url") ||
    "";

  const categories = [...head.matchAll(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi)]
    .map((match) => stripTags(decodeEntities(match[1])))
    .filter(Boolean);

  const itunesCategories = [...head.matchAll(/<itunes:category[^>]*\stext="([^"]+)"/gi)].map((match) =>
    decodeEntities(match[1]),
  );

  const descriptionHtml = firstTag(head, "description") || firstTag(head, "itunes:summary");

  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const episodes = uniqueSlugs(
    items.map((item) => {
      const title = firstTag(item, "itunes:title") || firstTag(item, "title");
      const descriptionHtml = firstTag(item, "description") || firstTag(item, "itunes:summary");
      const guid = firstTag(item, "guid") || slugify(title);
      const pubDate = firstTag(item, "pubDate");
      const duration = firstTag(item, "itunes:duration");
      const episodeNumberRaw = firstTag(item, "itunes:episode");
      const seasonRaw = firstTag(item, "itunes:season");
      const audioLengthRaw = attr(item, "enclosure", "length");

      return {
        guid,
        title,
        slug: slugify(title),
        descriptionHtml,
        notesHtml: notesHtml(descriptionHtml),
        summary: stripTags(descriptionHtml),
        pubDate,
        pubTime: Date.parse(pubDate) || 0,
        duration,
        durationSeconds: parseDurationSeconds(duration),
        durationIso: durationToIso8601(duration),
        audioUrl: attr(item, "enclosure", "url"),
        audioType: attr(item, "enclosure", "type") || "audio/mpeg",
        audioLength: audioLengthRaw ? Number.parseInt(audioLengthRaw, 10) : null,
        imageUrl: attr(item, "itunes:image", "href") || imageUrl,
        transcriptUrl: attr(item, "podcast:transcript", "url") || null,
        season: seasonRaw ? Number.parseInt(seasonRaw, 10) : null,
        episodeNumber: episodeNumberRaw ? Number.parseInt(episodeNumberRaw, 10) : null,
        chapters: parseChapters(descriptionHtml),
      };
    }),
  ).sort((a, b) => b.pubTime - a.pubTime || (b.episodeNumber ?? 0) - (a.episodeNumber ?? 0));

  return {
    title: firstTag(head, "title") || "The Notorious Cast",
    descriptionHtml,
    summary: stripTags(descriptionHtml),
    link: firstTag(head, "link"),
    language: firstTag(head, "language") || "en",
    author: firstTag(head, "itunes:author") || firstTag(head, "author") || "Dean Linder-Leighton",
    imageUrl,
    categories: categories.length ? categories : itunesCategories,
    episodes,
  };
}

export function findEpisode(podcast: Podcast, slug: string): Episode | undefined {
  return podcast.episodes.find((episode) => episode.slug === slug || episode.guid === slug);
}

export async function fetchCachedText(
  url: string,
  ctx: ExecutionContext,
  ttlSeconds = RSS_CACHE_TTL_SECONDS,
): Promise<string> {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached.text();

  const upstream = await fetch(url, {
    cf: {
      cacheTtl: ttlSeconds,
      cacheEverything: true,
    },
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, text/plain, */*",
      "User-Agent": "TheNotoriousCast/1.0 (+https://www.thenotoriouscast.com)",
    },
  });

  if (!upstream.ok) {
    throw new Error(`Upstream fetch failed (${upstream.status})`);
  }

  const text = await upstream.text();
  const cachedResponse = new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, s-maxage=${ttlSeconds}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
  return text;
}

export async function loadPodcast(env: Env, ctx: ExecutionContext): Promise<Podcast> {
  const rssUrl = env.RIVERSIDE_RSS_URL || DEFAULT_RSS_URL;
  const xml = await fetchCachedText(rssUrl, ctx, RSS_CACHE_TTL_SECONDS);
  return parseRss(xml);
}

export async function loadTranscript(url: string, ctx: ExecutionContext): Promise<string | null> {
  try {
    const text = await fetchCachedText(url, ctx, RSS_CACHE_TTL_SECONDS);
    return text.trim() || null;
  } catch {
    return null;
  }
}
