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

export interface ObjectiveTarget {
  playerId: number;
  playerName: string;
  target: number | null;
}

export interface ObjectivePeriod {
  id?: number;
  key: string; // yyyy-mm
  label: string;
  year: number;
  month: number;
  targets: ObjectiveTarget[];
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------
   TEST DE HIDRATACIÓN
---------------------------- */

export type HydrationDayType =
  | "pre_partido"
  | "partido"
  | "sin_especificar";

export type HydrationContext =
  | "pre_entreno"
  | "pre_desayuno"
  | "post_desayuno"
  | "post_cena"
  | "otro";

export interface HydrationEntry {
  /*
   * Puede quedar en null para registros históricos
   * de jugadoras que ya no estén en el plantel actual
   * o cuyo nombre no se pueda vincular automáticamente.
   */
  playerId: number | null;

  /*
   * Guardamos también el nombre tal como estaba
   * al momento del test para no perder el histórico.
   */
  playerName: string;

  /*
   * Valor del test.
   * Ejemplo: 1016, 1022, etc.
   */
  value: number | null;

  /*
   * Ejemplos:
   * Indispuesta, Reserva, No citada, Cx, Qx, etc.
   */
  observation: string | null;
}

export interface HydrationTest {
  id?: number;

  date: string; // yyyy-mm-dd

  /*
   * Fecha/jornada del torneo:
   * Fecha 1, Fecha 2, etc.
   */
  round: number | null;

  rival: string | null;

  /*
   * Día pre partido / Día de partido.
   * Los históricos pueden quedar sin especificar.
   */
  dayType: HydrationDayType;

  /*
   * Pre entreno, pre desayuno,
   * post desayuno, post cena u otro.
   */
  context: HydrationContext;

  /*
   * Solo se usa cuando context === "otro".
   */
  customContext: string | null;

  /*
   * Resultados de todas las jugadoras
   * incluidas en ese test.
   */
  entries: HydrationEntry[];

  createdAt: string;
  updatedAt: string;
}

export const HYDRATION_DAY_TYPES: Array<{
  value: HydrationDayType;
  label: string;
}> = [
  {
    value: "pre_partido",
    label: "Día pre partido",
  },
  {
    value: "partido",
    label: "Día de partido",
  },
  {
    value: "sin_especificar",
    label: "Sin especificar",
  },
];

export const HYDRATION_CONTEXTS: Array<{
  value: HydrationContext;
  label: string;
}> = [
  {
    value: "pre_entreno",
    label: "Pre entreno",
  },
  {
    value: "pre_desayuno",
    label: "Pre desayuno",
  },
  {
    value: "post_desayuno",
    label: "Post desayuno",
  },
  {
    value: "post_cena",
    label: "Post cena",
  },
  {
    value: "otro",
    label: "Otro",
  },
];

/* ---------------------------
   ANTROPOMETRÍA
   SEGUIMIENTO HABITUAL
---------------------------- */

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
  group:
    | "principal"
    | "pliegues"
    | "perimetros"
    | "corregidos";
  derived?: boolean;
  decimals: number;
}

