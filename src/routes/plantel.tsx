import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Printer } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { exportXLSX } from "@/lib/backup";
import {
  diff,
  fmt,
  fmtDate,
  fmtDiff,
  metricValue,
} from "@/lib/calc";
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

type HistoricalSum6 = {
  inicio: number | null;
  abril: number | null;
  junio: number | null;
  julio: number | null;
  agosto: number | null;
};

const HISTORY_ORDER = [
  "Sanabria",
  "Pavon",
  "Coronel Sabina",
  "Gomez",
  "Zacmon",
  "Puentes",
  "Lopez Camila",
  "Acuña",
  "Cardenas",
  "Arias",
  "Barrios",
  "Romeo",
  "Castillo",
  "Lopez Belen",
  "Pereyra",
  "Muzio",
  "Curril",
  "Salinas",
  "Molina",
  "Villalba",
  "Barrera",
  "Vidal",
  "Pafundi",
  "Ledesma",
  "Godoy",
  "Gonzalez",
  "Mereles",
  "Coronel Florencia",
  "Rodriguez",
  "Altamirano",
] as const;

const HISTORICAL_SUM6: Record<string, HistoricalSum6> = {
  sanabria: { inicio: 52, abril: 46.5, junio: 48, julio: 49, agosto: 49 },
  pavon: { inicio: 53.5, abril: 47, junio: 49, julio: 51.5, agosto: 52 },
  "coronel sabina": { inicio: 67.5, abril: 64, junio: 62.5, julio: 66, agosto: 60 },
  gomez: { inicio: 69, abril: null, junio: 71, julio: 75, agosto: 83 },
  zacmon: { inicio: 71, abril: 62, junio: 59, julio: 59, agosto: 55.5 },
  puentes: { inicio: 72.5, abril: 56, junio: 54, julio: 54.5, agosto: 53 },
  "lopez camila": { inicio: 73, abril: 66.5, junio: 65, julio: 62, agosto: 57.5 },
  acuna: { inicio: 73.5, abril: 60, junio: 59, julio: 67.5, agosto: 63.5 },
  cardenas: { inicio: 73.5, abril: 62.5, junio: 60, julio: 57.5, agosto: 57.5 },
  arias: { inicio: 74.5, abril: 59, junio: 59, julio: 60.5, agosto: 57.5 },
  barrios: { inicio: null, abril: null, junio: null, julio: null, agosto: 63 },
  romeo: { inicio: null, abril: null, junio: null, julio: null, agosto: 66 },
  castillo: { inicio: 76, abril: 63, junio: null, julio: null, agosto: 68.5 },
  "lopez belen": { inicio: 81.5, abril: 72.5, junio: 75.5, julio: 79.5, agosto: 72.5 },
  pereyra: { inicio: 84.5, abril: null, junio: null, julio: null, agosto: null },
  muzio: { inicio: 85.5, abril: 74.5, junio: 71.5, julio: 72.5, agosto: 65 },
  curril: { inicio: 86.5, abril: 76, junio: 69.5, julio: 73, agosto: 66 },
  salinas: { inicio: 86.5, abril: 78.5, junio: 76, julio: 81, agosto: 78.5 },
  molina: { inicio: 87, abril: 68.5, junio: 67, julio: 71.5, agosto: 68.5 },
  villalba: { inicio: 87.5, abril: 78, junio: 74.5, julio: 83, agosto: 81 },
  barrera: { inicio: 88.5, abril: 83, junio: 78, julio: 82, agosto: 75.5 },
  vidal: { inicio: 90, abril: 70, junio: 68.5, julio: 69.5, agosto: 67.5 },
  pafundi: { inicio: 91, abril: 77, junio: 76, julio: 83, agosto: 77.5 },
  ledesma: { inicio: 96.5, abril: 82, junio: 77, julio: 78.5, agosto: 73 },
  godoy: { inicio: 106, abril: 87.5, junio: null, julio: null, agosto: 93 },
  gonzalez: { inicio: 109.5, abril: 92.5, junio: 91, julio: 94.5, agosto: 92 },
  mereles: { inicio: 116, abril: 94, junio: 89, julio: 91, agosto: 83 },
  "coronel florencia": { inicio: 116, abril: 90.5, junio: 81.5, julio: 83.5, agosto: 79 },
  rodriguez: { inicio: null, abril: 112, junio: 100, julio: 100.5, agosto: 95 },
  altamirano: { inicio: 121, abril: 107.5, junio: 102, julio: 109, agosto: 105 },
};

