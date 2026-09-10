import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { exportXLSX } from "@/lib/backup";
import { fmt, fmtDate, metricValue } from "@/lib/calc";
import { useControls, usePlayers } from "@/lib/hooks";
import {
  GROUP_LABELS,
  METRICS,
  type Control,
  type MetricKey,
} from "@/lib/types";

export const Route = createFileRoute("/plantel")({
  component: () => (
    <ClientOnly>
      <InformeGrupal />
    </ClientOnly>
  ),
});

function InformeGrupal() {
  const players = usePlayers();
  const controls = useControls();

  const [search, setSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [selectedControlIds, setSelectedControlIds] = useState<number[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "weight",
    "sum6",
  ]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return players ?? [];

    return (players ?? []).filter((player) =>
      player.name.toLowerCase().includes(text),
    );
  }, [players, search]);

  const selectedPlayers = useMemo(() => {
    return (players ?? []).filter(
      (player) =>
        player.id != null &&
        selectedPlayerIds.includes(player.id),
    );
  }, [players, selectedPlayerIds]);

  const controlsByPlayer = useMemo(() => {
    const map = new Map<number, Control[]>();

    for (const control of controls ?? []) {
      const list = map.get(control.playerId) ?? [];
      list.push(control);
      map.set(control.playerId, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);

        if (byDate !== 0) return byDate;

        return (b.id ?? 0) - (a.id ?? 0);
      });
    }

    return map;
  }, [controls]);

  const reportGroups = useMemo(() => {
    return selectedPlayers
      .map((player) => {
        const playerControls =
          player.id != null
            ? controlsByPlayer.get(player.id) ?? []
            : [];

        return {
          player,
          controls: playerControls.filter(
            (control) =>
              control.id != null &&
              selectedControlIds.includes(control.id),
          ),
        };
      })
      .filter((group) => group.controls.length > 0);
  }, [
    selectedPlayers,
    controlsByPlayer,
    selectedControlIds,
  ]);

  function togglePlayer(id: number) {
    const selected = selectedPlayerIds.includes(id);

    if (selected) {
      setSelectedPlayerIds((current) =>
        current.filter((item) => item !== id),
      );

      const idsToRemove = new Set(
        (controlsByPlayer.get(id) ?? [])
          .filter((control) => control.id != null)
          .map((control) => control.id!),
      );

      setSelectedControlIds((current) =>
        current.filter((id) => !idsToRemove.has(id)),
      );
    } else {
      setSelectedPlayerIds((current) => [...current, id]);
    }
  }

  function toggleControl(id: number) {
    setSelectedControlIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function seleccionarTodasLasJugadoras() {
    setSelectedPlayerIds(
      (players ?? [])
        .filter((player) => player.id != null)
        .map((player) => player.id!),
    );
  }

  function seleccionarVisibles() {
    const ids = filteredPlayers
      .filter((player) => player.id != null)
      .map((player) => player.id!);

    setSelectedPlayerIds((current) => [
      ...new Set([...current, ...ids]),
    ]);
  }

  function ningunaJugadora() {
    setSelectedPlayerIds([]);
    setSelectedControlIds([]);
  }

  function seleccionarUltimoPorJugadora() {
    const ids: number[] = [];

    for (const playerId of selectedPlayerIds) {
      const latest = controlsByPlayer.get(playerId)?.[0];

      if (latest?.id != null) {
        ids.push(latest.id);
      }
    }

    setSelectedControlIds(ids);
  }

  function seleccionarUltimosDosPorJugadora() {
    const ids: number[] = [];

    for (const playerId of selectedPlayerIds) {
      const latest =
        controlsByPlayer.get(playerId)?.slice(0, 2) ?? [];

      for (const control of latest) {
        if (control.id != null) {
          ids.push(control.id);
        }
      }
    }

    setSelectedControlIds(ids);
  }

  function seleccionarTodosLosControles() {
    const ids: number[] = [];

    for (const playerId of selectedPlayerIds) {
      for (const control of controlsByPlayer.get(playerId) ?? []) {
        if (control.id != null) {
          ids.push(control.id);
        }
      }
    }

    setSelectedControlIds(ids);
  }

  async function exportarExcel() {
    if (
      reportGroups.length === 0 ||
      selectedMetrics.length === 0
    ) {
      return;
    }

    const rows: Record<string, unknown>[] = [];

    for (const group of reportGroups) {
      for (const control of group.controls) {
        const row: Record<string, unknown> = {
          Jugadora: group.player.name,
          Fecha: fmtDate(control.date),
        };

        for (const key of selectedMetrics) {
          const metric = METRICS.find((m) => m.key === key);

          if (!metric) continue;

          row[`${metric.label} (${metric.unit})`] =
            metricValue(control, key);
        }

        rows.push(row);
      }
    }

    await exportXLSX(
      rows,
      `informe-grupal-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`,
    );
  }

  const groups = [
    "principal",
    "pliegues",
    "perimetros",
    "corregidos",
  ] as const;

  const ready =
    reportGroups.length > 0 &&
    selectedMetrics.length > 0;

  return (
    <AppLayout
      title="Informe grupal"
      subtitle="Seleccioná jugadoras, controles y variables para presentar"
    >
      <div className="no-print space-y-4">
        {/* JUGADORAS */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="panel-title text-xs text-muted-foreground">
                1. Jugadoras a incluir
              </p>

              <p className="mt-1 text-sm">
                {selectedPlayerIds.length} seleccionadas
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={seleccionarVisibles}
              >
                Seleccionar visibles
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={seleccionarTodasLasJugadoras}
              >
                Todas
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={ningunaJugadora}
              >
                Ninguna
              </Button>
            </div>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugadora..."
            className="mt-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm md:max-w-md"
          />

          <div className="mt-4 grid max-h-[300px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlayers.map((player) => {
              if (player.id == null) return null;

              const selected =
                selectedPlayerIds.includes(player.id);

              return (
                <label
                  key={player.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePlayer(player.id!)}
                    className="h-4 w-4"
                  />

                  <span className="font-medium">
                    {player.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* CONTROLES POR JUGADORA */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="panel-title text-xs text-muted-foreground">
                2. Controles a comparar
              </p>

              <p className="mt-1 text-sm">
                {selectedControlIds.length} controles seleccionados
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={selectedPlayerIds.length === 0}
                onClick={seleccionarUltimoPorJugadora}
              >
                Último de cada una
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={selectedPlayerIds.length === 0}
                onClick={seleccionarUltimosDosPorJugadora}
              >
                Últimos 2 de cada una
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={selectedPlayerIds.length === 0}
                onClick={seleccionarTodosLosControles}
              >
                Todos
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedControlIds([])}
              >
                Ninguno
              </Button>
            </div>
          </div>

          {selectedPlayers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Primero seleccioná las jugadoras que querés incluir.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {selectedPlayers.map((player) => {
                if (player.id == null) return null;

                const playerControls =
                  controlsByPlayer.get(player.id) ?? [];

                return (
                  <div
                    key={player.id}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between bg-[#0B234A] px-4 py-3 text-white">
                      <span className="font-semibold">
                        {player.name}
                      </span>

                      <span className="text-xs text-white/70">
                        {playerControls.length} controles
                      </span>
                    </div>

                    {playerControls.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        No tiene controles cargados.
                      </div>
                    ) : (
                      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
                        {playerControls.map((control) => {
                          if (control.id == null) return null;

                          const selected =
                            selectedControlIds.includes(control.id);

                          return (
                            <label
                              key={control.id}
                              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                                selected
                                  ? "border-[#D71920] bg-red-50"
                                  : "border-border"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleControl(control.id!)
                                }
                                className="h-4 w-4"
                              />

                              <span className="font-medium">
                                {fmtDate(control.date)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* VARIABLES */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="panel-title text-xs text-muted-foreground">
            3. Variables a mostrar
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
                  METRICS.filter(
                    (m) => m.group === "pliegues",
                  ).map((m) => m.key),
                )
              }
            >
              Pliegues
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSelectedMetrics(
                  METRICS.filter(
                    (m) =>
                      m.group === "perimetros" ||
                      m.group === "corregidos",
                  ).map((m) => m.key),
                )
              }
            >
              Perímetros + corregidos
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSelectedMetrics(
                  METRICS.map((m) => m.key),
                )
              }
            >
              Antropometría completa
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedMetrics([])}
            >
              Ninguna
            </Button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  {GROUP_LABELS[group]}
                </p>

                <div className="space-y-2">
                  {METRICS.filter(
                    (metric) => metric.group === group,
                  ).map((metric) => (
                    <label
                      key={metric.key}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(
                          metric.key,
                        )}
                        onChange={() =>
                          toggleMetric(metric.key)
                        }
                        className="h-4 w-4"
                      />

                      <span>
                        {metric.label}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({metric.unit})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!ready}
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Exportar PDF / Imprimir
          </Button>

          <Button
            variant="outline"
            disabled={!ready}
            onClick={() => void exportarExcel()}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* INFORME FINAL */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            San Lorenzo de Almagro
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Informe antropométrico grupal
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Primera División – Fútbol Femenino
          </p>

          {ready && (
            <p className="mt-3 text-sm font-medium">
              {reportGroups.length} jugadoras ·{" "}
              {selectedControlIds.length} controles
            </p>
          )}
        </div>

        {selectedPlayers.length === 0 ? (
          <Empty text="Seleccioná las jugadoras que querés incluir." />
        ) : selectedControlIds.length === 0 ? (
          <Empty text="Seleccioná los controles de cada jugadora que querés comparar." />
        ) : selectedMetrics.length === 0 ? (
          <Empty text="Seleccioná al menos una variable." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/80">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Jugadora
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                    Fecha
                  </th>

                  {selectedMetrics.map((key) => {
                    const metric = METRICS.find(
                      (m) => m.key === key,
                    )!;

                    return (
                      <th
                        key={key}
                        className="whitespace-nowrap px-4 py-3 text-right font-semibold"
                      >
                        {metric.label}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({metric.unit})
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {reportGroups.map((group) =>
                  group.controls.map(
                    (control, controlIndex) => (
                      <tr
                        key={control.id}
                        className={`border-t border-border ${
                          controlIndex === 0
                            ? "bg-blue-50/60"
                            : "bg-card"
                        }`}
                      >
                        {controlIndex === 0 && (
                          <td
                            rowSpan={group.controls.length}
                            className="min-w-[180px] border-l-4 border-l-[#D71920] bg-[#0B234A] px-4 py-4 align-top font-semibold text-white"
                          >
                            {group.player.name}
                          </td>
                        )}

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={
                              controlIndex === 0
                                ? "font-semibold"
                                : ""
                            }
                          >
                            {fmtDate(control.date)}
                          </span>
                        </td>

                        {selectedMetrics.map((key) => {
                          const metric = METRICS.find(
                            (m) => m.key === key,
                          )!;

                          return (
                            <td
                              key={key}
                              className="numeric whitespace-nowrap px-4 py-3 text-right"
                            >
                              {fmt(
                                metricValue(control, key),
                                metric.decimals,
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ),
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
