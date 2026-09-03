import { useMemo, useState } from "react";
import { CATEGORIES, type Paper, type Repo } from "../lib/types";
import { formatGrowth, formatInt } from "../lib/format";
import { filterByQuery, growthMap, sortPapers, type PaperSortKey } from "../lib/ranking";
import type { History } from "../lib/types";

export function PapersView({
  papers,
  history,
  codeByPaper,
}: {
  papers: Paper[];
  history: History;
  codeByPaper: Map<string, Repo>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [year, setYear] = useState("All");
  const [sortKey, setSortKey] = useState<PaperSortKey>("citations");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const g30 = useMemo(() => growthMap(history.papers, 30), [history]);
  const years = useMemo(() => {
    const ys = [...new Set(papers.map((p) => p.year).filter((y): y is number => y !== null))].sort(
      (a, b) => b - a,
    );
    return ys;
  }, [papers]);

  const rows = useMemo(() => {
    let r = filterByQuery(papers, query, (p) => `${p.title ?? ""} ${(p.authors || []).join(" ")}`);
    if (category !== "All") r = r.filter((p) => p.category === category);
    if (year !== "All") r = r.filter((p) => String(p.year) === year);
    return sortPapers(r, sortKey, g30, dir);
  }, [papers, query, category, year, sortKey, g30, dir]);

  return (
    <section>
      <h2>Papers by citations</h2>
      <div className="controls">
        <input
          placeholder="Search title or author…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search papers"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
          <option value="All">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as PaperSortKey)}
          aria-label="Sort papers"
        >
          <option value="citations">Citations</option>
          <option value="growth30">Growth (+30d)</option>
          <option value="year">Year</option>
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
              <th>Paper</th>
              <th>Year</th>
              <th>Venue</th>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Citations</th>
              <th style={{ textAlign: "right" }}>+30d</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const g = g30.get(p.key) ?? null;
              const repo = codeByPaper.get(p.key);
              return (
                <tr key={p.key} className={i < 3 ? `top${i + 1}` : undefined}>
                  <td>{i + 1}</td>
                  <td>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer">
                        {p.title ?? p.key}
                      </a>
                    ) : (
                      (p.title ?? p.key)
                    )}
                    <div className="muted small">{(p.authors || []).slice(0, 4).join(", ")}</div>
                  </td>
                  <td>{p.year ?? "—"}</td>
                  <td className="small">{p.venue ?? "—"}</td>
                  <td>
                    <span className="badge">{p.category}</span>
                  </td>
                  <td className="num">{formatInt(p.cited_by_count)}</td>
                  <td className={`num ${g !== null && g > 0 ? "growth-up" : g === null ? "growth-na" : ""}`}>
                    {formatGrowth(g)}
                  </td>
                  <td className="small">
                    {repo ? (
                      <a href={repo.url} target="_blank" rel="noreferrer">
                        {repo.full_name}
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
        {rows.length === 0 && <div className="empty">No papers match the current filters.</div>}
      </div>
      <p className="muted small">
        Citation counts by OpenAlex. Growth shows N/A until enough history exists.
      </p>
    </section>
  );
}
