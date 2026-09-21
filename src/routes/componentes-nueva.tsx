import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  Calculator,
  Save,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  fmt,
  parseNum,
  todayISO,
} from "@/lib/calc";

import {
  upsertFullAnthropometry,
} from "@/lib/db";

import {
  calculateFiveComponents,
  calculateMeasureStatistics,
  missingKerrMeasures,
} from "@/lib/kerr";

import {
  usePlayer,
} from "@/lib/hooks";

import {
  FULL_ANTHROPOMETRY_GROUP_LABELS,
  FULL_ANTHROPOMETRY_MEASURES,
} from "@/lib/types";

import type {
  AnthropometrySex,
  FullAnthropometry,
  FullAnthropometryGroup,
  FullAnthropometryMeasure,
  FullAnthropometryMeasureKey,
} from "@/lib/types";

export const Route = createFileRoute(
  "/componentes-nueva",
)({
  validateSearch: (
    s: Record<string, unknown>,
  ): { player?: number } => ({
    player:
      s.player != null &&
      s.player !== ""
        ? Number(s.player)
        : undefined,
  }),

  component: () => (
    <ClientOnly>
      <NuevaAntropometria />
    </ClientOnly>
  ),
});

/* ============================================================
   TIPOS DEL FORMULARIO
============================================================ */

type SeriesStrings = [
  string,
  string,
  string,
  string,
  string,
];

type FormMeasurements = Record<
  FullAnthropometryMeasureKey,
  SeriesStrings
>;

const GROUP_ORDER:
  FullAnthropometryGroup[] = [
    "basicos",
    "diametros",
    "perimetros",
    "pliegues",
  ];

/* ============================================================
   HELPERS
============================================================ */

function createEmptyMeasurements():
  FormMeasurements {
  return Object.fromEntries(
    FULL_ANTHROPOMETRY_MEASURES.map(
      (definition) => [
        definition.key,
        ["", "", "", "", ""],
      ],
    ),
  ) as FormMeasurements;
}

function toMeasure(
  values: SeriesStrings,
): FullAnthropometryMeasure {
  const series = values.map(
    (value) => parseNum(value),
  ) as [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];

  return calculateMeasureStatistics(
    series,
  );
}

function buildMeasures(
  form: FormMeasurements,
): FullAnthropometry["measures"] {
  const result:
    FullAnthropometry["measures"] =
      {};

  for (
    const definition of
    FULL_ANTHROPOMETRY_MEASURES
  ) {
    result[definition.key] =
      toMeasure(
        form[definition.key],
      );
  }

  return result;
}

