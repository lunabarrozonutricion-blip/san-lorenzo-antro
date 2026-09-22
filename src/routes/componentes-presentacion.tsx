import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Printer,
} from "lucide-react";
import {
  useMemo,
} from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";

import {
  fmt,
  fmtDate,
} from "@/lib/calc";

import {
  calculateAntropogimsPresentation,
} from "@/lib/antropogims-presentation";

import {
  previousFullAnthropometry,
  useFullAnthropometries,
  useFullAnthropometry,
  usePlayer,
} from "@/lib/hooks";

import {
  FULL_ANTHROPOMETRY_GROUP_LABELS,
  FULL_ANTHROPOMETRY_MEASURES,
} from "@/lib/types";

import type {
  FiveComponentMasses,
  FullAnthropometry,
  FullAnthropometryGroup,
  FullAnthropometryMeasureKey,
} from "@/lib/types";

export const Route = createFileRoute(
  "/componentes-presentacion",
)({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    player?: number;
    id?: number;
  } => ({
    player:
      s.player != null &&
      s.player !== ""
        ? Number(s.player)
        : undefined,

    id:
      s.id != null &&
      s.id !== ""
        ? Number(s.id)
        : undefined,
  }),

  component: () => (
    <ClientOnly>
      <PresentacionAntropogims />
    </ClientOnly>
  ),
});

/* ============================================================
   CONFIGURACIÓN
============================================================ */

const GROUP_ORDER:
  FullAnthropometryGroup[] = [
    "basicos",
    "diametros",
    "perimetros",
    "pliegues",
  ];

const MASS_ROWS: Array<{
  key: keyof FiveComponentMasses;
  label: string;
}> = [
  {
    key: "adipose",
    label: "Masa adiposa",
  },
  {
    key: "muscle",
    label: "Masa muscular",
  },
  {
    key: "residual",
    label: "Masa residual",
  },
  {
    key: "bone",
    label: "Masa ósea",
  },
  {
    key: "skin",
    label: "Masa de la piel",
  },
];

const MASS_COLORS: Record<
  keyof FiveComponentMasses,
  string
> = {
  adipose: "#c94e4e",
  muscle: "#7fa64a",
  residual: "#72559b",
  bone: "#4c9db2",
  skin: "#e89242",
};

const BASIC_KEYS:
  FullAnthropometryMeasureKey[] =
  [
    "weight",
    "sittingHeight",
  ];

const DIAMETER_KEYS:
  FullAnthropometryMeasureKey[] =
  [
    "biacromial",
    "thoraxTransverse",
    "thoraxAP",
    "biiliocristal",
    "humeral",
    "femoral",
  ];

const PERIMETER_KEYS:
  FullAnthropometryMeasureKey[] =
  [
    "head",
    "armRelaxed",
    "armFlexed",
    "forearmMax",
    "thoraxMesosternal",
    "waistMin",
    "hipMax",
    "thighMax",
    "thighMedial",
    "calfMax",
  ];

const SKINFOLD_KEYS:
  FullAnthropometryMeasureKey[] =
  [
    "triceps",
    "subscapular",
    "supraespinal",
    "abdominal",
    "thighSkinfold",
    "calfSkinfold",
  ];

/* ============================================================
   HELPERS
============================================================ */

function measureLabel(
  key:
    FullAnthropometryMeasureKey,
) {
  return (
    FULL_ANTHROPOMETRY_MEASURES.find(
      (item) =>
        item.key === key,
    )?.label ?? key
  );
}

function currentMeasureValue(
  anthropometry:
    FullAnthropometry,
  key:
    FullAnthropometryMeasureKey,
) {
  return (
    anthropometry.measures[
      key
    ]?.median ?? null
  );
}

function signed(
  value:
    | number
    | null
    | undefined,
  decimals = 2,
  unit = "",
) {
  if (value == null) {
    return "—";
  }

  const sign =
    value > 0
      ? "+"
      : "";

  return `${sign}${fmt(
    value,
    decimals,
  )}${unit}`;
}

function formatMeasure(
  value:
    | number
    | null
    | undefined,
  decimals = 2,
) {
  if (value == null) {
    return "—";
  }

  return fmt(
    value,
    decimals,
  );
}

function sumMasses(
  masses:
    FiveComponentMasses,
) {
  const values = [
    masses.adipose,
    masses.muscle,
    masses.residual,
    masses.bone,
    masses.skin,
  ];

  if (
    values.some(
      (value) =>
        value == null,
    )
  ) {
    return null;
  }

  return values.reduce(
    (total, value) =>
      total +
      (value as number),
    0,
  );
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    Math.max(
      value,
      min,
    ),
    max,
  );
}

/* ============================================================
   PANTALLA
============================================================ */

