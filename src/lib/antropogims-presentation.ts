import {
  calculateFiveComponents,
  fullMeasureValue,
} from "./kerr";

import type {
  FiveComponentMasses,
  FullAnthropometry,
  FullAnthropometryMeasureKey,
} from "./types";

/*
 * ============================================================
 * PRESENTACIÓN ANTROPOGIMS
 *
 * Este archivo reproduce los cálculos que aparecen en la hoja
 * "Presentación" del Antropogims ORIGINAL.
 *
 * No utiliza como referencia el Excel adaptado de Acuña.
 * ============================================================
 */

export const PHANTOM_REFERENCE_HEIGHT =
  170.18;

type PhantomReference = {
  mean: number;
  sd: number;

  /*
   * true:
   * primero ajusta la medición a 170,18 cm
   * como lo hace la columna "Valor Ajustado"
   * de Antropogims.
   *
   * false:
   * utiliza directamente el valor medido.
   */
  adjusted: boolean;
};

/*
 * ============================================================
 * REFERENCIAS PHANTOM
 *
 * Valores copiados de las fórmulas de la hoja Presentación
 * del Antropogims original.
 * ============================================================
 */

const PHANTOM_REFERENCES:
  Partial<
    Record<
      FullAnthropometryMeasureKey,
      PhantomReference
    >
  > = {
    /* BÁSICOS */

    weight: {
      mean: 64.58,
      sd: 8.6,
      adjusted: true,
    },

    /*
     * Antropogims no calcula
     * Score-Z para talla corporal.
     */

    sittingHeight: {
      mean: 89.92,
      sd: 4.5,
      adjusted: true,
    },

    /* DIÁMETROS */

    biacromial: {
      mean: 38.04,
      sd: 1.92,
      adjusted: true,
    },

    thoraxTransverse: {
      mean: 27.92,
      sd: 1.74,
      adjusted: true,
    },

    thoraxAP: {
      mean: 17.5,
      sd: 1.38,
      adjusted: true,
    },

    biiliocristal: {
      mean: 28.84,
      sd: 1.75,
      adjusted: true,
    },

    humeral: {
      mean: 6.48,
      sd: 0.35,
      adjusted: true,
    },

    femoral: {
      mean: 9.52,
      sd: 0.48,
      adjusted: true,
    },

    /* PERÍMETROS */

    head: {
      mean: 56,
      sd: 1.44,
      adjusted: true,
    },

    armRelaxed: {
      mean: 26.89,
      sd: 2.33,
      adjusted: true,
    },

    armFlexed: {
      mean: 29.41,
      sd: 2.37,
      adjusted: true,
    },

    forearmMax: {
      mean: 25.13,
      sd: 1.41,
      adjusted: true,
    },

    thoraxMesosternal: {
      mean: 87.86,
      sd: 5.18,
      adjusted: true,
    },

    waistMin: {
      mean: 71.91,
      sd: 4.45,
      adjusted: true,
    },

    hipMax: {
      mean: 94.67,
      sd: 5.58,
      adjusted: true,
    },

    thighMax: {
      mean: 55.82,
      sd: 4.23,
      adjusted: true,
    },

    /*
     * IMPORTANTE:
     *
     * La fórmula original de Antropogims
     * usa directamente E29 y NO el valor
     * ajustado F29.
     *
     * Lo reproducimos exactamente así.
     */
    thighMedial: {
      mean: 53.2,
      sd: 4.56,
      adjusted: false,
    },

    calfMax: {
      mean: 35.25,
      sd: 2.3,
      adjusted: true,
    },

    /* PLIEGUES */

    triceps: {
      mean: 15.4,
      sd: 4.47,
      adjusted: true,
    },

    subscapular: {
      mean: 17.2,
      sd: 5.07,
      adjusted: true,
    },

    supraespinal: {
      mean: 15.4,
      sd: 4.47,
      adjusted: true,
    },

    abdominal: {
      mean: 25.4,
      sd: 7.78,
      adjusted: true,
    },

    thighSkinfold: {
      mean: 27,
      sd: 8.33,
      adjusted: true,
    },

    calfSkinfold: {
      mean: 16,
      sd: 4.67,
      adjusted: true,
    },
  };

