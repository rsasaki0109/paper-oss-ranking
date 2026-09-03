/** Number formatting helpers. Never fabricate values: null/NaN -> "—". */

export function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return trim(n / 1_000_000) + "M";
  if (abs >= 1_000) return trim(n / 1_000) + "k";
  return String(Math.round(n));
}

function trim(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : String(r);
}

/** Growth display: "+820", "+2.3k", or "N/A" when history is missing. */
export function formatGrowth(delta: number | null | undefined, compact = false): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return "N/A";
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "+";
  const abs = Math.abs(delta);
  const body = compact ? formatCompact(abs) : formatInt(abs);
  // Use ASCII hyphen-safe plus sign; keep minus readable.
  void sign;
  if (delta < 0) return `-${body}`;
  return `+${body}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}
