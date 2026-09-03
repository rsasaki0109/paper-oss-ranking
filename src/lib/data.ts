import type { History, Link, Meta, Paper, Repo } from "./types";

function base(): string {
  return import.meta.env.BASE_URL || "/";
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(base() + path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export interface SiteData {
  papers: Paper[];
  repos: Repo[];
  links: Link[];
  history: History;
  meta: Meta;
}

export async function loadSiteData(): Promise<SiteData> {
  const [papers, repos, links, history, meta] = await Promise.all([
    getJson<Paper[]>("data/papers.json", []),
    getJson<Repo[]>("data/repos.json", []),
    getJson<Link[]>("data/links.json", []),
    getJson<History>("data/history.json", { papers: {}, repos: {} }),
    getJson<Meta>("data/meta.json", {
      last_updated: "unknown",
      paper_source: "OpenAlex",
      oss_source: "GitHub",
    }),
  ]);
  return { papers, repos, links, history, meta };
}
