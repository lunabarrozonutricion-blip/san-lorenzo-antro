export interface Player {
  id?: number;
  name: string;
  position?: string | null;
  birthDate?: string | null;
  active: number; // 1 = activa, 0 = inactiva (indexable en Dexie)
  createdAt: string;
  updatedAt: string;
}

export interface Control {
  id?: number;
  playerId: number;
  date: string; // ISO yyyy-mm-dd
  weight: number | null;
  triceps: number | null;
  subscapular: number | null;
  supraespinal: number | null;
  abdominal: number | null;
  thighSkinfold: number | null;
  calfSkinfold: number | null;
  armPerimeter: number | null;
  thighPerimeter: number | null;
  calfPerimeter: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MetricKey =
  | "weight"
  | "sum6"
  | "triceps"
  | "subscapular"
  | "supraespinal"
  | "abdominal"
  | "thighSkinfold"
  | "calfSkinfold"
  | "armPerimeter"
  | "thighPerimeter"
  | "calfPerimeter"
  | "armCorrected"
  | "thighCorrected"
  | "calfCorrected";

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  group: "principal" | "pliegues" | "perimetros" | "corregidos";
  derived?: boolean;
  decimals: number;
}

export const METRICS: MetricDef[] = [
  { key: "weight", label: "Peso", unit: "kg", group: "principal", decimals: 1 },
  { key: "sum6", label: "Sum 6 pliegues", unit: "mm", group: "principal", derived: true, decimals: 1 },
  { key: "triceps", label: "Tríceps", unit: "mm", group: "pliegues", decimals: 1 },
  { key: "subscapular", label: "Subescapular", unit: "mm", group: "pliegues", decimals: 1 },
  { key: "supraespinal", label: "Supraespinal", unit: "mm", group: "pliegues", decimals: 1 },
  { key: "abdominal", label: "Abdominal", unit: "mm", group: "pliegues", decimals: 1 },
  { key: "thighSkinfold", label: "Muslo", unit: "mm", group: "pliegues", decimals: 1 },
  { key: "calfSkinfold", label: "Pierna", unit: "mm", group: "pliegues", decimals: 1 },
  { key: "armPerimeter", label: "Brazo", unit: "cm", group: "perimetros", decimals: 1 },
  { key: "thighPerimeter", label: "Muslo", unit: "cm", group: "perimetros", decimals: 1 },
  { key: "calfPerimeter", label: "Pantorrilla", unit: "cm", group: "perimetros", decimals: 1 },
  { key: "armCorrected", label: "Brazo corregido", unit: "cm", group: "corregidos", derived: true, decimals: 2 },
  { key: "thighCorrected", label: "Muslo corregido", unit: "cm", group: "corregidos", derived: true, decimals: 2 },
  { key: "calfCorrected", label: "Pantorrilla corregida", unit: "cm", group: "corregidos", derived: true, decimals: 2 },
];

export const GROUP_LABELS: Record<MetricDef["group"], string> = {
  principal: "Generales",
  pliegues: "Pliegues (mm)",
  perimetros: "Perímetros (cm)",
  corregidos: "Perímetros corregidos (cm)",
};

export const SKINFOLD_KEYS = [
  "triceps",
  "subscapular",
  "supraespinal",
  "abdominal",
  "thighSkinfold",
  "calfSkinfold",
] as const;