export const METRICS: MetricDef[] = [
  {
    key: "weight",
    label: "Peso",
    unit: "kg",
    group: "principal",
    decimals: 1,
  },
  {
    key: "sum6",
    label: "Sum 6 pliegues",
    unit: "mm",
    group: "principal",
    derived: true,
    decimals: 1,
  },
  {
    key: "triceps",
    label: "Tríceps",
    unit: "mm",
    group: "pliegues",
    decimals: 1,
  },
  {
    key: "subscapular",
    label: "Subescapular",
    unit: "mm",
    group: "pliegues",
    decimals: 1,
  },
  {
    key: "supraespinal",
    label: "Supraespinal",
    unit: "mm",
    group: "pliegues",
    decimals: 1,
  },
  {
    key: "abdominal",
    label: "Abdominal",
    unit: "mm",
    group: "pliegues",
    decimals: 1,
  },
  {
    key: "thighSkinfold",
    label: "Muslo",
    unit: "mm",
    group: "pliegues",
    decimals: 1,
  },
  {
    key: "calfSkinfold",
    label: "Pierna",
    unit: "mm",
    group: "pliegues",
    decimals: 1,
  },
  {
    key: "armPerimeter",
    label: "Brazo",
    unit: "cm",
    group: "perimetros",
    decimals: 1,
  },
  {
    key: "thighPerimeter",
    label: "Muslo",
    unit: "cm",
    group: "perimetros",
    decimals: 1,
  },
  {
    key: "calfPerimeter",
    label: "Pantorrilla",
    unit: "cm",
    group: "perimetros",
    decimals: 1,
  },
  {
    key: "armCorrected",
    label: "Brazo corregido",
    unit: "cm",
    group: "corregidos",
    derived: true,
    decimals: 2,
  },
  {
    key: "thighCorrected",
    label: "Muslo corregido",
    unit: "cm",
    group: "corregidos",
    derived: true,
    decimals: 2,
  },
  {
    key: "calfCorrected",
    label: "Pantorrilla corregida",
    unit: "cm",
    group: "corregidos",
    derived: true,
    decimals: 2,
  },
];

export const GROUP_LABELS: Record<
  MetricDef["group"],
  string
> = {
  principal: "Generales",
  pliegues: "Pliegues (mm)",
  perimetros: "Perímetros (cm)",
  corregidos:
    "Perímetros corregidos (cm)",
};

export const SKINFOLD_KEYS = [
  "triceps",
  "subscapular",
  "supraespinal",
  "abdominal",
  "thighSkinfold",
  "calfSkinfold",
] as const;

/* =========================================
   ANTROPOMETRÍA COMPLETA
   FRACCIONAMIENTO EN 5 COMPONENTES
   D. KERR / ANTROPOGIMS
========================================= */

export type FullAnthropometrySource =
  | "manual"
  | "antropogims";

export type AnthropometrySex =
  | "female"
  | "male"
  | "unspecified";

export type FullAnthropometryGroup =
  | "basicos"
  | "diametros"
  | "perimetros"
  | "pliegues";

/*
 * Son exactamente las mediciones que encontramos
 * en la hoja "Proc datos brutos" de Antropogims.
 *
 * Algunas no participan directamente del cálculo
 * de Kerr, pero igualmente las conservamos para
 * no perder información histórica del Excel.
 */
export type FullAnthropometryMeasureKey =
  /* Datos básicos */
  | "weight"
  | "stature"
  | "sittingHeight"

  /* Diámetros */
  | "biacromial"
  | "thoraxTransverse"
  | "thoraxAP"
  | "biiliocristal"
  | "humeral"
  | "femoral"

  /* Perímetros */
  | "head"
  | "armRelaxed"
  | "armFlexed"
  | "forearmMax"
  | "thoraxMesosternal"
  | "waistMin"
  | "hipMax"
  | "thighMax"
  | "thighMedial"
  | "calfMax"

  /* Pliegues */
  | "triceps"
  | "subscapular"
  | "supraespinal"
  | "abdominal"
  | "thighSkinfold"
  | "calfSkinfold";

/*
 * Campos de la antropometría completa que también
 * existen en el seguimiento habitual.
 *
 * Después vamos a usar este vínculo para que una
 * evaluación completa alimente automáticamente
 * Evolución, Historial, Informe, etc.
 */
export type FullAnthropometryControlKey =
  | "weight"
  | "triceps"
  | "subscapular"
  | "supraespinal"
  | "abdominal"
  | "thighSkinfold"
  | "calfSkinfold"
  | "armPerimeter"
  | "thighPerimeter"
  | "calfPerimeter";

