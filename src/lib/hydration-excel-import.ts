/*
 * Importación de Excel histórico de tests de hidratación.
 * Solo LEE y arma una vista previa; no escribe nada en la base.
 * Formato esperado por hoja: A:D pre entreno, F:I post entreno
 * (jugadora / valor / descripción / observación), encabezados en filas 1-2.
 */
import type { HydrationEntry, HydrationTest, Player } from "./types";
import { normalizeName, resolvePlayerId } from "./hydration";

export const POST_ENTRENO_LABEL = "Post entreno";
export const VALID_MIN = 1000;
export const VALID_MAX = 1040;

export type ImportSide = "pre" | "post";

export interface PreviewRow {
  rowNumber: number;
  rawName: string;
  playerId: number | null;
  playerName: string | null;
  rawValue: string;
  value: number | null;
  invalid: boolean;
  description: string | null;
  observation: string | null;
  duplicateInSheet: boolean;
}

export interface PreviewBlock {
  key: string;
  sheetName: string;
  side: ImportSide;
  date: string; // yyyy-mm-dd o "" si no se pudo deducir
  dateSource: string;
  headerHint: string | null;
  round: number | null;
  rival: string | null;
  rows: PreviewRow[];
  warnings: string[];
  existingTestId: number | null;
}

type Cell = string | number | null | undefined;

const STATUS_WORDS = ["bien hidratada", "deshidratada", "hidratada"];
const HEADER_WORDS = ["jugadora", "jugadoras", "nombre", "apellido", "valor", "pre", "post"];

function text(cell: Cell) {
  if (cell == null) return "";
  return String(cell).trim();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Fecha desde el nombre de hoja. Solo DDMMYYYY completo: no se inventa el año. */
export function dateFromSheetName(name: string): { date: string; source: string } {
  const m8 = name.match(/(?<!\d)(\d{2})(\d{2})(\d{4})(?!\d)/);
  if (m8) {
    const date = validDate(+m8[3], +m8[2], +m8[1]);
    if (date) return { date, source: "Nombre de hoja" };
  }
  const m = name.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?!\d)/);
  if (m) {
    const date = validDate(+m[3], +m[2], +m[1]);
    if (date) return { date, source: "Nombre de hoja" };
  }
  return { date: "", source: "Sin fecha completa: revisar" };
}

function roundRival(name: string) {
  const r = name.match(/FECHA\s*(\d{1,2})/i);
  const v = name.match(/\bVS\.?\s+(.+)$/i);
  return {
    round: r ? Number(r[1]) : null,
    rival: v ? v[1].trim().replace(/\s+/g, " ") : null,
  };
}

function parseNumber(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

function isHeaderName(name: string) {
  const n = normalizeName(name);
  return HEADER_WORDS.some((w) => n === w || n.startsWith(`${w} `)) ||
    /^(pre|post)\s*entren/.test(n);
}

function parseSide(
  rows: Cell[][],
  col: number,
  players: Player[],
): { rows: PreviewRow[]; hint: string | null } {
  const out: PreviewRow[] = [];
  const seen = new Set<number>();
  const hint = [rows[0]?.[col], rows[1]?.[col], rows[0]?.[col + 1], rows[1]?.[col + 1]]
    .map(text)
    .filter(Boolean)
    .join(" · ") || null;

  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const rawName = text(r[col]);
    if (!rawName || isHeaderName(rawName) || parseNumber(rawName) != null) continue;
    const rawValue = text(r[col + 1]);
    const descRaw = text(r[col + 2]);
    const obsRaw = text(r[col + 3]);

    let value: number | null = null;
    let invalid = false;
    let extraObs: string | null = null;
    const num = rawValue ? parseNumber(rawValue) : null;
    if (num != null) {
      if (num >= VALID_MIN && num <= VALID_MAX) value = num;
      else invalid = true;
    } else if (rawValue) {
      extraObs = rawValue; // ej. "Indispuesta" escrito en la columna valor
    }

    const description = descRaw || null;
    const descIsStatus = STATUS_WORDS.includes(normalizeName(descRaw));
    const obsParts = [extraObs, descIsStatus ? null : description, obsRaw || null].filter(
      (x): x is string => !!x,
    );

    const playerId = resolvePlayerId(rawName, players);
    const player = playerId != null ? players.find((p) => p.id === playerId) : undefined;
    const dup = playerId != null && seen.has(playerId);
    if (playerId != null) seen.add(playerId);

    out.push({
      rowNumber: i + 1,
      rawName,
      playerId,
      playerName: player?.name ?? null,
      rawValue,
      value,
      invalid,
      description,
      observation: obsParts.length ? obsParts.join(" · ") : null,
      duplicateInSheet: dup,
    });
  }
  return { rows: out, hint };
}

