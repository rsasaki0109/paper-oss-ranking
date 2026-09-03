import type { HistoryPoint, Link, LinkedRow, Paper, Repo } from "./types";

export type PaperSortKey = "citations" | "growth30" | "year";
export type RepoSortKey = "stars" | "growth30" | "updated";
export type LinkedSortKey = "citations" | "stars" | "paperGrowth" | "repoGrowth" | "year";

export function paperKey(p: Paper): string {
  return p.key;
}

/** Parse YYYY-MM-DD to UTC ms. Returns NaN on invalid input. */
export function parseDate(date: string): number {
  const ms = Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
  return ms;
}

/**
 * Growth = latest value - value closest to (latest date - days).
 * Returns null when history is missing (< 2 points or no baseline within tolerance).
 * Tolerance: baseline must be within [days, days + 7] days before latest, or exactly the oldest
 * point if the whole series is shorter than `days` but spans >= 60% of it.
 */
export function growthOver(series: HistoryPoint[] | undefined, days: 7 | 30 | 90): number | null {
  if (!series || series.length < 2) return null;
  const sorted = [...series]
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  if (sorted.length < 2) return null;
  const latest = sorted[sorted.length - 1];
  const latestMs = parseDate(latest.date);
  if (Number.isNaN(latestMs)) return null;
  const target = latestMs - days * 86_400_000;
  // Find the point at or just before target; prefer closest.
  let baseline: HistoryPoint | null = null;
  for (const p of sorted) {
    const ms = parseDate(p.date);
    if (Number.isNaN(ms) || ms >= latestMs) continue;
    if (ms <= target + 7 * 86_400_000) baseline = p;
    if (ms > target + 7 * 86_400_000) break;
  }
  if (!baseline) {
    // Fallback: if series spans at least 60% of the window, use oldest point.
    const oldestMs = parseDate(sorted[0].date);
    if (Number.isNaN(oldestMs)) return null;
    if (latestMs - oldestMs >= days * 86_400_000 * 0.6) baseline = sorted[0];
    else return null;
  }
  return latest.value - baseline.value;
}

export function growthMap(
  history: Record<string, HistoryPoint[]> | undefined,
  days: 7 | 30 | 90,
): Map<string, number | null> {
  const m = new Map<string, number | null>();
  if (!history) return m;
  for (const [k, v] of Object.entries(history)) m.set(k, growthOver(v, days));
  return m;
}

