import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Plus,
  Printer,
  Ruler,
  Scale,
  Search,
  Trash2,
  UserRound,
  Utensils,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import {
  fmtDate,
  todayISO,
} from "@/lib/calc";
import { upsertPlayer } from "@/lib/db";
import {
  useControls,
  useFullAnthropometries,
  usePlayers,
  useWeightRecords,
} from "@/lib/hooks";

export const Route =
  createFileRoute("/intercambios")({
    component: () => (
      <ClientOnly>
        <ExchangePlansPage />
      </ClientOnly>
    ),
  });

type WeightCandidate = {
  value: number;
  date: string;
  source: string;
};

type HeightCandidate = {
  value: number;
  date: string;
  source: string;
};

type Sex = "F" | "M";

type ExchangeGroupKey =
  | "almidones"
  | "legumbres"
  | "frutas_azucar"
  | "vegetales"
  | "lacteos_desc"
  | "lacteos_parcial"
  | "lacteos_enteros"
  | "proteinas_desgrasadas"
  | "proteinas_bajas"
  | "proteinas_moderadas"
  | "proteinas_altas"
  | "grasas";

type ExchangeGroup = {
  key: ExchangeGroupKey;
  label: string;
  short: string;
  carbs: number;
  protein: number;
  fat: number;
  kcal: number;
};

type MealKey =
  | "desayuno"
  | "media_manana"
  | "almuerzo"
  | "media_tarde"
  | "merienda"
  | "cena";

type PlanLine = {
  id: string;
  groupKey: ExchangeGroupKey;
  displayLabel: string;
  amount: number;
  note: string;
};

type MealLines = Record<
  MealKey,
  PlanLine[]
>;

const EXCHANGE_GROUPS:
  ExchangeGroup[] = [
    {
      key: "almidones",
      label: "Almidones",
      short: "ALM",
      carbs: 15,
      protein: 2.5,
      fat: 0.5,
      kcal: 80,
    },
    {
      key: "legumbres",
      label: "Legumbres",
      short: "LEG",
      carbs: 15,
      protein: 7,
      fat: 1,
      kcal: 97,
    },
    {
      key: "frutas_azucar",
      label: "Frutas y azúcar",
      short: "FR & AZ",
      carbs: 15,
      protein: 0,
      fat: 0,
      kcal: 60,
    },
    {
      key: "vegetales",
      label: "Vegetales",
      short: "VEG",
      carbs: 5,
      protein: 2,
      fat: 0,
      kcal: 25,
    },
    {
      key: "lacteos_desc",
      label: "Lácteos descremados",
      short: "LAC DESC",
      carbs: 12,
      protein: 8,
      fat: 3,
      kcal: 90,
    },
    {
      key: "lacteos_parcial",
      label:
        "Lácteos parcialmente descremados",
      short: "LAC P.DESC",
      carbs: 12,
      protein: 8,
      fat: 5,
      kcal: 120,
    },
    {
      key: "lacteos_enteros",
      label: "Lácteos enteros",
      short: "LAC ENT",
      carbs: 12,
      protein: 8,
      fat: 8,
      kcal: 150,
    },
    {
      key: "proteinas_desgrasadas",
      label: "Proteínas desgrasadas",
      short: "PROT DESGR",
      carbs: 0,
      protein: 7,
      fat: 0,
      kcal: 35,
    },
    {
      key: "proteinas_bajas",
      label:
        "Proteínas bajas en grasa",
      short: "PROT BG",
      carbs: 0,
      protein: 7,
      fat: 3,
      kcal: 55,
    },
    {
      key: "proteinas_moderadas",
      label:
        "Proteínas moderadas en grasa",
      short: "PROT MG",
      carbs: 0,
      protein: 7,
      fat: 5,
      kcal: 75,
    },
    {
      key: "proteinas_altas",
      label:
        "Proteínas altas en grasa",
      short: "PROT AG",
      carbs: 0,
      protein: 7,
      fat: 8,
      kcal: 100,
    },
    {
      key: "grasas",
      label: "Grasas",
      short: "GRASAS",
      carbs: 0,
      protein: 0,
      fat: 5,
      kcal: 45,
    },
  ];

const MEALS: Array<{
  key: MealKey;
  label: string;
}> = [
  {
    key: "desayuno",
    label: "Desayuno",
  },
  {
    key: "media_manana",
    label: "½ mañana",
  },
  {
    key: "almuerzo",
    label: "Almuerzo",
  },
  {
    key: "media_tarde",
    label: "½ tarde",
  },
  {
    key: "merienda",
    label: "Merienda",
  },
  {
    key: "cena",
    label: "Cena",
  },
];

const PLAN_GROUP_OPTIONS: Array<{
  value: string;
  groupKey: ExchangeGroupKey;
  label: string;
}> = [
  {
    value: "almidones",
    groupKey: "almidones",
    label: "Almidones",
  },
  {
    value: "legumbres",
    groupKey: "legumbres",
    label: "Legumbres",
  },
  {
    value: "frutas_azucar",
    groupKey: "frutas_azucar",
    label: "Frutas y azúcares",
  },
  {
    value: "frutas",
    groupKey: "frutas_azucar",
    label: "Frutas",
  },
  {
    value: "azucares",
    groupKey: "frutas_azucar",
    label: "Azúcares",
  },
  {
    value: "vegetales",
    groupKey: "vegetales",
    label: "Vegetales",
  },
  {
    value: "lacteos_desc",
    groupKey: "lacteos_desc",
    label: "Lácteos descremados",
  },
  {
    value: "lacteos_parcial",
    groupKey: "lacteos_parcial",
    label:
      "Lácteos parcialmente descremados",
  },
  {
    value: "lacteos_enteros",
    groupKey: "lacteos_enteros",
    label: "Lácteos enteros",
  },
  {
    value: "proteinas_desgrasadas",
    groupKey:
      "proteinas_desgrasadas",
    label: "Proteínas desgrasadas",
  },
  {
    value: "proteinas_bajas",
    groupKey: "proteinas_bajas",
    label:
      "Proteínas bajas en grasa",
  },
  {
    value: "proteinas_moderadas",
    groupKey:
      "proteinas_moderadas",
    label:
      "Proteínas moderadas en grasa",
  },
  {
    value: "proteinas_altas",
    groupKey: "proteinas_altas",
    label:
      "Proteínas altas en grasa",
  },
  {
    value: "grasas",
    groupKey: "grasas",
    label: "Grasas",
  },
];

