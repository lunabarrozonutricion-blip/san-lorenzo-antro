import type {
  Control,
  FiveComponentMasses,
  FiveComponentResults,
  FullAnthropometry,
  FullAnthropometryMeasure,
  FullAnthropometryMeasureKey,
} from "./types";

/*
 * ============================================================
 * MOTOR ANTROPOMÉTRICO
 * FRACCIONAMIENTO CORPORAL EN 5 COMPONENTES
 * D. KERR (1988)
 *
 * Las fórmulas de este archivo fueron reproducidas a partir
 * del Antropogims que estamos usando como referencia.
 *
 * IMPORTANTE:
 * No redondeamos los cálculos intermedios de Kerr.
 * La interfaz decidirá después cuántos decimales mostrar.
 * ============================================================
 */

export const KERR_CALCULATION_VERSION =
  "antropogims-kerr-1988-v1";

/*
 * Antropogims utiliza 3.141 en las correcciones
 * de perímetros, no Math.PI.
 *
 * Lo mantenemos así para poder comparar los
 * resultados exactamente contra el Excel.
 */
const KERR_PI = 3.141;

const WAIST_SKINFOLD_FACTOR = 0.3141;

/* ============================================================
   HERRAMIENTAS GENERALES
============================================================ */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function safeDivide(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (
    numerator == null ||
    denominator == null ||
    denominator === 0
  ) {
    return null;
  }

  const result =
    numerator / denominator;

  return Number.isFinite(result)
    ? result
    : null;
}

function sumNumbers(
  values: Array<number | null>,
): number | null {
  if (
    values.some(
      (value) => value == null,
    )
  ) {
    return null;
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + (value as number),
      0,
    );

  return Number.isFinite(total)
    ? total
    : null;
}

function round(
  value: number,
  decimals: number,
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      (value +
        Number.EPSILON) *
        factor,
    ) / factor
  );
}

/* ============================================================
   SERIES DE MEDICIÓN
============================================================ */

/*
 * Antropogims permite hasta cinco mediciones:
 *
 * serie 1
 * serie 2
 * serie 3
 * serie 4
 * serie 5
 *
 * y calcula:
 *
 * - mediana
 * - desvío estándar
 * - error %
 */

export function calculateMeasureStatistics(
  series: [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ],
): FullAnthropometryMeasure {
  const numericValues =
    series.filter(
      isFiniteNumber,
    );

  let median: number | null =
    null;

  if (
    numericValues.length > 0
  ) {
    const ordered =
      [...numericValues].sort(
        (a, b) => a - b,
      );

    const middle =
      Math.floor(
        ordered.length / 2,
      );

    if (
      ordered.length % 2 === 0
    ) {
      median =
        (
          ordered[
            middle - 1
          ] +
          ordered[middle]
        ) / 2;
    } else {
      median =
        ordered[middle];
    }

    median =
      round(median, 3);
  }

  /*
   * En el Excel original:
   *
   * IF(C6=0,0,STDEVA(...))
   *
   * Es decir:
   * si no hay una segunda medición,
   * muestra desvío 0.
   */
  const secondMeasurement =
    series[1];

  if (
    secondMeasurement == null ||
    secondMeasurement === 0
  ) {
    return {
      series,
      median,
      standardDeviation: 0,
      errorPercent: 0,
    };
  }

  let standardDeviation = 0;

  if (
    numericValues.length > 1
  ) {
    const mean =
      numericValues.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) /
      numericValues.length;

    const variance =
      numericValues.reduce(
        (sum, value) =>
          sum +
          (value - mean) ** 2,
        0,
      ) /
      (numericValues.length -
        1);

    standardDeviation =
      Math.sqrt(variance);
  }

  standardDeviation =
    round(
      standardDeviation,
      3,
    );

  const errorPercent =
    median != null &&
    median !== 0
      ? round(
          (standardDeviation /
            median) *
            100,
          3,
        )
      : 0;

  return {
    series,
    median,
    standardDeviation,
    errorPercent,
  };
}

