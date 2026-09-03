// Data update: OpenAlex (papers) + GitHub API (repos) -> JSON + snapshot.
// Safety: on API failure keep existing values; never write nulls over good data.
// Usage: node scripts/update-data.mjs [--check]   (--check = validate only, no network)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_DIR,
  PUBLIC_DATA_DIR,
  SNAP_DIR,
  readJson,
  writeJson,
  todayUTC,
  sleep,
  parseLinksYaml,
  normalizeOpenAlex,
  paperKeyOf,
  buildHistory,
  validateData,
} from "./lib.mjs";

const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO || "paper-oss-ranking@example.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const S2_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || "";
// Unauthenticated Semantic Scholar: max ~100 req / 5 min -> stay well below it.
const S2_DELAY_MS = S2_API_KEY ? 1100 : 3000;

function log(...a) {
  console.log("[update-data]", ...a);
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (res.status === 404) return { __notFound: true, status: 404 };
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

function openAlexHeaders() {
  return { Accept: "application/json", "User-Agent": `paper-oss-ranking/0.1 (mailto:${OPENALEX_MAILTO})` };
}

async function fetchWorkByDoi(doi) {
  const url =
    `https://api.openalex.org/works/https://doi.org/${doi}?select=id,doi,title,publication_year,cited_by_count,authorships,primary_location,open_access` +
    `&mailto=${encodeURIComponent(OPENALEX_MAILTO)}`;
  return await fetchJson(url, openAlexHeaders());
}

async function searchWork(title) {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(title)}&per-page=1` +
    `&select=id,doi,title,publication_year,cited_by_count,authorships,primary_location` +
    `&mailto=${encodeURIComponent(OPENALEX_MAILTO)}`;
  const j = await fetchJson(url, openAlexHeaders());
  return j.results && j.results[0] ? j.results[0] : null;
}

/**
 * Relevance gate for title-search results. DOI-direct hits are trusted;
 * search hits must share enough significant words with the hint so a wrong
 * record is never stored (counts are never fabricated).
 */
function titleMatchOk(hint, title) {
  if (!hint || !title) return false;
  const q = hint
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
  if (q.length === 0) return true;
  const t = title.toLowerCase();
  const hit = q.filter((w) => t.includes(w)).length;
  return hit >= Math.min(4, q.length) && hit / q.length >= 0.6;
}

function s2Headers() {
  const h = { Accept: "application/json", "User-Agent": `paper-oss-ranking/0.1 (mailto:${OPENALEX_MAILTO})` };
  if (S2_API_KEY) h["x-api-key"] = S2_API_KEY;
  return h;
}

/** Semantic Scholar fallback (spec-sanctioned second source). Returns top-1 hit or null. */
async function searchSemanticScholar(title) {
  const url =
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}` +
    `&limit=1&fields=title,authors,year,venue,citationCount,url,externalIds`;
  const j = await fetchJson(url, s2Headers());
  const hit = j.data && j.data[0];
  if (!hit || !titleMatchOk(title, hit.title)) return null;
  const doi = hit.externalIds && hit.externalIds.DOI ? String(hit.externalIds.DOI).toLowerCase() : null;
  return {
    openalex_id: null, // keep existing OpenAlex ID; S2 does not provide it
    doi,
    title: hit.title || null,
    authors: (hit.authors || []).slice(0, 12).map((a) => a && a.name).filter(Boolean),
    year: Number.isInteger(hit.year) ? hit.year : null,
    venue: hit.venue || null,
    cited_by_count: Number.isInteger(hit.citationCount) && hit.citationCount >= 0 ? hit.citationCount : null,
    url: (doi ? `https://doi.org/${doi}` : null) || hit.url || null,
  };
}

function toPaperPatch(work) {
  if (!work || work.__notFound) return null;
  const authors = (work.authorships || [])
    .slice(0, 12)
    .map((a) => a?.author?.display_name)
    .filter(Boolean);
  let venue = work?.primary_location?.source?.display_name || null;
  const url =
    work?.primary_location?.landing_page_url ||
    work?.doi ||
    (work?.id ? work.id.replace("https://openalex.org/", "https://openalex.org/") : null);
  return {
    openalex_id: normalizeOpenAlex(work.id),
    doi: work.doi ? work.doi.replace("https://doi.org/", "").toLowerCase() : null,
    title: work.title || null,
    authors,
    year: Number.isInteger(work.publication_year) ? work.publication_year : null,
    venue,
    cited_by_count:
      Number.isInteger(work.cited_by_count) && work.cited_by_count >= 0 ? work.cited_by_count : null,
    url: url || null,
  };
}

