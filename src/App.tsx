import { useEffect, useMemo, useState } from "react";
import { Header, type View } from "./components/Header";
import { PapersView } from "./components/PapersView";
import { OssView } from "./components/OssView";
import { LinkedView } from "./components/LinkedView";
import { TrendingView } from "./components/TrendingView";
import { loadSiteData, type SiteData } from "./lib/data";
import { joinLinked } from "./lib/ranking";

function initialTheme(): string {
  try {
    const saved = localStorage.getItem("por-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [data, setData] = useState<SiteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => {
    const h = window.location.hash.replace("#", "");
    return h === "oss" || h === "linked" || h === "trending" ? (h as View) : "papers";
  });
  const [theme, setTheme] = useState<string>(() => {
    try {
      return initialTheme();
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("por-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    window.location.hash = view === "papers" ? "" : view;
  }, [view]);

  useEffect(() => {
    loadSiteData()
      .then(setData)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  const { codeByPaper, paperByRepo } = useMemo(() => {
    const codeByPaper = new Map();
    const paperByRepo = new Map();
    if (!data) return { codeByPaper, paperByRepo };
    for (const row of joinLinked(data.papers, data.repos, data.links)) {
      if (!codeByPaper.has(row.paper.key)) codeByPaper.set(row.paper.key, row.repo);
      paperByRepo.set(row.repo.full_name.toLowerCase(), row.paper);
    }
    return { codeByPaper, paperByRepo };
  }, [data]);

  return (
    <>
      <Header
        meta={data?.meta ?? { last_updated: "…", paper_source: "OpenAlex", oss_source: "GitHub" }}
        view={view}
        setView={setView}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <main className="container">
        {error && <p role="alert">Failed to load data: {error}</p>}
        {!data && !error && <p className="muted">Loading rankings…</p>}
        {data && (
          <>
            {view === "papers" && (
              <PapersView papers={data.papers} history={data.history} codeByPaper={codeByPaper} />
            )}
            {view === "oss" && (
              <OssView repos={data.repos} history={data.history} paperByRepo={paperByRepo} />
            )}
            {view === "linked" && (
              <LinkedView papers={data.papers} repos={data.repos} links={data.links} history={data.history} />
            )}
            {view === "trending" && (
              <TrendingView papers={data.papers} repos={data.repos} history={data.history} />
            )}
            <footer className="footer">
              <p>
                Paper data: OpenAlex · OSS data: GitHub · Mappings curated in <code>data/links.yaml</code>.
                Growth values show N/A until snapshot history exists.
              </p>
            </footer>
          </>
        )}
      </main>
    </>
  );
}
