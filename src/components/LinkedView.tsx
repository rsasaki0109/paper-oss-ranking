import { useMemo, useState } from "react";
import type { History, Link, Paper, Repo } from "../lib/types";
import { formatCompact, formatGrowth, formatInt } from "../lib/format";
import {
  growthMap,
  highlyCitedFewerStars,
  highlyStarredFewerCitations,
  joinLinked,
  sortLinked,
  type LinkedSortKey,
} from "../lib/ranking";

export function LinkedView({
  papers,
  repos,
  links,
  history,
}: {
  papers: Paper[];
  repos: Repo[];
  links: Link[];
  history: History;
}) {
  const [sortKey, setSortKey] = useState<LinkedSortKey>("citations");
  const rows = useMemo(() => joinLinked(papers, repos, links), [papers, repos, links]);
  const pg = useMemo(() => growthMap(history.papers, 30), [history]);
  const rg = useMemo(() => growthMap(history.repos, 30), [history]);
  const sorted = useMemo(() => sortLinked(rows, sortKey, pg, rg), [rows, sortKey, pg, rg]);

  const paperGrowthSorted = useMemo(
    () =>
      [...rows]
        .filter((r) => (pg.get(r.paper.key) ?? null) !== null)
        .sort((a, b) => (pg.get(b.paper.key) ?? -1) - (pg.get(a.paper.key) ?? -1))
        .slice(0, 5),
    [rows, pg],
  );
  const repoGrowthSorted = useMemo(
    () =>
      [...rows]
        .filter((r) => (rg.get(r.repo.full_name) ?? null) !== null)
        .sort((a, b) => (rg.get(b.repo.full_name) ?? -1) - (rg.get(a.repo.full_name) ?? -1))
        .slice(0, 5),
    [rows, rg],
  );
  const citedFewStars = useMemo(() => highlyCitedFewerStars(rows, 5), [rows]);
  const starredFewCites = useMemo(() => highlyStarredFewerCitations(rows, 5), [rows]);

  return (
    <section>
      <h2>Paper + OSS</h2>
      <p className="muted">
        Papers joined with their implementations via a human-maintained mapping (<code>data/links.yaml</code>
        ). Citations and stars are always shown as independent metrics — no combined mystery score.
      </p>
      <div className="cards">
        <div className="card">
          <h3>Highly cited, fewer stars</h3>
          {citedFewStars.length === 0 ? (
            <p className="muted small">Not enough data yet.</p>
          ) : (
            <ol>
              {citedFewStars.map((r) => (
                <li key={r.paper.key} className="small">
                  {r.paper.title} ({formatInt(r.paper.cited_by_count)} cites, {formatCompact(r.repo.stars)} ★)
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card">
          <h3>Highly starred, fewer citations</h3>
          {starredFewCites.length === 0 ? (
            <p className="muted small">Not enough data yet.</p>
          ) : (
            <ol>
              {starredFewCites.map((r) => (
                <li key={r.paper.key} className="small">
                  {r.repo.full_name} ({formatCompact(r.repo.stars)} ★, {formatInt(r.paper.cited_by_count)}{" "}
                  cites)
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card">
          <h3>Fastest-growing papers</h3>
          {paperGrowthSorted.length === 0 ? (
            <p className="muted small">N/A until citation history accumulates.</p>
          ) : (
            <ol>
              {paperGrowthSorted.map((r) => (
                <li key={r.paper.key} className="small">
                  {r.paper.title} ({formatGrowth(pg.get(r.paper.key))} / 30d)
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card">
          <h3>Fastest-growing OSS</h3>
          {repoGrowthSorted.length === 0 ? (
            <p className="muted small">N/A until star history accumulates.</p>
          ) : (
            <ol>
              {repoGrowthSorted.map((r) => (
                <li key={r.repo.full_name} className="small">
                  {r.repo.full_name} ({formatGrowth(rg.get(r.repo.full_name), true)} / 30d)
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <div className="controls">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as LinkedSortKey)}
          aria-label="Sort linked rows"
        >
          <option value="citations">Citations</option>
          <option value="stars">Stars</option>
          <option value="paperGrowth">Citation growth</option>
          <option value="repoGrowth">Star growth</option>
          <option value="year">Year</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Paper</th>
              <th style={{ textAlign: "right" }}>Citations</th>
              <th style={{ textAlign: "right" }}>Cite +30d</th>
              <th>Repository</th>
              <th style={{ textAlign: "right" }}>Stars</th>
              <th style={{ textAlign: "right" }}>Star +30d</th>
              <th>Year</th>
              <th>Relation</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const pGrow = pg.get(r.paper.key) ?? null;
              const rGrow = rg.get(r.repo.full_name) ?? null;
              return (
                <tr key={`${r.paper.key}::${r.repo.full_name}`}>
                  <td>
                    {r.paper.url ? (
                      <a href={r.paper.url} target="_blank" rel="noreferrer">
                        {r.paper.title ?? r.paper.key}
                      </a>
                    ) : (
                      (r.paper.title ?? r.paper.key)
                    )}
                    <div className="muted small">{r.paper.category}</div>
                  </td>
                  <td className="num">{formatInt(r.paper.cited_by_count)}</td>
                  <td className="num">{formatGrowth(pGrow)}</td>
                  <td>
                    <a href={r.repo.url} target="_blank" rel="noreferrer">
                      {r.repo.full_name}
                    </a>
                  </td>
                  <td className="num">{formatCompact(r.repo.stars)}</td>
                  <td className="num">{formatGrowth(rGrow, true)}</td>
                  <td>{r.paper.year ?? "—"}</td>
                  <td>
                    <span className="badge">{r.relation}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="empty">No paper–repository links yet.</div>}
      </div>
    </section>
  );
}