function ageAtDate(
  birthDate:
    | string
    | null
    | undefined,
  evaluationDate: string,
): number | null {
  if (
    !birthDate ||
    !evaluationDate
  ) {
    return null;
  }

  const [
    birthYear,
    birthMonth,
    birthDay,
  ] = birthDate
    .split("-")
    .map(Number);

  const [
    year,
    month,
    day,
  ] = evaluationDate
    .split("-")
    .map(Number);

  if (
    !birthYear ||
    !birthMonth ||
    !birthDay ||
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  let age =
    year - birthYear;

  if (
    month < birthMonth ||
    (month === birthMonth &&
      day < birthDay)
  ) {
    age -= 1;
  }

  return age;
}

function optionalInteger(
  value: string,
): number | null {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function massText(
  kg: number | null,
  percent: number | null,
) {
  if (kg == null) {
    return "—";
  }

  return `${fmt(
    kg,
    1,
  )} kg${
    percent != null
      ? ` · ${fmt(
          percent,
          1,
        )}%`
      : ""
  }`;
}

/* ============================================================
   PANTALLA
============================================================ */

function NuevaAntropometria() {
  const navigate =
    useNavigate();

  const search =
    Route.useSearch();

  const playerId =
    search.player ?? null;

  const player =
    usePlayer(playerId);

  const [
    measurements,
    setMeasurements,
  ] =
    useState<FormMeasurements>(
      () =>
        createEmptyMeasurements(),
    );

  const [date, setDate] =
    useState(todayISO());

  const [
    measurementNumber,
    setMeasurementNumber,
  ] = useState("");

  const [sport, setSport] =
    useState("Fútbol");

  const [
    physicalActivity,
    setPhysicalActivity,
  ] = useState("");

  const [
    activityType,
    setActivityType,
  ] =
    useState("Deportista");

  const [sex, setSex] =
    useState<AnthropometrySex>(
      "female",
    );

  const [
    boneReference,
    setBoneReference,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const measures =
    useMemo(
      () =>
        buildMeasures(
          measurements,
        ),
      [measurements],
    );

  const age =
    ageAtDate(
      player?.birthDate,
      date,
    );

  const preview =
    useMemo(
      () =>
        calculateFiveComponents(
          {
            measures,
            sex,
            ageYears: age,
            boneReferenceKg:
              parseNum(
                boneReference,
              ),
          },
        ),
      [
        measures,
        sex,
        age,
        boneReference,
      ],
    );

  const missing =
    useMemo(
      () =>
        missingKerrMeasures({
          measures,
        }),
      [measures],
    );

  const finalMasses =
    preview
      .boneReferenceAdjustedMassesKg ??
    preview.weightAdjustedMassesKg;

  const finalPercentages =
    preview
      .boneReferenceAdjustedMassesPercent ??
    preview.weightAdjustedMassesPercent;

  function updateSeries(
    key:
      FullAnthropometryMeasureKey,
    index: number,
    value: string,
  ) {
    setMeasurements(
      (previous) => {
        const nextSeries = [
          ...previous[key],
        ] as SeriesStrings;

        nextSeries[index] =
          value;

        return {
          ...previous,
          [key]: nextSeries,
        };
      },
    );
  }

  async function save() {
    if (
      playerId == null ||
      !player
    ) {
      return;
    }

    if (!date) {
      toast.error(
        "Ingresá la fecha de la evaluación.",
      );

      return;
    }

    if (
      missing.length > 0
    ) {
      const labels =
        missing
          .slice(0, 4)
          .map(
            (key) =>
              FULL_ANTHROPOMETRY_MEASURES.find(
                (definition) =>
                  definition.key ===
                  key,
              )?.label ??
              key,
          )
          .join(", ");

      toast.error(
        `Faltan ${missing.length} mediciones necesarias para Kerr. ${labels}${
          missing.length > 4
            ? "…"
            : ""
        }`,
      );

      return;
    }

    setSaving(true);

    try {
      const now =
        new Date().toISOString();

      const anthropometry:
        FullAnthropometry = {
        playerId,

        date,

        measurementNumber:
          optionalInteger(
            measurementNumber,
          ),

        sport:
          sport.trim() ||
          null,

        physicalActivity:
          physicalActivity.trim() ||
          null,

        activityType:
          activityType.trim() ||
          null,

        sex,

        birthDate:
          player.birthDate ??
          null,

        ageYears: age,

        measures,

        boneReferenceKg:
          parseNum(
            boneReference,
          ),

        /*
         * db.ts vuelve a calcular
         * todos los resultados.
         */
        results: null,

        linkedControlId:
          null,

        source: "manual",

        sourceFileName:
          null,

        sourceSheetName:
          null,

        sourcePlayerName:
          player.name,

        notes:
          notes.trim() ||
          null,

        createdAt: now,
        updatedAt: now,
      };

      await upsertFullAnthropometry(
        anthropometry,
      );

      toast.success(
        "Antropometría completa guardada",
      );

      await navigate({
        to: "/componentes",
        search: {
          player: playerId,
        },
      });
    } catch (error) {
      console.error(error);

      toast.error(
        "No se pudo guardar la evaluación.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!playerId) {
    return (
      <AppLayout title="Nueva evaluación">
        <p className="text-sm text-muted-foreground">
          No se seleccionó una
          jugadora.
        </p>
      </AppLayout>
    );
  }

  if (!player) {
    return (
      <AppLayout title="Nueva evaluación">
        <p className="text-sm text-muted-foreground">
          Cargando jugadora…
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Nueva evaluación · ${player.name}`}
      subtitle="Antropometría completa · 5 componentes"
    >
      <PlayerNav
        playerId={playerId}
        playerName={player.name}
        current="componentes"
      />

      {/* ====================================================
          DATOS GENERALES
      ===================================================== */}

      <section className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Datos de la evaluación
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="font-medium">
              Fecha
            </span>

            <Input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              className="mt-1"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">
              N.º de medición
            </span>

            <Input
              type="number"
              min="1"
              value={
                measurementNumber
              }
              onChange={(event) =>
                setMeasurementNumber(
                  event.target.value,
                )
              }
              placeholder="Opcional"
              className="mt-1"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">
              Sexo
            </span>

            <select
              value={sex}
              onChange={(event) =>
                setSex(
                  event.target
                    .value as AnthropometrySex,
                )
              }
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="female">
                Femenino
              </option>

              <option value="male">
                Masculino
              </option>

              <option value="unspecified">
                Sin especificar
              </option>
            </select>
          </label>

          <div className="text-sm">
            <span className="font-medium">
              Edad
            </span>

            <div className="mt-1 flex h-10 items-center rounded-md border border-input bg-muted/40 px-3">
              {age != null
                ? `${age} años`
                : "—"}
            </div>
          </div>

          <label className="text-sm">
            <span className="font-medium">
              Deporte
            </span>

            <Input
              value={sport}
              onChange={(event) =>
                setSport(
                  event.target.value,
                )
              }
              className="mt-1"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">
              Actividad física
            </span>

            <Input
              value={
                physicalActivity
              }
              onChange={(event) =>
                setPhysicalActivity(
                  event.target.value,
                )
              }
              placeholder="Opcional"
              className="mt-1"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">
              Tipo de actividad
            </span>

            <Input
              value={activityType}
              onChange={(event) =>
                setActivityType(
                  event.target.value,
                )
              }
              className="mt-1"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">
              Masa ósea de referencia
            </span>

            <Input
              inputMode="decimal"
              value={
                boneReference
              }
              onChange={(event) =>
                setBoneReference(
                  event.target.value,
                )
              }
              placeholder="kg · opcional"
              className="mt-1"
            />
          </label>
        </div>
      </section>

      {/* ====================================================
          MEDICIONES
      ===================================================== */}

      {GROUP_ORDER.map(
        (group) => {
          const definitions =
            FULL_ANTHROPOMETRY_MEASURES.filter(
              (definition) =>
                definition.group ===
                group,
            );

          return (
            <section
              key={group}
              className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-panel"
            >
              <div className="border-b border-border px-4 py-3">
                <p className="font-display text-lg font-semibold">
                  {
                    FULL_ANTHROPOMETRY_GROUP_LABELS[
                      group
                    ]
                  }
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Podés cargar entre
                  una y cinco tomas.
                  La app utiliza la
                  mediana.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        Medición
                      </th>

                      <th className="px-2 py-2 text-center">
                        1
                      </th>

                      <th className="px-2 py-2 text-center">
                        2
                      </th>

                      <th className="px-2 py-2 text-center">
                        3
                      </th>

                      <th className="px-2 py-2 text-center">
                        4
                      </th>

                      <th className="px-2 py-2 text-center">
                        5
                      </th>

                      <th className="px-3 py-2 text-right">
                        Mediana
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {definitions.map(
                      (
                        definition,
                      ) => {
                        const measure =
                          toMeasure(
                            measurements[
                              definition
                                .key
                            ],
                          );

                        return (
                          <tr
                            key={
                              definition.key
                            }
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2">
                              <div className="font-medium">
                                {
                                  definition.label
                                }
                              </div>

                              <div className="text-xs text-muted-foreground">
                                {
                                  definition.unit
                                }
                                {definition.usedInKerr
                                  ? " · Kerr"
                                  : ""}
                              </div>
                            </td>

                            {measurements[
                              definition
                                .key
                            ].map(
                              (
                                value,
                                index,
                              ) => (
                                <td
                                  key={
                                    index
                                  }
                                  className="px-1.5 py-2"
                                >
                                  <Input
                                    inputMode="decimal"
                                    value={
                                      value
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateSeries(
                                        definition.key,
                                        index,
                                        event
                                          .target
                                          .value,
                                      )
                                    }
                                    className="h-9 min-w-[76px] text-center"
                                  />
                                </td>
                              ),
                            )}

                            <td className="numeric whitespace-nowrap px-3 py-2 text-right font-semibold">
                              {measure.median !=
                              null
                                ? `${fmt(
                                    measure.median,
                                    2,
                                  )} ${
                                    definition.unit
                                  }`
                                : "—"}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        },
      )}

      {/* ====================================================
          PREVISUALIZACIÓN KERR
      ===================================================== */}

      <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />

          <div>
            <p className="font-display text-lg font-semibold">
              Vista previa
            </p>

            <p className="text-xs text-muted-foreground">
              Cálculos automáticos
              según las mediciones
              cargadas.
            </p>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Faltan{" "}
            <strong>
              {missing.length}
            </strong>{" "}
            mediciones necesarias
            para completar Kerr.
            Podés seguir cargando los
            valores y la vista previa
            se irá actualizando.
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard
            label="Sum6"
            value={
              preview.sum6 != null
                ? `${fmt(
                    preview.sum6,
                    1,
                  )} mm`
                : "—"
            }
          />

          <ResultCard
            label="Masa muscular"
            value={massText(
              finalMasses.muscle,
              finalPercentages.muscle,
            )}
          />

          <ResultCard
            label="Masa adiposa"
            value={massText(
              finalMasses.adipose,
              finalPercentages.adipose,
            )}
          />

          <ResultCard
            label="Masa ósea"
            value={massText(
              finalMasses.bone,
              finalPercentages.bone,
            )}
          />

          <ResultCard
            label="Masa residual"
            value={massText(
              finalMasses.residual,
              finalPercentages.residual,
            )}
          />

          <ResultCard
            label="Masa de piel"
            value={massText(
              finalMasses.skin,
              finalPercentages.skin,
            )}
          />

          <ResultCard
            label="IMO"
            value={
              preview
                .muscleBoneIndexAdjusted !=
              null
                ? fmt(
                    preview
                      .muscleBoneIndexAdjusted,
                    2,
                  )
                : "—"
            }
          />

          <ResultCard
            label="Peso estructurado"
            value={
              preview
                .structuredWeightKg !=
              null
                ? `${fmt(
                    preview
                      .structuredWeightKg,
                    1,
                  )} kg`
                : "—"
            }
          />
        </div>
      </section>

      {/* ====================================================
          NOTAS Y GUARDADO
      ===================================================== */}

      <section className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <label className="text-sm">
          <span className="font-medium">
            Observaciones
          </span>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-muted-foreground">
            Al guardar, esta
            antropometría también va
            a actualizar el
            seguimiento habitual de
            {` ${player.name}`} con
            peso, pliegues y
            perímetros compartidos.
          </p>

          <Button
            onClick={() =>
              void save()
            }
            disabled={
              saving ||
              missing.length > 0
            }
          >
            <Save className="h-4 w-4" />

            {saving
              ? "Guardando…"
              : "Guardar evaluación"}
          </Button>
        </div>
      </section>
    </AppLayout>
  );
}

function ResultCard({
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

      <p className="mt-1 numeric text-lg font-bold">
        {value}
      </p>
    </div>
  );
}
