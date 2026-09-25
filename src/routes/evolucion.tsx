import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";
import {
  fmt,
  fmtDate,
  fmtDiff,
  metricValue,
  sortByDateAsc,
} from "@/lib/calc";
import { createEvolutionReportPdf } from "@/lib/evolution-report-pdf";
import {
  useControls,
  usePlayer,
  usePlayers,
} from "@/lib/hooks";
import { best2025ForPlayer } from "@/lib/historical-best-2025";
import { shareFile } from "@/lib/share-file";
import {
  GROUP_LABELS,
  METRICS,
  type MetricKey,
} from "@/lib/types";

export const Route = createFileRoute("/evolucion")({
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
      <Evolucion />
    </ClientOnly>
  ),
});

function Evolucion() {
  const search = Route.useSearch();
  const players = usePlayers();

  const [playerId, setPlayerId] =
    useState<number | null>(
      search.player ?? null,
    );

  const [metricKey, setMetricKey] =
    useState<MetricKey>("weight");

  const [
    showBest2025,
    setShowBest2025,
  ] = useState(false);

  const [sharing, setSharing] =
    useState(false);

  const controls =
    useControls(playerId);

  const player =
    usePlayer(playerId);

  const best2025 = useMemo(
    () =>
      best2025ForPlayer(
        player,
      ),
    [player],
  );

  useEffect(() => {
    if (
      playerId === null &&
      players &&
      players.length > 0
    ) {
      setPlayerId(
        players[0].id!,
      );
    }
  }, [players, playerId]);

  const metric =
    METRICS.find(
      (m) =>
        m.key === metricKey,
    ) ?? METRICS[0];

  const supportsBest2025 =
    metricKey === "weight" ||
    metricKey === "sum6";

  const ref2025Value =
    useMemo(() => {
      if (!best2025) {
        return null;
      }

      if (
        metricKey ===
        "weight"
      ) {
        return best2025.weight;
      }

      if (
        metricKey === "sum6"
      ) {
        return best2025.sum6;
      }

      return null;
    }, [
      best2025,
      metricKey,
    ]);

  const showReference =
    showBest2025 &&
    supportsBest2025 &&
    ref2025Value !== null;

  const chartData =
    useMemo(() => {
      return sortByDateAsc(
        controls ?? [],
      ).map(
        (control) => ({
          date: control.date,
          label: fmtDate(
            control.date,
          ),
          value:
            metricValue(
              control,
              metricKey,
            ),
        }),
      );
    }, [
      controls,
      metricKey,
    ]);

  const validData =
    useMemo(
      () =>
        chartData.filter(
          (
            item,
          ): item is typeof item & {
            value: number;
          } =>
            item.value !==
            null,
        ),
      [chartData],
    );

  const yDomain =
    useMemo<
      [number, number]
    >(() => {
      const values =
        validData.map(
          (item) =>
            item.value,
        );

      if (
        showReference &&
        ref2025Value !==
          null
      ) {
        values.push(
          ref2025Value,
        );
      }

      if (
        values.length === 0
      ) {
        return [0, 1];
      }

      const min =
        Math.min(...values);

      const max =
        Math.max(...values);

      const span =
        max - min;

      const padding =
        span > 0
          ? Math.max(
              span * 0.15,
              metricKey ===
                "weight"
                ? 0.5
                : 2,
            )
          : metricKey ===
              "weight"
            ? 1
            : 3;

      return [
        Math.floor(
          (min - padding) *
            10,
        ) / 10,

        Math.ceil(
          (max + padding) *
            10,
        ) / 10,
      ];
    }, [
      validData,
      showReference,
      ref2025Value,
      metricKey,
    ]);

  const first =
    validData[0];

  const last =
    validData[
      validData.length - 1
    ];

  const cambio =
    first && last
      ? last.value -
        first.value
      : null;

  async function compartirEvolucion() {
    if (
      !player ||
      validData.length ===
        0
    ) {
      toast.error(
        "No hay datos para compartir.",
      );

      return;
    }

    setSharing(true);

    try {
      const {
        blob,
        fileName,
      } =
        createEvolutionReportPdf({
          playerName:
            player.name,

          metricLabel:
            metric.label,

          unit:
            metric.unit,

          decimals:
            metric.decimals,

          data:
            validData.map(
              (item) => ({
                date:
                  item.date,
                label:
                  item.label,
                value:
                  item.value,
              }),
            ),

          reference:
            showReference &&
            best2025 &&
            ref2025Value !==
              null
              ? {
                  value:
                    ref2025Value,
                  label:
                    best2025.period,
                }
              : null,
        });

      const result =
        await shareFile({
          blob,
          fileName,
          title: `Evolución · ${player.name}`,
          text: `Evolución de ${metric.label} · ${player.name}`,
        });

      if (
        result.status ===
        "unsupported"
      ) {
        toast.error(
          result.message,
        );
      }
    } catch (error) {
      console.error(error);

      toast.error(
        "No se pudo compartir la evolución.",
      );
    } finally {
      setSharing(false);
    }
  }

  const groups = [
    "principal",
    "pliegues",
    "perimetros",
    "corregidos",
  ] as const;

  return (
    <AppLayout
      title={
        player
          ? `Evolución · ${player.name}`
          : "Evolución"
      }
      subtitle="Seguimiento temporal por jugadora y variable"
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={
            !player ||
            validData.length ===
              0 ||
            sharing
          }
          onClick={() =>
            void compartirEvolucion()
          }
        >
          <Share2 className="h-4 w-4" />

          {sharing
            ? "Preparando..."
            : "Compartir"}
        </Button>
      }
    >
      <PlayerNav
        playerId={playerId}
        playerName={
          player?.name
        }
        current="evolucion"
      />

      <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Jugadora
            </span>

            <select
              value={
                playerId ?? ""
              }
              onChange={(
                e,
              ) => {
                setPlayerId(
                  e.target
                    .value
                    ? Number(
                        e.target
                          .value,
                      )
                    : null,
                );

                setShowBest2025(
                  false,
                );
              }}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(
                players ?? []
              ).map(
                (
                  player,
                ) => (
                  <option
                    key={
                      player.id
                    }
                    value={
                      player.id
                    }
                  >
                    {
                      player.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Variable
            </span>

            <select
              value={
                metricKey
              }
              onChange={(
                e,
              ) =>
                setMetricKey(
                  e.target
                    .value as MetricKey,
                )
              }
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {groups.map(
                (
                  group,
                ) => (
                  <optgroup
                    key={
                      group
                    }
                    label={
                      GROUP_LABELS[
                        group
                      ]
                    }
                  >
                    {METRICS.filter(
                      (
                        metric,
                      ) =>
                        metric.group ===
                        group,
                    ).map(
                      (
                        metric,
                      ) => (
                        <option
                          key={
                            metric.key
                          }
                          value={
                            metric.key
                          }
                        >
                          {
                            metric.label
                          }{" "}
                          (
                          {
                            metric.unit
                          }
                          )
                        </option>
                      ),
                    )}
                  </optgroup>
                ),
              )}
            </select>
          </label>
        </div>

        {best2025 &&
        supportsBest2025 ? (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
            <input
              type="checkbox"
              checked={
                showBest2025
              }
              onChange={(
                e,
              ) =>
                setShowBest2025(
                  e.target
                    .checked,
                )
              }
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />

            <div>
              <p className="text-sm font-semibold">
                Comparar con
                mejor 2025
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Activá esta
                opción para
                mostrar la
                referencia
                histórica en el
                gráfico.
              </p>
            </div>
          </label>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Primer registro"
          value={
            first
              ? `${fmt(
                  first.value,
                  metric.decimals,
                )} ${
                  metric.unit
                }`
              : "—"
          }
          sub={
            first?.label
          }
        />

        <SummaryCard
          label="Último registro"
          value={
            last
              ? `${fmt(
                  last.value,
                  metric.decimals,
                )} ${
                  metric.unit
                }`
              : "—"
          }
          sub={
            last?.label
          }
        />

        <SummaryCard
          label="Cambio total"
          value={
            cambio !== null
              ? `${fmtDiff(
                  cambio,
                  metric.decimals,
                )} ${
                  metric.unit
                }`
              : "—"
          }
          sub={
            validData.length
              ? `${validData.length} controles con dato`
              : undefined
          }
        />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="mb-5">
          <p className="panel-title text-xs text-muted-foreground">
            Evolución temporal
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            {metric.label}
          </h2>

          <p className="text-sm text-muted-foreground">
            Valores
            expresados en{" "}
            {metric.unit}
          </p>

          {showReference &&
          best2025 ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Mejor registro
                2025
              </p>

              <p className="mt-0.5 text-lg font-bold text-red-700">
                {fmt(
                  ref2025Value!,
                  metric.decimals,
                )}{" "}
                {metric.unit}
              </p>

              <p className="text-xs text-muted-foreground">
                {
                  best2025.period
                }
              </p>
            </div>
          ) : null}
        </div>

        {validData.length >=
        2 ? (
          <div className="h-[360px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={
                  validData
                }
                margin={{
                  top: 20,
                  right: 20,
                  bottom: 10,
                  left: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                  }}
                  minTickGap={
                    25
                  }
                />

                <YAxis
                  domain={
                    yDomain
                  }
                  tick={{
                    fontSize: 12,
                  }}
                  width={55}
                  allowDataOverflow={
                    false
                  }
                />

                <Tooltip
                  formatter={(
                    value,
                  ) => [
                    `${fmt(
                      Number(
                        value,
                      ),
                      metric.decimals,
                    )} ${
                      metric.unit
                    }`,
                    metric.label,
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={
                    2.5
                  }
                  dot={{
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />

                {showReference ? (
                  <ReferenceLine
                    y={
                      ref2025Value!
                    }
                    stroke="#c8102e"
                    strokeDasharray="7 5"
                    strokeWidth={
                      2.5
                    }
                    isFront
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center text-center">
            <div>
              <p className="font-semibold">
                No hay
                suficientes
                datos
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Se necesitan al
                menos dos
                controles con
                esta variable
                para mostrar la
                evolución.
              </p>
            </div>
          </div>
        )}
      </div>

      {validData.length >
        0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
          <div className="border-b border-border px-4 py-3">
            <p className="panel-title text-xs text-muted-foreground">
              Registros
            </p>
          </div>

          <div className="max-h-[350px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">
                    Fecha
                  </th>

                  <th className="px-4 py-2 text-right">
                    {
                      metric.label
                    }
                  </th>
                </tr>
              </thead>

              <tbody>
                {[
                  ...validData,
                ]
                  .reverse()
                  .map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={`${item.date}-${index}`}
                        className="border-t border-border"
                      >
                        <td className="px-4 py-2">
                          {
                            item.label
                          }
                        </td>

                        <td className="numeric px-4 py-2 text-right font-semibold">
                          {fmt(
                            item.value,
                            metric.decimals,
                          )}{" "}
                          <span className="font-normal text-muted-foreground">
                            {
                              metric.unit
                            }
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
      <p className="panel-title text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-display text-xl font-semibold">
        {value}
      </p>

      {sub && (
        <p className="mt-1 text-xs text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}