export function emptyFullMeasure():
  FullAnthropometryMeasure {
  return {
    series: [
      null,
      null,
      null,
      null,
      null,
    ],
    median: null,
    standardDeviation: null,
    errorPercent: null,
  };
}

/*
 * Devuelve el valor que Kerr debe usar.
 *
 * Si el Excel ya trajo una mediana,
 * usamos esa.
 *
 * Si no existe, la calculamos a partir
 * de las series.
 */
export function fullMeasureValue(
  anthropometry:
    Pick<
      FullAnthropometry,
      "measures"
    >,
  key:
    FullAnthropometryMeasureKey,
): number | null {
  const measure =
    anthropometry.measures[
      key
    ];

  if (!measure) {
    return null;
  }

  if (
    isFiniteNumber(
      measure.median,
    )
  ) {
    return measure.median;
  }

  return (
    calculateMeasureStatistics(
      measure.series,
    ).median
  );
}

/* ============================================================
   MEDICIONES NECESARIAS PARA KERR
============================================================ */

export const KERR_REQUIRED_MEASURES:
  FullAnthropometryMeasureKey[] =
  [
    "weight",
    "stature",
    "sittingHeight",

    "biacromial",
    "thoraxTransverse",
    "thoraxAP",
    "biiliocristal",
    "humeral",
    "femoral",

    "head",
    "armRelaxed",
    "forearmMax",
    "thoraxMesosternal",
    "waistMin",
    "thighMax",
    "calfMax",

    "triceps",
    "subscapular",
    "supraespinal",
    "abdominal",
    "thighSkinfold",
    "calfSkinfold",
  ];

export function missingKerrMeasures(
  anthropometry:
    Pick<
      FullAnthropometry,
      "measures"
    >,
) {
  return (
    KERR_REQUIRED_MEASURES.filter(
      (key) =>
        fullMeasureValue(
          anthropometry,
          key,
        ) == null,
    )
  );
}

/* ============================================================
   MASAS
============================================================ */

function emptyMasses():
  FiveComponentMasses {
  return {
    adipose: null,
    muscle: null,
    residual: null,
    bone: null,
    skin: null,
  };
}

function totalMass(
  masses:
    FiveComponentMasses,
): number | null {
  return sumNumbers([
    masses.adipose,
    masses.muscle,
    masses.residual,
    masses.bone,
    masses.skin,
  ]);
}

function massPercentages(
  masses:
    FiveComponentMasses,
  total: number | null,
): FiveComponentMasses {
  if (
    total == null ||
    total === 0
  ) {
    return emptyMasses();
  }

  const percent = (
    value: number | null,
  ) =>
    value == null
      ? null
      : (value / total) *
        100;

  return {
    adipose: percent(
      masses.adipose,
    ),
    muscle: percent(
      masses.muscle,
    ),
    residual: percent(
      masses.residual,
    ),
    bone: percent(
      masses.bone,
    ),
    skin: percent(
      masses.skin,
    ),
  };
}

/* ============================================================
   CÁLCULO PRINCIPAL
============================================================ */

