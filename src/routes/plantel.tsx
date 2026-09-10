import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { fmt, fmtDate, metricValue } from "@/lib/calc";
import { useControls, usePlayers } from "@/lib/hooks";
import { METRICS, type MetricKey } from "@/lib/types";

export const Route = createFileRoute("/plantel")({
  component: () => (
    <ClientOnly>
      <Plantel />
    </ClientOnly>
  ),
});

function Plantel() {
  const players = usePlayers();
  const controls = useControls();

  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "weight",
    "sum6",
  ]);

  const [search, setSearch] = useState("");

  const lastByPlayer = useMemo(() => {
    const map = new Map<number, (typeof controls)[number]>();

    for (const control of controls ?? []) {
      if (!map.has(control.playerId)) {
        map.set(control.playerId, control);
      }
    }

    return map;
  }, [controls]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return players ?? [];

    return (players ?? []).filter((player) =>
      player.name.toLowerCase().includes(text),
    );
  }, [players, search]);

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  return (
    <AppLayout
      title="Plantel completo"
      subtitle="Último control disponible de todas las jugadoras"
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="panel-title text-xs text-muted-foreground">
              Buscar jugadora
            </p>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por apellido o nombre..."
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm lg:max-w-md"
            />
          </div>

          <div className="flex items-end">
            <p className="text-sm text-muted-foreground">
              {filteredPlayers.length} jugadoras
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <p className="panel-title text-xs text-muted-foreground">
          Columnas visibles
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setSelectedMetrics(["weight", "sum6"])
            }
          >
            Peso + Sum6P
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setSelectedMetrics(
                METRICS.map((metric) => metric.key),
              )
            }
          >
            Todas
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedMetrics([])}
          >
            Ninguna
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <label
              key={metric.key}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedMetrics.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
                className="h-4 w-4"
              />

              <span>
                {metric.label}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({metric.unit})
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card shadow-panel">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-muted/70">
            <tr>
              <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left font-semibold">
                Jugadora
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                Último control
              </th>

              {selectedMetrics.map((key) => {
                const metric = METRICS.find(
                  (item) => item.key === key,
                );

                return (
                  <th
                    key={key}
                    className="whitespace-nowrap px-4 py-3 text-right font-semibold"
                  >
                    {metric?.label}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({metric?.unit})
                    </span>
                  </th>
                );
              })}

              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody>
            {filteredPlayers.map((player) => {
              const last =
                player.id != null
                  ? lastByPlayer.get(player.id)
                  : undefined;

              return (
                <tr
                  key={player.id}
                  className="border-t border-border"
                >
                  <td className="sticky left-0 bg-card px-4 py-3 font-semibold">
                    {player.name}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {fmtDate(last?.date)}
                  </td>

                  {selectedMetrics.map((key) => {
                    const metric = METRICS.find(
                      (item) => item.key === key,
                    )!;

                    return (
                      <td
                        key={key}
                        className="numeric whitespace-nowrap px-4 py-3 text-right"
                      >
                        {fmt(
                          metricValue(last, key),
                          metric.decimals,
                        )}
                      </td>
                    );
                  })}

                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {player.id != null && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                      >
                        <Link
                          to="/jugadoras/$id"
                          params={{
                            id: String(player.id),
                          }}
                        >
                          Ver ficha
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredPlayers.length === 0 && (
              <tr>
                <td
                  colSpan={selectedMetrics.length + 3}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No se encontraron jugadoras.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