const AMOUNT_OPTIONS = [
  0.25,
  0.5,
  0.75,
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  4.5,
  5,
  5.5,
  6,
];

const FA_PRESETS = [
  {
    level: "A",
    female: 1.3,
    male: 1.3,
  },
  {
    level: "B",
    female: 1.5,
    male: 1.6,
  },
  {
    level: "C",
    female: 1.6,
    male: 1.7,
  },
  {
    level: "D",
    female: 1.9,
    male: 2.1,
  },
  {
    level: "E",
    female: 2.2,
    male: 2.4,
  },
];

const QUICK_GUIDE = [
  {
    title: "Lácteos descremados",
    text:
      "1 IC: 1 vaso de leche descremada (200 cc), 1 pote de yogur de 200 cc o 1 vaso de yogur bebible de 200 cc.",
  },
  {
    title: "Almidones · almuerzo",
    text:
      "1 IC: 100 g cocidos, 3 cucharadas soperas o 1 puño de arroz, quinoa, fideos, ñoquis, polenta, cuscús; también 100 g de papa, batata o choclo.",
  },
  {
    title: "Almidones · desayuno",
    text:
      "1 IC: 1 rebanada de pan, 3 galletas de arroz, 2 vainillas, 10 crackers de arroz o 1 turrón. Para granola, avena, copos de maíz o tutucas: 30 g.",
  },
  {
    title: "Frutas",
    text:
      "1 IC: 100 g de fruta. Ejemplos de la guía: 1 manzana chica, ½ banana grande o 1 banana chica, 1 kiwi, 10 uvas, 1 durazno, 1 mandarina o naranja chica.",
  },
  {
    title: "Vegetales",
    text:
      "1 IC: 100 g de ensalada, 1 taza de hojas crudas, 1 taza de puré de vegetales o ½ taza de hojas cocidas.",
  },
  {
    title: "Proteínas",
    text:
      "La guía separa desgrasadas, bajas, moderadas y altas en grasa. Como referencia: 3 IC ≈ 90 g y 4 IC ≈ 120 g de carne, pollo o pescado.",
  },
  {
    title: "Azúcares",
    text:
      "1 IC: 1 cucharada sopera de azúcar, miel o mermelada; 2 cubos de 2×2 de batata/membrillo; 8 gomitas o ¼ taza de pasas.",
  },
  {
    title: "Grasas",
    text:
      "1 IC: 1 cucharadita tipo té de aceite, 5–6 almendras, 8–10 aceitunas, 1 cucharada de coco rallado, 1 cucharadita de semillas o una porción equivalente de palta/frutos secos.",
  },
];

function emptyPortions():
  Record<
    ExchangeGroupKey,
    number
  > {
  return {
    almidones: 0,
    legumbres: 0,
    frutas_azucar: 0,
    vegetales: 0,
    lacteos_desc: 0,
    lacteos_parcial: 0,
    lacteos_enteros: 0,
    proteinas_desgrasadas: 0,
    proteinas_bajas: 0,
    proteinas_moderadas: 0,
    proteinas_altas: 0,
    grasas: 0,
  };
}

function emptyMeals():
  MealLines {
  return {
    desayuno: [],
    media_manana: [],
    almuerzo: [],
    media_tarde: [],
    merienda: [],
    cena: [],
  };
}

function parseNumber(
  value: string,
): number | null {
  const normalized =
    value
      .trim()
      .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function inputNumber(
  value: number | null,
) {
  return value == null
    ? ""
    : String(value);
}

function calculateAge(
  birthDate?: string | null,
  referenceDate?: string | null,
): number | null {
  if (!birthDate) {
    return null;
  }

  const reference =
    referenceDate || todayISO();

  const birth =
    new Date(
      `${birthDate}T12:00:00`,
    );

  const current =
    new Date(
      `${reference}T12:00:00`,
    );

  if (
    Number.isNaN(
      birth.getTime(),
    ) ||
    Number.isNaN(
      current.getTime(),
    )
  ) {
    return null;
  }

  const milliseconds =
    current.getTime() -
    birth.getTime();

  if (milliseconds < 0) {
    return null;
  }

  const years =
    milliseconds /
    (365.2425 *
      24 *
      60 *
      60 *
      1000);

  return (
    Math.round(
      years * 10,
    ) / 10
  );
}

function formatNumber(
  value: number | null,
  decimals = 1,
) {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString(
    "es-AR",
    {
      minimumFractionDigits:
        decimals,
      maximumFractionDigits:
        decimals,
    },
  );
}

function roundTo(
  value: number,
  decimals = 1,
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      value * factor,
    ) / factor
  );
}

function lineId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getGroup(
  key: ExchangeGroupKey,
) {
  return EXCHANGE_GROUPS.find(
    (group) =>
      group.key === key,
  )!;
}

