# Contributing

Thanks for helping out! Data-only contributions are especially welcome — you never need to touch the frontend to add a paper, an OSS project, or a mapping.

## Quick paths

### Add a paper

1. Find the DOI (preferred; OpenAlex ID also works).
2. Add an entry to `data/papers.json`:
   ```json
   {
     "key": "10.xxxx/yyyy",
     "openalex_id": null,
     "doi": "10.xxxx/yyyy",
     "title": null,
     "authors": [],
     "year": null,
     "venue": null,
     "cited_by_count": null,
     "url": null,
     "category": "SLAM",
     "title_hint": "Full paper title for fallback search"
   }
   ```
   Leave fetched fields `null` — the daily updater fills them from OpenAlex. Never invent citation counts.
3. Use one of the 10 categories: Robotics, SLAM, Localization, Autonomous Driving, Computer Vision, 3D Vision, VLA, World Models, Gaussian Splatting, NeRF.

### Add an OSS project

1. Confirm the exact `owner/repo`.
2. Add an entry to `data/repos.json` with fetched fields `null` (filled from the GitHub API).

### Fix a paper/OSS mapping

Edit `data/links.yaml`. `paper` must match a `papers.json` DOI/OpenAlex ID, `repo` a `repos.json` full name, `relation` one of `official` | `community`. No fuzzy auto-matching — every link is human-reviewed.

## Validation

```bash
node scripts/validate.mjs
```

CI runs the same check plus lint, tests, and a production build. A PR that only touches `data/` is enough — no frontend changes needed.

## Issue templates

Prefer filing an issue? Use **Add Paper**, **Add OSS**, or **Fix Paper/OSS Mapping** — each asks only for identifiers (DOI / `owner/repo`), never for scraped numbers.

## Code changes

- `npm run lint`, `npm run test`, `npm run build` must pass.
- Keep dependencies minimal; no backend, no database, no Scholar scraping.
