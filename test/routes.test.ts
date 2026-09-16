import { describe, expect, it } from "vitest";
import { episodeJsonLd } from "../src/html";
import { apexRedirectLocation, normalizePath, parseRoute, trailingSlashLocation } from "../src/routes";
import type { Episode, Podcast } from "../src/types";

describe("routes", () => {
  it("maps the public pages", () => {
    expect(parseRoute("/")).toEqual({ name: "home" });
    expect(parseRoute("/episodes")).toEqual({ name: "episodes" });
    expect(parseRoute("/episodes/documenting-the-journey-ep1")).toEqual({
      name: "episode",
      slug: "documenting-the-journey-ep1",
    });
    expect(parseRoute("/subscribe")).toEqual({ name: "subscribe" });
    expect(parseRoute("/about")).toEqual({ name: "about" });
    expect(parseRoute("/sitemap.xml")).toEqual({ name: "sitemap" });
    expect(parseRoute("/robots.txt")).toEqual({ name: "robots" });
    expect(parseRoute("/nope")).toEqual({ name: "notfound" });
  });

  it("normalizes trailing slashes", () => {
    expect(normalizePath("/episodes/")).toBe("/episodes");
    expect(trailingSlashLocation(new URL("https://www.thenotoriouscast.com/about/"))).toBe(
      "https://www.thenotoriouscast.com/about",
    );
  });

  it("301s apex traffic to www", () => {
    expect(apexRedirectLocation(new URL("http://thenotoriouscast.com/episodes"))).toBe(
      "https://www.thenotoriouscast.com/episodes",
    );
    expect(apexRedirectLocation(new URL("https://www.thenotoriouscast.com/"))).toBeNull();
  });
});

describe("PodcastEpisode JSON-LD", () => {
  it("emits schema.org fields from a real episode shape", () => {
    const episode: Episode = {
      guid: "4d2f778b-af63-4e0e-a483-09380f14a214",
      title: "Documenting the journey EP1",
      slug: "documenting-the-journey-ep1",
      descriptionHtml: "",
      notesHtml: "<p>Notes</p>",
      summary: "Documenting the journey.",
      pubDate: "Wed, 16 Sep 2026 03:11:33 GMT",
      pubTime: Date.parse("Wed, 16 Sep 2026 03:11:33 GMT"),
      duration: "00:27:50",
      durationSeconds: 1670,
      durationIso: "PT27M50S",
      audioUrl: "https://example.com/ep1.mp3",
      audioType: "audio/mpeg",
      audioLength: 1,
      imageUrl: "https://example.com/cover.png",
      transcriptUrl: null,
      season: 1,
      episodeNumber: 1,
      chapters: [],
    };
    const podcast: Podcast = {
      title: "The Notorious Cast",
      descriptionHtml: "",
      summary: "",
      link: "",
      language: "en",
      author: "Dean",
      imageUrl: "https://example.com/cover.png",
      categories: [],
      episodes: [episode],
    };

    const json = episodeJsonLd(episode, "https://www.thenotoriouscast.com", podcast);
    expect(json["@type"]).toBe("PodcastEpisode");
    expect(json.url).toBe("https://www.thenotoriouscast.com/episodes/documenting-the-journey-ep1");
    expect(json.duration).toBe("PT27M50S");
    expect(json.associatedMedia?.contentUrl).toBe("https://example.com/ep1.mp3");
    expect(json.partOfSeries.name).toBe("The Notorious Cast");
  });
});