const SEPTEMBER_SUM6_TARGETS: Record<string, number> = {
  acuna: 60,
  altamirano: 99,
  barrera: 71.5,
  castillo: 64.5,
  "coronel florencia": 75,
  curril: 65,
  gomez: 78,
  gonzalez: 88,
  ledesma: 71,
  "lopez belen": 68,
  mereles: 79,
  muzio: 63,
  pafundi: 73.5,
  salinas: 75,
  vidal: 67,
  villalba: 77,
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameMatches(playerName: string, referenceName: string) {
  const playerTokens = new Set(normalizeName(playerName).split(" "));
  const referenceTokens = normalizeName(referenceName).split(" ");

  return referenceTokens.every((token) => playerTokens.has(token));
}

function historicalFor(name: string) {
  const key = Object.keys(HISTORICAL_SUM6).find((reference) =>
    nameMatches(name, reference),
  );

  return key ? HISTORICAL_SUM6[key] : null;
}

function targetFor(name: string) {
  const key = Object.keys(SEPTEMBER_SUM6_TARGETS).find((reference) =>
    nameMatches(name, reference),
  );

  return key ? SEPTEMBER_SUM6_TARGETS[key] : null;
}

function metricDifference(
  current: Control,
  previous: Control | undefined,
  key: MetricKey,
) {
  if (!previous) return null;

  const currentValue = metricValue(current, key);
  const previousValue = metricValue(previous, key);

  return diff(currentValue, previousValue);
}

function sum6Band(value: number | null) {
  if (value === null) return null;
  if (value < 70) return "green" as const;
  if (value <= 90) return "yellow" as const;
  return "red" as const;
}

function bandCellClass(value: number | null) {
  const band = sum6Band(value);

  if (band === "green") return "bg-green-100 text-green-950";
  if (band === "yellow") return "bg-amber-100 text-amber-950";
  if (band === "red") return "bg-red-100 text-red-950";

  return "bg-card text-muted-foreground";
}

function chartDomain(values: number[], reference?: number | null): [number, number] {
  const all = [...values];

  if (reference !== null && reference !== undefined) {
    all.push(reference);
  }

  if (all.length === 0) return [0, 1];

  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min;
  const padding = span > 0 ? Math.max(span * 0.12, 1) : 2;

  return [
    Math.floor((min - padding) * 10) / 10,
    Math.ceil((max + padding) * 10) / 10,
  ];
}

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
  const [showGroupSummary, setShowGroupSummary] = useState(true);
  const [showObjectives, setShowObjectives] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [summaryOnlySelected, setSummaryOnlySelected] = useState(false);

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

  const groupSummaryRows = useMemo(() => {
    return HISTORY_ORDER.map((name) => {
      const player = (players ?? []).find((candidate) =>
        nameMatches(candidate.name, name),
      );

      if (!player?.id) return null;

      if (
        summaryOnlySelected &&
        !selectedPlayerIds.includes(player.id)
      ) {
        return null;
      }

      const history = historicalFor(player.name);
      if (!history) return null;

      const septemberControl = (controlsByPlayer.get(player.id) ?? []).find(
        (control) =>
          control.date.startsWith("2026-09") &&
          metricValue(control, "sum6") !== null,
      );

      const september = septemberControl
        ? metricValue(septemberControl, "sum6")
        : null;

      const target = targetFor(player.name);

      return {
        player,
        ...history,
        september,
        septemberDate: septemberControl?.date ?? null,
        target,
        vsAugust:
          september !== null && history.agosto !== null
            ? diff(september, history.agosto)
            : null,
        vsTarget:
          september !== null && target !== null
            ? diff(september, target)
            : null,
      };
    }).filter(Boolean) as Array<{
      player: NonNullable<(typeof players)>[number];
      inicio: number | null;
      abril: number | null;
      junio: number | null;
      julio: number | null;
      agosto: number | null;
      september: number | null;
      septemberDate: string | null;
      target: number | null;
      vsAugust: number | null;
      vsTarget: number | null;
    }>;
  }, [
    players,
    controlsByPlayer,
    selectedPlayerIds,
    summaryOnlySelected,
  ]);

  const bandCounts = useMemo(() => {
    const periods = [
      "inicio",
      "abril",
      "junio",
      "julio",
      "agosto",
      "september",
    ] as const;

    const result: Record<
      (typeof periods)[number],
      { green: number; yellow: number; red: number }
    > = {
      inicio: { green: 0, yellow: 0, red: 0 },
      abril: { green: 0, yellow: 0, red: 0 },
      junio: { green: 0, yellow: 0, red: 0 },
      julio: { green: 0, yellow: 0, red: 0 },
      agosto: { green: 0, yellow: 0, red: 0 },
      september: { green: 0, yellow: 0, red: 0 },
    };

    for (const row of groupSummaryRows) {
      for (const period of periods) {
        const band = sum6Band(row[period]);
        if (band) result[period][band] += 1;
      }
    }

    return result;
  }, [groupSummaryRows]);

  const latestSummaries = useMemo(() => {
    return selectedPlayers.map((player) => {
      if (player.id == null) {
        return {
          player,
          current: undefined,
          previous: undefined,
          currentSum6: null,
          previousSum6: null,
          target: targetFor(player.name),
        };
      }

      const validControls = (controlsByPlayer.get(player.id) ?? []).filter(
        (control) => metricValue(control, "sum6") !== null,
      );

      const current = validControls[0];
      const previous = validControls[1];
      const currentSum6 = current ? metricValue(current, "sum6") : null;
      const previousSum6 = previous ? metricValue(previous, "sum6") : null;
      const target = targetFor(player.name);

      return {
        player,
        current,
        previous,
        currentSum6,
        previousSum6,
        target,
      };
    });
  }, [selectedPlayers, controlsByPlayer]);

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
        current.filter((controlId) => !idsToRemove.has(controlId)),
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

  function seleccionarUltimosPorJugadora(count: number) {
    const ids: number[] = [];

    for (const playerId of selectedPlayerIds) {
      const latest = controlsByPlayer.get(playerId)?.slice(0, count) ?? [];

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
      group.controls.forEach((control, controlIndex) => {
        const previousControl =
          group.controls[controlIndex + 1];

        const row: Record<string, unknown> = {
          Jugadora: group.player.name,
          Fecha: fmtDate(control.date),
        };

        for (const key of selectedMetrics) {
          const metric = METRICS.find((m) => m.key === key);

          if (!metric) continue;

          const value = metricValue(control, key);

          const difference = metricDifference(
            control,
            previousControl,
            key,
          );

          row[`${metric.label} (${metric.unit})`] = value;

          row[
            `Δ ${metric.label} vs anterior (${metric.unit})`
          ] = difference ?? "";
        }

        if (showObjectives) {
          const target = targetFor(group.player.name);
          const sum6 = metricValue(control, "sum6");

          row["Objetivo Sum6 septiembre (mm)"] = target ?? "";
          row["Δ Sum6 vs objetivo (mm)"] =
            sum6 !== null && target !== null
              ? diff(sum6, target) ?? ""
              : "";
        }

        rows.push(row);
      });
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

  const septemberMeasured = groupSummaryRows.filter(
    (row) => row.september !== null,
  ).length;

  return (
    <AppLayout
      title="Informe grupal"
      subtitle="Seleccioná jugadoras, controles y variables para presentar"
    >
      <div className="no-print space-y-4">
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
                onClick={() => seleccionarUltimosPorJugadora(1)}
              >
                Último de cada una
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={selectedPlayerIds.length === 0}
                onClick={() => seleccionarUltimosPorJugadora(2)}
              >
                Últimos 2
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={selectedPlayerIds.length === 0}
                onClick={() => seleccionarUltimosPorJugadora(4)}
              >
                Últimos 4
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

        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="panel-title text-xs text-muted-foreground">
            4. Presentación
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={showGroupSummary}
                onChange={(e) => setShowGroupSummary(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Comparativa grupal
                </span>
                <span className="text-xs text-muted-foreground">
                  Inicio a septiembre
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={showObjectives}
                onChange={(e) => setShowObjectives(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Mostrar objetivos
                </span>
                <span className="text-xs text-muted-foreground">
                  Objetivo Sum6 septiembre
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={showCharts}
                onChange={(e) => setShowCharts(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Gráficos de evolución
                </span>
                <span className="text-xs text-muted-foreground">
                  Usa las jugadoras, controles y variables seleccionados
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={summaryOnlySelected}
                onChange={(e) => setSummaryOnlySelected(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Resumen sólo seleccionadas
                </span>
                <span className="text-xs text-muted-foreground">
                  Filtra la comparativa grupal
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => window.print()}
            disabled={
              !showGroupSummary &&
              !ready &&
              selectedPlayers.length === 0
            }
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

      {showGroupSummary && (
        <section
          className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-panel"
          style={{ breakInside: "avoid" }}
        >
          <div className="border-b border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              San Lorenzo de Almagro
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Comparativa grupal · Sum 6 pliegues
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Inicio de temporada a septiembre 2026 · Septiembre toma el último control con Sum6 cargado.
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Referencia visual: verde &lt;70 mm · amarillo 70–90 mm · rojo &gt;90 mm.
              Septiembre: {septemberMeasured} jugadoras con medición cargada.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-muted/80">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">
                    Jugadora
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">Inicio</th>
                  <th className="px-3 py-3 text-right font-semibold">Abril</th>
                  <th className="px-3 py-3 text-right font-semibold">Junio</th>
                  <th className="px-3 py-3 text-right font-semibold">Julio</th>
                  <th className="px-3 py-3 text-right font-semibold">Agosto</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Septiembre
                  </th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Δ vs Agosto
                  </th>
                  {showObjectives && (
                    <>
                      <th className="px-3 py-3 text-right font-semibold">
                        Objetivo Sep
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">
                        Δ vs objetivo
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {groupSummaryRows.map((row) => (
                  <tr key={row.player.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {row.player.name}
                    </td>
                    <BandCell value={row.inicio} />
                    <BandCell value={row.abril} />
                    <BandCell value={row.junio} />
                    <BandCell value={row.julio} />
                    <BandCell value={row.agosto} />
                    <BandCell
                      value={row.september}
                      sub={row.septemberDate ? fmtDate(row.septemberDate) : undefined}
                      emphasize
                    />
                    <td className="numeric whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {fmtDiff(row.vsAugust, 1)}
                    </td>
                    {showObjectives && (
                      <>
                        <td className="numeric whitespace-nowrap px-3 py-2.5 text-right">
                          {fmt(row.target, 1)}
                        </td>
                        <td className="numeric whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                          {fmtDiff(row.vsTarget, 1)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>

              <tfoot className="border-t-2 border-border bg-muted/40 text-xs font-semibold">
                <BandCountRow
                  label="Verde <70"
                  counts={bandCounts}
                  band="green"
                  extraColumns={showObjectives ? 3 : 1}
                />
                <BandCountRow
                  label="Amarillo 70–90"
                  counts={bandCounts}
                  band="yellow"
                  extraColumns={showObjectives ? 3 : 1}
                />
                <BandCountRow
                  label="Rojo >90"
                  counts={bandCounts}
                  band="red"
                  extraColumns={showObjectives ? 3 : 1}
                />
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {selectedPlayers.length > 0 && (
        <section className="mt-6">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Últimas mediciones
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Resumen por jugadora
            </h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {latestSummaries.map((summary) => {
              const deltaPrevious =
                summary.currentSum6 !== null &&
                summary.previousSum6 !== null
                  ? diff(summary.currentSum6, summary.previousSum6)
                  : null;

              const deltaTarget =
                summary.currentSum6 !== null && summary.target !== null
                  ? diff(summary.currentSum6, summary.target)
                  : null;

              return (
                <div
                  key={summary.player.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-panel"
                  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl font-semibold">
                        {summary.player.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {summary.current
                          ? `Último control ${fmtDate(summary.current.date)}`
                          : "Sin control con Sum6"}
                      </p>
                    </div>

                    {summary.currentSum6 !== null && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bandCellClass(
                          summary.currentSum6,
                        )}`}
                      >
                        Sum6 {fmt(summary.currentSum6, 1)} mm
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <MiniStat
                      label="Actual"
                      value={
                        summary.currentSum6 !== null
                          ? `${fmt(summary.currentSum6, 1)} mm`
                          : "—"
                      }
                    />
                    <MiniStat
                      label="Anterior"
                      value={
                        summary.previousSum6 !== null
                          ? `${fmt(summary.previousSum6, 1)} mm`
                          : "—"
                      }
                      sub={summary.previous ? fmtDate(summary.previous.date) : undefined}
                    />
                    <MiniStat
                      label="Δ vs anterior"
                      value={
                        deltaPrevious !== null
                          ? `${fmtDiff(deltaPrevious, 1)} mm`
                          : "—"
                      }
                    />
                    {showObjectives && (
                      <>
                        <MiniStat
                          label="Objetivo septiembre"
                          value={
                            summary.target !== null
                              ? `${fmt(summary.target, 1)} mm`
                              : "—"
                          }
                        />
                        <MiniStat
                          label="Δ vs objetivo"
                          value={
                            deltaTarget !== null
                              ? `${fmtDiff(deltaTarget, 1)} mm`
                              : "—"
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
            <>
              <p className="mt-3 text-sm font-medium">
                {reportGroups.length} jugadoras ·{" "}
                {selectedControlIds.length} controles
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                Δ: diferencia respecto del control seleccionado
                inmediatamente anterior de cada jugadora.
              </p>
            </>
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
                    (control, controlIndex) => {
                      const previousControl =
                        group.controls[controlIndex + 1];

                      return (
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

                            const value = metricValue(
                              control,
                              key,
                            );

                            const difference =
                              metricDifference(
                                control,
                                previousControl,
                                key,
                              );

                            return (
                              <td
                                key={key}
                                className="numeric whitespace-nowrap px-4 py-3 text-right"
                              >
                                <div
                                  className={
                                    controlIndex === 0
                                      ? "font-semibold"
                                      : ""
                                  }
                                >
                                  {fmt(
                                    value,
                                    metric.decimals,
                                  )}
                                </div>

                                {difference !== null && (
                                  <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                                    Δ{" "}
                                    {fmtDiff(
                                      difference,
                                      metric.decimals,
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    },
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCharts && ready && (
        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Evolución
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              Gráficos de las jugadoras seleccionadas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada gráfico usa únicamente los controles y variables que seleccionaste arriba.
            </p>
          </div>

          <div className="space-y-6">
            {reportGroups.map((group) => (
              <div
                key={group.player.id}
                className="rounded-lg border border-border bg-card p-4 shadow-panel"
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <h3 className="font-display text-xl font-semibold">
                  {group.player.name}
                </h3>

                <div className="mt-4 grid gap-5 xl:grid-cols-2">
                  {selectedMetrics.map((key) => (
                    <EvolutionChart
                      key={key}
                      controls={group.controls}
                      metricKey={key}
                      target={
                        showObjectives && key === "sum6"
                          ? targetFor(group.player.name)
                          : null
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}

function BandCell({
  value,
  sub,
  emphasize = false,
}: {
  value: number | null;
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    <td
      className={`numeric whitespace-nowrap px-3 py-2.5 text-right ${bandCellClass(
        value,
      )} ${emphasize ? "font-bold" : "font-medium"}`}
    >
      <div>{fmt(value, 1)}</div>
      {sub && value !== null && (
        <div className="mt-0.5 text-[10px] font-normal opacity-70">
          {sub}
        </div>
      )}
    </td>
  );
}

function BandCountRow({
  label,
  counts,
  band,
  extraColumns,
}: {
  label: string;
  counts: Record<
    "inicio" | "abril" | "junio" | "julio" | "agosto" | "september",
    { green: number; yellow: number; red: number }
  >;
  band: "green" | "yellow" | "red";
  extraColumns: number;
}) {
  return (
    <tr>
      <td className="px-3 py-2 text-left">{label}</td>
      <td className="px-3 py-2 text-right">{counts.inicio[band]}</td>
      <td className="px-3 py-2 text-right">{counts.abril[band]}</td>
      <td className="px-3 py-2 text-right">{counts.junio[band]}</td>
      <td className="px-3 py-2 text-right">{counts.julio[band]}</td>
      <td className="px-3 py-2 text-right">{counts.agosto[band]}</td>
      <td className="px-3 py-2 text-right">{counts.september[band]}</td>
      {Array.from({ length: extraColumns }).map((_, index) => (
        <td key={index} />
      ))}
    </tr>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="numeric mt-1 text-sm font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function EvolutionChart({
  controls,
  metricKey,
  target,
}: {
  controls: Control[];
  metricKey: MetricKey;
  target: number | null;
}) {
  const metric = METRICS.find((item) => item.key === metricKey)!;

  const data = [...controls]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((control) => ({
      date: control.date,
      label: fmtDate(control.date),
      value: metricValue(control, metricKey),
    }))
    .filter(
      (item): item is typeof item & { value: number } => item.value !== null,
    );

  const domain = chartDomain(
    data.map((item) => item.value),
    target,
  );

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-semibold">{metric.label}</p>
          <p className="text-xs text-muted-foreground">
            {metric.unit} · {data.length} controles con dato
          </p>
        </div>

        {target !== null && (
          <p className="text-xs font-semibold text-red-700">
            Objetivo {fmt(target, 1)} mm
          </p>
        )}
      </div>

      {data.length >= 2 ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 18, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                minTickGap={20}
              />
              <YAxis
                domain={domain}
                tick={{ fontSize: 10 }}
                width={52}
              />
              <Tooltip
                formatter={(value) => [
                  `${fmt(Number(value), metric.decimals)} ${metric.unit}`,
                  metric.label,
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={2.25}
                dot={{ r: 3.5 }}
                activeDot={{ r: 5 }}
              />
              {target !== null && (
                <ReferenceLine
                  y={target}
                  stroke="#c8102e"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  isFront
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground">
          Se necesitan al menos dos controles seleccionados con esta variable.
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
