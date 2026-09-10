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
  type MetricKey,
} from "@/lib/types";

export const Route = createFileRoute("/informes")({
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
      <Informes />
    </ClientOnly>
  ),
});

function Informes() {
  const search = Route.useSearch();
  const players = usePlayers();

  const [playerId, setPlayerId] = useState<number | null>(
    search.player ?? null,
  );

  const controls = useControls(playerId);

  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "weight",
    "sum6",
  ]);

  const [selectedControls, setSelectedControls] = useState<number[]>([]);

  useEffect(() => {
    if (playerId === null && players && players.length > 0) {
      setPlayerId(players[0].id!);
    }
  }, [players, playerId]);

  useEffect(() => {
    if (!controls) return;

    setSelectedControls(
      controls
        .filter((control) => control.id != null)
        .map((control) => control.id!),
    );
  }, [controls]);

  const player = players?.find((p) => p.id === playerId);

  const reportControls = useMemo(() => {
    return (controls ?? [])
      .filter(
        (control) =>
          control.id != null &&
          selectedControls.includes(control.id),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [controls, selectedControls]);

  const months = useMemo(() => {
    const map = new Map<string, string>();

    for (const control of controls ?? []) {
      const key = control.date.slice(0, 7);

      if (!map.has(key)) {
        const [year, month] = key.split("-").map(Number);

        const label = new Intl.DateTimeFormat("es-AR", {
          month: "long",
          year: "numeric",
        }).format(new Date(year, month - 1, 1));

        map.set(
          key,
          label.charAt(0).toUpperCase() + label.slice(1),
        );
      }
    }

    return [...map.entries()].sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
  }, [controls]);

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function toggleControl(id: number) {
    setSelectedControls((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function selectMonth(month: string) {
    const ids =
      controls
        ?.filter(
          (control) =>
            control.date.startsWith(month) &&
            control.id != null,
        )
        .map((control) => control.id!) ?? [];

    const allSelected = ids.every((id) =>
      selectedControls.includes(id),
    );

    if (allSelected) {
      setSelectedControls((current) =>
        current.filter((id) => !ids.includes(id)),
      );
    } else {
      setSelectedControls((current) => [
        ...new Set([...current, ...ids]),
      ]);
    }
  }

  function presetPesoSum6() {
    setSelectedMetrics(["weight", "sum6"]);
  }

  function presetCompleta() {
    setSelectedMetrics(METRICS.map((m) => m.key));
  }

  function presetPerimetros() {
    setSelectedMetrics(
      METRICS.filter(
        (m) =>
          m.group === "perimetros" ||
          m.group === "corregidos",
      ).map((m) => m.key),
    );
  }

  async function exportarExcel() {
    if (!player || reportControls.length === 0) return;

    const rows = reportControls.map((control) => {
      const row: Record<string, unknown> = {
        Jugadora: player.name,
        Fecha: fmtDate(control.date),
      };

      for (const key of selectedMetrics) {
        const metric = METRICS.find((m) => m.key === key);
        if (!metric) continue;

        row[`${metric.label} (${metric.unit})`] =
          metricValue(control, key);
      }

      return row;
    });

    const safeName = player.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    await exportXLSX(
      rows,
      `informe-${safeName}.xlsx`,
    );
  }

  const groups = [
    "principal",
    "pliegues",
    "perimetros",
    "corregidos",
  ] as const;

  return (
    <AppLayout
      title="Informes"
      subtitle="Armá un informe personalizado por jugadora"
    >
      <div className="no-print space-y-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
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
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm md:max-w-md"
            >
              {(players ?? []).map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="panel-title text-xs text-muted-foreground">
            Variables a mostrar
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={presetPesoSum6}
            >
              Solo Peso + Sum6P
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={presetCompleta}
            >
              Antropometría completa
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={presetPerimetros}
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
              Seleccionar todo
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedMetrics([])}
            >
              Deseleccionar todo
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="panel-title text-xs text-muted-foreground">
                Controles a mostrar
              </p>

              <p className="mt-1 text-sm">
                {selectedControls.length} de{" "}
                {controls?.length ?? 0} seleccionados
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedControls(
                    (controls ?? [])
                      .filter((c) => c.id != null)
                      .map((c) => c.id!),
                  )
                }
              >
                Todos
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedControls([])}
              >
                Ninguno
              </Button>
            </div>
          </div>

          {months.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Selección rápida por mes
              </p>

              <div className="flex flex-wrap gap-2">
                {months.map(([month, label]) => {
                  const monthIds =
                    controls
                      ?.filter(
                        (c) =>
                          c.date.startsWith(month) &&
                          c.id != null,
                      )
                      .map((c) => c.id!) ?? [];

                  const active =
                    monthIds.length > 0 &&
                    monthIds.every((id) =>
                      selectedControls.includes(id),
                    );

                  return (
                    <Button
                      key={month}
                      size="sm"
                      variant={
                        active ? "default" : "outline"
                      }
                      onClick={() => selectMonth(month)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 grid max-h-[300px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {(controls ?? []).map((control) => (
              <label
                key={control.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={
                    control.id != null &&
                    selectedControls.includes(control.id)
                  }
                  onChange={() => {
                    if (control.id != null) {
                      toggleControl(control.id);
                    }
                  }}
                  className="h-4 w-4"
                />

                {fmtDate(control.date)}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => window.print()}
            disabled={
              selectedMetrics.length === 0 ||
              reportControls.length === 0
            }
          >
            <Printer className="h-4 w-4" />
            Exportar PDF / Imprimir
          </Button>

          <Button
            variant="outline"
            onClick={() => void exportarExcel()}
            disabled={
              selectedMetrics.length === 0 ||
              reportControls.length === 0
            }
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            San Lorenzo de Almagro
          </p>

          <h2 className="mt-1 font-display text-2xl font-semibold">
            Informe antropométrico
          </h2>

          <p className="mt-1 text-lg font-medium">
            {player?.name ?? "—"}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Primera División – Fútbol Femenino
          </p>
        </div>

        {selectedMetrics.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Seleccioná al menos una variable para generar el
            informe.
          </div>
        ) : reportControls.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Seleccioná al menos un control para generar el
            informe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th className="sticky left-0 bg-muted px-3 py-3 text-left font-semibold">
                    Fecha
                  </th>

                  {selectedMetrics.map((key) => {
                    const metric = METRICS.find(
                      (m) => m.key === key,
                    );

                    return (
                      <th
                        key={key}
                        className="whitespace-nowrap px-3 py-3 text-right font-semibold"
                      >
                        {metric?.label}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({metric?.unit})
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {reportControls.map((control) => (
                  <tr
                    key={control.id}
                    className="border-t border-border"
                  >
                    <td className="sticky left-0 whitespace-nowrap bg-card px-3 py-3 font-medium">
                      {fmtDate(control.date)}
                    </td>

                    {selectedMetrics.map((key) => {
                      const metric = METRICS.find(
                        (m) => m.key === key,
                      )!;

                      return (
                        <td
                          key={key}
                          className="numeric whitespace-nowrap px-3 py-3 text-right"
                        >
                          {fmt(
                            metricValue(control, key),
                            metric.decimals,
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
