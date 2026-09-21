import * as XLSX from "xlsx";

import {
  calculateMeasureStatistics,
} from "./kerr";

import type {
  AnthropometrySex,
  FullAnthropometry,
  FullAnthropometryMeasureKey,
} from "./types";

/* ============================================================
   IMPORTADOR ANTROPOGIMS
============================================================ */

/*
 * Esta estructura representa lo que logramos
 * extraer del archivo antes de guardarlo.
 */
export interface ParsedAntropogims {
  sourceFileName: string;
  sourceSheetName: string;

  playerName: string | null;

  date: string | null;
  birthDate: string | null;
  ageYears: number | null;

  measurementNumber: number | null;

  sport: string | null;
  physicalActivity: string | null;
  activityType: string | null;

  sex: AnthropometrySex;

  boneReferenceKg: number | null;

  measures:
    FullAnthropometry["measures"];

  warnings: string[];
}

/* ============================================================
   FILAS ORIGINALES DE "PROC DATOS BRUTOS"
============================================================ */

/*
 * Estas filas corresponden exactamente
 * al Antropogims que estamos utilizando.
 *
 * B:F = series 1 a 5.
 */
const MEASURE_ROWS:
  Record<
    FullAnthropometryMeasureKey,
    number
  > = {
    weight: 6,
    stature: 7,
    sittingHeight: 8,

    biacromial: 10,
    thoraxTransverse: 11,
    thoraxAP: 12,
    biiliocristal: 13,
    humeral: 14,
    femoral: 15,

    head: 17,
    armRelaxed: 18,
    armFlexed: 19,
    forearmMax: 20,
    thoraxMesosternal: 21,
    waistMin: 22,
    hipMax: 23,
    thighMax: 24,
    thighMedial: 25,
    calfMax: 26,

    triceps: 28,
    subscapular: 29,
    supraespinal: 30,
    abdominal: 31,
    thighSkinfold: 32,
    calfSkinfold: 33,
  };

/* ============================================================
   HELPERS
============================================================ */

function cellValue(
  sheet: XLSX.WorkSheet,
  address: string,
): unknown {
  return sheet[address]?.v;
}

function textValue(
  sheet: XLSX.WorkSheet,
  address: string,
): string | null {
  const raw =
    cellValue(
      sheet,
      address,
    );

  if (
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  const text =
    String(raw).trim();

  return text === ""
    ? null
    : text;
}

function numberValue(
  sheet: XLSX.WorkSheet,
  address: string,
): number | null {
  const raw =
    cellValue(
      sheet,
      address,
    );

  if (
    raw === null ||
    raw === undefined ||
    raw === ""
  ) {
    return null;
  }

  if (
    typeof raw === "number"
  ) {
    return Number.isFinite(raw)
      ? raw
      : null;
  }

  const normalized =
    String(raw)
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".");

  if (
    normalized === ""
  ) {
    return null;
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function excelDateToISO(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  /*
   * SheetJS con cellDates:true
   * puede devolver Date directamente.
   */
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime(),
    )
  ) {
    const year =
      value.getUTCFullYear();

    const month =
      String(
        value.getUTCMonth() +
          1,
      ).padStart(2, "0");

    const day =
      String(
        value.getUTCDate(),
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /*
   * Algunos .xls/.xlsx devuelven
   * el serial de Excel.
   */
  if (
    typeof value === "number"
  ) {
    const decoded =
      XLSX.SSF.parse_date_code(
        value,
      );

    if (!decoded) {
      return null;
    }

    return `${String(
      decoded.y,
    ).padStart(4, "0")}-${String(
      decoded.m,
    ).padStart(2, "0")}-${String(
      decoded.d,
    ).padStart(2, "0")}`;
  }

  const text =
    String(value).trim();

  /*
   * yyyy-mm-dd
   */
  const iso =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    );

  if (iso) {
    return `${iso[1]}-${iso[2].padStart(
      2,
      "0",
    )}-${iso[3].padStart(
      2,
      "0",
    )}`;
  }

  /*
   * dd/mm/yyyy
   */
  const argentine =
    text.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    );

  if (argentine) {
    return `${argentine[3]}-${argentine[2].padStart(
      2,
      "0",
    )}-${argentine[1].padStart(
      2,
      "0",
    )}`;
  }

  return null;
}

