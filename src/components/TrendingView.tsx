import { useMemo, useState } from "react";
import type { History, Paper, Repo } from "../lib/types";
import { formatCompact, formatGrowth, formatInt } from "../lib/format";
import { growthMap } from "../lib/ranking";

export function TrendingView({
  papers,
  repos,
  history,
}: {
  papers: Paper[];
  repos: Repo[];
  history: History;
}) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const pg = useMemo(() => growthMap(history.papers, days), [history, days]);
  const rg = useMemo(() => growthMap(history.repos, days), [history, days]);

  const topPapers = useMemo(
    () =>
      papers
        .map((p) => ({ p, g: pg.get(p.key) ?? null }))
        .filter((x) => x.g !== null)
        .sort((a, b) => (b.g as number) - (a.g as number))
        .slice(0, 10),
    [papers, pg],
  );
  const topRepos = useMemo(
    () =>
      repos
        .map((r) => ({ r, g: rg.get(r.full_name) ?? null }))
        .filter((x) => x.g !== null)
        .sort((a, b) => (b.g as number) - (a.g as number))
        .slice(0, 10),
    [repos, rg],
  );

  return (
    <section>
      <h2>Trending</h2>
      <div className="controls">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
          aria-label="Trending period"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <h3>Trending Papers</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Paper</th>
              <th style={{ textAlign: "right" }}>Citations</th>
              <th style={{ textAlign: "right" }}>+{days}d</th>
            </tr>
          </thead>
          <tbody>
            {topPapers.map(({ p, g }, i) => (
              <tr key={p.key} className={i < 3 ? `top${i + 1}` : undefined}>
                <td>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {p.title ?? p.key}
                    </a>
                  ) : (
                    (p.title ?? p.key)
                  )}
                </td>
                <td className="num">{formatInt(p.cited_by_count)}</td>
                <td className={`num ${g !== null && g > 0 ? "growth-up" : ""}`}>{formatGrowth(g)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {topPapers.length === 0 && (
          <div className="empty">
            N/A — not enough citation history yet. Check back after daily snapshots accumulate.
          </div>
        )}
      </div>
      <h3>Trending OSS</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Repository</th>
              <th style={{ textAlign: "right" }}>Stars</th>
              <th style={{ textAlign: "right" }}>+{days}d</th>
            </tr>
          </thead>
          <tbody>
            {topRepos.map(({ r, g }, i) => (
              <tr key={r.full_name} className={i < 3 ? `top${i + 1}` : undefined}>
                <td>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.full_name}
                  </a>
                </td>
                <td className="num">{formatCompact(r.stars)}</td>
                <td className={`num ${g !== null && g > 0 ? "growth-up" : ""}`}>{formatGrowth(g, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {topRepos.length === 0 && (
          <div className="empty">
            N/A — not enough star history yet. Check back after daily snapshots accumulate.
          </div>
        )}
      </div>
    </section>
  );
}
