import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { fmt, fmtDiff, metricValue } from "@/lib/calc";
import { nowISO, upsertObjectivePeriod } from "@/lib/db";
import {
  useControls,
  useObjectivePeriods,
  usePlayers,
} from "@/lib/hooks";
import {
  objectivePeriodLabel,
} from "@/lib/objectives";

export const Route = createFileRoute("/objetivos")({
  component: () => (
    <ClientOnly>
      <Objetivos />
    </ClientOnly>
  ),
});

function Objetivos() {
  const players = usePlayers();
  const controls = useControls();
  const periods = useObjectivePeriods();

  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [newMonth, setNewMonth] = useState("");
  const [copyPrevious, setCopyPrevious] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!periods || periods.length === 0) return;

    if (
      !selectedKey ||
      !periods.some((period) => period.key === selectedKey)
    ) {
      setSelectedKey(periods[periods.length - 1].key);
    }
  }, [periods, selectedKey]);

  const selectedPeriod = useMemo(
    () => periods?.find((period) => period.key === selectedKey),
    [periods, selectedKey],
  );

  useEffect(() => {
    if (!selectedPeriod || !players) {
      setDraft({});
      return;
    }

    const next: Record<number, string> = {};

    for (const player of players) {
      if (player.id == null) continue;

      const target =
        selectedPeriod.targets.find(
          (candidate) => candidate.playerId === player.id,
        )?.target ?? null;

      next[player.id] =
        target === null ? "" : String(target);
    }

    setDraft(next);
  }, [selectedPeriod, players]);

  const latestSum6ByPlayer = useMemo(() => {
    const map = new Map<number, number | null>();

    for (const player of players ?? []) {
      if (player.id == null) continue;

      const latest = (controls ?? []).find(
        (control) =>
          control.playerId === player.id &&
          metricValue(control, "sum6") !== null,
      );

      map.set(
        player.id,
        latest ? metricValue(latest, "sum6") : null,
      );
    }

    return map;
  }, [players, controls]);

  async function createPeriod() {
    if (!newMonth || !players || !periods) return;

    const existing = periods.find(
      (period) => period.key === newMonth,
    );

    if (existing) {
      setSelectedKey(existing.key);
      setNewMonth("");
      return;
    }

    const [yearText, monthText] = newMonth.split("-");
    const year = Number(yearText);
    const month = Number(monthText);

    if (!year || month < 1 || month > 12) return;

    const previous = [...periods]
      .filter((period) => period.key < newMonth)
      .sort((a, b) => a.key.localeCompare(b.key))
      .at(-1);

    const now = nowISO();

    await upsertObjectivePeriod({
      key: newMonth,
      label: objectivePeriodLabel(newMonth),
      year,
      month,
      targets: players
        .filter((player) => player.id != null)
        .map((player) => ({
          playerId: player.id!,
          playerName: player.name,
          target: copyPrevious
            ? previous?.targets.find(
                (candidate) =>
                  candidate.playerId === player.id,
              )?.target ?? null
            : null,
        })),
      createdAt: now,
      updatedAt: now,
    });

    setSelectedKey(newMonth);
    setNewMonth("");
  }

  async function save() {
    if (!selectedPeriod || !players) return;

    setSaving(true);

    try {
      await upsertObjectivePeriod({
        ...selectedPeriod,
        targets: players
          .filter((player) => player.id != null)
          .map((player) => {
            const raw = draft[player.id!]?.trim() ?? "";
            const parsed =
              raw === "" ? null : Number(raw);

            return {
              playerId: player.id!,
              playerName: player.name,
              target:
                parsed === null || Number.isNaN(parsed)
                  ? null
                  : parsed,
            };
          }),
        updatedAt: nowISO(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout
      title="Objetivos"
      subtitle="Objetivos Sum6 por período y por jugadora"
    >
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <p className="panel-title text-xs text-muted-foreground">
            Períodos
          </p>

          <div className="mt-3 space-y-2">
            {(periods ?? []).map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedKey(period.key)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  selectedKey === period.key
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nuevo período
            </p>

            <input
              type="month"
              value={newMonth}
              onChange={(event) =>
                setNewMonth(event.target.value)
              }
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />

            <label className="mt-3 flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={copyPrevious}
                onChange={(event) =>
                  setCopyPrevious(event.target.checked)
                }
                className="mt-0.5 h-4 w-4"
              />

              <span>
                Copiar los objetivos del período anterior para después modificar sólo los que cambian.
              </span>
            </label>

            <Button
              size="sm"
              className="mt-3 w-full"
              disabled={!newMonth}
              onClick={() => void createPeriod()}
            >
              Crear período
            </Button>
          </div>
        </aside>

        <section className="rounded-lg border border-border bg-card p-5 shadow-panel">
          {selectedPeriod ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Objetivos Sum6
                  </p>

                  <h2 className="mt-1 font-display text-2xl font-semibold">
                    {selectedPeriod.label}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Dejá vacío si una jugadora no tiene objetivo definido para este período.
                  </p>
                </div>

                <Button
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? "Guardando…" : "Guardar objetivos"}
                </Button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-muted/80">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Jugadora
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Último Sum6
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Objetivo
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Δ vs objetivo
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(players ?? []).map((player) => {
                      if (player.id == null) return null;

                      const current =
                        latestSum6ByPlayer.get(player.id) ?? null;

                      const raw =
                        draft[player.id] ?? "";

                      const parsed =
                        raw.trim() === ""
                          ? null
                          : Number(raw);

                      const target =
                        parsed === null || Number.isNaN(parsed)
                          ? null
                          : parsed;

                      const delta =
                        current !== null && target !== null
                          ? current - target
                          : null;

                      return (
                        <tr
                          key={player.id}
                          className="border-t border-border"
                        >
                          <td className="px-4 py-2.5 font-medium">
                            {player.name}
                          </td>

                          <td className="numeric px-4 py-2.5 text-right">
                            {current !== null
                              ? `${fmt(current, 1)} mm`
                              : "—"}
                          </td>

                          <td className="px-4 py-2.5 text-right">
                            <input
                              inputMode="decimal"
                              value={raw}
                              onChange={(event) =>
                                setDraft((currentDraft) => ({
                                  ...currentDraft,
                                  [player.id!]: event.target.value,
                                }))
                              }
                              placeholder="—"
                              className="h-9 w-28 rounded-md border border-input bg-background px-2 text-right numeric"
                            />
                          </td>

                          <td
                            className={`numeric px-4 py-2.5 text-right font-semibold ${
                              delta === null
                                ? "text-muted-foreground"
                                : delta <= 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                            }`}
                          >
                            {fmtDiff(delta, 1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Preparando objetivos…
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
