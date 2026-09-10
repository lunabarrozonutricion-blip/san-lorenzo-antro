import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
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

  const availableDates = useMemo(() => {
    if (selectedPlayerIds.length === 0) return [];

    const ids = new Set(selectedPlayerIds);

    return [
      ...new Set(
        (controls ?? [])
          .filter((control) => ids.has(control.playerId))
          .map((control) => control.date),
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [controls, selectedPlayerIds]);

  useEffect(() => {
    setSelectedDates((current) => {
      const valid = current.filter((date) =>
        availableDates.includes(date),
      );

      if (
        valid.length === current.length &&
        valid.every((date, index) => date === current[index])
      ) {
        return current;
      }

      return valid;
    });
  }, [availableDates]);

  const reportDates = useMemo(
    () => [...selectedDates].sort((a, b) => b.localeCompare(a)),
    [selectedDates],
  );

  const controlByPlayerDate = useMemo(() => {
    const map = new Map<string, Control>();

    for (const control of controls ?? []) {
      const key = `${control.playerId}|${control.date}`;

      if (!map.has(key)) {
        map.set(key, control);
      }
    }

    return map;
  }, [controls]);

  function togglePlayer(id: number) {
    setSelectedPlayerIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleDate(date: string) {
    setSelectedDates((current) =>
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date],
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
    setSelectedDates([]);
  }

  function seleccionarUltimasDosFechas() {
    setSelectedDates(availableDates.slice(0, 2));
  }

  async function exportarExcel() {
    if (
      selectedPlayers.length === 0 ||
      reportDates.length === 0 ||
      selectedMetrics.length === 0
    ) {
      return;
    }

    const rows: Record<string, unknown>[] = [];

    for (const player of selectedPlayers) {
      for (const date of reportDates) {
        const control =
          player.id != null
            ? controlByPlayerDate.get(`${player.id}|${date}`)
            : undefined;

        const row: Record<string, unknown> = {
          Jugadora: player.name,
          Fecha: fmtDate(date),
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
    selectedPlayers.length > 0 &&
    reportDates.length > 0 &&
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

              const selected = selectedPlayerIds.includes(player.id);

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

        {/* FECHAS */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="panel-title text-xs text-muted-foreground">
                2. Controles / fechas
              </p>

              <p className="mt-1 text-sm">
                {selectedDates.length} fechas seleccionadas
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={availableDates.length === 0}
                onClick={seleccionarUltimasDosFechas}
              >
                Últimas 2 fechas
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={availableDates.length === 0}
                onClick={() =>
                  setSelectedDates([...availableDates])
                }
              >
                Todas
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDates([])}
              >
                Ninguna
              </Button>
            </div>
          </div>

          {selectedPlayerIds.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Primero seleccioná las jugadoras que querés incluir.
            </p>
          ) : (
            <div className="mt-4 grid max-h-[280px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
              {availableDates.map((date) => {
                const selected = selectedDates.includes(date);

                return (
                  <label
                    key={date}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDate(date)}
                      className="h-4 w-4"
                    />

                    <span className="font-medium">
                      {fmtDate(date)}
                    </span>
                  </label>
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

      {/* INFORME */}
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
              {selectedPlayers.length} jugadoras ·{" "}
              {reportDates.length} controles seleccionados
            </p>
          )}
        </div>

        {selectedPlayers.length === 0 ? (
          <Empty text="Seleccioná las jugadoras que querés incluir en el informe." />
        ) : reportDates.length === 0 ? (
          <Empty text="Seleccioná al menos una fecha." />
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
                {selectedPlayers.map((player) =>
                  reportDates.map((date, dateIndex) => {
                    const control =
                      player.id != null
                        ? controlByPlayerDate.get(
                            `${player.id}|${date}`,
                          )
                        : undefined;

                    return (
                      <tr
                        key={`${player.id}-${date}`}
                        className={`border-t border-border ${
                          dateIndex === 0
                            ? "bg-blue-50/60"
                            : "bg-card"
                        }`}
                      >
                        {dateIndex === 0 && (
                          <td
                            rowSpan={reportDates.length}
                            className="min-w-[180px] border-l-4 border-l-[#D71920] bg-[#0B234A] px-4 py-4 align-top font-semibold text-white"
                          >
                            {player.name}
                          </td>
                        )}

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={
                              dateIndex === 0
                                ? "font-semibold"
                                : ""
                            }
                          >
                            {fmtDate(date)}
                          </span>

                          {!control && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              Sin control
                            </span>
                          )}
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
                    );
                  }),
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
