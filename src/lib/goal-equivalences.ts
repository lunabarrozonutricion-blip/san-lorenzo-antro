/**
 * Equivalencias adiposas utilizadas en el planificador de Aplicación C.
 * Son estimaciones del Excel, NO equivalen a la masa adiposa Kerr.
 * No modifica objetivos mensuales existentes.
 */
const REFERENCE_HEIGHT_CM = 170.18;
const SUM6_CENTER = 116.41;
const SUM6_SCALE = 34.79;
const ADIPOSE_CENTER_KG = 25.6;
const ADIPOSE_SCALE_KG = 5.85;

export function zFromSum6(sum6mm: number, heightCm: number): number | null {
  if (!Number.isFinite(sum6mm) || sum6mm < 0 || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  return (sum6mm * REFERENCE_HEIGHT_CM / heightCm - SUM6_CENTER) / SUM6_SCALE;
}

export function sum6FromZ(z: number, heightCm: number): number | null {
  if (!Number.isFinite(z) || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  const result = heightCm / REFERENCE_HEIGHT_CM * (z * SUM6_SCALE + SUM6_CENTER);
  return result >= 0 ? result : null;
}

export function excelAdiposeFromZ(z: number, heightCm: number): number | null {
  if (!Number.isFinite(z) || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  const result = (z * ADIPOSE_SCALE_KG + ADIPOSE_CENTER_KG) / Math.pow(REFERENCE_HEIGHT_CM / heightCm, 3);
  return result >= 0 ? result : null;
}

export function zFromExcelAdipose(kg: number, heightCm: number): number | null {
  if (!Number.isFinite(kg) || kg < 0 || !Number.isFinite(heightCm) || heightCm <= 0) return null;
  return (kg * Math.pow(REFERENCE_HEIGHT_CM / heightCm, 3) - ADIPOSE_CENTER_KG) / ADIPOSE_SCALE_KG;
}

export function adiposeGoalEquivalence(input: { heightCm: number; sum6mm?: number; z?: number; excelAdiposeKg?: number }) {
  const { heightCm, sum6mm, z, excelAdiposeKg } = input;
  const targetZ = sum6mm != null ? zFromSum6(sum6mm, heightCm)
    : z != null && Number.isFinite(z) ? z
    : excelAdiposeKg != null ? zFromExcelAdipose(excelAdiposeKg, heightCm)
    : null;
  return targetZ == null ? null : {
    z: targetZ,
    sum6mm: sum6FromZ(targetZ, heightCm),
    excelAdiposeKg: excelAdiposeFromZ(targetZ, heightCm),
  };
}