function githubHeaders() {
  const h = { Accept: "application/vnd.github+json", "User-Agent": "paper-oss-ranking" };
  if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

async function fetchRepo(fullName) {
  const j = await fetchJson(`https://api.github.com/repos/${fullName}`, githubHeaders());
  if (j.__notFound) return null;
  let contributors = null;
  try {
    // contributors count via per_page=1 + Link header last page (1 extra request per repo).
    const res = await fetch(`https://api.github.com/repos/${fullName}/contributors?per_page=1&anon=true`, {
      headers: githubHeaders(),
    });
    if (res.ok) {
      const link = res.headers.get("link");
      if (link) {
        const m = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
        contributors = m ? parseInt(m[1], 10) : 1;
      } else {
        const arr = await res.json();
        contributors = Array.isArray(arr) ? arr.length : null;
      }
    }
  } catch {
    contributors = null; // optional field: keep old value on failure
  }
  const [owner, repo] = fullName.split("/");
  return {
    owner,
    repo,
    description: j.description ?? null,
    stars: Number.isInteger(j.stargazers_count) ? j.stargazers_count : null,
    forks: Number.isInteger(j.forks_count) ? j.forks_count : null,
    language: j.language ?? null,
    updated_at: j.updated_at ?? null,
    url: j.html_url || `https://github.com/${fullName}`,
    contributors_count: Number.isInteger(contributors) ? contributors : null,
  };
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const papersPath = join(DATA_DIR, "papers.json");
  const reposPath = join(DATA_DIR, "repos.json");
  const linksPath = join(DATA_DIR, "links.yaml");
  const papers = readJson(papersPath, null);
  const repos = readJson(reposPath, null);
  if (!papers || !repos) throw new Error("data/papers.json or data/repos.json missing");
  const linksYaml = readFileSync(linksPath, "utf8");
  const links = parseLinksYaml(linksYaml);

  let paperHits = 0;
  let repoHits = 0;

  if (!checkOnly) {
    for (const p of papers) {
      try {
        let patch = null;
        if (p.doi) {
          try {
            const work = await fetchWorkByDoi(p.doi);
            // DOI endpoint is exact: a returned record owns that DOI, trust it.
            if (work && !work.__notFound) patch = toPaperPatch(work);
          } catch (e) {
            log(`OpenAlex DOI lookup failed for ${p.doi}: ${e.message}`);
          }
        }
        if (!patch && p.title_hint) {
          try {
            const work = await searchWork(p.title_hint);
            // Search hits must pass the relevance gate (never store a wrong record).
            if (work && titleMatchOk(p.title_hint, work.title)) patch = toPaperPatch(work);
            else if (work) log(`OpenAlex top hit rejected for "${p.title_hint}": "${work.title}"`);
          } catch (e) {
            log(`OpenAlex search failed for "${p.title_hint}": ${e.message}`);
          }
        }
        if (!patch && p.title_hint) {
          try {
            await sleep(S2_DELAY_MS);
            patch = await searchSemanticScholar(p.title_hint);
            if (patch) log(`Semantic Scholar fallback hit for "${p.title_hint}"`);
          } catch (e) {
            log(`Semantic Scholar failed for "${p.title_hint}": ${e.message}`);
          }
        }
        if (patch) {
          // Only overwrite with non-null values; keep key stable.
          if (patch.openalex_id) p.openalex_id = patch.openalex_id;
          if (patch.title) p.title = patch.title;
          if (patch.authors && patch.authors.length) p.authors = patch.authors;
          if (patch.year) p.year = patch.year;
          if (patch.venue) p.venue = patch.venue;
          if (patch.cited_by_count !== null) p.cited_by_count = patch.cited_by_count;
          if (patch.url) p.url = patch.url;
          if (patch.doi && !p.doi) p.doi = patch.doi;
          paperHits++;
        } else {
          log(`No paper data for ${p.key}; keeping existing values`);
        }
      } catch (e) {
        log(`Paper ${p.key} error (kept old values): ${e.message}`);
      }
      await sleep(350);
    }

    for (const r of repos) {
      try {
        const patch = await fetchRepo(r.full_name);
        if (patch) {
          if (patch.description !== null) r.description = patch.description;
          if (patch.stars !== null) r.stars = patch.stars;
          if (patch.forks !== null) r.forks = patch.forks;
          if (patch.language !== null) r.language = patch.language;
          if (patch.updated_at) r.updated_at = patch.updated_at;
          if (patch.url) r.url = patch.url;
          if (patch.contributors_count !== null) r.contributors_count = patch.contributors_count;
          repoHits++;
        } else {
          log(`GitHub repo not found: ${r.full_name}; keeping existing values`);
        }
      } catch (e) {
        log(`Repo ${r.full_name} error (kept old values): ${e.message}`);
      }
      await sleep(400);
    }

    writeJson(papersPath, papers);
    writeJson(reposPath, repos);
    log(`Updated papers ${paperHits}/${papers.length}, repos ${repoHits}/${repos.length}`);
  }

  // Snapshot (always, even in --check? No: only when network ran or snapshots exist)
  const today = todayUTC();
  if (!checkOnly) {
    const snapshot = { date: today, papers: {}, repos: {} };
    for (const p of papers) {
      const k = paperKeyOf(p);
      if (Number.isInteger(p.cited_by_count)) snapshot.papers[k] = p.cited_by_count;
    }
    for (const r of repos) {
      if (Number.isInteger(r.stars)) snapshot.repos[r.full_name] = r.stars;
    }
    mkdirSync(SNAP_DIR, { recursive: true });
    writeJson(join(SNAP_DIR, `${today}.json`), snapshot);
    log(`Snapshot written for ${today}`);
  }

  // Derived artifacts for the frontend.
  const history = buildHistory();
  const meta = { last_updated: today, paper_source: "OpenAlex", oss_source: "GitHub" };
  const errors = validateData(papers, repos, links);
  if (errors.length) {
    console.error("Validation errors:\n- " + errors.join("\n- "));
    process.exitCode = 1;
    return;
  }
  mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  writeJson(join(PUBLIC_DATA_DIR, "papers.json"), papers);
  writeJson(join(PUBLIC_DATA_DIR, "repos.json"), repos);
  writeJson(join(PUBLIC_DATA_DIR, "links.json"), links);
  writeJson(join(PUBLIC_DATA_DIR, "history.json"), history);
  writeJson(join(PUBLIC_DATA_DIR, "meta.json"), meta);
  // Keep a copy of meta/history at data/ level for transparency.
  writeFileSync(join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  log(`Wrote public/data (papers=${papers.length}, repos=${repos.length}, links=${links.length})`);
}

main().catch((e) => {
  console.error("[update-data] FATAL (existing data untouched):", e.message);
  process.exitCode = 1;
});