/*
 * Antropogims calcula:
 *
 * (fecha medición - fecha nacimiento) / 365.25
 *
 * Reproducimos exactamente ese criterio.
 */
export function antropogimsDecimalAge(
  birthDate: string | null,
  evaluationDate: string | null,
): number | null {
  if (
    !birthDate ||
    !evaluationDate
  ) {
    return null;
  }

  const birth =
    Date.parse(
      `${birthDate}T00:00:00Z`,
    );

  const evaluation =
    Date.parse(
      `${evaluationDate}T00:00:00Z`,
    );

  if (
    !Number.isFinite(birth) ||
    !Number.isFinite(
      evaluation,
    ) ||
    evaluation < birth
  ) {
    return null;
  }

  const days =
    (evaluation - birth) /
    (1000 *
      60 *
      60 *
      24);

  return (
    Math.round(
      (days / 365.25) *
        1000,
    ) / 1000
  );
}

function parseSex(
  raw: unknown,
): AnthropometrySex {
  if (
    raw === 1 ||
    String(raw)
      .trim()
      .toLowerCase() ===
      "1"
  ) {
    return "male";
  }

  if (
    raw === 2 ||
    String(raw)
      .trim()
      .toLowerCase() ===
      "2"
  ) {
    return "female";
  }

  const text =
    String(
      raw ?? "",
    )
      .trim()
      .toLowerCase();

  if (
    text === "m" ||
    text === "masculino" ||
    text === "hombre"
  ) {
    return "male";
  }

  if (
    text === "f" ||
    text === "femenino" ||
    text === "mujer"
  ) {
    return "female";
  }

  return "unspecified";
}

function parseMeasurementNumber(
  sheet: XLSX.WorkSheet,
): number | null {
  const value =
    numberValue(
      sheet,
      "I1",
    );

  if (
    value == null
  ) {
    return null;
  }

  return Math.trunc(value);
}

/* ============================================================
   VALIDACIÓN DE ARCHIVO
============================================================ */

function findDataSheet(
  workbook:
    XLSX.WorkBook,
): {
  sheetName: string;
  sheet: XLSX.WorkSheet;
} {
  /*
   * Primero buscamos el nombre exacto.
   */
  const exact =
    workbook.SheetNames.find(
      (name) =>
        name
          .trim()
          .toLowerCase() ===
        "proc datos brutos",
    );

  /*
   * Después permitimos pequeñas
   * variaciones del nombre.
   */
  const approximate =
    exact ??
    workbook.SheetNames.find(
      (name) => {
        const normalized =
          name
            .trim()
            .toLowerCase();

        return (
          normalized.includes(
            "datos brutos",
          ) ||
          normalized.includes(
            "proc datos",
          )
        );
      },
    );

  if (!approximate) {
    throw new Error(
      'No encontré la hoja "Proc datos brutos". Verificá que sea un archivo de Antropogims.',
    );
  }

  const sheet =
    workbook.Sheets[
      approximate
    ];

  if (!sheet) {
    throw new Error(
      "No se pudo leer la hoja de datos del archivo.",
    );
  }

  /*
   * Verificaciones simples para evitar
   * interpretar otro Excel como Antropogims.
   */
  const weightLabel =
    textValue(
      sheet,
      "A6",
    );

  const tricepsLabel =
    textValue(
      sheet,
      "A28",
    );

  if (
    !weightLabel
      ?.toLowerCase()
      .includes("peso") ||
    !tricepsLabel
      ?.toLowerCase()
      .includes("tríceps") &&
    !tricepsLabel
      ?.toLowerCase()
      .includes("triceps")
  ) {
    throw new Error(
      "La estructura del Excel no coincide con el formato de Antropogims esperado.",
    );
  }

  return {
    sheetName:
      approximate,
    sheet,
  };
}

/* ============================================================
   MEDICIONES
============================================================ */

function readMeasure(
  sheet: XLSX.WorkSheet,
  row: number,
) {
  const columns = [
    "B",
    "C",
    "D",
    "E",
    "F",
  ];

  const series =
    columns.map(
      (column) =>
        numberValue(
          sheet,
          `${column}${row}`,
        ),
    ) as [
      number | null,
      number | null,
      number | null,
      number | null,
      number | null,
    ];

  return (
    calculateMeasureStatistics(
      series,
    )
  );
}

