import { describe, expect, it } from "vitest";
import { renderHome, renderSubscribe } from "../src/pages";
import { parseRss } from "../src/rss";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const env = {
  ASSETS: {} as Fetcher,
  RIVERSIDE_RSS_URL: "https://api.riverside.com/hosting/VYqtCBp6.rss",
  SITE_URL: "https://www.thenotoriouscast.com",
  APPLE_PODCASTS_URL: "",
  SPOTIFY_URL: "",
  YOUTUBE_URL: "",
} as unknown as Env;

const podcast = parseRss(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/riverside.rss"), "utf8"),
);

describe("pages", () => {
  it("renders the latest feed episode on the home page", async () => {
    const html = await renderHome(env, new URL("https://www.thenotoriouscast.com/"), podcast, null).text();
    expect(html).toContain("The Notorious Cast");
    expect(html).toContain("Nutrition Basics");
    expect(html).toContain("Documenting the journey EP1");
    expect(html).toContain("application/ld+json");
    expect(html).toContain("PodcastSeries");
  });

  it("shows subscribe placeholders and the live RSS url", async () => {
    const html = await renderSubscribe(env, new URL("https://www.thenotoriouscast.com/subscribe"), podcast).text();
    expect(html).toContain("Coming soon");
    expect(html).toContain("https://api.riverside.com/hosting/VYqtCBp6.rss");
    expect(html).toContain("Apple Podcasts");
    expect(html).toContain("Spotify");
    expect(html).toContain("YouTube");
  });
});