/*
 * Antropogims permite hasta cinco repeticiones de
 * una misma medición.
 *
 * Guardamos las cinco series originales y también
 * la mediana, el desvío y el error porcentual.
 *
 * De esta forma, al importar un Excel no perdemos
 * ninguna toma original.
 */
export interface FullAnthropometryMeasure {
  series: [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];

  median: number | null;

  standardDeviation: number | null;

  errorPercent: number | null;
}

export interface FullAnthropometryMeasureDef {
  key: FullAnthropometryMeasureKey;
  label: string;
  unit: "kg" | "cm" | "mm";
  group: FullAnthropometryGroup;

  /*
   * true = participa directamente del
   * fraccionamiento corporal de Kerr.
   */
  usedInKerr: boolean;

  /*
   * Si existe, esta medición se copia también
   * al seguimiento antropométrico habitual.
   */
  controlKey?: FullAnthropometryControlKey;
}

export const FULL_ANTHROPOMETRY_MEASURES:
  FullAnthropometryMeasureDef[] = [
    /* -----------------
       DATOS BÁSICOS
    ------------------ */

    {
      key: "weight",
      label: "Peso bruto",
      unit: "kg",
      group: "basicos",
      usedInKerr: true,
      controlKey: "weight",
    },
    {
      key: "stature",
      label: "Talla corporal",
      unit: "cm",
      group: "basicos",
      usedInKerr: true,
    },
    {
      key: "sittingHeight",
      label: "Talla sentado",
      unit: "cm",
      group: "basicos",
      usedInKerr: true,
    },

    /* -----------------
       DIÁMETROS
    ------------------ */

    {
      key: "biacromial",
      label: "Biacromial",
      unit: "cm",
      group: "diametros",
      usedInKerr: true,
    },
    {
      key: "thoraxTransverse",
      label: "Tórax transverso",
      unit: "cm",
      group: "diametros",
      usedInKerr: true,
    },
    {
      key: "thoraxAP",
      label: "Tórax antero-posterior",
      unit: "cm",
      group: "diametros",
      usedInKerr: true,
    },
    {
      key: "biiliocristal",
      label: "Bi-iliocrestídeo",
      unit: "cm",
      group: "diametros",
      usedInKerr: true,
    },
    {
      key: "humeral",
      label: "Humeral (biepicondilar)",
      unit: "cm",
      group: "diametros",
      usedInKerr: true,
    },
    {
      key: "femoral",
      label: "Femoral (biepicondilar)",
      unit: "cm",
      group: "diametros",
      usedInKerr: true,
    },

    /* -----------------
       PERÍMETROS
    ------------------ */

    {
      key: "head",
      label: "Cabeza",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
    },
    {
      key: "armRelaxed",
      label: "Brazo relajado",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
      controlKey: "armPerimeter",
    },
    {
      key: "armFlexed",
      label: "Brazo flexionado en tensión",
      unit: "cm",
      group: "perimetros",
      usedInKerr: false,
    },
    {
      key: "forearmMax",
      label: "Antebrazo máximo",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
    },
    {
      key: "thoraxMesosternal",
      label: "Tórax mesoesternal",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
    },
    {
      key: "waistMin",
      label: "Cintura mínima",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
    },
    {
      key: "hipMax",
      label: "Cadera máxima",
      unit: "cm",
      group: "perimetros",
      usedInKerr: false,
    },
    {
      key: "thighMax",
      label: "Muslo máximo",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
      controlKey: "thighPerimeter",
    },
    {
      key: "thighMedial",
      label: "Muslo medial",
      unit: "cm",
      group: "perimetros",
      usedInKerr: false,
    },
    {
      key: "calfMax",
      label: "Pantorrilla máxima",
      unit: "cm",
      group: "perimetros",
      usedInKerr: true,
      controlKey: "calfPerimeter",
    },

    /* -----------------
       PLIEGUES
    ------------------ */

    {
      key: "triceps",
      label: "Tríceps",
      unit: "mm",
      group: "pliegues",
      usedInKerr: true,
      controlKey: "triceps",
    },
    {
      key: "subscapular",
      label: "Subescapular",
      unit: "mm",
      group: "pliegues",
      usedInKerr: true,
      controlKey: "subscapular",
    },
    {
      key: "supraespinal",
      label: "Supraespinal",
      unit: "mm",
      group: "pliegues",
      usedInKerr: true,
      controlKey: "supraespinal",
    },
    {
      key: "abdominal",
      label: "Abdominal",
      unit: "mm",
      group: "pliegues",
      usedInKerr: true,
      controlKey: "abdominal",
    },
    {
      key: "thighSkinfold",
      label: "Muslo medial",
      unit: "mm",
      group: "pliegues",
      usedInKerr: true,
      controlKey: "thighSkinfold",
    },
    {
      key: "calfSkinfold",
      label: "Pantorrilla",
      unit: "mm",
      group: "pliegues",
      usedInKerr: true,
      controlKey: "calfSkinfold",
    },
  ];