export function calculateFiveComponents(
  anthropometry:
    Pick<
      FullAnthropometry,
      | "measures"
      | "sex"
      | "ageYears"
      | "boneReferenceKg"
    >,
): FiveComponentResults {
  const value = (
    key:
      FullAnthropometryMeasureKey,
  ) =>
    fullMeasureValue(
      anthropometry,
      key,
    );

  /* -------------------------
     DATOS BÁSICOS
  -------------------------- */

  const weight =
    value("weight");

  const stature =
    value("stature");

  const sittingHeight =
    value("sittingHeight");

  /* -------------------------
     PLIEGUES
  -------------------------- */

  const triceps =
    value("triceps");

  const subscapular =
    value("subscapular");

  const supraespinal =
    value("supraespinal");

  const abdominal =
    value("abdominal");

  const thighSkinfold =
    value("thighSkinfold");

  const calfSkinfold =
    value("calfSkinfold");

  const sum6 =
    sumNumbers([
      triceps,
      subscapular,
      supraespinal,
      abdominal,
      thighSkinfold,
      calfSkinfold,
    ]);

  /* ==========================================================
     1. MASA DE LA PIEL
  ========================================================== */

  /*
   * Antropogims:
   *
   * masculino = 2.07
   * femenino  = 1.96
   */
  const skinThickness =
    anthropometry.sex ===
    "male"
      ? 2.07
      : anthropometry.sex ===
          "female"
        ? 1.96
        : null;

  /*
   * Constante de superficie corporal
   * exactamente como aparece en el Excel:
   *
   * masculino -> 68.308
   * femenino  -> 73.074
   * sin sexo y <12 años -> 70.691
   *
   * Aunque la estructura de esta fórmula
   * del Excel es algo particular, la
   * reproducimos para poder validarla.
   */
  const surfaceConstant =
    anthropometry.sex ===
    "male"
      ? 68.308
      : anthropometry.sex ===
          "female"
        ? 73.074
        : anthropometry.ageYears !=
              null &&
            anthropometry.ageYears <
              12
          ? 70.691
          : null;

  let bodySurfaceArea:
    number | null = null;

  if (
    surfaceConstant != null &&
    weight != null &&
    stature != null &&
    weight > 0 &&
    stature > 0
  ) {
    const result =
      (
        surfaceConstant *
        weight ** 0.425 *
        stature ** 0.725
      ) /
      10000;

    bodySurfaceArea =
      Number.isFinite(result)
        ? result
        : null;
  }

  let skinMass:
    number | null = null;

  if (
    bodySurfaceArea != null &&
    skinThickness != null
  ) {
    const result =
      bodySurfaceArea *
      skinThickness *
      1.05;

    skinMass =
      Number.isFinite(result)
        ? result
        : null;
  }

  /* ==========================================================
     2. MASA ADIPOSA
  ========================================================== */

  let adiposeMass:
    number | null = null;

  if (
    sum6 != null &&
    stature != null &&
    stature !== 0
  ) {
    const correction =
      170.18 / stature;

    const adiposeZ =
      (
        sum6 *
          correction -
        116.41
      ) /
      34.79;

    const result =
      (
        adiposeZ *
          5.85 +
        25.6
      ) /
      correction ** 3;

    adiposeMass =
      Number.isFinite(result)
        ? result
        : null;
  }

  /* ==========================================================
     3. MASA MUSCULAR
  ========================================================== */

  const armRelaxed =
    value("armRelaxed");

  const forearmMax =
    value("forearmMax");

  const thighMax =
    value("thighMax");

  const calfMax =
    value("calfMax");

  const thoraxMesosternal =
    value(
      "thoraxMesosternal",
    );

  const correctedArm =
    armRelaxed != null &&
    triceps != null
      ? armRelaxed -
        (triceps *
          KERR_PI) /
          10
      : null;

  const forearm =
    forearmMax;

  const correctedThigh =
    thighMax != null &&
    thighSkinfold != null
      ? thighMax -
        (thighSkinfold *
          KERR_PI) /
          10
      : null;

  const correctedCalf =
    calfMax != null &&
    calfSkinfold != null
      ? calfMax -
        (calfSkinfold *
          KERR_PI) /
          10
      : null;

  const correctedThorax =
    thoraxMesosternal !=
      null &&
    subscapular != null
      ? thoraxMesosternal -
        (subscapular *
          KERR_PI) /
          10
      : null;

  const correctedPerimetersSum =
    sumNumbers([
      correctedArm,
      forearm,
      correctedThigh,
      correctedCalf,
      correctedThorax,
    ]);

  let muscleMass:
    number | null = null;

  if (
    correctedPerimetersSum !=
      null &&
    stature != null &&
    stature !== 0
  ) {
    const correction =
      170.18 / stature;

    const muscleZ =
      (
        correctedPerimetersSum *
          correction -
        207.21
      ) /
      13.74;

    const result =
      (
        muscleZ * 5.4 +
        24.5
      ) /
      correction ** 3;

    muscleMass =
      Number.isFinite(result)
        ? result
        : null;
  }

  /* ==========================================================
     4. MASA RESIDUAL
  ========================================================== */

  const waistMin =
    value("waistMin");

  const thoraxTransverse =
    value(
      "thoraxTransverse",
    );

  const thoraxAP =
    value("thoraxAP");

  const correctedWaist =
    waistMin != null &&
    abdominal != null
      ? waistMin -
        abdominal *
          WAIST_SKINFOLD_FACTOR
      : null;

  const thoraxSum =
    sumNumbers([
      thoraxTransverse,
      thoraxAP,
      correctedWaist,
    ]);

  let residualMass:
    number | null = null;

  if (
    thoraxSum != null &&
    sittingHeight != null &&
    sittingHeight !== 0
  ) {
    const correction =
      89.92 /
      sittingHeight;

    const residualZ =
      (
        thoraxSum *
          correction -
        109.35
      ) /
      7.08;

    const result =
      (
        residualZ *
          1.24 +
        6.1
      ) /
      correction ** 3;

    residualMass =
      Number.isFinite(result)
        ? result
        : null;
  }

  /* ==========================================================
     5. MASA ÓSEA
  ========================================================== */

  const head =
    value("head");

  const biacromial =
    value("biacromial");

  const biiliocristal =
    value("biiliocristal");

  const humeral =
    value("humeral");

  const femoral =
    value("femoral");

  let headBoneMass:
    number | null = null;

  if (head != null) {
    const headZ =
      (head - 56) /
      1.44;

    const result =
      headZ *
        0.18 +
      1.2;

    headBoneMass =
      Number.isFinite(result)
        ? result
        : null;
  }

  const diameterSum =
    biacromial != null &&
    biiliocristal != null &&
    humeral != null &&
    femoral != null
      ? biacromial +
        biiliocristal +
        humeral * 2 +
        femoral * 2
      : null;

  let bodyBoneMass:
    number | null = null;

  if (
    diameterSum != null &&
    stature != null &&
    stature !== 0
  ) {
    const correction =
      170.18 / stature;

    const boneZ =
      (
        diameterSum *
          correction -
        98.88
      ) /
      5.33;

    const result =
      (
        boneZ *
          1.34 +
        6.7
      ) /
      correction ** 3;

    bodyBoneMass =
      Number.isFinite(result)
        ? result
        : null;
  }

  const boneMass =
    headBoneMass != null &&
    bodyBoneMass != null
      ? headBoneMass +
        bodyBoneMass
      : null;

  /* ==========================================================
     MASAS CRUDAS / PESO ESTRUCTURADO
  ========================================================== */

  const rawMassesKg:
    FiveComponentMasses = {
    adipose: adiposeMass,
    muscle: muscleMass,
    residual: residualMass,
    bone: boneMass,
    skin: skinMass,
  };

  const structuredWeightKg =
    totalMass(
      rawMassesKg,
    );

  const rawMassesPercentOfStructured =
    massPercentages(
      rawMassesKg,
      structuredWeightKg,
    );

  const structuredDifferenceKg =
    structuredWeightKg != null &&
    weight != null
      ? structuredWeightKg -
        weight
      : null;

  const structuredDifferencePercent =
    structuredDifferenceKg !=
      null &&
    weight != null &&
    weight !== 0
      ? (
          structuredDifferenceKg /
          weight
        ) *
        100
      : null;

  /* ==========================================================
     PRIMER AJUSTE
     PESO ESTRUCTURADO -> PESO REAL
  ========================================================== */

  let weightAdjustedMassesKg =
    emptyMasses();

  if (
    structuredWeightKg != null &&
    structuredWeightKg !== 0 &&
    structuredDifferenceKg !=
      null
  ) {
    const adjustMass = (
      mass: number | null,
    ): number | null => {
      if (mass == null) {
        return null;
      }

      /*
       * Excel:
       *
       * porcentaje =
       * masa / peso estructurado
       *
       * ajuste =
       * diferencia * porcentaje
       *
       * masa ajustada =
       * masa - ajuste
       */
      const proportion =
        mass /
        structuredWeightKg;

      const adjustment =
        structuredDifferenceKg *
        proportion;

      const result =
        mass -
        adjustment;

      return Number.isFinite(
        result,
      )
        ? result
        : null;
    };

    weightAdjustedMassesKg =
      {
        adipose: adjustMass(
          rawMassesKg.adipose,
        ),
        muscle: adjustMass(
          rawMassesKg.muscle,
        ),
        residual: adjustMass(
          rawMassesKg.residual,
        ),
        bone: adjustMass(
          rawMassesKg.bone,
        ),
        skin: adjustMass(
          rawMassesKg.skin,
        ),
      };
  }

  const weightAdjustedTotal =
    totalMass(
      weightAdjustedMassesKg,
    );

  const weightAdjustedMassesPercent =
    massPercentages(
      weightAdjustedMassesKg,
      weightAdjustedTotal,
    );

  /* ==========================================================
     SEGUNDO AJUSTE
     MASA ÓSEA DE REFERENCIA
  ========================================================== */

  let boneReferenceAdjustedMassesKg:
    FiveComponentMasses | null =
    null;

  let boneReferenceAdjustedMassesPercent:
    FiveComponentMasses | null =
    null;

  const boneReference =
    anthropometry.boneReferenceKg;

  /*
   * Esta parte reproduce las celdas
   * I39:I55 del Antropogims.
   *
   * Solo la hacemos si realmente hay
   * una masa ósea de referencia cargada.
   */
  if (
    boneReference != null &&
    boneReference > 0 &&
    weightAdjustedMassesKg.bone !=
      null &&
    weightAdjustedTotal != null
  ) {
    const currentBone =
      weightAdjustedMassesKg.bone;

    /*
     * I40:
     * MOR - masa ósea actual
     */
    const boneDifference =
      boneReference -
      currentBone;

    /*
     * I41:
     * suma de cuatro masas =
     * peso total ajustado -
     * masa ósea de referencia
     */
    const fourMassReferenceTotal =
      weightAdjustedTotal -
      boneReference;

    if (
      fourMassReferenceTotal !==
      0
    ) {
      const redistribute = (
        mass: number | null,
      ): number | null => {
        if (mass == null) {
          return null;
        }

        /*
         * Exactamente como Antropogims:
         *
         * nuevo porcentaje =
         * masa ajustada /
         * suma de 4 masas
         *
         * masa re-ajustada =
         * masa ajustada -
         * diferencia ósea *
         * nuevo porcentaje
         */
        const percentage =
          mass /
          fourMassReferenceTotal;

        const result =
          mass -
          boneDifference *
            percentage;

        return Number.isFinite(
          result,
        )
          ? result
          : null;
      };

      boneReferenceAdjustedMassesKg =
        {
          adipose:
            redistribute(
              weightAdjustedMassesKg.adipose,
            ),

          muscle:
            redistribute(
              weightAdjustedMassesKg.muscle,
            ),

          residual:
            redistribute(
              weightAdjustedMassesKg.residual,
            ),

          bone:
            boneReference,

          skin:
            redistribute(
              weightAdjustedMassesKg.skin,
            ),
        };

      const finalTotal =
        totalMass(
          boneReferenceAdjustedMassesKg,
        );

      boneReferenceAdjustedMassesPercent =
        massPercentages(
          boneReferenceAdjustedMassesKg,
          finalTotal,
        );
    }
  }

  /* ==========================================================
     ÍNDICES
  ========================================================== */

  const hipMax =
    value("hipMax");

  const bmi =
    weight != null &&
    stature != null &&
    stature !== 0
      ? weight /
        (stature / 100) ** 2
      : null;

  const waistHipRatio =
    waistMin != null &&
    hipMax != null &&
    hipMax !== 0
      ? waistMin /
        hipMax
      : null;

  /*
   * IMO que aparece en la presentación:
   *
   * Masa muscular cruda /
   * Masa ósea cruda
   */
  const muscleBoneIndexRaw =
    safeDivide(
      rawMassesKg.muscle,
      rawMassesKg.bone,
    );

  const adiposeMuscleIndexRaw =
    safeDivide(
      rawMassesKg.adipose,
      rawMassesKg.muscle,
    );

  /*
   * Para el índice ajustado usamos
   * la masa final disponible:
   *
   * 1. re-ajuste óseo, si existe
   * 2. ajuste al peso real
   */
  const finalMasses =
    boneReferenceAdjustedMassesKg ??
    weightAdjustedMassesKg;

  const muscleBoneIndexAdjusted =
    safeDivide(
      finalMasses.muscle,
      finalMasses.bone,
    );

  const adiposeMuscleIndexAdjusted =
    safeDivide(
      finalMasses.adipose,
      finalMasses.muscle,
    );

  return {
    calculationVersion:
      KERR_CALCULATION_VERSION,

    sum6,

    bodySurfaceArea,

    correctedArm,
    forearm,
    correctedThigh,
    correctedCalf,
    correctedThorax,
    correctedWaist,

    rawMassesKg,

    rawMassesPercentOfStructured,

    structuredWeightKg,

    structuredDifferenceKg,

    structuredDifferencePercent,

    weightAdjustedMassesKg,

    weightAdjustedMassesPercent,

    boneReferenceAdjustedMassesKg,

    boneReferenceAdjustedMassesPercent,

    bmi,

    waistHipRatio,

    muscleBoneIndexRaw,

    muscleBoneIndexAdjusted,

    adiposeMuscleIndexRaw,

    adiposeMuscleIndexAdjusted,
  };
}

