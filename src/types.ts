export interface Chapter {
  title: string;
  start: number;
  label: string;
}

export interface Episode {
  guid: string;
  title: string;
  slug: string;
  descriptionHtml: string;
  notesHtml: string;
  summary: string;
  pubDate: string;
  pubTime: number;
  duration: string;
  durationSeconds: number;
  durationIso: string;
  audioUrl: string;
  audioType: string;
  audioLength: number | null;
  imageUrl: string;
  transcriptUrl: string | null;
  season: number | null;
  episodeNumber: number | null;
  chapters: Chapter[];
}

export interface Podcast {
  title: string;
  descriptionHtml: string;
  summary: string;
  link: string;
  language: string;
  author: string;
  imageUrl: string;
  categories: string[];
  episodes: Episode[];
}

export interface SubscribeLinks {
  apple: string;
  spotify: string;
  youtube: string;
  rss: string;
}
