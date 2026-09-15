import type { Player } from "./types";

/**
 * Referencias históricas "Mejor Sum6 2025".
 *
 * IMPORTANTE: estos datos provienen de un informe PDF que sólo informa
 * Peso y Sum6 por período. NO son controles completos (no tienen los 6
 * pliegues individuales ni una fecha exacta de día), por eso NO se
 * insertan en IndexedDB como controles normales. Son un archivo
 * estático de referencia para comparar contra el control actual.
 */
export interface HistoricalBest2025 {
  /** Apellido normalizado (minúsculas, sin tildes) para matching. */
  key: string;
  /** Nombre legible tal como figura en el informe. */
  label: string;
  /** Período del mejor registro 2025 (ej: "Noviembre 2do control 2025"). */
  period: string;
  weight: number;
  sum6: number;
}

export const HISTORICAL_BEST_2025: HistoricalBest2025[] = [
  { key: "barrera", label: "Barrera", period: "Noviembre 2do control 2025", weight: 77.2, sum6: 75 },
  { key: "coronel sabina", label: "Coronel Sabina", period: "Noviembre 2025", weight: 52.2, sum6: 58.5 },
  { key: "coronel florencia", label: "Coronel Florencia", period: "Septiembre 2025", weight: 55.4, sum6: 76 },
  { key: "gomez", label: "Gomez", period: "Septiembre 2025", weight: 53.2, sum6: 57.5 },
  { key: "molina", label: "Molina", period: "Septiembre 2025", weight: 56.2, sum6: 70 },
  { key: "puentes", label: "Puentes", period: "Noviembre 2do control 2025", weight: 53.6, sum6: 58 },
  { key: "vidal", label: "Vidal", period: "Noviembre 2do control 2025", weight: 65.2, sum6: 63.5 },
  { key: "zacmon", label: "Zacmon", period: "Noviembre 2do control 2025", weight: 55.9, sum6: 51 },
  { key: "pafundi", label: "Pafundi", period: "Noviembre 2do control 2025", weight: 59.0, sum6: 58.5 },
  { key: "sanabria", label: "Sanabria", period: "Noviembre 2do control 2025", weight: 53.1, sum6: 45 },
  { key: "muzio", label: "Muzio", period: "Septiembre 2025", weight: 63.6, sum6: 68 },
  { key: "gonzalez", label: "Gonzalez", period: "Septiembre 2025", weight: 66.5, sum6: 75 },
  { key: "mereles", label: "Mereles", period: "Optimización Agosto 2025", weight: 73.6, sum6: 85 },
  { key: "lopez belen", label: "Lopez Belen", period: "Julio Pretemporada 2025", weight: 60.1, sum6: 75 },
  { key: "salinas", label: "Salinas", period: "Optimización Agosto 2025", weight: 65.3, sum6: 69 },
  { key: "castillo", label: "Castillo", period: "Agosto 2025", weight: 57.7, sum6: 58 },
  // NOTA: "Pereyra" NO se mapea todavía porque en el informe 2025 hay dos
  // posibles jugadoras (Pereyra Maricel y Pereyra Solana). Agregar la
  // entrada aquí cuando se confirme cuál corresponde.
];

/** Normaliza: minúsculas, sin tildes, sin espacios extra. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca la referencia 2025 para una jugadora de la app.
 * Matching tolerante: la clave puede ser apellido solo ("gomez") o
 * apellido + nombre ("coronel sabina"); se considera match si todas las
 * palabras de la clave aparecen en el nombre normalizado de la jugadora.
 */
export function best2025ForPlayer(
  player: Player | null | undefined,
): HistoricalBest2025 | null {
  if (!player?.name) return null;
  const name = normalizeName(player.name);
  const tokens = new Set(name.split(" "));

  for (const ref of HISTORICAL_BEST_2025) {
    const refTokens = ref.key.split(" ");
    if (refTokens.every((t) => tokens.has(t))) return ref;
  }
  return null;
}