function readAllMeasures(
  sheet: XLSX.WorkSheet,
): FullAnthropometry["measures"] {
  const measures:
    FullAnthropometry["measures"] =
      {};

  for (
    const [
      key,
      row,
    ] of Object.entries(
      MEASURE_ROWS,
    )
  ) {
    measures[
      key as FullAnthropometryMeasureKey
    ] = readMeasure(
      sheet,
      row,
    );
  }

  return measures;
}

/* ============================================================
   PARSER PRINCIPAL
============================================================ */

export async function parseAntropogimsFile(
  file: File,
): Promise<ParsedAntropogims> {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    extension !== "xls" &&
    extension !== "xlsx" &&
    extension !== "xlsm"
  ) {
    throw new Error(
      "Formato no compatible. Usá un archivo .xls, .xlsx o .xlsm.",
    );
  }

  const buffer =
    await file.arrayBuffer();

  let workbook:
    XLSX.WorkBook;

  try {
    workbook =
      XLSX.read(
        buffer,
        {
          type: "array",

          /*
           * Hace que las fechas sean
           * mucho más fáciles de leer.
           */
          cellDates: true,

          /*
           * Solo necesitamos datos.
           * Las macros no se ejecutan.
           */
          cellFormula: true,
        },
      );
  } catch {
    throw new Error(
      "No se pudo abrir el Excel. Verificá que el archivo no esté dañado.",
    );
  }

  const {
    sheetName,
    sheet,
  } =
    findDataSheet(
      workbook,
    );

  /* -------------------------
     DATOS GENERALES
  -------------------------- */

  /*
   * Layout confirmado en Antropogims:
   *
   * C1 -> deporte
   * F1 -> actividad física
   * I1 -> número de medición
   *
   * B2 -> nombre
   * F2 -> Depo/Recrea
   * I2 -> sexo
   *
   * B3 -> fecha
   * E3 -> fecha nacimiento
   * I3 -> edad calculada por Excel
   */

  const playerName =
    textValue(
      sheet,
      "B2",
    );

  const date =
    excelDateToISO(
      cellValue(
        sheet,
        "B3",
      ),
    );

  const birthDate =
    excelDateToISO(
      cellValue(
        sheet,
        "E3",
      ),
    );

  const sport =
    textValue(
      sheet,
      "C1",
    );

  const physicalActivity =
    textValue(
      sheet,
      "F1",
    );

  const activityType =
    textValue(
      sheet,
      "F2",
    );

  const sex =
    parseSex(
      cellValue(
        sheet,
        "I2",
      ),
    );

  const measurementNumber =
    parseMeasurementNumber(
      sheet,
    );

  /*
   * La masa ósea de referencia
   * es un input opcional en I39.
   */
  const boneReferenceKg =
    numberValue(
      sheet,
      "I39",
    );

  const measures =
    readAllMeasures(
      sheet,
    );

  const ageYears =
    antropogimsDecimalAge(
      birthDate,
      date,
    );

  /* -------------------------
     ADVERTENCIAS
  -------------------------- */

  const warnings: string[] =
    [];

  if (!playerName) {
    warnings.push(
      "El Excel no tiene nombre de deportista.",
    );
  }

  if (!date) {
    warnings.push(
      "No pude detectar la fecha de la evaluación.",
    );
  }

  if (!birthDate) {
    warnings.push(
      "No pude detectar la fecha de nacimiento.",
    );
  }

  if (
    sex === "unspecified"
  ) {
    warnings.push(
      "No pude determinar el sexo desde el Excel.",
    );
  }

  const measureCount =
    Object.values(
      measures,
    ).filter(
      (measure) =>
        measure?.median !=
        null,
    ).length;

  if (
    measureCount === 0
  ) {
    warnings.push(
      "El archivo no contiene mediciones cargadas.",
    );
  }

  return {
    sourceFileName:
      file.name,

    sourceSheetName:
      sheetName,

    playerName,

    date,
    birthDate,
    ageYears,

    measurementNumber,

    sport,
    physicalActivity,
    activityType,

    sex,

    boneReferenceKg,

    measures,

    warnings,
  };
}