export function contextKey(t: Pick<HydrationTest, "context" | "customContext">) {
  return t.context === "otro" ? `otro:${normalizeName(t.customContext ?? "")}` : t.context;
}

export function blockContextKey(side: ImportSide) {
  return side === "pre" ? "pre_entreno" : `otro:${normalizeName(POST_ENTRENO_LABEL)}`;
}

export function findExisting(date: string, side: ImportSide, tests: HydrationTest[]) {
  if (!date) return null;
  const k = blockContextKey(side);
  return tests.find((t) => t.date === date && contextKey(t) === k)?.id ?? null;
}

export function buildPreview(
  sheets: { name: string; rows: Cell[][] }[],
  players: Player[],
  tests: HydrationTest[],
): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  for (const sheet of sheets) {
    const { date, source } = dateFromSheetName(sheet.name);
    const { round, rival } = roundRival(sheet.name);
    for (const side of ["pre", "post"] as const) {
      const { rows, hint } = parseSide(sheet.rows, side === "pre" ? 0 : 5, players);
      if (rows.length === 0) continue;
      const warnings: string[] = [];
      if (!date) warnings.push("La hoja no tiene fecha completa (día/mes/año): cargala a mano.");
      if (hint && /\d{1,2}\s*[/.-]\s*\d{1,2}/.test(hint) || (hint && /\b(marzo|abril|mayo|junio|julio)\b/i.test(hint))) {
        warnings.push(`El encabezado interno dice "${hint}". Se usa la fecha del nombre de hoja.`);
      }
      const unmatched = rows.filter((r) => r.playerId == null).length;
      const invalid = rows.filter((r) => r.invalid).length;
      const dups = rows.filter((r) => r.duplicateInSheet).length;
      if (unmatched) warnings.push(`${unmatched} nombre(s) sin jugadora existente: no se importan.`);
      if (invalid) warnings.push(`${invalid} valor(es) fuera de rango ${VALID_MIN}–${VALID_MAX}: se guardan sin valor, con el original en observación.`);
      if (dups) warnings.push(`${dups} jugadora(s) repetida(s) en la hoja: se toma la primera.`);
      const existingTestId = findExisting(date, side, tests);
      if (existingTestId != null) warnings.push("Ya existe un test con esa fecha y contexto: no se importará.");
      blocks.push({
        key: `${sheet.name}|${side}`,
        sheetName: sheet.name,
        side,
        date,
        dateSource: source,
        headerHint: hint,
        round,
        rival,
        rows,
        warnings,
        existingTestId,
      });
    }
  }
  return blocks;
}

export function entriesFromBlock(block: PreviewBlock): HydrationEntry[] {
  return block.rows
    .filter((r) => r.playerId != null && !r.duplicateInSheet)
    .map((r) => ({
      playerId: r.playerId,
      playerName: r.playerName ?? r.rawName,
      value: r.value,
      observation:
        [r.invalid ? `Valor original fuera de rango: ${r.rawValue} (revisar)` : null, r.observation]
          .filter(Boolean)
          .join(" · ") || null,
    }));
}

export function testFromBlock(block: PreviewBlock, now: string): HydrationTest {
  return {
    date: block.date,
    round: block.round,
    rival: block.rival,
    dayType: "sin_especificar",
    context: block.side === "pre" ? "pre_entreno" : "otro",
    customContext: block.side === "pre" ? null : POST_ENTRENO_LABEL,
    entries: entriesFromBlock(block),
    createdAt: now,
    updatedAt: now,
  };
}

export async function readWorkbook(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    }),
  }));
}
