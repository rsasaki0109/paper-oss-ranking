import { describe, expect, it } from "vitest";
import { formatCompact, formatDate, formatGrowth, formatInt } from "./format";

describe("format", () => {
  it("formats ints with separators and handles nulls", () => {
    expect(formatInt(1234)).toBe("1,234");
    expect(formatInt(null)).toBe("—");
    expect(formatInt(undefined)).toBe("—");
  });
  it("compacts thousands", () => {
    expect(formatCompact(24100)).toBe("24.1k");
    expect(formatCompact(102000)).toBe("102k");
    expect(formatCompact(null)).toBe("—");
  });
  it("shows N/A for missing growth, never fabricates", () => {
    expect(formatGrowth(null)).toBe("N/A");
    expect(formatGrowth(undefined)).toBe("N/A");
    expect(formatGrowth(820)).toBe("+820");
    expect(formatGrowth(2300, true)).toBe("+2.3k");
  });
  it("formats dates safely", () => {
    expect(formatDate("2024-05-01T12:00:00Z")).toBe("2024-05-01");
    expect(formatDate(null)).toBe("—");
  });
});