export const FULL_ANTHROPOMETRY_GROUP_LABELS:
  Record<
    FullAnthropometryGroup,
    string
  > = {
    basicos: "Datos básicos",
    diametros: "Diámetros (cm)",
    perimetros: "Perímetros (cm)",
    pliegues: "Pliegues cutáneos (mm)",
  };

/*
 * Las cinco masas utilizadas por Kerr.
 *
 * Mantenerlas juntas nos permite manejar
 * fácilmente kg, porcentajes, comparación
 * anterior y gráficos de evolución.
 */
export interface FiveComponentMasses {
  adipose: number | null;
  muscle: number | null;
  residual: number | null;
  bone: number | null;
  skin: number | null;
}

/*
 * Resultados calculados por nuestra app.
 *
 * Vamos a validar estas fórmulas contra
 * Antropogims antes de usarlas visualmente.
 */
export interface FiveComponentResults {
  /*
   * Permite saber con qué versión de las
   * ecuaciones se calculó un registro histórico.
   */
  calculationVersion: string;

  /* Suma de los seis pliegues */
  sum6: number | null;

  /* Superficie corporal usada para piel */
  bodySurfaceArea: number | null;

  /* -------------------------
     PERÍMETROS CORREGIDOS
  -------------------------- */

  correctedArm: number | null;
  forearm: number | null;
  correctedThigh: number | null;
  correctedCalf: number | null;
  correctedThorax: number | null;
  correctedWaist: number | null;

  /* -------------------------
     MASAS ORIGINALES KERR
  -------------------------- */

  rawMassesKg: FiveComponentMasses;

  /*
   * Porcentaje de cada masa sobre el
   * "peso estructurado" calculado.
   *
   * Es equivalente a las proporciones que
   * utiliza Antropogims antes del ajuste.
   */
  rawMassesPercentOfStructured:
    FiveComponentMasses;

  /*
   * Suma de las cinco masas estimadas
   * independientemente.
   */
  structuredWeightKg: number | null;

  /*
   * Peso estructurado - peso medido.
   */
  structuredDifferenceKg: number | null;

  structuredDifferencePercent:
    number | null;

  /* -------------------------
     AJUSTE AL PESO REAL
  -------------------------- */

  /*
   * Antropogims distribuye proporcionalmente
   * la diferencia entre el peso estructurado
   * y el peso real.
   *
   * Estas masas deben sumar el peso medido.
   */
  weightAdjustedMassesKg:
    FiveComponentMasses;

  weightAdjustedMassesPercent:
    FiveComponentMasses;

  /* -------------------------
     AJUSTE ÓSEO OPCIONAL
  -------------------------- */

  /*
   * El Excel original posee además una
   * "Masa ósea de referencia".
   *
   * Si se carga una referencia, Antropogims
   * vuelve a redistribuir las otras cuatro
   * masas. Si no existe referencia, estos
   * campos pueden quedar en null.
   */
  boneReferenceAdjustedMassesKg:
    FiveComponentMasses | null;