/* ============================================================
   TIPOS
============================================================ */

export interface AntropogimsAdditionalData {
  waistHipRatio: number | null;
  sum6: number | null;

  muscleBoneIndex:
    number | null;

  adiposeMuscleIndex:
    number | null;

  bmi: number | null;

  sittingHeightStatureRatio:
    number | null;

  bodySurfaceArea:
    number | null;

  bodySurfaceAreaBodyMass:
    number | null;
}

export interface AntropogimsSomatotype {
  skinfoldSum: number | null;

  heightCorrection:
    number | null;

  correctedSkinfoldSum:
    number | null;

  correctedFlexedArm:
    number | null;

  correctedCalf:
    number | null;

  cubeRootWeight:
    number | null;

  heightWeightRatio:
    number | null;

  endomorph:
    number | null;

  mesomorph:
    number | null;

  ectomorph:
    number | null;

  x:
    number | null;

  y:
    number | null;
}

export interface AntropogimsPresentationData {
  adjustedValues:
    Partial<
      Record<
        FullAnthropometryMeasureKey,
        number | null
      >
    >;

  phantomScoreZ:
    Partial<
      Record<
        FullAnthropometryMeasureKey,
        number | null
      >
    >;

  previousValues:
    Partial<
      Record<
        FullAnthropometryMeasureKey,
        number | null
      >
    >;

  measurementDifferences:
    Partial<
      Record<
        FullAnthropometryMeasureKey,
        number | null
      >
    >;

  massesKg:
    FiveComponentMasses;

  massPercentages:
    FiveComponentMasses;

  massScoreZ:
    FiveComponentMasses;

  previousMassesKg:
    FiveComponentMasses | null;

  massDifferencesKg:
    FiveComponentMasses | null;

  totalMassKg:
    number | null;

  totalAdjustedMassKg:
    number | null;

  totalMassScoreZ:
    number | null;

  structuredDifferencePercent:
    number | null;

  additional:
    AntropogimsAdditionalData;

  somatotype:
    AntropogimsSomatotype;
}

/* ============================================================
   HELPERS
============================================================ */

function value(
  anthropometry:
    FullAnthropometry,
  key:
    FullAnthropometryMeasureKey,
) {
  return fullMeasureValue(
    anthropometry,
    key,
  );
}