function num(v: number | null | undefined, fallback = -1): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function sortPapers(
  papers: Paper[],
  key: PaperSortKey,
  growth30: Map<string, number | null>,
  dir: "asc" | "desc" = "desc",
): Paper[] {
  const s = dir === "asc" ? 1 : -1;
  return [...papers].sort((a, b) => {
    let d = 0;
    if (key === "citations") d = num(a.cited_by_count) - num(b.cited_by_count);
    else if (key === "year") d = num(a.year) - num(b.year);
    else d = num(growth30.get(a.key)) - num(growth30.get(b.key));
    if (d !== 0) return d * s;
    // Stable tiebreakers: citations desc, then title.
    const c = num(b.cited_by_count) - num(a.cited_by_count);
    if (c !== 0) return c;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

export function sortRepos(
  repos: Repo[],
  key: RepoSortKey,
  growth30: Map<string, number | null>,
  dir: "asc" | "desc" = "desc",
): Repo[] {
  const s = dir === "asc" ? 1 : -1;
  return [...repos].sort((a, b) => {
    let d = 0;
    if (key === "stars") d = num(a.stars) - num(b.stars);
    else if (key === "growth30") d = num(growth30.get(a.full_name)) - num(growth30.get(b.full_name));
    else {
      const ta = a.updated_at ? Date.parse(a.updated_at) : NaN;
      const tb = b.updated_at ? Date.parse(b.updated_at) : NaN;
      d = (Number.isNaN(ta) ? -1 : ta) - (Number.isNaN(tb) ? -1 : tb);
    }
    if (d !== 0) return d * s;
    const c = num(b.stars) - num(a.stars);
    if (c !== 0) return c;
    return a.full_name.localeCompare(b.full_name);
  });
}

export function joinLinked(papers: Paper[], repos: Repo[], links: Link[]): LinkedRow[] {
  const paperByKey = new Map(papers.map((p) => [p.key, p]));
  const paperByDoi = new Map(papers.filter((p) => p.doi).map((p) => [(p.doi as string).toLowerCase(), p]));
  const paperByOpenAlex = new Map(
    papers.filter((p) => p.openalex_id).map((p) => [normalizeOpenAlex(p.openalex_id as string), p]),
  );
  const repoByName = new Map(repos.map((r) => [r.full_name.toLowerCase(), r]));
  const rows: LinkedRow[] = [];
  for (const l of links) {
    const lk = l.paper.trim();
    const paper =
      paperByKey.get(lk) ?? paperByDoi.get(lk.toLowerCase()) ?? paperByOpenAlex.get(normalizeOpenAlex(lk));
    const repo = repoByName.get(l.repo.trim().toLowerCase());
    // Skip incomplete mappings instead of guessing. Never fabricate rows.
    if (!paper || !repo) continue;
    rows.push({ paper, repo, relation: l.relation });
  }
  return rows;
}

function normalizeOpenAlex(id: string): string {
  const m = id.match(/W\d+/i);
  return (m ? m[0] : id).toUpperCase();
}

export function sortLinked(
  rows: LinkedRow[],
  key: LinkedSortKey,
  paperGrowth: Map<string, number | null>,
  repoGrowth: Map<string, number | null>,
  dir: "asc" | "desc" = "desc",
): LinkedRow[] {
  const s = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let d = 0;
    if (key === "citations") d = num(a.paper.cited_by_count) - num(b.paper.cited_by_count);
    else if (key === "stars") d = num(a.repo.stars) - num(b.repo.stars);
    else if (key === "paperGrowth") d = num(paperGrowth.get(a.paper.key)) - num(paperGrowth.get(b.paper.key));
    else if (key === "repoGrowth")
      d = num(repoGrowth.get(a.repo.full_name)) - num(repoGrowth.get(b.repo.full_name));
    else d = num(a.paper.year) - num(b.paper.year);
    if (d !== 0) return d * s;
    return num(b.paper.cited_by_count) - num(a.paper.cited_by_count);
  });
}

export function filterByQuery<T>(rows: T[], q: string, pick: (r: T) => string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => pick(r).toLowerCase().includes(needle));
}

/** Rank positions with dense ranking? We use standard competition ranking ("1,2,2,4"). */
export function ranks(values: (number | null)[]): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  const order = values
    .map((v, i) => ({ v, i }))
    .filter((x) => typeof x.v === "number" && Number.isFinite(x.v as number))
    .sort((a, b) => (b.v as number) - (a.v as number));
  let rank = 0;
  let prev: number | null = null;
  order.forEach((x, idx) => {
    if (prev === null || (x.v as number) !== prev) rank = idx + 1;
    out[x.i] = rank;
    prev = x.v as number;
  });
  return out;
}

// ---- "Interesting" rankings: citations and stars stay independent, no mystery score. ----

function percentile(sortedAsc: number[], v: number): number {
  if (sortedAsc.length === 0) return 0;
  let lo = 0;
  for (const x of sortedAsc) if (x <= v) lo++;
  return lo / sortedAsc.length;
}

/**
 * Highly cited but relatively fewer stars: top citation quartile AND bottom star half
 * among linked rows. Purely descriptive filters, no combined score.
 */
export function highlyCitedFewerStars(rows: LinkedRow[], limit = 10): LinkedRow[] {
  const cites = rows
    .map((r) => r.paper.cited_by_count)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  const stars = rows
    .map((r) => r.repo.stars)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  return rows
    .filter((r) => {
      if (r.paper.cited_by_count == null || r.repo.stars == null) return false;
      return percentile(cites, r.paper.cited_by_count) >= 0.75 && percentile(stars, r.repo.stars) <= 0.5;
    })
    .sort((a, b) => (b.paper.cited_by_count as number) - (a.paper.cited_by_count as number))
    .slice(0, limit);
}

export function highlyStarredFewerCitations(rows: LinkedRow[], limit = 10): LinkedRow[] {
  const cites = rows
    .map((r) => r.paper.cited_by_count)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  const stars = rows
    .map((r) => r.repo.stars)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  return rows
    .filter((r) => {
      if (r.paper.cited_by_count == null || r.repo.stars == null) return false;
      return percentile(stars, r.repo.stars) >= 0.75 && percentile(cites, r.paper.cited_by_count) <= 0.5;
    })
    .sort((a, b) => (b.repo.stars as number) - (a.repo.stars as number))
    .slice(0, limit);
}
