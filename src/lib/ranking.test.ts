import { describe, expect, it } from "vitest";
import {
  growthOver,
  highlyCitedFewerStars,
  highlyStarredFewerCitations,
  joinLinked,
  ranks,
  sortPapers,
  sortRepos,
} from "./ranking";
import type { LinkedRow, Paper, Repo } from "./types";

function paper(over: Partial<Paper> & { key: string }): Paper {
  return {
    openalex_id: null,
    doi: null,
    title: over.key,
    authors: [],
    year: null,
    venue: null,
    cited_by_count: null,
    url: null,
    category: "SLAM",
    ...over,
  };
}

function repo(over: Partial<Repo> & { full_name: string }): Repo {
  return {
    owner: null,
    repo: null,
    description: null,
    stars: null,
    forks: null,
    language: null,
    updated_at: null,
    url: `https://github.com/${over.full_name}`,
    contributors_count: null,
    category: "SLAM",
    ...over,
  };
}

describe("paper data parsing", () => {
  it("sorts by citations with nulls last", () => {
    const rows = [
      paper({ key: "a", cited_by_count: null }),
      paper({ key: "b", cited_by_count: 10 }),
      paper({ key: "c", cited_by_count: 50 }),
    ];
    const sorted = sortPapers(rows, "citations", new Map());
    expect(sorted.map((p) => p.key)).toEqual(["c", "b", "a"]);
  });

  it("sorts by year", () => {
    const rows = [paper({ key: "a", year: 2020 }), paper({ key: "b", year: 2016 })];
    expect(sortPapers(rows, "year", new Map()).map((p) => p.key)).toEqual(["a", "b"]);
  });
});

describe("repository data parsing", () => {
  it("sorts by stars and falls back to name", () => {
    const rows = [repo({ full_name: "b/b", stars: 5 }), repo({ full_name: "a/a", stars: 5 })];
    expect(sortRepos(rows, "stars", new Map()).map((r) => r.full_name)).toEqual(["a/a", "b/b"]);
  });

  it("sorts by recently updated", () => {
    const rows = [
      repo({ full_name: "old/o", stars: 999, updated_at: "2020-01-01T00:00:00Z" }),
      repo({ full_name: "new/n", stars: 1, updated_at: "2024-01-01T00:00:00Z" }),
    ];
    expect(sortRepos(rows, "updated", new Map()).map((r) => r.full_name)).toEqual(["new/n", "old/o"]);
  });
});

describe("growth from snapshots", () => {
  it("computes 30d growth from history", () => {
    const g = growthOver(
      [
        { date: "2024-01-01", value: 100 },
        { date: "2024-01-31", value: 150 },
      ],
      30,
    );
    expect(g).toBe(50);
  });

  it("returns null when history is missing", () => {
    expect(growthOver(undefined, 30)).toBeNull();
    expect(growthOver([{ date: "2024-01-31", value: 150 }], 30)).toBeNull();
    expect(
      growthOver(
        [
          { date: "2024-01-30", value: 100 },
          { date: "2024-01-31", value: 150 },
        ],
        90,
      ),
    ).toBeNull();
  });
});

describe("paper+oss join", () => {
  it("joins via links and skips unknown entries without guessing", () => {
    const papers = [paper({ key: "10.1/abc", doi: "10.1/abc", cited_by_count: 5 })];
    const repos = [repo({ full_name: "o/r", stars: 7 })];
    const rows = joinLinked(papers, repos, [
      { paper: "10.1/abc", repo: "o/r", relation: "official" },
      { paper: "unknown-paper", repo: "o/r", relation: "official" },
      { paper: "10.1/abc", repo: "unknown/repo", relation: "official" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].relation).toBe("official");
  });
});

describe("incomplete data", () => {
  it("handles null titles/authors without crashing", () => {
    const rows = [paper({ key: "x", title: null, authors: [] })];
    expect(() => sortPapers(rows, "citations", new Map())).not.toThrow();
  });
});

describe("ranks", () => {
  it("uses competition ranking and skips nulls", () => {
    expect(ranks([10, 20, 20, null])).toEqual([3, 1, 1, null]);
  });
});

describe("interesting rankings keep metrics independent", () => {
  function linked(cites: number, stars: number): LinkedRow {
    return {
      paper: paper({ key: `p${cites}-${stars}`, cited_by_count: cites }),
      repo: repo({ full_name: `o/${cites}-${stars}`, stars }),
      relation: "official",
    };
  }
  it("finds highly-cited / fewer-stars and vice versa", () => {
    const rows = [
      linked(10000, 10),
      linked(9000, 20),
      linked(8000, 30),
      linked(100, 50000),
      linked(200, 40000),
      linked(300, 30000),
    ];
    const a = highlyCitedFewerStars(rows, 10);
    const b = highlyStarredFewerCitations(rows, 10);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a.every((r) => (r.paper.cited_by_count ?? 0) > 1000)).toBe(true);
    expect(b.every((r) => (r.repo.stars ?? 0) > 1000)).toBe(true);
  });
});
