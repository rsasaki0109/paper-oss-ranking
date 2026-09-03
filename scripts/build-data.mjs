// Offline build step: regenerate public/data/* from data/* without network calls.
// Used by `npm run build` so GitHub Pages always ships fresh derived artifacts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_DIR,
  PUBLIC_DATA_DIR,
  readJson,
  writeJson,
  todayUTC,
  parseLinksYaml,
  buildHistory,
  validateData,
} from "./lib.mjs";

const papers = readJson(join(DATA_DIR, "papers.json"), null);
const repos = readJson(join(DATA_DIR, "repos.json"), null);
if (!papers || !repos) throw new Error("data/papers.json or data/repos.json missing");
const links = parseLinksYaml(readFileSync(join(DATA_DIR, "links.yaml"), "utf8"));

const errors = validateData(papers, repos, links);
if (errors.length) {
  console.error("Validation errors:\n- " + errors.join("\n- "));
  process.exit(1);
}
const history = buildHistory();
const meta = readJson(join(DATA_DIR, "meta.json"), null) || {
  last_updated: todayUTC(),
  paper_source: "OpenAlex",
  oss_source: "GitHub",
};
writeJson(join(PUBLIC_DATA_DIR, "papers.json"), papers);
writeJson(join(PUBLIC_DATA_DIR, "repos.json"), repos);
writeJson(join(PUBLIC_DATA_DIR, "links.json"), links);
writeJson(join(PUBLIC_DATA_DIR, "history.json"), history);
writeJson(join(PUBLIC_DATA_DIR, "meta.json"), meta);
console.log(
  `[build-data] public/data refreshed (papers=${papers.length}, repos=${repos.length}, links=${links.length})`,
);