function PresentacionAntropogims() {
  const search =
    Route.useSearch();

  const playerId =
    search.player ?? null;

  const evaluationId =
    search.id ?? null;

  const player =
    usePlayer(
      playerId,
    );

  const anthropometry =
    useFullAnthropometry(
      evaluationId,
    );

  const allAnthropometries =
    useFullAnthropometries(
      playerId,
    );

  const previous =
    previousFullAnthropometry(
      allAnthropometries,
      anthropometry,
    );

  const presentation =
    useMemo(
      () =>
        anthropometry
          ? calculateAntropogimsPresentation(
              anthropometry,
              previous,
            )
          : null,
      [
        anthropometry,
        previous,
      ],
    );

  const previousPresentation =
    useMemo(
      () =>
        previous
          ? calculateAntropogimsPresentation(
              previous,
            )
          : null,
      [previous],
    );

  if (
    playerId == null ||
    evaluationId == null
  ) {
    return (
      <AppLayout title="Presentación">
        <p className="text-sm text-muted-foreground">
          No se seleccionó una
          evaluación.
        </p>
      </AppLayout>
    );
  }

  if (
    !player ||
    !anthropometry ||
    !presentation
  ) {
    return (
      <AppLayout title="Presentación">
        <p className="text-sm text-muted-foreground">
          Cargando presentación…
        </p>
      </AppLayout>
    );
  }

  const massTotal =
    sumMasses(
      presentation.massesKg,
    );

  const fiveMassScoreItems:
    ScoreItem[] = [
      {
        label: "Peso",
        value:
          presentation
            .totalMassScoreZ,
        color: "#497eb9",
      },
      {
        label:
          "Masa adiposa",
        value:
          presentation
            .massScoreZ
            .adipose,
        color:
          MASS_COLORS.adipose,
      },
      {
        label:
          "Masa muscular",
        value:
          presentation
            .massScoreZ
            .muscle,
        color:
          MASS_COLORS.muscle,
      },
      {
        label:
          "Masa residual",
        value:
          presentation
            .massScoreZ
            .residual,
        color:
          MASS_COLORS.residual,
      },
      {
        label:
          "Masa ósea",
        value:
          presentation
            .massScoreZ
            .bone,
        color:
          MASS_COLORS.bone,
      },
    ];

  return (
    <AppLayout
      title={`Presentación · ${player.name}`}
      subtitle="Informe de composición corporal · Antropogims / Kerr"
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          html,
          body {
            background: white !important;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .presentation-card {
            box-shadow: none !important;
          }

          .print-page {
            break-before: page;
            page-break-before: always;
          }

          .avoid-print-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /*
           * PÁGINA 1
           * Encabezado + todas las mediciones.
           */
          .presentation-main-header {
            box-shadow: none !important;
          }

          .presentation-main-header
            .presentation-title-bar {
            padding: 8px 12px !important;
          }

          .presentation-main-header
            .presentation-title-bar h1 {
            font-size: 18px !important;
            line-height: 1.1 !important;
          }

          .presentation-main-header
            .header-item {
            padding: 5px 8px !important;
          }

          .presentation-main-header
            .header-item p:first-child {
            font-size: 7px !important;
          }

          .presentation-main-header
            .header-item p:last-child {
            margin-top: 1px !important;
            font-size: 9px !important;
          }

          .presentation-measurements {
            margin-top: 6px !important;
          }

          .presentation-measurements
            .measurement-heading {
            padding: 5px 8px !important;
          }

          .presentation-measurements
            .measurement-heading
            > p:first-child {
            font-size: 7px !important;
          }

          .presentation-measurements
            .measurement-heading h2 {
            margin-top: 1px !important;
            font-size: 13px !important;
            line-height: 1.1 !important;
          }

          .presentation-measurements
            .measurement-heading
            > p:last-child {
            margin-top: 1px !important;
            font-size: 7px !important;
            line-height: 1.1 !important;
          }

          .presentation-measurements table {
            min-width: 0 !important;
            width: 100% !important;
            font-size: 7.6px !important;
          }

          .presentation-measurements
            th,
          .presentation-measurements
            td {
            padding: 2px 5px !important;
            line-height: 1.08 !important;
          }

          .presentation-measurements
            .measurement-group-row
            td {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
            font-size: 7px !important;
          }

          .presentation-measurements
            td span.text-xs {
            font-size: 6.5px !important;
          }

          /*
           * SCORE-Z
           * Compactamos gráficos sin cambiar sus valores.
           */
          .score-z-plot {
            padding: 7px !important;
          }

          .score-z-plot h3 {
            font-size: 10px !important;
            line-height: 1.1 !important;
          }

          .score-z-plot
            .score-z-content {
            margin-top: 7px !important;
          }

          .score-z-row {
            grid-template-columns:
              88px 1fr 32px !important;
            gap: 4px !important;
            margin-bottom: 4px !important;
          }

          .score-z-row
            .score-z-label,
          .score-z-row
            .score-z-value {
            font-size: 7px !important;
          }

          .score-z-bar {
            height: 15px !important;
          }

          .score-z-point {
            width: 9px !important;
            height: 9px !important;
          }

          .score-z-axis {
            margin-left: 92px !important;
            margin-right: 36px !important;
            font-size: 6px !important;
          }

          /*
           * PÁGINA PHANTOM
           * Fuerza 2 columnas también al imprimir.
           */
          .phantom-grid {
            display: grid !important;
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
            gap: 8px !important;
            margin-top: 8px !important;
          }

          .phantom-description {
            margin-top: 7px !important;
            padding: 7px !important;
            font-size: 7.5px !important;
            line-height: 1.2 !important;
          }

          .phantom-description p {
            margin-top: 2px !important;
          }

          /*
           * 5 MASAS
           */
          .five-masses-section {
            padding: 10px !important;
          }

          .five-masses-section
            .five-masses-chart {
            margin-top: 8px !important;
          }

          .five-masses-section
            .five-masses-table {
            margin-top: 9px !important;
          }

          .five-masses-section table {
            font-size: 8px !important;
          }

          .five-masses-section
            th,
          .five-masses-section
            td {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }

          .five-masses-description {
            margin-top: 7px !important;
            padding: 7px !important;
            font-size: 7.5px !important;
          }

          .five-masses-description
            .mini-masses-grid {
            margin-top: 6px !important;
            gap: 4px !important;
          }

          /*
           * DATOS ADICIONALES
           */
          .additional-section {
            padding: 10px !important;
          }

          .additional-cards {
            margin-top: 8px !important;
            gap: 6px !important;
          }

          .metric-card {
            padding: 7px !important;
          }

          .metric-card
            p:first-child {
            font-size: 7px !important;
          }

          .metric-card
            p:last-child {
            margin-top: 3px !important;
            font-size: 12px !important;
          }

          .risk-table {
            margin-top: 7px !important;
          }

          .risk-table table {
            min-width: 0 !important;
            font-size: 7px !important;
          }

          .risk-table
            th,
          .risk-table
            td {
            padding: 2px 4px !important;
          }

          /*
           * SOMATOTIPO
           * La somatocarta se reduce para que no salte
           * sola a una página nueva.
           */
          .somatotype-section {
            padding: 10px !important;
          }

          .somatotype-cards {
            margin-top: 8px !important;
            gap: 6px !important;
          }

          .somatotype-card {
            padding: 7px !important;
          }

          .somatotype-card
            p:first-child {
            font-size: 7px !important;
          }

          .somatotype-card
            p:nth-child(2) {
            margin-top: 3px !important;
            font-size: 16px !important;
          }

          .somatochart-wrapper {
            margin-top: 8px !important;
            padding: 7px !important;
          }

          .somatochart-wrapper h3 {
            font-size: 12px !important;
          }

          .somatochart-area {
            height: 255px !important;
            margin-top: 7px !important;
          }

          .somatochart-legend {
            margin-top: 5px !important;
            font-size: 7px !important;
            gap: 8px !important;
          }

          .somatotype-details {
            margin-top: 7px !important;
            gap: 6px !important;
          }

          .comparison-card {
            margin-top: 7px !important;
            padding: 7px !important;
            font-size: 7.5px !important;
          }
        }
      `}</style>

      <PlayerNav
        playerId={
          playerId
        }
        playerName={
          player.name
        }
        current="componentes"
      />

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="outline"
        >
          <Link
            to="/componentes"
            search={{
              player:
                playerId,
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <Button
          onClick={() =>
            window.print()
          }
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      {/* ==================================================
          INFORME PRINCIPAL
      ================================================== */}

      <PresentationHeader
        title="Informe de Composición Corporal"
        playerName={
          player.name
        }
        anthropometry={
          anthropometry
        }
      />

      {/* ==================================================
          MEDICIONES
      ================================================== */}

      <section className="presentation-card presentation-measurements mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="measurement-heading border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Antropometría
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            Mediciones
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Resultados, valor
            ajustado PHANTOM,
            diferencia con la
            medición anterior y
            Score-Z.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-3 py-2 text-left">
                  Medición
                </th>

                <th className="px-3 py-2 text-right">
                  Resultado
                </th>

                <th className="px-3 py-2 text-right">
                  Valor ajustado
                </th>

                <th className="px-3 py-2 text-right">
                  Anterior
                </th>

                <th className="px-3 py-2 text-right">
                  Diferencia
                </th>

                <th className="px-3 py-2 text-right">
                  Score-Z
                </th>
              </tr>
            </thead>

            <tbody>
              {GROUP_ORDER.map(
                (group) => (
                  <MeasurementGroup
                    key={group}
                    group={
                      group
                    }
                    anthropometry={
                      anthropometry
                    }
                    presentation={
                      presentation
                    }
                  />
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==================================================
          FRACCIONAMIENTO 5 MASAS
      ================================================== */}

      <section className="presentation-card five-masses-section print-page mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fraccionamiento
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              5 masas
            </h2>
          </div>

          <p className="text-xs text-muted-foreground">
            D. Kerr, 1988
          </p>
        </div>

        <div className="five-masses-chart mt-4">
          <ScoreZPlot
            title="Fraccionamiento 5 masas · Score-Z"
            items={
              fiveMassScoreItems
            }
          />
        </div>

        <div className="five-masses-table mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-3 py-2 text-left">
                  Componente
                </th>

                <th className="px-3 py-2 text-right">
                  Porcentaje
                </th>

                <th className="px-3 py-2 text-right">
                  Kg
                </th>

                <th className="px-3 py-2 text-right">
                  Score-Z
                </th>

                <th className="px-3 py-2 text-right">
                  Diferencia
                </th>
              </tr>
            </thead>

            <tbody>
              {MASS_ROWS.map(
                (row) => (
                  <tr
                    key={
                      row.key
                    }
                    className="border-t border-border"
                  >
                    <td className="px-3 py-2 font-medium">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            MASS_COLORS[
                              row.key
                            ],
                        }}
                      />

                      {
                        row.label
                      }
                    </td>

                    <td className="numeric px-3 py-2 text-right">
                      {presentation
                        .massPercentages[
                        row.key
                      ] != null
                        ? `${fmt(
                            presentation
                              .massPercentages[
                              row.key
                            ]!,
                            2,
                          )}%`
                        : "—"}
                    </td>

                    <td className="numeric px-3 py-2 text-right font-semibold">
                      {presentation
                        .massesKg[
                        row.key
                      ] != null
                        ? `${fmt(
                            presentation
                              .massesKg[
                              row.key
                            ]!,
                            3,
                          )} kg`
                        : "—"}
                    </td>

                    <td className="numeric px-3 py-2 text-right">
                      {presentation
                        .massScoreZ[
                        row.key
                      ] != null
                        ? fmt(
                            presentation
                              .massScoreZ[
                              row.key
                            ]!,
                            2,
                          )
                        : "—"}
                    </td>

                    <td className="numeric px-3 py-2 text-right">
                      {presentation
                        .massDifferencesKg
                        ? signed(
                            presentation
                              .massDifferencesKg[
                              row.key
                            ],
                            3,
                            " kg",
                          )
                        : "—"}
                    </td>
                  </tr>
                ),
              )}

              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                <td className="px-3 py-2">
                  Masa total
                </td>

                <td className="numeric px-3 py-2 text-right">
                  100,00%
                </td>

                <td className="numeric px-3 py-2 text-right">
                  {massTotal !=
                  null
                    ? `${fmt(
                        massTotal,
                        3,
                      )} kg`
                    : "—"}
                </td>

                <td className="numeric px-3 py-2 text-right">
                  {presentation
                    .totalMassScoreZ !=
                  null
                    ? fmt(
                        presentation
                          .totalMassScoreZ,
                        2,
                      )
                    : "—"}
                </td>

                <td className="px-3 py-2 text-right">
                  —
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <strong>
              Diferencia peso
              estructurado / peso
              bruto:
            </strong>{" "}
            {presentation
              .structuredDifferencePercent !=
            null
              ? signed(
                  presentation
                    .structuredDifferencePercent,
                  2,
                  "%",
                )
              : "—"}
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <strong>
              Masa ósea de referencia:
            </strong>{" "}
            {anthropometry
              .boneReferenceKg !=
            null
              ? `${fmt(
                  anthropometry
                    .boneReferenceKg,
                  3,
                )} kg`
              : "—"}
          </div>
        </div>

        <div className="five-masses-description mt-4 rounded-md border border-border p-4 text-sm">
          <p className="font-semibold">
            Fraccionamiento corporal
            en 5 componentes
          </p>

          <p className="mt-2 leading-relaxed text-muted-foreground">
            El modelo divide la masa
            corporal en tejido
            adiposo, muscular,
            residual, óseo y cutáneo.
            Los porcentajes y masas
            respetan la metodología
            utilizada por
            Antropogims.
          </p>

          <div className="mini-masses-grid mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <MiniMass
              label="Adiposa"
              detail="grasa subcutánea"
            />

            <MiniMass
              label="Muscular"
              detail="músculo"
            />

            <MiniMass
              label="Residual"
              detail="vísceras, órganos, pulmones"
            />

            <MiniMass
              label="Ósea"
              detail="huesos"
            />

            <MiniMass
              label="Cutánea"
              detail="piel"
            />
          </div>
        </div>
      </section>

      {/* ==================================================
          PHANTOM SCORE-Z
      ================================================== */}

      <section className="presentation-card print-page mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <PresentationHeader
          compact
          title="Phantom Score-Z"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <div className="phantom-description mt-4 rounded-md border border-border bg-muted/20 p-4 text-sm leading-relaxed">
          <p className="font-semibold">
            Modelo de
            proporcionalidad
            PHANTOM
          </p>

          <p className="mt-2 text-muted-foreground">
            El modelo PHANTOM usa
            una referencia unisex de
            170,18 cm. Las
            mediciones se ajustan a
            esa talla y luego se
            expresan en desvíos
            estándar mediante
            Score-Z.
          </p>

          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Un Score-Z de 0
            corresponde al valor de
            referencia. Valores
            positivos quedan por
            encima y valores
            negativos por debajo.
          </p>
        </div>

        <div className="phantom-grid mt-5 grid gap-5 lg:grid-cols-2">
          <ScoreZPlot
            title="Score-Z Básicos"
            items={makeScoreItems(
              BASIC_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />

          <ScoreZPlot
            title="Score-Z Diámetros"
            items={makeScoreItems(
              DIAMETER_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />

          <ScoreZPlot
            title="Score-Z Perímetros"
            items={makeScoreItems(
              PERIMETER_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />

          <ScoreZPlot
            title="Score-Z Pliegues"
            items={makeScoreItems(
              SKINFOLD_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />
        </div>
      </section>

      {/* ==================================================
          DATOS ADICIONALES
      ================================================== */}

      <section className="presentation-card additional-section print-page mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <PresentationHeader
          compact
          title="Datos adicionales"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <div className="additional-cards mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Índice cintura / cadera"
            value={
              presentation
                .additional
                .waistHipRatio !=
              null
                ? fmt(
                    presentation
                      .additional
                      .waistHipRatio,
                    3,
                  )
                : "—"
            }
          />

          <MetricCard
            label="Suma de 6 pliegues"
            value={
              presentation
                .additional
                .sum6 != null
                ? `${fmt(
                    presentation
                      .additional
                      .sum6,
                    1,
                  )} mm`
                : "—"
            }
          />

          <MetricCard
            label="Índice músculo / óseo"
            value={
              presentation
                .additional
                .muscleBoneIndex !=
              null
                ? fmt(
                    presentation
                      .additional
                      .muscleBoneIndex,
                    2,
                  )
                : "—"
            }
          />

          <MetricCard
            label="Índice adiposo / muscular"
            value={
              presentation
                .additional
                .adiposeMuscleIndex !=
              null
                ? fmt(
                    presentation
                      .additional
                      .adiposeMuscleIndex,
                    3,
                  )
                : "—"
            }
          />

          <MetricCard
            label="Índice de masa corporal"
            value={
              presentation
                .additional
                .bmi != null
                ? `${fmt(
                    presentation
                      .additional
                      .bmi,
                    2,
                  )} kg/m²`
                : "—"
            }
          />

          <MetricCard
            label="Talla sentado / talla"
            value={
              presentation
                .additional
                .sittingHeightStatureRatio !=
              null
                ? fmt(
                    presentation
                      .additional
                      .sittingHeightStatureRatio,
                    3,
                  )
                : "—"
            }
          />

          <MetricCard
            label="BSA"
            value={
              presentation
                .additional
                .bodySurfaceArea !=
              null
                ? `${fmt(
                    presentation
                      .additional
                      .bodySurfaceArea,
                    3,
                  )} m²`
                : "—"
            }
          />

          <MetricCard
            label="BSA / BM"
            value={
              presentation
                .additional
                .bodySurfaceAreaBodyMass !=
              null
                ? `${fmt(
                    presentation
                      .additional
                      .bodySurfaceAreaBodyMass,
                    2,
                  )} cm²/kg`
                : "—"
            }
          />
        </div>

        <div className="mt-5">
          <h3 className="font-display text-lg font-semibold">
            Índice cintura /
            cadera
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Tabla incluida en la
            presentación original
            como referencia
            descriptiva.
          </p>

          <WaistHipReferenceTable />
        </div>
      </section>

      {/* ==================================================
          SOMATOTIPO
      ================================================== */}

      <section className="presentation-card somatotype-section print-page mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <PresentationHeader
          compact
          title="Somatotipo de Heath & Carter"
          subtitle="1990"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <div className="somatotype-cards mt-5 grid gap-4 md:grid-cols-3">
          <SomatotypeCard
            label="Endomorfia"
            value={
              presentation
                .somatotype
                .endomorph
            }
            previous={
              previousPresentation
                ?.somatotype
                .endomorph
            }
          />

          <SomatotypeCard
            label="Mesomorfia"
            value={
              presentation
                .somatotype
                .mesomorph
            }
            previous={
              previousPresentation
                ?.somatotype
                .mesomorph
            }
          />

          <SomatotypeCard
            label="Ectomorfia"
            value={
              presentation
                .somatotype
                .ectomorph
            }
            previous={
              previousPresentation
                ?.somatotype
                .ectomorph
            }
          />
        </div>

        <div className="mt-5">
          <Somatochart
            x={
              presentation
                .somatotype.x
            }
            y={
              presentation
                .somatotype.y
            }
            previousX={
              previousPresentation
                ?.somatotype.x
            }
            previousY={
              previousPresentation
                ?.somatotype.y
            }
          />
        </div>

        <div className="somatotype-details mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Σ pliegues somatotipo"
            value={
              presentation
                .somatotype
                .skinfoldSum !=
              null
                ? `${fmt(
                    presentation
                      .somatotype
                      .skinfoldSum,
                    2,
                  )} mm`
                : "—"
            }
          />

          <MetricCard
            label="Brazo flexionado corregido"
            value={
              presentation
                .somatotype
                .correctedFlexedArm !=
              null
                ? `${fmt(
                    presentation
                      .somatotype
                      .correctedFlexedArm,
                    2,
                  )} cm`
                : "—"
            }
          />

          <MetricCard
            label="Pantorrilla corregida"
            value={
              presentation
                .somatotype
                .correctedCalf !=
              null
                ? `${fmt(
                    presentation
                      .somatotype
                      .correctedCalf,
                    2,
                  )} cm`
                : "—"
            }
          />

          <MetricCard
            label="Índice talla / peso"
            value={
              presentation
                .somatotype
                .heightWeightRatio !=
              null
                ? fmt(
                    presentation
                      .somatotype
                      .heightWeightRatio,
                    2,
                  )
                : "—"
            }
          />
        </div>

        <section className="comparison-card mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="font-semibold">
            Comparación con medición
            anterior
          </p>

          {previous ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Los campos
              “Anterior” y
              “Diferencia” se
              calcularon
              automáticamente contra
              la evaluación del{" "}
              <strong>
                {fmtDate(
                  previous.date,
                )}
              </strong>
              .
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Esta es la primera
              evaluación completa
              disponible para la
              jugadora. Todavía no hay
              una medición anterior
              para comparar.
            </p>
          )}
        </section>
      </section>
    </AppLayout>
  );
}

/* ============================================================
   ENCABEZADO
============================================================ */

function PresentationHeader({
  title,
  subtitle,
  playerName,
  anthropometry,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  playerName: string;
  anthropometry:
    FullAnthropometry;
  compact?: boolean;
}) {
  return (
    <section
      className={
        compact
          ? ""
          : "presentation-card presentation-main-header overflow-hidden rounded-lg border border-border bg-card shadow-panel"
      }
    >
      <div
        className={
          compact
            ? "border-b border-border pb-3"
            : "presentation-title-bar border-b border-border bg-primary px-5 py-4 text-primary-foreground"
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 text-sm opacity-80">
                {subtitle}
              </p>
            )}
          </div>

          {!compact && (
            <p className="text-sm font-semibold">
              {fmtDate(
                anthropometry.date,
              )}
            </p>
          )}
        </div>
      </div>

      <div
        className={
          compact
            ? "mt-3 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
            : "grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        <HeaderItem
          label="Nombre"
          value={
            playerName
          }
        />

        <HeaderItem
          label="Edad"
          value={
            anthropometry
              .ageYears !=
            null
              ? `${fmt(
                  anthropometry
                    .ageYears,
                  1,
                )} años`
              : "—"
          }
        />

        <HeaderItem
          label="N.º de medición"
          value={
            anthropometry
              .measurementNumber !=
            null
              ? String(
                  anthropometry
                    .measurementNumber,
                )
              : "—"
          }
        />

        <HeaderItem
          label="Fecha"
          value={
            fmtDate(
              anthropometry.date,
            )
          }
        />
      </div>
    </section>
  );
}

function HeaderItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="header-item bg-card px-4 py-3 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   TABLA DE MEDICIONES
============================================================ */

function MeasurementGroup({
  group,
  anthropometry,
  presentation,
}: {
  group:
    FullAnthropometryGroup;
  anthropometry:
    FullAnthropometry;
  presentation:
    ReturnType<
      typeof calculateAntropogimsPresentation
    >;
}) {
  const definitions =
    FULL_ANTHROPOMETRY_MEASURES.filter(
      (item) =>
        item.group ===
        group,
    );

  return (
    <>
      <tr className="measurement-group-row border-t border-border bg-primary/5">
        <td
          colSpan={6}
          className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary"
        >
          {
            FULL_ANTHROPOMETRY_GROUP_LABELS[
              group
            ]
          }
        </td>
      </tr>

      {definitions.map(
        (
          definition,
        ) => {
          const currentValue =
            currentMeasureValue(
              anthropometry,
              definition.key,
            );

          const adjustedValue =
            presentation
              .adjustedValues[
              definition.key
            ];

          const previousValue =
            presentation
              .previousValues[
              definition.key
            ];

          const difference =
            presentation
              .measurementDifferences[
              definition.key
            ];

          const scoreZ =
            presentation
              .phantomScoreZ[
              definition.key
            ];

          return (
            <tr
              key={
                definition.key
              }
              className="border-t border-border"
            >
              <td className="px-3 py-2">
                <span className="font-medium">
                  {
                    definition.label
                  }
                </span>

                <span className="ml-1 text-xs text-muted-foreground">
                  ({definition.unit})
                </span>
              </td>

              <td className="numeric px-3 py-2 text-right font-semibold">
                {formatMeasure(
                  currentValue,
                  2,
                )}
              </td>

              <td className="numeric px-3 py-2 text-right">
                {formatMeasure(
                  adjustedValue,
                  2,
                )}
              </td>

              <td className="numeric px-3 py-2 text-right">
                {formatMeasure(
                  previousValue,
                  2,
                )}
              </td>

              <td className="numeric px-3 py-2 text-right">
                {signed(
                  difference,
                  2,
                )}
              </td>

              <td className="numeric px-3 py-2 text-right font-semibold">
                {scoreZ !=
                null
                  ? fmt(
                      scoreZ,
                      2,
                    )
                  : "—"}
              </td>
            </tr>
          );
        },
      )}
    </>
  );
}

/* ============================================================
   SCORE-Z VISUAL
============================================================ */

type ScoreItem = {
  label: string;
  value:
    | number
    | null
    | undefined;
  color: string;
};

function makeScoreItems(
  keys:
    FullAnthropometryMeasureKey[],
  values:
    Partial<
      Record<
        FullAnthropometryMeasureKey,
        number | null
      >
    >,
): ScoreItem[] {
  const colors = [
    "#497eb9",
    "#c34f48",
    "#88aa46",
    "#72559b",
    "#49a1b3",
    "#e88a3c",
    "#527da8",
    "#a34e4e",
    "#779b46",
    "#67538f",
  ];

  return keys.map(
    (
      key,
      index,
    ) => ({
      label:
        measureLabel(
          key,
        ),

      value:
        values[
          key
        ],

      color:
        colors[
          index %
            colors.length
        ],
    }),
  );
}

function ScoreZPlot({
  title,
  items,
}: {
  title: string;
  items: ScoreItem[];
}) {
  return (
    <div className="score-z-plot avoid-print-break rounded-lg border border-border bg-background p-4">
      <h3 className="text-center font-display text-base font-semibold">
        {title}
      </h3>

      <div className="score-z-content mt-4">
        {items.map(
          (
            item,
          ) => {
            const clamped =
              item.value !=
              null
                ? clamp(
                    item.value,
                    -4,
                    4,
                  )
                : null;

            const left =
              clamped !=
              null
                ? (
                    (
                      clamped +
                      4
                    ) /
                    8
                  ) *
                  100
                : null;

            return (
              <div
                key={
                  item.label
                }
                className="score-z-row mb-3 grid grid-cols-[130px_1fr_52px] items-center gap-2"
              >
                <div className="score-z-label truncate text-xs font-medium">
                  {
                    item.label
                  }
                </div>

                <div
                  className="score-z-bar relative h-7 overflow-hidden rounded border border-border"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, transparent 49.7%, rgba(100,116,139,.5) 49.7%, rgba(100,116,139,.5) 50.3%, transparent 50.3%), repeating-linear-gradient(to right, transparent 0, transparent calc(12.5% - 1px), rgba(148,163,184,.28) calc(12.5% - 1px), rgba(148,163,184,.28) 12.5%)",
                  }}
                >
                  {left !=
                    null && (
                    <span
                      className="score-z-point absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                      style={{
                        left: `${left}%`,
                        backgroundColor:
                          item.color,
                      }}
                    />
                  )}
                </div>

                <div className="score-z-value numeric text-right text-xs font-semibold">
                  {item.value !=
                  null
                    ? fmt(
                        item.value,
                        2,
                      )
                    : "—"}
                </div>
              </div>
            );
          },
        )}

        <div className="score-z-axis ml-[138px] mr-[60px] mt-1 grid grid-cols-9 text-center text-[10px] text-muted-foreground">
          {[
            -4,
            -3,
            -2,
            -1,
            0,
            1,
            2,
            3,
            4,
          ].map(
            (
              value,
            ) => (
              <span
                key={
                  value
                }
              >
                {value}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DATOS ADICIONALES
============================================================ */

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card rounded-lg border border-border bg-muted/25 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 numeric text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

function MiniMass({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-xs font-semibold">
        {label}
      </p>

      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function WaistHipReferenceTable() {
  return (
    <div className="risk-table mt-3 overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead className="bg-muted/70">
          <tr>
            <th className="px-2 py-2 text-left">
              Sexo
            </th>

            <th className="px-2 py-2 text-left">
              Edad
            </th>

            <th className="px-2 py-2 text-center">
              Bajo
            </th>

            <th className="px-2 py-2 text-center">
              Moderado
            </th>

            <th className="px-2 py-2 text-center">
              Alto
            </th>

            <th className="px-2 py-2 text-center">
              Muy alto
            </th>
          </tr>
        </thead>

        <tbody>
          <RiskRow
            sex="Hombres"
            age="20–29"
            low="<0,83"
            moderate="0,83–0,88"
            high="0,89–0,94"
            veryHigh=">0,94"
          />

          <RiskRow
            sex="Hombres"
            age="30–39"
            low="<0,84"
            moderate="0,84–0,91"
            high="0,92–0,96"
            veryHigh=">0,96"
          />

          <RiskRow
            sex="Hombres"
            age="40–49"
            low="<0,88"
            moderate="0,88–0,95"
            high="0,96–1,00"
            veryHigh=">1,00"
          />

          <RiskRow
            sex="Hombres"
            age="50–59"
            low="<0,90"
            moderate="0,90–0,96"
            high="0,97–1,02"
            veryHigh=">1,02"
          />

          <RiskRow
            sex="Hombres"
            age="60–69"
            low="<0,91"
            moderate="0,91–0,98"
            high="0,99–1,03"
            veryHigh=">1,03"
          />

          <RiskRow
            sex="Mujeres"
            age="20–29"
            low="<0,71"
            moderate="0,71–0,77"
            high="0,78–0,82"
            veryHigh=">0,82"
          />

          <RiskRow
            sex="Mujeres"
            age="30–39"
            low="<0,72"
            moderate="0,72–0,78"
            high="0,79–0,84"
            veryHigh=">0,84"
          />

          <RiskRow
            sex="Mujeres"
            age="40–49"
            low="<0,73"
            moderate="0,73–0,79"
            high="0,80–0,87"
            veryHigh=">0,87"
          />

          <RiskRow
            sex="Mujeres"
            age="50–59"
            low="<0,74"
            moderate="0,74–0,81"
            high="0,82–0,88"
            veryHigh=">0,88"
          />

          <RiskRow
            sex="Mujeres"
            age="60–69"
            low="<0,76"
            moderate="0,76–0,83"
            high="0,84–0,90"
            veryHigh=">0,90"
          />
        </tbody>
      </table>
    </div>
  );
}

function RiskRow({
  sex,
  age,
  low,
  moderate,
  high,
  veryHigh,
}: {
  sex: string;
  age: string;
  low: string;
  moderate: string;
  high: string;
  veryHigh: string;
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-2 py-1.5 font-medium">
        {sex}
      </td>

      <td className="px-2 py-1.5">
        {age}
      </td>

      <td className="px-2 py-1.5 text-center">
        {low}
      </td>

      <td className="px-2 py-1.5 text-center">
        {moderate}
      </td>

      <td className="px-2 py-1.5 text-center">
        {high}
      </td>

      <td className="px-2 py-1.5 text-center">
        {veryHigh}
      </td>
    </tr>
  );
}

/* ============================================================
   SOMATOTIPO
============================================================ */

function SomatotypeCard({
  label,
  value,
  previous,
}: {
  label: string;
  value:
    | number
    | null;
  previous?:
    | number
    | null;
}) {
  return (
    <div className="somatotype-card rounded-lg border border-border bg-muted/25 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 numeric text-2xl font-bold">
        {value != null
          ? fmt(
              value,
              2,
            )
          : "—"}
      </p>

      {previous !=
        null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Anterior:{" "}
          {fmt(
            previous,
            2,
          )}
        </p>
      )}
    </div>
  );
}

function Somatochart({
  x,
  y,
  previousX,
  previousY,
}: {
  x:
    | number
    | null;
  y:
    | number
    | null;
  previousX?:
    | number
    | null;
  previousY?:
    | number
    | null;
}) {
  const minX = -8;
  const maxX = 8;

  const minY = -10;
  const maxY = 16;

  const position = (
    pointX:
      | number
      | null
      | undefined,
    pointY:
      | number
      | null
      | undefined,
  ) => {
    if (
      pointX == null ||
      pointY == null
    ) {
      return null;
    }

    const safeX =
      clamp(
        pointX,
        minX,
        maxX,
      );

    const safeY =
      clamp(
        pointY,
        minY,
        maxY,
      );

    return {
      left:
        (
          (
            safeX -
            minX
          ) /
          (
            maxX -
            minX
          )
        ) *
        100,

      top:
        (
          1 -
          (
            safeY -
            minY
          ) /
          (
            maxY -
            minY
          )
        ) *
        100,
    };
  };

  const current =
    position(
      x,
      y,
    );

  const previous =
    position(
      previousX,
      previousY,
    );

  return (
    <div className="somatochart-wrapper avoid-print-break rounded-lg border border-border bg-background p-4">
      <h3 className="text-center font-display text-lg font-semibold">
        Somatocarta
      </h3>

      <div className="somatochart-area relative mx-auto mt-4 h-[430px] max-w-3xl overflow-hidden border border-border bg-muted/10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.18) 1px, transparent 1px)",
            backgroundSize:
              "10% 10%",
          }}
        />

        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />

        <div className="absolute left-0 top-[61.5%] h-px w-full bg-border" />

        <div className="absolute left-1/2 top-3 -translate-x-1/2 text-sm font-bold text-blue-600">
          MESOMORFO
        </div>

        <div className="absolute bottom-8 left-4 text-sm font-bold text-orange-500">
          ENDOMORFO
        </div>

        <div className="absolute bottom-8 right-4 text-sm font-bold text-emerald-600">
          ECTOMORFO
        </div>

        {previous && (
          <span
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow"
            style={{
              left: `${previous.left}%`,
              top: `${previous.top}%`,
            }}
            title="Posicionamiento anterior"
          />
        )}

        {current && (
          <span
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
            style={{
              left: `${current.left}%`,
              top: `${current.top}%`,
            }}
            title="Posicionamiento actual"
          />
        )}
      </div>

      <div className="somatochart-legend mt-3 flex flex-wrap justify-center gap-5 text-xs">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-600" />
          Posicionamiento actual
        </span>

        {previous && (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Posicionamiento anterior
          </span>
        )}

        <span className="numeric font-medium">
          X:{" "}
          {x != null
            ? fmt(
                x,
                2,
              )
            : "—"}{" "}
          · Y:{" "}
          {y != null
            ? fmt(
                y,
                2,
              )
            : "—"}
        </span>
      </div>
    </div>
  );
}
