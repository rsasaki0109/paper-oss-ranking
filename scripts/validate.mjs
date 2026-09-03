// JSON schema validation (no network).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, readJson, parseLinksYaml, validateData } from "./lib.mjs";

const papers = readJson(join(DATA_DIR, "papers.json"), null);
const repos = readJson(join(DATA_DIR, "repos.json"), null);
const links = parseLinksYaml(readFileSync(join(DATA_DIR, "links.yaml"), "utf8"));
if (!papers || !repos) {
  console.error("Missing data files");
  process.exit(1);
}
const errors = validateData(papers, repos, links);
if (errors.length) {
  console.error("Validation errors:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log(`OK: papers=${papers.length}, repos=${repos.length}, links=${links.length}`);