function divide(
  numerator: number | null,
  denominator: number | null,
) {
  if (
    numerator == null ||
    denominator == null ||
    denominator === 0
  ) {
    return null;
  }

  const result =
    numerator /
    denominator;

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

function difference(
  current:
    number | null,
  previous:
    number | null,
) {
  if (
    current == null ||
    previous == null
  ) {
    return null;
  }

  const result =
    current -
    previous;

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

function sumMasses(
  masses:
    FiveComponentMasses,
): number | null {
  const values = [
    masses.adipose,
    masses.muscle,
    masses.residual,
    masses.bone,
    masses.skin,
  ];

  if (
    values.some(
      (item) =>
        item == null,
    )
  ) {
    return null;
  }

  return values.reduce(
    (total: number, item) =>
      total +
      (item as number),
    0,
  );
}

function nullMasses():
  FiveComponentMasses {
  return {
    adipose: null,
    muscle: null,
    residual: null,
    bone: null,
    skin: null,
  };
}

/* ============================================================
   VALOR AJUSTADO
============================================================ */

/*
 * Antropogims utiliza 170,18 cm como
 * talla PHANTOM de referencia.
 *
 * Las variables lineales se multiplican por:
 *
 * 170,18 / talla
 *
 * El peso se ajusta en tres dimensiones:
 *
 * peso × (170,18 / talla)^3
 *
 * La talla corporal no posee
 * "Valor Ajustado" en la presentación.
 */
export function antropogimsAdjustedValue(
  anthropometry:
    FullAnthropometry,
  key:
    FullAnthropometryMeasureKey,
): number | null {
  const raw =
    value(
      anthropometry,
      key,
    );

  const stature =
    value(
      anthropometry,
      "stature",
    );

  if (
    raw == null ||
    stature == null ||
    stature === 0
  ) {
    return null;
  }

  if (
    key === "stature"
  ) {
    return null;
  }

  const correction =
    PHANTOM_REFERENCE_HEIGHT /
    stature;

  const result =
    key === "weight"
      ? raw *
        correction ** 3
      : raw *
        correction;

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

/* ============================================================
   SCORE-Z PHANTOM
============================================================ */

export function antropogimsPhantomScoreZ(
  anthropometry:
    FullAnthropometry,
  key:
    FullAnthropometryMeasureKey,
): number | null {
  const reference =
    PHANTOM_REFERENCES[
      key
    ];

  if (!reference) {
    return null;
  }

  const sourceValue =
    reference.adjusted
      ? antropogimsAdjustedValue(
          anthropometry,
          key,
        )
      : value(
          anthropometry,
          key,
        );

  if (
    sourceValue == null ||
    reference.sd === 0
  ) {
    return null;
  }

  const result =
    (
      sourceValue -
      reference.mean
    ) /
    reference.sd;

  return Number.isFinite(
    result,
  )
    ? result
    : null;
}

/* ============================================================
   SCORE-Z DEL FRACCIONAMIENTO DE KERR
============================================================ */

function calculateMassScoreZ(
  anthropometry:
    FullAnthropometry,
) {
  const results =
    calculateFiveComponents({
      measures:
        anthropometry.measures,

      sex:
        anthropometry.sex,

      ageYears:
        anthropometry.ageYears,

      boneReferenceKg:
        anthropometry
          .boneReferenceKg,
    });

  const stature =
    value(
      anthropometry,
      "stature",
    );

  const sittingHeight =
    value(
      anthropometry,
      "sittingHeight",
    );

  const thoraxTransverse =
    value(
      anthropometry,
      "thoraxTransverse",
    );

  const thoraxAP =
    value(
      anthropometry,
      "thoraxAP",
    );

  const biacromial =
    value(
      anthropometry,
      "biacromial",
    );

  const biiliocristal =
    value(
      anthropometry,
      "biiliocristal",
    );

  const humeral =
    value(
      anthropometry,
      "humeral",
    );

  const femoral =
    value(
      anthropometry,
      "femoral",
    );

  let adipose:
    number | null = null;

  let muscle:
    number | null = null;

  let residual:
    number | null = null;

  let bone:
    number | null = null;

  /*
   * Masa adiposa:
   *
   * Presentación -> Proc datos brutos B51
   */
  if (
    results.sum6 != null &&
    stature != null &&
    stature !== 0
  ) {
    const correction =
      PHANTOM_REFERENCE_HEIGHT /
      stature;

    adipose =
      (
        results.sum6 *
          correction -
        116.41
      ) /
      34.79;
  }

  /*
   * Masa muscular:
   *
   * Presentación -> Proc datos brutos B61
   */
  const correctedPerimeters = [
    results.correctedArm,
    results.forearm,
    results.correctedThigh,
    results.correctedCalf,
    results.correctedThorax,
  ];

  if (
    correctedPerimeters.every(
      (item) =>
        item != null,
    ) &&
    stature != null &&
    stature !== 0
  ) {
    const correction =
      PHANTOM_REFERENCE_HEIGHT /
      stature;

    const total =
      correctedPerimeters.reduce(
        (sum, item) =>
          sum +
          (item as number),
        0,
      );

    muscle =
      (
        total *
          correction -
        207.21
      ) /
      13.74;
  }

  /*
   * Masa residual:
   *
   * Presentación -> Proc datos brutos B67
   */
  if (
    thoraxTransverse !=
      null &&
    thoraxAP != null &&
    results.correctedWaist !=
      null &&
    sittingHeight != null &&
    sittingHeight !== 0
  ) {
    const correction =
      89.92 /
      sittingHeight;

    residual =
      (
        (
          thoraxTransverse +
          thoraxAP +
          results.correctedWaist
        ) *
          correction -
        109.35
      ) /
      7.08;
  }

  /*
   * Masa ósea:
   *
   * Presentación -> Proc datos brutos B75
   *
   * Este Score-Z corresponde al componente
   * óseo corporal del modelo de Kerr.
   */
  if (
    biacromial != null &&
    biiliocristal != null &&
    humeral != null &&
    femoral != null &&
    stature != null &&
    stature !== 0
  ) {
    const correction =
      PHANTOM_REFERENCE_HEIGHT /
      stature;

    const diameterSum =
      biacromial +
      biiliocristal +
      humeral * 2 +
      femoral * 2;

    bone =
      (
        diameterSum *
          correction -
        98.88
      ) /
      5.33;
  }

  /*
   * El Antropogims original no muestra
   * Score-Z de masa de piel.
   */
  return {
    adipose,
    muscle,
    residual,
    bone,
    skin: null,
  } satisfies FiveComponentMasses;
}

/* ============================================================
   DATOS ADICIONALES
============================================================ */

function calculateAdditionalData(
  anthropometry:
    FullAnthropometry,
): AntropogimsAdditionalData {
  const results =
    calculateFiveComponents({
      measures:
        anthropometry.measures,

      sex:
        anthropometry.sex,

      ageYears:
        anthropometry.ageYears,

      boneReferenceKg:
        anthropometry
          .boneReferenceKg,
    });

  const weight =
    value(
      anthropometry,
      "weight",
    );

  const stature =
    value(
      anthropometry,
      "stature",
    );

  const sittingHeight =
    value(
      anthropometry,
      "sittingHeight",
    );

  /*
   * Antropogims:
   *
   * Presentación F187
   *
   * BSA =
   * peso^0,425 × talla^0,725 × 0,007189
   */
  let bodySurfaceArea:
    number | null = null;

  if (
    weight != null &&
    weight > 0 &&
    stature != null &&
    stature > 0
  ) {
    const result =
      weight ** 0.425 *
      stature ** 0.725 *
      0.007189;

    bodySurfaceArea =
      Number.isFinite(
        result,
      )
        ? result
        : null;
  }

  /*
   * Presentación F190
   *
   * BSA/BM =
   * BSA × 10000 / peso
   */
  const bodySurfaceAreaBodyMass =
    bodySurfaceArea != null &&
    weight != null &&
    weight !== 0
      ? (
          bodySurfaceArea *
          10000
        ) /
        weight
      : null;

  return {
    /*
     * Presentación D173
     */
    waistHipRatio:
      results.waistHipRatio,

    /*
     * Presentación F175
     */
    sum6:
      results.sum6,

    /*
     * Presentación D178
     *
     * masa muscular Kerr /
     * masa ósea Kerr
     */
    muscleBoneIndex:
      results
        .muscleBoneIndexRaw,

    /*
     * Presentación I178
     */
    adiposeMuscleIndex:
      results
        .adiposeMuscleIndexRaw,

    /*
     * Presentación F181
     */
    bmi:
      results.bmi,

    /*
     * Presentación D184
     */
    sittingHeightStatureRatio:
      divide(
        sittingHeight,
        stature,
      ),

    bodySurfaceArea,

    bodySurfaceAreaBodyMass:
      Number.isFinite(
        bodySurfaceAreaBodyMass ??
          Number.NaN,
      )
        ? bodySurfaceAreaBodyMass
        : null,
  };
}

/* ============================================================
   SOMATOTIPO HEATH & CARTER
============================================================ */

function calculateSomatotype(
  anthropometry:
    FullAnthropometry,
): AntropogimsSomatotype {
  const weight =
    value(
      anthropometry,
      "weight",
    );

  const stature =
    value(
      anthropometry,
      "stature",
    );

  const triceps =
    value(
      anthropometry,
      "triceps",
    );

  const subscapular =
    value(
      anthropometry,
      "subscapular",
    );

  const supraespinal =
    value(
      anthropometry,
      "supraespinal",
    );

  const armFlexed =
    value(
      anthropometry,
      "armFlexed",
    );

  const calf =
    value(
      anthropometry,
      "calfMax",
    );

  const calfSkinfold =
    value(
      anthropometry,
      "calfSkinfold",
    );

  const humeral =
    value(
      anthropometry,
      "humeral",
    );

  const femoral =
    value(
      anthropometry,
      "femoral",
    );

  /*
   * Presentación C198
   */
  const skinfoldSum =
    triceps != null &&
    subscapular != null &&
    supraespinal != null
      ? triceps +
        subscapular +
        supraespinal
      : null;

  /*
   * Presentación C199
   */
  const heightCorrection =
    stature != null &&
    stature !== 0
      ? PHANTOM_REFERENCE_HEIGHT /
        stature
      : null;

  /*
   * Presentación C200
   */
  const correctedSkinfoldSum =
    skinfoldSum != null &&
    heightCorrection != null
      ? skinfoldSum *
        heightCorrection
      : null;

  /*
   * Presentación C201
   */
  let endomorph:
    number | null = null;

  if (
    correctedSkinfoldSum !=
    null
  ) {
    const x =
      correctedSkinfoldSum;

    const result =
      -0.7182 +
      0.1451 * x -
      0.00068 * x ** 2 +
      0.0000014 * x ** 3;

    endomorph =
      Number.isFinite(
        result,
      )
        ? result
        : null;
  }

  /*
   * Presentación F198
   *
   * Brazo flexionado corregido =
   * brazo flexionado - tríceps/10
   */
  const correctedFlexedArm =
    armFlexed != null &&
    triceps != null
      ? armFlexed -
        triceps / 10
      : null;

  /*
   * Presentación F199
   */
  const correctedCalf =
    calf != null &&
    calfSkinfold != null
      ? calf -
        calfSkinfold / 10
      : null;

  /*
   * Presentación I198
   */
  const cubeRootWeight =
    weight != null &&
    weight > 0
      ? weight ** 0.33333
      : null;

  /*
   * Presentación I199
   */
  const heightWeightRatio =
    stature != null &&
    cubeRootWeight != null &&
    cubeRootWeight !== 0
      ? stature /
        cubeRootWeight
      : null;

  /*
   * Presentación F201
   */
  let mesomorph:
    number | null = null;

  if (
    humeral != null &&
    femoral != null &&
    correctedFlexedArm !=
      null &&
    correctedCalf != null &&
    stature != null
  ) {
    const result =
      0.858 * humeral +
      0.601 * femoral +
      0.188 *
        correctedFlexedArm +
      0.161 *
        correctedCalf -
      stature * 0.131 +
      4.5;

    mesomorph =
      Number.isFinite(
        result,
      )
        ? result
        : null;
  }

  /*
   * Presentación I201
   */
  let ectomorph:
    number | null = null;

  if (
    heightWeightRatio != null
  ) {
    if (
      heightWeightRatio <=
      38.25
    ) {
      ectomorph = 0.1;
    } else if (
      heightWeightRatio <
      40.75
    ) {
      ectomorph =
        0.463 *
          heightWeightRatio -
        17.63;
    } else {
      ectomorph =
        0.732 *
          heightWeightRatio -
        28.58;
    }
  }

  /*
   * Coordenadas de la somatocarta.
   */
  const x =
    ectomorph != null &&
    endomorph != null
      ? ectomorph -
        endomorph
      : null;

  const y =
    mesomorph != null &&
    ectomorph != null &&
    endomorph != null
      ? 2 *
          mesomorph -
        (
          ectomorph +
          endomorph
        )
      : null;

  return {
    skinfoldSum,

    heightCorrection,

    correctedSkinfoldSum,

    correctedFlexedArm,

    correctedCalf,

    cubeRootWeight,

    heightWeightRatio,

    endomorph,

    mesomorph,

    ectomorph,

    x,

    y,
  };
}

/* ============================================================
   PRESENTACIÓN COMPLETA
============================================================ */

export function calculateAntropogimsPresentation(
  anthropometry:
    FullAnthropometry,
  previous?:
    FullAnthropometry,
): AntropogimsPresentationData {
  const results =
    calculateFiveComponents({
      measures:
        anthropometry.measures,

      sex:
        anthropometry.sex,

      ageYears:
        anthropometry.ageYears,

      boneReferenceKg:
        anthropometry
          .boneReferenceKg,
    });

  const previousResults =
    previous
      ? calculateFiveComponents({
          measures:
            previous.measures,

          sex:
            previous.sex,

          ageYears:
            previous.ageYears,

          boneReferenceKg:
            previous
              .boneReferenceKg,
        })
      : null;

  const adjustedValues:
    AntropogimsPresentationData["adjustedValues"] =
      {};

  const phantomScoreZ:
    AntropogimsPresentationData["phantomScoreZ"] =
      {};

  const previousValues:
    AntropogimsPresentationData["previousValues"] =
      {};

  const measurementDifferences:
    AntropogimsPresentationData["measurementDifferences"] =
      {};

  /*
   * Recorremos todas las mediciones
   * originales del Antropogims.
   */
  const keys =
    Object.keys(
      anthropometry.measures,
    ) as FullAnthropometryMeasureKey[];

  for (
    const key of keys
  ) {
    const currentValue =
      value(
        anthropometry,
        key,
      );

    const previousValue =
      previous
        ? value(
            previous,
            key,
          )
        : null;

    adjustedValues[key] =
      antropogimsAdjustedValue(
        anthropometry,
        key,
      );

    phantomScoreZ[key] =
      antropogimsPhantomScoreZ(
        anthropometry,
        key,
      );

    previousValues[key] =
      previousValue;

    measurementDifferences[key] =
      difference(
        currentValue,
        previousValue,
      );
  }

  /*
   * Igual que la Presentación original:
   *
   * PORCENTAJES:
   * corresponden al primer reajuste.
   *
   * KG:
   * utilizan el resultado final después
   * de la MOR cuando existe.
   */
  const massesKg =
    results
      .boneReferenceAdjustedMassesKg ??
    results.weightAdjustedMassesKg;

  const massPercentages =
    results
      .weightAdjustedMassesPercent;

  const massScoreZ =
    calculateMassScoreZ(
      anthropometry,
    );

  const previousMassesKg =
    previousResults
      ? (
          previousResults
            .boneReferenceAdjustedMassesKg ??
          previousResults
            .weightAdjustedMassesKg
        )
      : null;

  let massDifferencesKg:
    FiveComponentMasses | null =
    null;

  if (
    previousMassesKg
  ) {
    massDifferencesKg = {
      adipose:
        difference(
          massesKg.adipose,
          previousMassesKg.adipose,
        ),

      muscle:
        difference(
          massesKg.muscle,
          previousMassesKg.muscle,
        ),

      residual:
        difference(
          massesKg.residual,
          previousMassesKg.residual,
        ),

      bone:
        difference(
          massesKg.bone,
          previousMassesKg.bone,
        ),

      skin:
        difference(
          massesKg.skin,
          previousMassesKg.skin,
        ),
    };
  }

  const totalMassKg =
    sumMasses(
      massesKg,
    );

  const stature =
    value(
      anthropometry,
      "stature",
    );

  /*
   * Presentación F64:
   *
   * masa total ajustada a PHANTOM.
   */
  const totalAdjustedMassKg =
    totalMassKg != null &&
    stature != null &&
    stature !== 0
      ? totalMassKg *
        (
          PHANTOM_REFERENCE_HEIGHT /
          stature
        ) ** 3
      : null;

  /*
   * Presentación G64.
   */
  const totalMassScoreZ =
    totalAdjustedMassKg != null
      ? (
          totalAdjustedMassKg -
          64.58
        ) /
        8.6
      : null;

  return {
    adjustedValues,

    phantomScoreZ,

    previousValues,

    measurementDifferences,

    massesKg,

    massPercentages,

    massScoreZ,

    previousMassesKg,

    massDifferencesKg,

    totalMassKg,

    totalAdjustedMassKg,

    totalMassScoreZ,

    /*
     * Presentación G65 /
     * Proc datos brutos B82.
     */
    structuredDifferencePercent:
      results
        .structuredDifferencePercent,

    additional:
      calculateAdditionalData(
        anthropometry,
      ),

    somatotype:
      calculateSomatotype(
        anthropometry,
      ),
  };
}

/*
 * Helper por si alguna pantalla necesita
 * una estructura vacía para las masas.
 */
export function emptyPresentationMasses():
  FiveComponentMasses {
  return nullMasses();
}
