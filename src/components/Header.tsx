import type { ReactNode } from "react";
import type { Meta } from "../lib/types";

export type View = "papers" | "oss" | "linked" | "trending";

export function Header({
  meta,
  view,
  setView,
  theme,
  toggleTheme,
}: {
  meta: Meta;
  view: View;
  setView: (v: View) => void;
  theme: string;
  toggleTheme: () => void;
}) {
  return (
    <header className="site-header">
      <div className="inner">
        <div className="brand">
          <h1>Paper &amp; OSS Ranking</h1>
          <p>Paper &amp; OSS rankings by citations and GitHub stars.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="meta-line">
            <span>Last updated: {meta.last_updated}</span>
            <span>Paper data: {meta.paper_source}</span>
            <span>OSS data: {meta.oss_source}</span>
          </div>
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
      </div>
      <div className="inner" style={{ paddingTop: 0 }}>
        <nav className="tabs" role="tablist" aria-label="Views">
          <Tab current={view} id="papers" label="Papers" setView={setView} />
          <Tab current={view} id="oss" label="OSS" setView={setView} />
          <Tab current={view} id="linked" label="Paper + OSS" setView={setView} />
          <Tab current={view} id="trending" label="Trending" setView={setView} />
        </nav>
      </div>
    </header>
  );
}

function Tab({
  current,
  id,
  label,
  setView,
}: {
  current: View;
  id: View;
  label: ReactNode;
  setView: (v: View) => void;
}) {
  return (
    <button role="tab" aria-selected={current === id} onClick={() => setView(id)}>
      {label}
    </button>
  );
}
