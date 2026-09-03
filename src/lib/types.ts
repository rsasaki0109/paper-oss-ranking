export const CATEGORIES = [
  "Robotics",
  "SLAM",
  "Localization",
  "Autonomous Driving",
  "Computer Vision",
  "3D Vision",
  "VLA",
  "World Models",
  "Gaussian Splatting",
  "NeRF",
  "VLM",
  "Image Generation",
  "Coding AI",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Paper {
  /** Stable key: DOI lower-cased if available, else OpenAlex short id. */
  key: string;
  openalex_id: string | null;
  doi: string | null;
  title: string | null;
  authors: string[];
  year: number | null;
  venue: string | null;
  cited_by_count: number | null;
  url: string | null;
  category: string;
}

export interface Repo {
  full_name: string;
  owner: string | null;
  repo: string | null;
  description: string | null;
  stars: number | null;
  forks: number | null;
  language: string | null;
  updated_at: string | null;
  url: string;
  contributors_count: number | null;
  category: string;
}

export interface Link {
  paper: string;
  repo: string;
  relation: "official" | "community";
  note?: string;
}

/** Compact time series for the frontend: entity key -> sorted points. */
export interface HistoryPoint {
  date: string;
  value: number;
}

export interface History {
  papers: Record<string, HistoryPoint[]>;
  repos: Record<string, HistoryPoint[]>;
}

export interface Meta {
  last_updated: string;
  paper_source: string;
  oss_source: string;
}

export interface LinkedRow {
  paper: Paper;
  repo: Repo;
  relation: Link["relation"];
}
