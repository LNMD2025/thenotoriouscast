import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  durationToIso8601,
  findEpisode,
  notesHtml,
  parseChapters,
  parseDurationSeconds,
  parseRss,
  sanitizeHtml,
  slugify,
  timestampToSeconds,
} from "../src/rss";

const fixture = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/riverside.rss"), "utf8");

describe("parseRss", () => {
  const podcast = parseRss(fixture);

  it("reads show metadata from the live Riverside fixture", () => {
    expect(podcast.title).toBe("The Notorious Cast");
    expect(podcast.summary).toMatch(/Leadership/);
    expect(podcast.imageUrl).toContain("hosting-media.riverside.com");
    expect(podcast.author).toBe("Dean");
  });

  it("does not invent episodes and keeps the known EP1 guid", () => {
    expect(podcast.episodes).toHaveLength(3);
    const ep1 = podcast.episodes.find((episode) => episode.guid === "4d2f778b-af63-4e0e-a483-09380f14a214");
    expect(ep1).toBeDefined();
    expect(ep1?.title).toBe("Documenting the journey EP1");
    expect(ep1?.duration).toBe("00:27:50");
    expect(ep1?.audioUrl).toMatch(/\.mp3/);
    expect(ep1?.transcriptUrl).toContain("transcripts.txt");
    expect(ep1?.chapters.map((chapter) => chapter.title)).toEqual([
      "Documenting the Journey",
      "Balancing Fitness and Business",
      "Optimizing Business Operations",
      "Expanding Brand and Vision",
      "The Power of Consistency",
      "Overcoming Mental Barriers",
      "Building Resistance and Commitment",
    ]);
  });

  it("sorts newest first without dropping later uploads", () => {
    expect(podcast.episodes.map((episode) => episode.title)).toEqual([
      "Nutrition Basics",
      "The Journey of Personal Growth",
      "Documenting the journey EP1",
    ]);
  });

  it("rejects non-RSS payloads", () => {
    expect(() => parseRss("<html>not a feed</html>")).toThrow(/RSS/i);
  });
});

describe("slugify and lookup", () => {
  it("builds stable slugs", () => {
    expect(slugify("Documenting the journey EP1")).toBe("documenting-the-journey-ep1");
    expect(slugify("The Journey of Personal Growth")).toBe("the-journey-of-personal-growth");
  });

  it("finds episodes by slug or guid", () => {
    const podcast = parseRss(fixture);
    expect(findEpisode(podcast, "documenting-the-journey-ep1")?.guid).toBe(
      "4d2f778b-af63-4e0e-a483-09380f14a214",
    );
    expect(findEpisode(podcast, "4d2f778b-af63-4e0e-a483-09380f14a214")?.slug).toBe(
      "documenting-the-journey-ep1",
    );
  });

  it("disambiguates colliding titles", () => {
    const xml = `<?xml version="1.0"?><rss><channel><title>Show</title>
      <item><title>Same Title</title><guid>aaa</guid><pubDate>Wed, 16 Sep 2026 03:00:00 GMT</pubDate></item>
      <item><title>Same Title</title><guid>bbb-ccc</guid><pubDate>Wed, 16 Sep 2026 02:00:00 GMT</pubDate></item>
    </channel></rss>`;
    const slugs = parseRss(xml).episodes.map((episode) => episode.slug);
    expect(new Set(slugs).size).toBe(2);
  });
});

describe("chapters and duration", () => {
  it("parses timestamped chapter lines", () => {
    const chapters = parseChapters(`<p>Chapters</p><ul><li>00:00 Documenting the Journey</li><li>02:08 Balancing Fitness and Business</li></ul>`);
    expect(chapters).toEqual([
      { title: "Documenting the Journey", start: 0, label: "00:00" },
      { title: "Balancing Fitness and Business", start: 128, label: "02:08" },
    ]);
  });

  it("converts clock values", () => {
    expect(timestampToSeconds("00:27:50")).toBe(1670);
    expect(parseDurationSeconds("00:27:50")).toBe(1670);
    expect(durationToIso8601("00:27:50")).toBe("PT27M50S");
    expect(durationToIso8601("01:02:03")).toBe("PT1H2M3S");
  });
});

describe("html notes", () => {
  it("strips scripts and chapter lists from notes", () => {
    const html = `<p>Hello</p><p>Chapters</p><ul><li>00:00 Start</li></ul><script>alert(1)</script>`;
    const notes = notesHtml(html);
    expect(notes).toContain("Hello");
    expect(notes).not.toContain("Chapters");
    expect(notes).not.toContain("script");
  });

  it("drops javascript hrefs", () => {
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).toContain("<a>");
    expect(sanitizeHtml(`<a href="https://www.thenotoriouscast.com">x</a>`)).toContain(
      "https://www.thenotoriouscast.com",
    );
  });
});
