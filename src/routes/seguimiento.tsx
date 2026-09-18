import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import {
  diff,
  fmt,
  fmtDate,
  fmtDiff,
  metricValue,
} from "@/lib/calc";
import {
  useControls,
  useObjectivePeriods,
  usePlayers,
} from "@/lib/hooks";
import type { Control } from "@/lib/types";

export const Route = createFileRoute("/seguimiento")({
  component: () => (
    <ClientOnly>
      <SeguimientoGrupal />
    </ClientOnly>
  ),
});

function SeguimientoGrupal() {
  const players = usePlayers();
  const controls = useControls();
  const objectivePeriods =
    useObjectivePeriods();

  const [search, setSearch] =
    useState("");

  const latestObjectivePeriod =
    useMemo(() => {
      if (
        !objectivePeriods ||
        objectivePeriods.length === 0
      ) {
        return null;
      }

      return (
        [...objectivePeriods]
          .sort((a, b) =>
            a.key.localeCompare(b.key),
          )
          .at(-1) ?? null
      );
    }, [objectivePeriods]);

  const targetByPlayerId =
    useMemo(() => {
      const map = new Map<
        number,
        number | null
      >();

      for (
        const target of
        latestObjectivePeriod
          ?.targets ?? []
      ) {
        map.set(
          target.playerId,
          target.target,
        );
      }

      return map;
    }, [latestObjectivePeriod]);

  const controlsByPlayer =
    useMemo(() => {
      const map =
        new Map<number, Control[]>();

      for (
        const control of
        controls ?? []
      ) {
        if (
          metricValue(
            control,
            "sum6",
          ) === null
        ) {
          continue;
        }

        const list =
          map.get(
            control.playerId,
          ) ?? [];

        list.push(control);

        map.set(
          control.playerId,
          list,
        );
      }

      for (
        const list of
        map.values()
      ) {
        list.sort((a, b) => {
          const byDate =
            a.date.localeCompare(
              b.date,
            );

          if (byDate !== 0) {
            return byDate;
          }

          return (
            (a.id ?? 0) -
            (b.id ?? 0)
          );
        });
      }

      return map;
    }, [controls]);

  const filteredPlayers =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      return (
        players ?? []
      )
        .filter(
          (player) =>
            player.active === 1,
        )
        .filter((player) =>
          !text
            ? true
            : player.name
                .toLowerCase()
                .includes(text),
        );
    }, [players, search]);

  const maxControls =
    useMemo(() => {
      let max = 0;

      for (
        const player of
        filteredPlayers
      ) {
        if (
          player.id == null
        ) {
          continue;
        }

        const count =
          controlsByPlayer.get(
            player.id,
          )?.length ?? 0;

        max = Math.max(
          max,
          count,
        );
      }

      return max;
    }, [
      filteredPlayers,
      controlsByPlayer,
    ]);

  const totalMeasurements =
    useMemo(() => {
      return filteredPlayers.reduce(
        (total, player) => {
          if (
            player.id == null
          ) {
            return total;
          }

          return (
            total +
            (controlsByPlayer.get(
              player.id,
            )?.length ?? 0)
          );
        },
        0,
      );
    }, [
      filteredPlayers,
      controlsByPlayer,
    ]);

  return (
    <AppLayout
      title="Seguimiento grupal"
      subtitle="Evolución automática de Sum6 del plantel"
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Seguimiento automático
              </p>

              <h2 className="mt-1 font-display text-2xl font-semibold">
                Evolución del plantel
              </h2>

              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Cada control nuevo que cargues con Sum6
                aparecerá automáticamente en esta pantalla.
                No hace falta volver a cargar ningún dato.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Jugadoras"
                value={String(
                  filteredPlayers.length,
                )}
              />

              <StatCard
                label="Mediciones"
                value={String(
                  totalMeasurements,
                )}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-full max-w-sm">
              <label className="text-xs font-semibold text-muted-foreground">
                Buscar jugadora
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Apellido o nombre..."
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Objetivo vigente
              </p>

              <p className="mt-0.5 text-sm font-semibold">
                {latestObjectivePeriod?.label ??
                  "Sin objetivo cargado"}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
          <div className="border-b border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Sum 6 pliegues
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold">
              Controles acumulados
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Los controles se ordenan del más antiguo al
              más reciente. Cada celda muestra fecha,
              Sum6 y cambio respecto del control anterior.
            </p>
          </div>

          {filteredPlayers.length ===
          0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay jugadoras para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-max text-sm">
                <thead className="bg-muted/80">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-[190px] border-r border-border bg-muted px-4 py-3 text-left font-semibold">
                      Jugadora
                    </th>

                    {Array.from({
                      length: maxControls,
                    }).map(
                      (_, index) => (
                        <th
                          key={index}
                          className="min-w-[145px] px-3 py-3 text-center font-semibold"
                        >
                          Control{" "}
                          {index + 1}
                        </th>
                      ),
                    )}

                    <th className="min-w-[130px] border-l border-border px-3 py-3 text-right font-semibold">
                      Último
                    </th>

                    <th className="min-w-[150px] px-3 py-3 text-right font-semibold">
                      Objetivo
                    </th>

                    <th className="min-w-[145px] px-3 py-3 text-right font-semibold">
                      Δ objetivo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPlayers.map(
                    (player) => {
                      if (
                        player.id ==
                        null
                      ) {
                        return null;
                      }

                      const playerControls =
                        controlsByPlayer.get(
                          player.id,
                        ) ?? [];

                      const target =
                        targetByPlayerId.get(
                          player.id,
                        ) ?? null;

                      const latest =
                        playerControls.at(
                          -1,
                        );

                      const latestSum6 =
                        latest
                          ? metricValue(
                              latest,
                              "sum6",
                            )
                          : null;

                      const targetDiff =
                        latestSum6 !==
                          null &&
                        target !== null
                          ? diff(
                              latestSum6,
                              target,
                            )
                          : null;

                      return (
                        <tr
                          key={
                            player.id
                          }
                          className="border-t border-border"
                        >
                          <td className="sticky left-0 z-10 border-r border-border bg-[#0B234A] px-4 py-3 font-semibold text-white">
                            {
                              player.name
                            }
                          </td>

                          {Array.from({
                            length:
                              maxControls,
                          }).map(
                            (
                              _,
                              index,
                            ) => {
                              const control =
                                playerControls[
                                  index
                                ];

                              const previous =
                                index > 0
                                  ? playerControls[
                                      index -
                                        1
                                    ]
                                  : undefined;

                              if (
                                !control
                              ) {
                                return (
                                  <td
                                    key={
                                      index
                                    }
                                    className="px-3 py-3 text-center text-muted-foreground"
                                  >
                                    —
                                  </td>
                                );
                              }

                              const value =
                                metricValue(
                                  control,
                                  "sum6",
                                );

                              const previousValue =
                                previous
                                  ? metricValue(
                                      previous,
                                      "sum6",
                                    )
                                  : null;

                              const change =
                                value !==
                                  null &&
                                previousValue !==
                                  null
                                  ? diff(
                                      value,
                                      previousValue,
                                    )
                                  : null;

                              return (
                                <td
                                  key={
                                    control.id ??
                                    `${player.id}-${index}`
                                  }
                                  className="px-3 py-3 text-center"
                                >
                                  <div className="rounded-md border border-border bg-background px-2 py-2">
                                    <p className="text-[10px] font-medium text-muted-foreground">
                                      {fmtDate(
                                        control.date,
                                      )}
                                    </p>

                                    <p className="numeric mt-1 font-semibold">
                                      {fmt(
                                        value,
                                        1,
                                      )}{" "}
                                      mm
                                    </p>

                                    {change !==
                                      null && (
                                      <p
                                        className={`numeric mt-1 text-[11px] font-semibold ${
                                          change >
                                          0
                                            ? "text-rose-700"
                                            : change <
                                                0
                                              ? "text-emerald-700"
                                              : "text-muted-foreground"
                                        }`}
                                      >
                                        Δ{" "}
                                        {fmtDiff(
                                          change,
                                          1,
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            },
                          )}

                          <td className="border-l border-border px-3 py-3 text-right">
                            {latestSum6 !==
                            null ? (
                              <div>
                                <p className="numeric font-bold">
                                  {fmt(
                                    latestSum6,
                                    1,
                                  )}{" "}
                                  mm
                                </p>

                                {latest && (
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    {fmtDate(
                                      latest.date,
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {target !==
                            null ? (
                              <div>
                                <p className="numeric font-semibold">
                                  {fmt(
                                    target,
                                    1,
                                  )}{" "}
                                  mm
                                </p>

                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {latestObjectivePeriod?.label ??
                                    ""}
                                </p>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {targetDiff !==
                            null ? (
                              <span
                                className={`numeric rounded-full px-2 py-1 text-xs font-semibold ${
                                  targetDiff >
                                  0
                                    ? "bg-rose-50 text-rose-700"
                                    : targetDiff <
                                        0
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-muted text-foreground"
                                }`}
                              >
                                {fmtDiff(
                                  targetDiff,
                                  1,
                                )}{" "}
                                mm
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[110px] rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="numeric mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}
