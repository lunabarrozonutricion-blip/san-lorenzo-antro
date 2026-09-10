import type { Control, MetricKey } from "./types";
import { METRICS, SKINFOLD_KEYS } from "./types";

const PI = 3.14;

export function sum6(c: Partial<Control>): number | null {
  const values = SKINFOLD_KEYS.map((k) => c[k]);
  if (values.some((v) => v === null || v === undefined || Number.isNaN(v))) return null;
  return round(values.reduce((a, b) => (a as number) + (b as number), 0) as number, 2);
}

function corrected(perimeter: number | null | undefined, skinfold: number | null | undefined) {
  if (perimeter === null || perimeter === undefined) return null;
  if (skinfold === null || skinfold === undefined) return null;
  return round(perimeter - (skinfold / 10) * PI, 2);
}

export function armCorrected(c: Partial<Control>) {
  return corrected(c.armPerimeter, c.triceps);
}
export function thighCorrected(c: Partial<Control>) {
  return corrected(c.thighPerimeter, c.thighSkinfold);
}
export function calfCorrected(c: Partial<Control>) {
  return corrected(c.calfPerimeter, c.calfSkinfold);
}

export function metricValue(c: Partial<Control> | null | undefined, key: MetricKey): number | null {
  if (!c) return null;
  switch (key) {
    case "sum6":
      return sum6(c);
    case "armCorrected":
      return armCorrected(c);
    case "thighCorrected":
      return thighCorrected(c);
    case "calfCorrected":
      return calfCorrected(c);
    default: {
      const v = c[key];
      return v === undefined ? null : v;
    }
  }
}

export function metricDef(key: MetricKey) {
  return METRICS.find((m) => m.key === key)!;
}

export function round(n: number, decimals = 2) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/** Acepta coma o punto decimal. Vacío => null (nunca 0). */
export function parseNum(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(",", ".");
  if (s === "" || s === "-" || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Formato argentino: coma decimal. */
export function fmt(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtDiff(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + fmt(Math.abs(n), decimals);
}

export function diff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return round(a - b, 2);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function sortByDateAsc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}
export function sortByDateDesc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date));
}
