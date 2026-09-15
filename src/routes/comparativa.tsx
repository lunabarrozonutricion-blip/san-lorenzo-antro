import { createFileRoute } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Diff, Value } from "@/components/metric-cells";
import { Button } from "@/components/ui/button";
import { diff, fmt, fmtDate, metricValue } from "@/lib/calc";
import { best2025ForPlayer } from "@/lib/historical-best-2025";
import { useControls, usePlayer, usePlayers } from "@/lib/hooks";
import { GROUP_LABELS, METRICS, type MetricKey } from "@/lib/types";

export const Route = createFileRoute("/comparativa")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { player?: number; a?: number; b?: number } => ({
    player:
      s.player != null && s.player !== ""
        ? Number(s.player)
        : undefined,
    a: s.a != null && s.a !== "" ? Number(s.a) : undefined,
    b: s.b != null && s.b !== "" ? Number(s.b) : undefined,
  }),

  component: () => (
    <ClientOnly>
      <Comparativa />
    </ClientOnly>
  ),
});

function Comparativa() {
  const search = Route.useSearch();
  const players = usePlayers();

  const [playerId, setPlayerId] = useState<number | null>(
    search.player ?? null,
  );

  const controls = useControls(playerId);

  const [controlA, setControlA] = useState<number | null>(
    search.a ?? null,
  );

  const [controlB, setControlB] = useState<number | null>(
    search.b ?? null,
  );

  useEffect(() => {
    if (playerId === null && players && players.length > 0) {
      setPlayerId(players[0].id!);
    }
  }, [players, playerId]);

  useEffect(() => {
    if (!controls || controls.length === 0) {
      setControlA(null);
      setControlB(null);
      return;
    }

    const ids = controls.map((c) => c.id!);

    setControlA((actual) =>
      actual && ids.includes(actual) ? actual : ids[0],
    );

    setControlB((actual) =>
      actual && ids.includes(actual)
        ? actual
        : ids.length > 1
          ? ids[1]
          : null,
    );
  }, [controls]);

  const a = useMemo(
    () => controls?.find((c) => c.id === controlA),
    [controls, controlA],
  );

  const b = useMemo(
    () => controls?.find((c) => c.id === controlB),
    [controls, controlB],
  );

  function usarUltimosDos() {
    if (!controls || controls.length < 2) return;

    setControlA(controls[0].id!);
    setControlB(controls[1].id!);
  }

  const groups = [
    "principal",
    "pliegues",
    "perimetros",
    "corregidos",
  ] as const;

  return (
    <AppLayout
      title="Comparativa"
      subtitle="Compará dos controles de una misma jugadora"
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Jugadora
            </span>

            <select
              value={playerId ?? ""}
              onChange={(e) => {
                setPlayerId(Number(e.target.value));
                setControlA(null);
                setControlB(null);
              }}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(players ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Control más reciente
            </span>

            <select
              value={controlA ?? ""}
              onChange={(e) =>
                setControlA(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Seleccionar</option>

              {(controls ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {fmtDate(c.date)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Control anterior
            </span>

            <select
              value={controlB ?? ""}
              onChange={(e) =>
                setControlB(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Seleccionar</option>

              {(controls ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {fmtDate(c.date)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            onClick={usarUltimosDos}
            disabled={!controls || controls.length < 2}
          >
            <GitCompareArrows className="h-4 w-4" />
            Comparar con control anterior
          </Button>
        </div>
      </div>

      {!controls || controls.length < 2 ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-6 text-center shadow-panel">
          <p className="font-semibold">
            Esta jugadora necesita al menos dos controles.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Cuando tenga dos mediciones cargadas vas a poder compararlas.
          </p>
        </div>
      ) : null}

      {a && b ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Resumen
              label="Control reciente"
              value={fmtDate(a.date)}
            />

            <Resumen
              label="Control anterior"
              value={fmtDate(b.date)}
            />

            <Resumen
              label="Diferencia"
              value="Reciente − anterior"
            />
          </div>

          {groups.map((group) => {
            const metrics = METRICS.filter(
              (metric) => metric.group === group,
            );

            return (
              <div
                key={group}
                className="overflow-hidden rounded-lg border border-border bg-card shadow-panel"
              >
                <div className="border-b border-border bg-muted/50 px-4 py-3">
                  <h2 className="panel-title text-xs font-semibold text-muted-foreground">
                    {GROUP_LABELS[group]}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2 font-medium">
                          Variable
                        </th>

                        <th className="px-4 py-2 text-right font-medium">
                          {fmtDate(b.date)}
                        </th>

                        <th className="px-4 py-2 text-right font-medium">
                          {fmtDate(a.date)}
                        </th>

                        <th className="px-4 py-2 text-right font-medium">
                          Diferencia
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {metrics.map((metric) => (
                        <MetricRow
                          key={metric.key}
                          metric={metric.key}
                          label={metric.label}
                          unit={metric.unit}
                          decimals={metric.decimals}
                          reciente={a}
                          anterior={b}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </AppLayout>
  );
}

function MetricRow({
  metric,
  label,
  unit,
  decimals,
  reciente,
  anterior,
}: {
  metric: MetricKey;
  label: string;
  unit: string;
  decimals: number;
  reciente: Parameters<typeof metricValue>[0];
  anterior: Parameters<typeof metricValue>[0];
}) {
  const nuevo = metricValue(reciente, metric);
  const previo = metricValue(anterior, metric);

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-3 font-medium">
        {label}
        <span className="ml-1 text-xs text-muted-foreground">
          ({unit})
        </span>
      </td>

      <td className="numeric px-4 py-3 text-right">
        <Value value={previo} decimals={decimals} />
      </td>

      <td className="numeric px-4 py-3 text-right font-semibold">
        <Value value={nuevo} decimals={decimals} />
      </td>

      <td className="px-4 py-3 text-right">
        <Diff
          value={diff(nuevo, previo)}
          decimals={decimals}
        />
      </td>
    </tr>
  );
}

function Resumen({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
      <p className="panel-title text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-display text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}