function ExchangePlansPage() {
  const players =
    usePlayers();

  const [search, setSearch] =
    useState("");

  const [
    selectedPlayerId,
    setSelectedPlayerId,
  ] =
    useState<number | null>(
      null,
    );

  const [planDate, setPlanDate] =
    useState(todayISO());

  const [weight, setWeight] =
    useState("");

  const [height, setHeight] =
    useState("");

  const [ageInput, setAgeInput] =
    useState("");

  const [sex, setSex] =
    useState<Sex>("F");

  const [
    activityFactor,
    setActivityFactor,
  ] = useState("1.5");

  const [
    adjustmentOne,
    setAdjustmentOne,
  ] = useState("0");

  const [
    adjustmentTwo,
    setAdjustmentTwo,
  ] = useState("0");

  const [
    carbsPerKg,
    setCarbsPerKg,
  ] = useState("");

  const [
    proteinPerKg,
    setProteinPerKg,
  ] = useState("");

  const [
    portions,
    setPortions,
  ] = useState<
    Record<
      ExchangeGroupKey,
      number
    >
  >(() => emptyPortions());

  const [
    meals,
    setMeals,
  ] =
    useState<MealLines>(
      () => emptyMeals(),
    );

  const [
    planNotes,
    setPlanNotes,
  ] = useState("");

  const [
    showMacroTable,
    setShowMacroTable,
  ] = useState(false);

  const controls =
    useControls(
      selectedPlayerId,
    );

  const weightRecords =
    useWeightRecords(
      selectedPlayerId,
    );

  const fullAnthropometries =
    useFullAnthropometries(
      selectedPlayerId,
    );

  const selectedPlayer =
    useMemo(
      () =>
        (players ?? []).find(
          (player) =>
            player.id ===
            selectedPlayerId,
        ),
      [
        players,
        selectedPlayerId,
      ],
    );

  const filteredPlayers =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return [];
      }

      return (
        players ?? []
      )
        .filter(
          (player) =>
            player.active ===
              1 &&
            player.name
              .toLowerCase()
              .includes(text),
        )
        .slice(0, 8);
    }, [players, search]);

  const latestWeight =
    useMemo(() => {
      if (
        selectedPlayerId ==
        null
      ) {
        return null;
      }

      const candidates:
        WeightCandidate[] =
        [];

      for (
        const record of
        weightRecords ?? []
      ) {
        if (
          record.weight !=
          null
        ) {
          candidates.push({
            value:
              record.weight,
            date: record.date,
            source:
              "Pesajes",
          });
        }
      }

      for (
        const control of
        controls ?? []
      ) {
        if (
          control.weight !=
          null
        ) {
          candidates.push({
            value:
              control.weight,
            date: control.date,
            source:
              "Control antropométrico",
          });
        }
      }

      for (
        const anthropometry of
        fullAnthropometries ??
        []
      ) {
        const value =
          anthropometry
            .measures
            .weight
            ?.median;

        if (
          value != null
        ) {
          candidates.push({
            value,
            date:
              anthropometry.date,
            source:
              "Antropometría completa",
          });
        }
      }

      return (
        candidates.sort(
          (a, b) =>
            b.date.localeCompare(
              a.date,
            ),
        )[0] ?? null
      );
    }, [
      selectedPlayerId,
      weightRecords,
      controls,
      fullAnthropometries,
    ]);

  const latestHeight =
    useMemo(() => {
      if (
        selectedPlayerId ==
        null
      ) {
        return null;
      }

      const candidates:
        HeightCandidate[] =
        [];

      for (
        const anthropometry of
        fullAnthropometries ??
        []
      ) {
        const value =
          anthropometry
            .measures
            .stature
            ?.median;

        if (
          value != null
        ) {
          candidates.push({
            value,
            date:
              anthropometry.date,
            source:
              "Antropometría completa",
          });
        }
      }

      return (
        candidates.sort(
          (a, b) =>
            b.date.localeCompare(
              a.date,
            ),
        )[0] ?? null
      );
    }, [
      selectedPlayerId,
      fullAnthropometries,
    ]);

  /*
   * Si la ficha de la jugadora no tiene
   * fecha de nacimiento, usamos la más
   * reciente cargada en una antropometría
   * completa.
   */
  const fallbackBirthDate =
    useMemo(() => {
      if (
        selectedPlayer?.birthDate
      ) {
        return null;
      }

      for (
        const anthropometry of
        fullAnthropometries ?? []
      ) {
        if (
          anthropometry.birthDate
        ) {
          return anthropometry.birthDate;
        }
      }

      return null;
    }, [
      selectedPlayer?.birthDate,
      fullAnthropometries,
    ]);

  const effectiveBirthDate =
    selectedPlayer?.birthDate ||
    fallbackBirthDate;

  /*
   * Persistimos el respaldo una sola vez
   * por jugadora, sin pisar un valor
   * existente.
   */
  const persistedBirthDateFor =
    useRef<number | null>(null);

  useEffect(() => {
    if (
      !selectedPlayer ||
      selectedPlayer.id == null ||
      selectedPlayer.birthDate ||
      !fallbackBirthDate
    ) {
      return;
    }

    if (
      persistedBirthDateFor.current ===
      selectedPlayer.id
    ) {
      return;
    }

    persistedBirthDateFor.current =
      selectedPlayer.id;

    void upsertPlayer({
      ...selectedPlayer,
      birthDate: fallbackBirthDate,
    }).catch((error) => {
      persistedBirthDateFor.current =
        null;
      console.warn(
        "No se pudo guardar la fecha de nacimiento en la ficha.",
        error,
      );
    });
  }, [
    selectedPlayer,
    fallbackBirthDate,
  ]);

  const calculatedAge =
    calculateAge(
      effectiveBirthDate,
      planDate,
    );

  useEffect(() => {
    if (
      selectedPlayerId ==
      null
    ) {
      setWeight("");
      setHeight("");
      setAgeInput("");

      return;
    }

    setWeight(
      latestWeight
        ? String(
            latestWeight.value,
          )
        : "",
    );

    setHeight(
      latestHeight
        ? String(
            latestHeight.value,
          )
        : "",
    );

    setAgeInput(
      inputNumber(
        calculatedAge,
      ),
    );
  }, [
    selectedPlayerId,
    latestWeight?.value,
    latestHeight?.value,
    calculatedAge,
  ]);

  const weightValue =
    parseNumber(weight);

  const heightValue =
    parseNumber(height);

  const ageValue =
    parseNumber(ageInput);

  const activityFactorValue =
    parseNumber(
      activityFactor,
    );

  const adjustmentOneValue =
    parseNumber(
      adjustmentOne,
    ) ?? 0;

  const adjustmentTwoValue =
    parseNumber(
      adjustmentTwo,
    ) ?? 0;

  const carbsPerKgValue =
    parseNumber(
      carbsPerKg,
    );

  const proteinPerKgValue =
    parseNumber(
      proteinPerKg,
    );

  const basalMetabolism =
    useMemo(() => {
      if (
        weightValue == null ||
        heightValue == null ||
        ageValue == null
      ) {
        return null;
      }

      if (sex === "M") {
        return (
          66 +
          13.7 * weightValue +
          5 * heightValue -
          6.8 * ageValue
        );
      }

      return (
        655 +
        9.7 * weightValue +
        1.8 * heightValue -
        4.7 * ageValue
      );
    }, [
      weightValue,
      heightValue,
      ageValue,
      sex,
    ]);

  const totalEnergy =
    basalMetabolism != null &&
    activityFactorValue !=
      null
      ? basalMetabolism *
        activityFactorValue
      : null;

  const prescription =
    totalEnergy != null
      ? totalEnergy +
        adjustmentOneValue +
        adjustmentTwoValue
      : null;

  const targetCarbs =
    weightValue != null &&
    carbsPerKgValue != null
      ? weightValue *
        carbsPerKgValue
      : null;

  const targetProtein =
    weightValue != null &&
    proteinPerKgValue !=
      null
      ? weightValue *
        proteinPerKgValue
      : null;

  const targetFat =
    prescription != null &&
    targetCarbs != null &&
    targetProtein != null
      ? Math.max(
          0,
          (prescription -
            (targetCarbs +
              targetProtein) *
              4) /
            9,
        )
      : null;

  const targetFatPerKg =
    targetFat != null &&
    weightValue != null &&
    weightValue > 0
      ? targetFat /
        weightValue
      : null;

  const exchangeTotals =
    useMemo(() => {
      let carbs = 0;
      let protein = 0;
      let fat = 0;
      let kcal = 0;

      for (
        const group of
        EXCHANGE_GROUPS
      ) {
        const amount =
          portions[group.key] ??
          0;

        carbs +=
          amount * group.carbs;

        protein +=
          amount *
          group.protein;

        fat +=
          amount * group.fat;

        kcal +=
          amount * group.kcal;
      }

      return {
        carbs,
        protein,
        fat,
        kcal,
      };
    }, [portions]);

  const macroDifferences = {
    carbs:
      targetCarbs != null
        ? exchangeTotals.carbs -
          targetCarbs
        : null,
    protein:
      targetProtein != null
        ? exchangeTotals.protein -
          targetProtein
        : null,
    fat:
      targetFat != null
        ? exchangeTotals.fat -
          targetFat
        : null,
    kcal:
      prescription != null
        ? exchangeTotals.kcal -
          prescription
        : null,
  };

  /*
   * SALDO IC del Excel:
   * HC / 15, proteínas / 7 y grasas / 5.
   * Acá lo mostramos en sentido intuitivo:
   * positivo = faltan IC; negativo = sobran.
   */
  const exchangeBalance = {
    carbs:
      targetCarbs != null
        ? (targetCarbs -
            exchangeTotals.carbs) /
          15
        : null,
    protein:
      targetProtein != null
        ? (targetProtein -
            exchangeTotals.protein) /
          7
        : null,
    fat:
      targetFat != null
        ? (targetFat -
            exchangeTotals.fat) /
          5
        : null,
  };

  const distributedByGroup =
    useMemo(() => {
      const result =
        emptyPortions();

      for (
        const meal of MEALS
      ) {
        for (
          const line of
          meals[meal.key]
        ) {
          result[
            line.groupKey
          ] += line.amount;
        }
      }

      return result;
    }, [meals]);

  function choosePlayer(
    playerId: number,
    playerName: string,
  ) {
    setSelectedPlayerId(
      playerId,
    );

    setSearch(
      playerName,
    );

    setPortions(
      emptyPortions(),
    );

    setMeals(
      emptyMeals(),
    );

    setPlanNotes("");
  }

  function clearPlayer() {
    setSelectedPlayerId(
      null,
    );

    setSearch("");
    setWeight("");
    setHeight("");
    setAgeInput("");
    setPortions(
      emptyPortions(),
    );
    setMeals(
      emptyMeals(),
    );
    setPlanNotes("");
  }

  function setPortion(
    key: ExchangeGroupKey,
    value: string,
  ) {
    const parsed =
      parseNumber(value);

    setPortions(
      (previous) => ({
        ...previous,
        [key]:
          parsed == null
            ? 0
            : Math.max(
                0,
                parsed,
              ),
      }),
    );
  }

  function addLine(
    mealKey: MealKey,
  ) {
    const option =
      PLAN_GROUP_OPTIONS[0];

    const line: PlanLine = {
      id: lineId(),
      groupKey:
        option.groupKey,
      displayLabel:
        option.label,
      amount: 1,
      note: "",
    };

    setMeals(
      (previous) => ({
        ...previous,
        [mealKey]: [
          ...previous[
            mealKey
          ],
          line,
        ],
      }),
    );
  }

  function updateLine(
    mealKey: MealKey,
    lineIdValue: string,
    patch:
      Partial<PlanLine>,
  ) {
    setMeals(
      (previous) => ({
        ...previous,
        [mealKey]:
          previous[
            mealKey
          ].map((line) =>
            line.id ===
            lineIdValue
              ? {
                  ...line,
                  ...patch,
                }
              : line,
          ),
      }),
    );
  }

  function removeLine(
    mealKey: MealKey,
    lineIdValue: string,
  ) {
    setMeals(
      (previous) => ({
        ...previous,
        [mealKey]:
          previous[
            mealKey
          ].filter(
            (line) =>
              line.id !==
              lineIdValue,
          ),
      }),
    );
  }

  function changeLineGroup(
    mealKey: MealKey,
    lineIdValue: string,
    optionValue: string,
  ) {
    const option =
      PLAN_GROUP_OPTIONS.find(
        (item) =>
          item.value ===
          optionValue,
      );

    if (!option) {
      return;
    }

    updateLine(
      mealKey,
      lineIdValue,
      {
        groupKey:
          option.groupKey,
        displayLabel:
          option.label,
      },
    );
  }

  function applyFaPreset(
    level: string,
  ) {
    const preset =
      FA_PRESETS.find(
        (item) =>
          item.level ===
          level,
      );

    if (!preset) {
      return;
    }

    setActivityFactor(
      String(
        sex === "M"
          ? preset.male
          : preset.female,
      ),
    );
  }

  function printPlan() {
    window.print();
  }

  const allDistributionOk =
    EXCHANGE_GROUPS.every(
      (group) =>
        Math.abs(
          (portions[
            group.key
          ] ?? 0) -
            (distributedByGroup[
              group.key
            ] ?? 0),
        ) < 0.001,
    );

  return (
    <AppLayout
      title="Plan de intercambios"
      subtitle="Cálculo nutricional, intercambios y armado del plan"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .player-plan-print,
          .player-plan-print * {
            visibility: visible !important;
          }

          .player-plan-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 18mm !important;
          }

          .print-hide {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      <div className="plan-editor-only mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
          <div className="border-b border-border bg-gradient-to-r from-[#0B234A]/5 via-background to-[#C8102E]/5 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
              Nuevo plan
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Datos de la jugadora
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              La app toma los últimos
              datos disponibles, pero
              todo lo que se usa para
              este plan queda editable.
            </p>
          </div>

          <div className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <label className="text-sm">
                  <span className="panel-title text-xs text-muted-foreground">
                    Jugadora
                  </span>

                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <input
                      value={search}
                      onChange={(
                        event,
                      ) => {
                        setSearch(
                          event
                            .target
                            .value,
                        );

                        if (
                          selectedPlayerId !=
                          null
                        ) {
                          setSelectedPlayerId(
                            null,
                          );
                        }
                      }}
                      placeholder="Escribí el apellido..."
                      className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3"
                    />
                  </div>
                </label>

                {selectedPlayerId ==
                  null &&
                  filteredPlayers.length >
                    0 && (
                    <div className="absolute left-0 right-0 top-[68px] z-20 overflow-hidden rounded-md border border-border bg-card shadow-lg">
                      {filteredPlayers.map(
                        (
                          player,
                        ) => (
                          <button
                            key={
                              player.id
                            }
                            type="button"
                            onClick={() =>
                              choosePlayer(
                                player.id!,
                                player.name,
                              )
                            }
                            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted"
                          >
                            <UserRound className="h-4 w-4 text-muted-foreground" />

                            <span className="font-medium">
                              {
                                player.name
                              }
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  )}

                {selectedPlayer && (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <span>
                      Seleccionada:{" "}
                      <strong>
                        {
                          selectedPlayer.name
                        }
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={
                        clearPlayer
                      }
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              <label className="text-sm">
                <span className="panel-title text-xs text-muted-foreground">
                  Fecha del plan
                </span>

                <input
                  type="date"
                  value={
                    planDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setPlanDate(
                      event
                        .target
                        .value,
                    )
                  }
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3"
                />
              </label>
            </div>
          </div>
        </section>

        {!selectedPlayer ? (
          <section className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <UserRound className="mx-auto h-9 w-9 text-muted-foreground" />

            <h3 className="mt-3 font-display text-lg font-semibold">
              Elegí una jugadora
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Cuando selecciones un
              apellido se cargarán
              peso, talla y edad
              automáticamente.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon={
                  CalendarDays
                }
                label="Fecha de nacimiento"
                value={
                  effectiveBirthDate
                    ? fmtDate(
                        effectiveBirthDate,
                      )
                    : "Sin dato"
                }
                note="Ficha de la jugadora"
              />

              <InfoCard
                icon={
                  UserRound
                }
                label="Edad automática"
                value={
                  calculatedAge ==
                  null
                    ? "Sin dato"
                    : `${formatNumber(
                        calculatedAge,
                        1,
                      )} años`
                }
                note="Podés modificarla abajo"
              />

              <InfoCard
                icon={Scale}
                label="Último peso"
                value={
                  latestWeight
                    ? `${formatNumber(
                        latestWeight.value,
                        1,
                      )} kg`
                    : "Sin dato"
                }
                note={
                  latestWeight
                    ? `${latestWeight.source} · ${fmtDate(
                        latestWeight.date,
                      )}`
                    : "Carga manual disponible"
                }
              />

              <InfoCard
                icon={Ruler}
                label="Última talla"
                value={
                  latestHeight
                    ? `${formatNumber(
                        latestHeight.value,
                        1,
                      )} cm`
                    : "Sin dato"
                }
                note={
                  latestHeight
                    ? `${latestHeight.source} · ${fmtDate(
                        latestHeight.date,
                      )}`
                    : "Carga manual disponible"
                }
              />
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <SectionTitle
                icon={Calculator}
                eyebrow="Cálculo interno"
                title="Estimación energética"
                description="Replica el flujo de tu planilla: datos básicos → Harris/Benedict → factor de actividad → ajuste por objetivo."
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <EditableField
                  label="Peso"
                  value={weight}
                  onChange={
                    setWeight
                  }
                  suffix="kg"
                />

                <EditableField
                  label="Talla"
                  value={height}
                  onChange={
                    setHeight
                  }
                  suffix="cm"
                />

                <EditableField
                  label="Edad"
                  value={
                    ageInput
                  }
                  onChange={
                    setAgeInput
                  }
                  suffix="años"
                />

                <label className="text-sm">
                  <span className="panel-title text-xs text-muted-foreground">
                    Sexo
                  </span>

                  <select
                    value={sex}
                    onChange={(
                      event,
                    ) =>
                      setSex(
                        event.target
                          .value as Sex,
                      )
                    }
                    className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3"
                  >
                    <option value="F">
                      Femenino
                    </option>
                    <option value="M">
                      Masculino
                    </option>
                  </select>
                </label>

                <EditableField
                  label="Factor actividad"
                  value={
                    activityFactor
                  }
                  onChange={
                    setActivityFactor
                  }
                  suffix="FA"
                />

                <div className="text-sm">
                  <span className="panel-title text-xs text-muted-foreground">
                    Presets FA
                  </span>

                  <div className="mt-1 grid grid-cols-5 gap-1">
                    {FA_PRESETS.map(
                      (preset) => (
                        <button
                          key={
                            preset.level
                          }
                          type="button"
                          onClick={() =>
                            applyFaPreset(
                              preset.level,
                            )
                          }
                          className="h-11 rounded-md border border-input bg-background text-xs font-semibold hover:bg-muted"
                        >
                          {
                            preset.level
                          }
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ResultBox
                  label="MB x H/B"
                  value={
                    basalMetabolism ==
                    null
                      ? "—"
                      : `${formatNumber(
                          basalMetabolism,
                          0,
                        )} kcal`
                  }
                />

                <ResultBox
                  label="VCT"
                  value={
                    totalEnergy ==
                    null
                      ? "—"
                      : `${formatNumber(
                          totalEnergy,
                          0,
                        )} kcal`
                  }
                />

                <EditableField
                  label="Ajuste kcal 1 · DMA"
                  value={
                    adjustmentOne
                  }
                  onChange={
                    setAdjustmentOne
                  }
                  suffix="kcal"
                />

                <EditableField
                  label="Ajuste kcal 2 · AMM"
                  value={
                    adjustmentTwo
                  }
                  onChange={
                    setAdjustmentTwo
                  }
                  suffix="kcal"
                />
              </div>

              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prescripción por objetivo
                </p>

                <p className="mt-1 text-3xl font-bold text-primary">
                  {prescription ==
                  null
                    ? "—"
                    : `${formatNumber(
                        prescription,
                        0,
                      )} kcal`}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <SectionTitle
                icon={Calculator}
                eyebrow="Objetivos"
                title="Macronutrientes"
                description="Ingresás HC y proteínas en g/kg. Las grasas se estiman con las kcal restantes, igual que en la planilla."
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <EditableField
                  label="HC"
                  value={
                    carbsPerKg
                  }
                  onChange={
                    setCarbsPerKg
                  }
                  suffix="g/kg"
                />

                <EditableField
                  label="Proteínas"
                  value={
                    proteinPerKg
                  }
                  onChange={
                    setProteinPerKg
                  }
                  suffix="g/kg"
                />

                <ResultBox
                  label="Grasas"
                  value={
                    targetFatPerKg ==
                    null
                      ? "—"
                      : `${formatNumber(
                          targetFatPerKg,
                          2,
                        )} g/kg`
                  }
                />

                <ResultBox
                  label="Kcal objetivo"
                  value={
                    prescription ==
                    null
                      ? "—"
                      : `${formatNumber(
                          prescription,
                          0,
                        )} kcal`
                  }
                />
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <input
                  type="checkbox"
                  checked={showMacroTable}
                  onChange={(event) =>
                    setShowMacroTable(
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-[#0B234A]"
                />

                <div>
                  <p className="text-sm font-semibold">
                    Mostrar tabla de kcal y macronutrientes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    La podés abrir cuando quieras comprobar objetivos, plan actual y diferencias.
                  </p>
                </div>
              </label>

              {showMacroTable && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        Variable
                      </th>
                      <th className="px-4 py-3 text-right">
                        Objetivo
                      </th>
                      <th className="px-4 py-3 text-right">
                        Plan actual
                      </th>
                      <th className="px-4 py-3 text-right">
                        Diferencia
                      </th>
                      <th className="px-4 py-3 text-center">
                        Rango
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <MacroCheckRow
                      label="HC"
                      target={
                        targetCarbs
                      }
                      actual={
                        exchangeTotals.carbs
                      }
                      difference={
                        macroDifferences.carbs
                      }
                      tolerance={6}
                      unit="g"
                    />

                    <MacroCheckRow
                      label="Proteínas"
                      target={
                        targetProtein
                      }
                      actual={
                        exchangeTotals.protein
                      }
                      difference={
                        macroDifferences.protein
                      }
                      tolerance={4}
                      unit="g"
                    />

                    <MacroCheckRow
                      label="Grasas"
                      target={
                        targetFat
                      }
                      actual={
                        exchangeTotals.fat
                      }
                      difference={
                        macroDifferences.fat
                      }
                      tolerance={3}
                      unit="g"
                    />

                    <MacroCheckRow
                      label="Energía"
                      target={
                        prescription
                      }
                      actual={
                        exchangeTotals.kcal
                      }
                      difference={
                        macroDifferences.kcal
                      }
                      tolerance={30}
                      unit="kcal"
                      decimals={0}
                    />
                  </tbody>
                </table>
              </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <SectionTitle
                icon={Utensils}
                eyebrow="Estimación de IC"
                title="Intercambios por grupo"
                description="Cargá la cantidad de intercambios de cada grupo. La tabla calcula automáticamente HC, proteínas, grasas y kcal."
              />

              <div className="mt-5 rounded-xl border border-[#0B234A]/15 bg-gradient-to-r from-[#0B234A]/5 via-background to-[#C8102E]/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
                      Saldo de intercambios
                    </p>
                    <h4 className="mt-1 font-display text-lg font-semibold">
                      ¿Cuánto me falta agregar?
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se actualiza solo cada vez que cambiás los IC de la tabla. Es la misma lógica de “SALDO IC” de tu Excel.
                    </p>
                  </div>

                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    HC ÷ 15 · PR ÷ 7 · GR ÷ 5
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ExchangeBalanceCard
                    label="Hidratos"
                    value={exchangeBalance.carbs}
                    colorClass="border-blue-200 bg-blue-50/70 text-blue-900"
                  />

                  <ExchangeBalanceCard
                    label="Proteínas"
                    value={exchangeBalance.protein}
                    colorClass="border-red-200 bg-red-50/70 text-red-900"
                  />

                  <ExchangeBalanceCard
                    label="Grasas"
                    value={exchangeBalance.fat}
                    colorClass="border-amber-200 bg-amber-50/70 text-amber-900"
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Es una guía para orientarte mientras armás el plan: después elegís vos qué grupo de alimentos usar para completar ese saldo.
                </p>
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        Grupo
                      </th>
                      <th className="px-3 py-3 text-center">
                        HC/IC
                      </th>
                      <th className="px-3 py-3 text-center">
                        PR/IC
                      </th>
                      <th className="px-3 py-3 text-center">
                        Gr/IC
                      </th>
                      <th className="px-3 py-3 text-center">
                        Kcal/IC
                      </th>
                      <th className="px-3 py-3 text-center">
                        IC
                      </th>
                      <th className="px-3 py-3 text-right">
                        HC
                      </th>
                      <th className="px-3 py-3 text-right">
                        PR
                      </th>
                      <th className="px-3 py-3 text-right">
                        Gr
                      </th>
                      <th className="px-3 py-3 text-right">
                        Kcal
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {EXCHANGE_GROUPS.map(
                      (group) => {
                        const amount =
                          portions[
                            group.key
                          ];

                        return (
                          <tr
                            key={
                              group.key
                            }
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2 font-medium">
                              {
                                group.label
                              }
                            </td>

                            <td className="numeric px-3 py-2 text-center text-muted-foreground">
                              {
                                group.carbs
                              }
                            </td>

                            <td className="numeric px-3 py-2 text-center text-muted-foreground">
                              {
                                group.protein
                              }
                            </td>

                            <td className="numeric px-3 py-2 text-center text-muted-foreground">
                              {
                                group.fat
                              }
                            </td>

                            <td className="numeric px-3 py-2 text-center text-muted-foreground">
                              {
                                group.kcal
                              }
                            </td>

                            <td className="px-3 py-2">
                              <input
                                inputMode="decimal"
                                value={
                                  amount ===
                                  0
                                    ? ""
                                    : amount
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setPortion(
                                    group.key,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="0"
                                className="mx-auto h-9 w-20 rounded-md border border-input bg-background px-2 text-center font-semibold"
                              />
                            </td>

                            <td className="numeric px-3 py-2 text-right">
                              {formatNumber(
                                amount *
                                  group.carbs,
                                1,
                              )}
                            </td>

                            <td className="numeric px-3 py-2 text-right">
                              {formatNumber(
                                amount *
                                  group.protein,
                                1,
                              )}
                            </td>

                            <td className="numeric px-3 py-2 text-right">
                              {formatNumber(
                                amount *
                                  group.fat,
                                1,
                              )}
                            </td>

                            <td className="numeric px-3 py-2 text-right font-semibold">
                              {formatNumber(
                                amount *
                                  group.kcal,
                                0,
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>

                  <tfoot className="border-t-2 border-border bg-muted/40 font-bold">
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-3"
                      >
                        TOTAL DEL PLAN
                      </td>

                      <td className="numeric px-3 py-3 text-right">
                        {formatNumber(
                          exchangeTotals.carbs,
                          1,
                        )}{" "}
                        g
                      </td>

                      <td className="numeric px-3 py-3 text-right">
                        {formatNumber(
                          exchangeTotals.protein,
                          1,
                        )}{" "}
                        g
                      </td>

                      <td className="numeric px-3 py-3 text-right">
                        {formatNumber(
                          exchangeTotals.fat,
                          1,
                        )}{" "}
                        g
                      </td>

                      <td className="numeric px-3 py-3 text-right">
                        {formatNumber(
                          exchangeTotals.kcal,
                          0,
                        )}{" "}
                        kcal
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Como en tu Excel:
                  buscá que las kcal
                  queden dentro de
                  ±30 kcal y los
                  macros dentro de
                  ±6 g HC, ±4 g
                  proteínas y ±3 g
                  grasas.
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <SectionTitle
                icon={Utensils}
                eyebrow="Plan para la jugadora"
                title="Distribución diaria"
                description="Armá cada comida con desplegables. La app controla que lo distribuido coincida con los intercambios que definiste arriba."
              />

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {MEALS.map(
                  (meal) => (
                    <MealEditor
                      key={
                        meal.key
                      }
                      mealKey={
                        meal.key
                      }
                      label={
                        meal.label
                      }
                      lines={
                        meals[
                          meal.key
                        ]
                      }
                      onAdd={() =>
                        addLine(
                          meal.key,
                        )
                      }
                      onRemove={(
                        id,
                      ) =>
                        removeLine(
                          meal.key,
                          id,
                        )
                      }
                      onGroupChange={(
                        id,
                        option,
                      ) =>
                        changeLineGroup(
                          meal.key,
                          id,
                          option,
                        )
                      }
                      onAmountChange={(
                        id,
                        amount,
                      ) =>
                        updateLine(
                          meal.key,
                          id,
                          {
                            amount,
                          },
                        )
                      }
                      onNoteChange={(
                        id,
                        note,
                      ) =>
                        updateLine(
                          meal.key,
                          id,
                          {
                            note,
                          },
                        )
                      }
                    />
                  ),
                )}
              </div>

              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      Control de distribución
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prescripto vs.
                      distribuido entre
                      las comidas.
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      allDistributionOk
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {allDistributionOk ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <CircleAlert className="h-4 w-4" />
                    )}

                    {allDistributionOk
                      ? "Distribución completa"
                      : "Hay IC por distribuir"}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {EXCHANGE_GROUPS.filter(
                    (group) =>
                      portions[
                        group.key
                      ] > 0 ||
                      distributedByGroup[
                        group.key
                      ] > 0,
                  ).map(
                    (group) => {
                      const prescribed =
                        portions[
                          group.key
                        ];

                      const distributed =
                        distributedByGroup[
                          group.key
                        ];

                      const remaining =
                        prescribed -
                        distributed;

                      const ok =
                        Math.abs(
                          remaining,
                        ) < 0.001;

                      return (
                        <div
                          key={
                            group.key
                          }
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <p className="text-xs font-semibold">
                            {
                              group.label
                            }
                          </p>

                          <p className="mt-1 text-sm">
                            <strong>
                              {formatNumber(
                                distributed,
                                2,
                              )}
                            </strong>{" "}
                            de{" "}
                            <strong>
                              {formatNumber(
                                prescribed,
                                2,
                              )}
                            </strong>{" "}
                            IC
                          </p>

                          <p
                            className={`mt-1 text-xs font-semibold ${
                              ok
                                ? "text-emerald-700"
                                : remaining >
                                    0
                                  ? "text-amber-700"
                                  : "text-red-700"
                            }`}
                          >
                            {ok
                              ? "Completo ✓"
                              : remaining >
                                  0
                                ? `Faltan ${formatNumber(
                                    remaining,
                                    2,
                                  )} IC`
                                : `Sobran ${formatNumber(
                                    Math.abs(
                                      remaining,
                                    ),
                                    2,
                                  )} IC`}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              <label className="mt-5 block text-sm">
                <span className="panel-title text-xs text-muted-foreground">
                  Observaciones generales
                  del plan
                </span>

                <textarea
                  value={
                    planNotes
                  }
                  onChange={(
                    event,
                  ) =>
                    setPlanNotes(
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  placeholder="Indicaciones generales, aclaraciones, prioridades..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <SectionTitle
                icon={BookOpen}
                eyebrow="Referencia"
                title="Guía rápida de intercambios"
                description="Resumen integrado a partir de la guía que usás actualmente."
              />

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {QUICK_GUIDE.map(
                  (item) => (
                    <details
                      key={
                        item.title
                      }
                      className="rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <summary className="cursor-pointer font-semibold">
                        {
                          item.title
                        }
                      </summary>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {
                          item.text
                        }
                      </p>
                    </details>
                  ),
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                    Vista final
                  </p>

                  <h3 className="mt-1 font-display text-xl font-semibold">
                    Plan para compartir
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Esta parte es la
                    que se imprime o
                    guarda como PDF.
                    No incluye tus
                    cálculos internos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    printPlan
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0B234A] px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir / PDF
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {selectedPlayer && (
        <div className="player-plan-print mx-auto mt-5 max-w-4xl rounded-xl border border-border bg-white p-7 text-slate-950 shadow-panel">
          <div className="border-b-4 border-[#0B234A] pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C8102E]">
              Plan alimentario
            </p>

            <h1 className="mt-1 text-3xl font-bold uppercase">
              {
                selectedPlayer.name
              }
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Sistema de
              intercambios ·{" "}
              {fmtDate(
                planDate,
              )}
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {MEALS.map(
              (meal) => (
                <div
                  key={
                    meal.key
                  }
                  className="break-inside-avoid rounded-xl border border-slate-200 p-4"
                >
                  <h2 className="text-lg font-bold uppercase text-[#0B234A]">
                    {
                      meal.label
                    }
                  </h2>

                  {meals[
                    meal.key
                  ].length ===
                  0 ? (
                    <p className="mt-2 text-sm text-slate-400">
                      Sin indicaciones.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {meals[
                        meal.key
                      ].map(
                        (
                          line,
                        ) => (
                          <li
                            key={
                              line.id
                            }
                            className="text-sm"
                          >
                            <span className="font-semibold">
                              {
                                line.displayLabel
                              }
                              :
                            </span>{" "}
                            {formatNumber(
                              line.amount,
                              2,
                            )}{" "}
                            IC
                            {line.note.trim()
                              ? ` (${line.note.trim()})`
                              : ""}
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </div>
              ),
            )}
          </div>

          {planNotes.trim() && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <h2 className="text-sm font-bold uppercase text-[#0B234A]">
                Indicaciones
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {planNotes}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold uppercase text-[#0B234A]">
              Resumen de intercambios
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-3">
              {EXCHANGE_GROUPS.filter(
                (group) =>
                  portions[
                    group.key
                  ] > 0,
              ).map(
                (group) => (
                  <div
                    key={
                      group.key
                    }
                    className="flex justify-between gap-3 border-b border-slate-100 pb-1"
                  >
                    <span>
                      {
                        group.label
                      }
                    </span>
                    <strong>
                      {formatNumber(
                        portions[
                          group.key
                        ],
                        2,
                      )}{" "}
                      IC
                    </strong>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            Plan nutricional ·
            Sistema de intercambios
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof Calculator;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
          {eyebrow}
        </p>

        <h3 className="mt-0.5 font-display text-xl font-semibold">
          {title}
        </h3>

        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  suffix?: string;
}) {
  return (
    <label className="text-sm">
      <span className="panel-title text-xs text-muted-foreground">
        {label}
      </span>

      <div className="relative mt-1">
        <input
          inputMode="decimal"
          value={value}
          onChange={(
            event,
          ) =>
            onChange(
              event.target.value,
            )
          }
          className="h-11 w-full rounded-md border border-input bg-background px-3 pr-14"
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function ResultBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 numeric text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function MacroCheckRow({
  label,
  target,
  actual,
  difference,
  tolerance,
  unit,
  decimals = 1,
}: {
  label: string;
  target: number | null;
  actual: number;
  difference: number | null;
  tolerance: number;
  unit: string;
  decimals?: number;
}) {
  const ok =
    difference != null &&
    Math.abs(
      difference,
    ) <= tolerance;

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 font-semibold">
        {label}
      </td>

      <td className="numeric px-4 py-3 text-right">
        {target == null
          ? "—"
          : `${formatNumber(
              target,
              decimals,
            )} ${unit}`}
      </td>

      <td className="numeric px-4 py-3 text-right">
        {formatNumber(
          actual,
          decimals,
        )}{" "}
        {unit}
      </td>

      <td
        className={`numeric px-4 py-3 text-right font-semibold ${
          difference ==
          null
            ? ""
            : ok
              ? "text-emerald-700"
              : "text-amber-700"
        }`}
      >
        {difference == null
          ? "—"
          : `${difference > 0 ? "+" : ""}${formatNumber(
              difference,
              decimals,
            )} ${unit}`}
      </td>

      <td className="px-4 py-3 text-center">
        {difference ==
        null ? (
          <span className="text-xs text-muted-foreground">
            Falta objetivo
          </span>
        ) : ok ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Dentro
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
            <CircleAlert className="h-3.5 w-3.5" />
            Ajustar
          </span>
        )}
      </td>
    </tr>
  );
}

function ExchangeBalanceCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number | null;
  colorClass: string;
}) {
  const tolerance = 0.05;

  let status =
    "Primero definí el objetivo";

  let amount = "—";

  if (value != null) {
    const absolute =
      Math.abs(value);

    amount = `${formatNumber(
      absolute,
      2,
    )} IC`;

    if (absolute <= tolerance) {
      status = "Saldo cubierto ✓";
      amount = "0 IC";
    } else if (value > 0) {
      status = "Faltan aprox.";
    } else {
      status = "Sobran aprox.";
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 ${colorClass}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {amount}
      </p>

      <p className="mt-1 text-xs font-semibold">
        {status}
      </p>
    </div>
  );
}

function MealEditor({
  mealKey,
  label,
  lines,
  onAdd,
  onRemove,
  onGroupChange,
  onAmountChange,
  onNoteChange,
}: {
  mealKey: MealKey;
  label: string;
  lines: PlanLine[];
  onAdd: () => void;
  onRemove: (
    id: string,
  ) => void;
  onGroupChange: (
    id: string,
    option: string,
  ) => void;
  onAmountChange: (
    id: string,
    amount: number,
  ) => void;
  onNoteChange: (
    id: string,
    note: string,
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comida
          </p>

          <h4 className="font-display text-lg font-semibold">
            {label}
          </h4>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-semibold hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {lines.length ===
      0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" />
          Agregar intercambio
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          {lines.map(
            (line) => {
              const selectedOption =
                PLAN_GROUP_OPTIONS.find(
                  (option) =>
                    option.groupKey ===
                      line.groupKey &&
                    option.label ===
                      line.displayLabel,
                ) ??
                PLAN_GROUP_OPTIONS.find(
                  (option) =>
                    option.groupKey ===
                    line.groupKey,
                )!;

              return (
                <div
                  key={
                    line.id
                  }
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_110px_38px]">
                    <select
                      value={
                        selectedOption.value
                      }
                      onChange={(
                        event,
                      ) =>
                        onGroupChange(
                          line.id,
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {PLAN_GROUP_OPTIONS.map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        ),
                      )}
                    </select>

                    <select
                      value={
                        line.amount
                      }
                      onChange={(
                        event,
                      ) =>
                        onAmountChange(
                          line.id,
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {AMOUNT_OPTIONS.map(
                        (
                          amount,
                        ) => (
                          <option
                            key={
                              amount
                            }
                            value={
                              amount
                            }
                          >
                            {
                              amount
                            }{" "}
                            IC
                          </option>
                        ),
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        onRemove(
                          line.id,
                        )
                      }
                      aria-label={`Eliminar de ${mealKey}`}
                      className="flex h-10 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    value={
                      line.note
                    }
                    onChange={(
                      event,
                    ) =>
                      onNoteChange(
                        line.id,
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Aclaración opcional: priorizar fruta, 1 cda queso, 2 cditas..."
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>

      <p className="mt-3 text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {note}
      </p>
    </div>
  );
}
