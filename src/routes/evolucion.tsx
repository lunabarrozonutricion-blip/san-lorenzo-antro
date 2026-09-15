import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  fmt,
  fmtDate,
  fmtDiff,
  metricValue,
  sortByDateAsc,
} from "@/lib/calc";
import { useControls, usePlayer, usePlayers } from "@/lib/hooks";
import { best2025ForPlayer } from "@/lib/historical-best-2025";
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
      s.player != null && s.player !== ""
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

  const [playerId, setPlayerId] = useState<number | null>(
    search.player ?? null,
  );

  const [metricKey, setMetricKey] =
    useState<MetricKey>("weight");

  const controls = useControls(playerId);

  useEffect(() => {
    if (playerId === null && players && players.length > 0) {
      setPlayerId(players[0].id!);
    }
  }, [players, playerId]);

  const metric =
    METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  const chartData = useMemo(() => {
    return sortByDateAsc(controls ?? []).map((control) => ({
      date: control.date,
      label: fmtDate(control.date),
      value: metricValue(control, metricKey),
    }));
  }, [controls, metricKey]);

  const validData = useMemo(
    () =>
      chartData.filter(
        (item): item is typeof item & { value: number } =>
          item.value !== null,
      ),
    [chartData],
  );

  const first = validData[0];
  const last = validData[validData.length - 1];

  const cambio =
    first && last ? last.value - first.value : null;

  const groups = [
    "principal",
    "pliegues",
    "perimetros",
    "corregidos",
  ] as const;

  return (
    <AppLayout
      title="Evolución"
      subtitle="Seguimiento temporal por jugadora y variable"
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Jugadora
            </span>

            <select
              value={playerId ?? ""}
              onChange={(e) =>
                setPlayerId(
                  e.target.value
                    ? Number(e.target.value)
                    : null,
                )
              }
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(players ?? []).map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Variable
            </span>

            <select
              value={metricKey}
              onChange={(e) =>
                setMetricKey(e.target.value as MetricKey)
              }
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {groups.map((group) => (
                <optgroup
                  key={group}
                  label={GROUP_LABELS[group]}
                >
                  {METRICS.filter(
                    (metric) => metric.group === group,
                  ).map((metric) => (
                    <option
                      key={metric.key}
                      value={metric.key}
                    >
                      {metric.label} ({metric.unit})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Primer registro"
          value={
            first
              ? `${fmt(
                  first.value,
                  metric.decimals,
                )} ${metric.unit}`
              : "—"
          }
          sub={first?.label}
        />

        <SummaryCard
          label="Último registro"
          value={
            last
              ? `${fmt(
                  last.value,
                  metric.decimals,
                )} ${metric.unit}`
              : "—"
          }
          sub={last?.label}
        />

        <SummaryCard
          label="Cambio total"
          value={
            cambio !== null
              ? `${fmtDiff(
                  cambio,
                  metric.decimals,
                )} ${metric.unit}`
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
            Valores expresados en {metric.unit}
          </p>
        </div>

        {validData.length >= 2 ? (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={validData}
                margin={{
                  top: 10,
                  right: 20,
                  bottom: 10,
                  left: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  minTickGap={25}
                />

                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12 }}
                  width={55}
                />

                <Tooltip
                  formatter={(value) => [
                    `${fmt(
                      Number(value),
                      metric.decimals,
                    )} ${metric.unit}`,
                    metric.label,
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center text-center">
            <div>
              <p className="font-semibold">
                No hay suficientes datos
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Se necesitan al menos dos controles con esta
                variable para mostrar la evolución.
              </p>
            </div>
          </div>
        )}
      </div>

      {validData.length > 0 && (
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
                    {metric.label}
                  </th>
                </tr>
              </thead>

              <tbody>
                {[...validData].reverse().map((item, index) => (
                  <tr
                    key={`${item.date}-${index}`}
                    className="border-t border-border"
                  >
                    <td className="px-4 py-2">
                      {item.label}
                    </td>

                    <td className="numeric px-4 py-2 text-right font-semibold">
                      {fmt(
                        item.value,
                        metric.decimals,
                      )}{" "}
                      <span className="font-normal text-muted-foreground">
                        {metric.unit}
                      </span>
                    </td>
                  </tr>
                ))}
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
