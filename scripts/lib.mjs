// Shared helpers for update-data / build-data / validate (no external deps).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = join(ROOT, "data");
export const PUBLIC_DATA_DIR = join(ROOT, "public", "data");
export const SNAP_DIR = join(DATA_DIR, "snapshots");

export const CATEGORIES = new Set([
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
]);

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Minimal YAML parser for our links.yaml subset:
// top-level list items starting with "- ", followed by "key: value" lines.
export function parseLinksYaml(text) {
  const links = [];
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").replace(/\s+$/, "");
    if (!line.trim()) continue;
    const item = line.match(/^\s*-\s+paper\s*:\s*(.+)\s*$/);
    if (item) {
      if (current) links.push(current);
      current = { paper: strip(item[1]) };
      continue;
    }
    const kv = line.match(/^\s{2,}([A-Za-z_]+)\s*:\s*(.+)?\s*$/);
    if (kv && current) {
      current[kv[1]] = strip(kv[2] ?? "");
      continue;
    }
    const dashKv = line.match(/^\s*-\s+([A-Za-z_]+)\s*:\s*(.+)\s*$/);
    if (dashKv && !current) {
      // "- key: value" single-line items are not used; ignore safely.
      continue;
    }
  }
  if (current) links.push(current);
  return links.filter((l) => l.paper && l.repo && l.relation);
}

function strip(s) {
  return String(s)
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function normalizeOpenAlex(id) {
  if (!id) return null;
  const m = String(id).match(/W\d+/i);
  return m ? m[0].toUpperCase() : String(id).toUpperCase();
}

export function paperKeyOf(p) {
  if (p.doi) return String(p.doi).toLowerCase();
  const n = normalizeOpenAlex(p.openalex_id);
  if (n) return n;
  return String(p.key || "").toLowerCase();
}

/** Build history.json from all snapshots in data/snapshots. */
export function buildHistory() {
  const history = { papers: {}, repos: {} };
  if (!existsSync(SNAP_DIR)) return history;
  const files = readdirSync(SNAP_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  for (const f of files) {
    const date = f.slice(0, 10);
    const snap = readJson(join(SNAP_DIR, f), null);
    if (!snap) continue;
    for (const [k, v] of Object.entries(snap.papers || {})) {
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      (history.papers[k] ||= []).push({ date, value: v });
    }
    for (const [k, v] of Object.entries(snap.repos || {})) {
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      (history.repos[k] ||= []).push({ date, value: v });
    }
  }
  return history;
}

export function validateData(papers, repos, links) {
  const errors = [];
  const paperKeys = new Set();
  for (const [i, p] of papers.entries()) {
    if (!p.key) errors.push(`papers[${i}]: missing key`);
    if (p.key) {
      if (paperKeys.has(String(p.key).toLowerCase())) errors.push(`papers[${i}]: duplicate key ${p.key}`);
      paperKeys.add(String(p.key).toLowerCase());
    }
    if (p.doi) paperKeys.add(String(p.doi).toLowerCase());
    if (p.openalex_id) {
      const n = normalizeOpenAlex(p.openalex_id);
      if (n) paperKeys.add(n);
    }
    if (!p.category || !CATEGORIES.has(p.category))
      errors.push(`papers[${i}]: invalid category ${p.category}`);
    if (p.cited_by_count !== null && !(Number.isInteger(p.cited_by_count) && p.cited_by_count >= 0))
      errors.push(`papers[${i}]: invalid cited_by_count`);
    if (
      p.year !== null &&
      p.year !== undefined &&
      !(Number.isInteger(p.year) && p.year > 1900 && p.year < 2100)
    )
      errors.push(`papers[${i}]: invalid year`);
  }
  const repoNames = new Set(repos.map((r) => String(r.full_name).toLowerCase()));
  for (const [i, r] of repos.entries()) {
    if (!r.full_name || !r.full_name.includes("/")) errors.push(`repos[${i}]: invalid full_name`);
    if (r.stars !== null && !(Number.isInteger(r.stars) && r.stars >= 0))
      errors.push(`repos[${i}]: invalid stars`);
  }
  for (const [i, l] of links.entries()) {
    if (!paperKeys.has(String(l.paper).toLowerCase()) && !paperKeys.has(normalizeOpenAlex(l.paper) || ""))
      errors.push(`links[${i}]: unknown paper ${l.paper}`);
    if (!repoNames.has(String(l.repo).toLowerCase())) errors.push(`links[${i}]: unknown repo ${l.repo}`);
    if (!["official", "community"].includes(l.relation)) errors.push(`links[${i}]: invalid relation`);
  }
  return errors;
}
