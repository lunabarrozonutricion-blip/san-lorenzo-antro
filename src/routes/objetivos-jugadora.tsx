import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import {
  fmt,
  fmtDate,
  metricValue,
} from "@/lib/calc";
import {
  useControls,
  useObjectivePeriods,
  usePlayer,
} from "@/lib/hooks";
import { targetForPlayer } from "@/lib/objectives";

export const Route = createFileRoute(
  "/objetivos-jugadora",
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
      <ObjetivosJugadora />
    </ClientOnly>
  ),
});

function ObjetivosJugadora() {
  const search = Route.useSearch();
  const playerId =
    search.player ?? null;

  const player =
    usePlayer(playerId);

  const controls =
    useControls(playerId);

  const objectivePeriods =
    useObjectivePeriods();

  const objectives = useMemo(() => {
    if (!player) {
      return [];
    }

    return (
      objectivePeriods ?? []
    )
      .map((period) => ({
        period,
        target:
          targetForPlayer(
            period,
            player,
          ),
      }))
      .filter(
        (
          item,
        ): item is typeof item & {
          target: number;
        } =>
          item.target !== null,
      )
      .sort((a, b) =>
        b.period.key.localeCompare(
          a.period.key,
        ),
      );
  }, [
    objectivePeriods,
    player,
  ]);

  const current =
    objectives[0];

  const latestSum6Control =
    controls?.find(
      (control) =>
        metricValue(
          control,
          "sum6",
        ) !== null,
    );

  const latestSum6 =
    latestSum6Control
      ? metricValue(
          latestSum6Control,
          "sum6",
        )
      : null;

  const delta =
    latestSum6 !== null &&
    current
      ? latestSum6 -
        current.target
      : null;

  if (!playerId) {
    return (
      <AppLayout title="Objetivos">
        <p className="text-sm text-muted-foreground">
          No se seleccionó una
          jugadora.
        </p>
      </AppLayout>
    );
  }

  if (!player) {
    return (
      <AppLayout title="Objetivos">
        <p className="text-sm text-muted-foreground">
          Cargando jugadora…
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Objetivos · ${player.name}`}
      subtitle="Historial de objetivos individuales"
    >
      <PlayerNav
        playerId={playerId}
        playerName={player.name}
        current="objetivos"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Objetivo actual
          </p>

          <p className="mt-2 font-display text-2xl font-semibold">
            {current
              ? `${fmt(
                  current.target,
                  1,
                )} mm`
              : "—"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {current?.period.label ??
              "Sin objetivo cargado"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Último Sum6
          </p>

          <p className="mt-2 font-display text-2xl font-semibold">
            {latestSum6 !== null
              ? `${fmt(
                  latestSum6,
                  1,
                )} mm`
              : "—"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {latestSum6Control
              ? fmtDate(
                  latestSum6Control.date,
                )
              : "Sin controles"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Δ vs objetivo
          </p>

          <p
            className={`mt-2 font-display text-2xl font-semibold ${
              delta === null
                ? ""
                : delta <= 0
                  ? "text-emerald-700"
                  : "text-rose-700"
            }`}
          >
            {delta !== null
              ? `${
                  delta > 0
                    ? "+"
                    : ""
                }${fmt(
                  delta,
                  1,
                )} mm`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Historial de objetivos
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            {player.name}
          </h2>
        </div>

        {objectives.length >
        0 ? (
          <div className="divide-y divide-border">
            {objectives.map(
              ({
                period,
                target,
              }) => (
                <div
                  key={
                    period.key
                  }
                  className="flex items-center justify-between gap-4 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      {
                        period.label
                      }
                    </p>
                  </div>

                  <p className="numeric text-lg font-bold">
                    {fmt(
                      target,
                      1,
                    )}{" "}
                    mm
                  </p>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Esta jugadora todavía
            no tiene objetivos
            cargados.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
