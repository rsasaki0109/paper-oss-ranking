import { useMemo, useState } from "react";
import { CATEGORIES, type History, type Paper, type Repo } from "../lib/types";
import { formatCompact, formatDate, formatGrowth, formatInt } from "../lib/format";
import { filterByQuery, growthMap, sortRepos, type RepoSortKey } from "../lib/ranking";

export function OssView({
  repos,
  history,
  paperByRepo,
}: {
  repos: Repo[];
  history: History;
  paperByRepo: Map<string, Paper>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sortKey, setSortKey] = useState<RepoSortKey>("stars");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const g30 = useMemo(() => growthMap(history.repos, 30), [history]);
  const rows = useMemo(() => {
    let r = filterByQuery(repos, query, (x) => `${x.full_name} ${x.description ?? ""}`);
    if (category !== "All") r = r.filter((x) => x.category === category);
    return sortRepos(r, sortKey, g30, dir);
  }, [repos, query, category, sortKey, g30, dir]);

  return (
    <section>
      <h2>OSS by GitHub stars</h2>
      <div className="controls">
        <input
          placeholder="Search repository…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search repositories"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as RepoSortKey)}
          aria-label="Sort repositories"
        >
          <option value="stars">Stars</option>
          <option value="growth30">Star growth (+30d)</option>
          <option value="updated">Recently updated</option>
        </select>
        <button className="theme-btn" onClick={() => setDir(dir === "desc" ? "asc" : "desc")}>
          {dir === "desc" ? "↓ Desc" : "↑ Asc"}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Repository</th>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Stars</th>
              <th style={{ textAlign: "right" }}>+30d</th>
              <th style={{ textAlign: "right" }}>Forks</th>
              <th>Language</th>
              <th>Updated</th>
              <th>Paper</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const g = g30.get(r.full_name) ?? null;
              const paper = paperByRepo.get(r.full_name.toLowerCase());
              return (
                <tr key={r.full_name} className={i < 3 ? `top${i + 1}` : undefined}>
                  <td>{i + 1}</td>
                  <td>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.full_name}
                    </a>
                    <div className="muted small">{r.description ?? ""}</div>
                    {r.contributors_count !== null && (
                      <div className="muted small">{formatInt(r.contributors_count)} contributors</div>
                    )}
                  </td>
                  <td>
                    <span className="badge">{r.category}</span>
                  </td>
                  <td className="num" title={formatInt(r.stars)}>
                    {formatCompact(r.stars)}
                  </td>
                  <td className={`num ${g !== null && g > 0 ? "growth-up" : g === null ? "growth-na" : ""}`}>
                    {formatGrowth(g, true)}
                  </td>
                  <td className="num">{formatCompact(r.forks)}</td>
                  <td className="small">{r.language ?? "—"}</td>
                  <td className="small">{formatDate(r.updated_at)}</td>
                  <td className="small">
                    {paper?.url ? (
                      <a href={paper.url} target="_blank" rel="noreferrer">
                        {paper.title ?? paper.key}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No repositories match the current filters.</div>}
      </div>
      <p className="muted small">
        Star counts by the GitHub API. Growth shows N/A until enough history exists.
      </p>
    </section>
  );
}