  boneReferenceAdjustedMassesPercent:
    FiveComponentMasses | null;

  /* -------------------------
     ÍNDICES
  -------------------------- */

  bmi: number | null;

  waistHipRatio: number | null;

  /*
   * IMO = masa muscular / masa ósea
   */
  muscleBoneIndexRaw: number | null;

  muscleBoneIndexAdjusted:
    number | null;

  /*
   * Masa adiposa / masa muscular
   */
  adiposeMuscleIndexRaw:
    number | null;

  adiposeMuscleIndexAdjusted:
    number | null;
}

/*
 * Un registro de esta tabla representa
 * UNA evaluación antropométrica completa
 * de UNA jugadora en UNA fecha.
 */
export interface FullAnthropometry {
  id?: number;

  playerId: number;

  date: string; // yyyy-mm-dd

  /*
   * N.º de medición que figura en
   * Antropogims, si existe.
   */
  measurementNumber: number | null;

  /*
   * Datos generales que también aparecen
   * arriba de la hoja Proc datos brutos.
   */
  sport: string | null;

  physicalActivity: string | null;

  activityType: string | null;

  sex: AnthropometrySex;

  /*
   * Snapshot de la fecha de nacimiento.
   * Aunque también esté en Player, nos sirve
   * para conservar exactamente el dato con
   * el que se hizo esa antropometría.
   */
  birthDate: string | null;

  /*
   * Edad calculada/usada en esa evaluación.
   */
  ageYears: number | null;

  /*
   * Todas las mediciones originales:
   * series 1 a 5 + mediana + desvío + error.
   */
  measures: Partial<
    Record<
      FullAnthropometryMeasureKey,
      FullAnthropometryMeasure
    >
  >;

  /*
   * Input opcional que existe en Antropogims
   * para realizar el segundo ajuste de masas.
   */
  boneReferenceKg: number | null;

  /*
   * Resultado completo de Kerr.
   *
   * Inicialmente puede quedar null hasta que
   * agreguemos y validemos el motor de cálculo.
   */
  results: FiveComponentResults | null;

  /*
   * Cuando guardemos una evaluación completa,
   * crearemos o actualizaremos también el
   * Control habitual correspondiente.
   *
   * Este ID nos permite saber que ambos
   * registros pertenecen a la misma medición.
   */
  linkedControlId: number | null;

  /*
   * Cómo ingresó la evaluación.
   */
  source: FullAnthropometrySource;

  /*
   * Información del archivo original para
   * poder rastrear importaciones históricas.
   */
  sourceFileName: string | null;

  sourceSheetName: string | null;

  /*
   * Nombre tal como aparecía dentro del Excel.
   * Nos sirve para revisar vinculaciones.
   */
  sourcePlayerName: string | null;

  notes: string | null;

  createdAt: string;
  updatedAt: string;
}

/* ---------------------------
   PESAJES
---------------------------- */

export type WeightCondition =
  | "normal"
  | "indispuesta"
  | "seleccion"
  | "reserva"
  | "ausente"
  | "otro";

export interface WeightRecord {
  id?: number;

  playerId: number;
  date: string;

  // Puede quedar vacío si, por ejemplo, estuvo ausente.
  weight: number | null;

  // Contexto de la medición.
  // "indispuesta" NO impide cargar peso.
  condition: WeightCondition;

  notes: string | null;

  createdAt: string;
  updatedAt: string;
}

export const WEIGHT_CONDITIONS: Array<{
  value: WeightCondition;
  label: string;
}> = [
  {
    value: "normal",
    label: "Normal",
  },
  {
    value: "indispuesta",
    label: "Indispuesta",
  },
  {
    value: "seleccion",
    label: "Selección",
  },
  {
    value: "reserva",
    label: "Reserva",
  },
  {
    value: "ausente",
    label: "Ausente",
  },
  {
    value: "otro",
    label: "Otro",
  },
];