/* ============================================================
   CONEXIÓN CON EL SEGUIMIENTO HABITUAL
============================================================ */

/*
 * Esto todavía NO guarda nada en la base.
 *
 * Solamente transforma una antropometría completa
 * en los campos que ya conoce el seguimiento
 * habitual.
 *
 * Más adelante lo vamos a usar al tocar:
 *
 * "Guardar evaluación"
 *
 * para que el control habitual se complete
 * automáticamente.
 */

export function controlDataFromFullAnthropometry(
  anthropometry:
    Pick<
      FullAnthropometry,
      "measures"
    >,
): Pick<
  Control,
  | "weight"
  | "triceps"
  | "subscapular"
  | "supraespinal"
  | "abdominal"
  | "thighSkinfold"
  | "calfSkinfold"
  | "armPerimeter"
  | "thighPerimeter"
  | "calfPerimeter"
> {
  return {
    weight:
      fullMeasureValue(
        anthropometry,
        "weight",
      ),

    triceps:
      fullMeasureValue(
        anthropometry,
        "triceps",
      ),

    subscapular:
      fullMeasureValue(
        anthropometry,
        "subscapular",
      ),

    supraespinal:
      fullMeasureValue(
        anthropometry,
        "supraespinal",
      ),

    abdominal:
      fullMeasureValue(
        anthropometry,
        "abdominal",
      ),

    thighSkinfold:
      fullMeasureValue(
        anthropometry,
        "thighSkinfold",
      ),

    calfSkinfold:
      fullMeasureValue(
        anthropometry,
        "calfSkinfold",
      ),

    /*
     * Seguimiento habitual:
     * Brazo = brazo relajado.
     */
    armPerimeter:
      fullMeasureValue(
        anthropometry,
        "armRelaxed",
      ),

    /*
     * Seguimiento habitual:
     * Muslo = muslo máximo.
     */
    thighPerimeter:
      fullMeasureValue(
        anthropometry,
        "thighMax",
      ),

    calfPerimeter:
      fullMeasureValue(
        anthropometry,
        "calfMax",
      ),
  };
}
