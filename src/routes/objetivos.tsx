import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarPlus,
  Save,
  Target,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { parseNum } from "@/lib/calc";
import {
  deleteObjective,
  nowISO,
  upsertObjective,
} from "@/lib/db";
import {
  useObjectives,
  usePlayers,
} from "@/lib/hooks";

export const Route = createFileRoute("/objetivos")({
  component: () => (
    <ClientOnly>
      <Objetivos />
    </ClientOnly>
  ),
});

interface IncomingObjective {
  playerName: string;
  month?: string;
  targetSum6: number;
}

interface ObjectiveImportFile {
  month?: string;
  records: IncomingObjective[];
}

function currentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function nextMonth(value: string) {
  const [year, month] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month,
    1,
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function formatMonth(value: string) {
  const [year, month] = value
    .split("-")
    .map(Number);

  if (!year || !month) {
    return value;
  }

  const text =
    new Intl.DateTimeFormat(
      "es-AR",
      {
        month: "long",
        year: "numeric",
      },
    ).format(
      new Date(
        year,
        month - 1,
        1,
      ),
    );

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function Objetivos() {
  const players = usePlayers();
  const objectives = useObjectives();

  const fileRef =
    useRef<HTMLInputElement>(null);

  const [month, setMonth] =
    useState(currentMonth());

  const [drafts, setDrafts] =
    useState<Record<number, string>>(
      {},
    );

  const [saving, setSaving] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const objectiveMonths =
    useMemo(() => {
      return [
        ...new Set(
          (objectives ?? []).map(
            (objective) =>
              objective.month,
          ),
        ),
      ].sort((a, b) =>
        b.localeCompare(a),
      );
    }, [objectives]);

  const latestMonth =
    objectiveMonths[0] ?? null;

  const objectivesForMonth =
    useMemo(() => {
      const map = new Map();

      for (
        const objective of
        objectives ?? []
      ) {
        if (
          objective.month === month
        ) {
          map.set(
            objective.playerId,
            objective,
          );
        }
      }

      return map;
    }, [objectives, month]);

  useEffect(() => {
    if (!players) {
      return;
    }

    const next: Record<
      number,
      string
    > = {};

    for (const player of players) {
      if (player.id == null) {
        continue;
      }

      const existing =
        objectivesForMonth.get(
          player.id,
        );

      next[player.id] =
        existing
          ? String(
              existing.targetSum6,
            ).replace(".", ",")
          : "";
    }

    setDrafts(next);
  }, [
    players,
    objectivesForMonth,
  ]);

  function nuevoObjetivo() {
    const base =
      latestMonth ??
      currentMonth();

    setMonth(
      nextMonth(base),
    );
  }

  async function guardar() {
    if (!players) {
      return;
    }

    try {
      setSaving(true);

      let saved = 0;

      for (const player of players) {
        if (player.id == null) {
          continue;
        }

        const raw =
          drafts[player.id] ?? "";

        const value =
          parseNum(raw);

        const existing =
          objectivesForMonth.get(
            player.id,
          );

        if (value == null) {
          if (existing?.id) {
            await deleteObjective(
              existing.id,
            );
          }

          continue;
        }

        await upsertObjective({
          id: existing?.id,
          playerId: player.id,
          month,
          targetSum6: value,
          createdAt:
            existing?.createdAt ??
            nowISO(),
          updatedAt: nowISO(),
        });

        saved++;
      }

      toast.success(
        `${saved} objetivos guardados para ${formatMonth(
          month,
        )}`,
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "No se pudieron guardar los objetivos",
      );
    } finally {
      setSaving(false);
    }
  }

  async function importar(
    file: File,
  ) {
    try {
      setImporting(true);

      const text =
        await file.text();

      const parsed =
        JSON.parse(
          text,
        ) as ObjectiveImportFile;

      if (
        !parsed ||
        !Array.isArray(
          parsed.records,
        )
      ) {
        throw new Error(
          "Formato inválido",
        );
      }

      const playersByName =
        new Map(
          (players ?? [])
            .filter(
              (player) =>
                player.id != null,
            )
            .map((player) => [
              normalizeName(
                player.name,
              ),
              player,
            ]),
        );

      let loaded = 0;

      const unmatched =
        new Set<string>();

      let importedMonth =
        parsed.month ?? null;

      for (
        const row of
        parsed.records
      ) {
        const rowMonth =
          row.month ??
          parsed.month;

        if (
          !rowMonth ||
          !Number.isFinite(
            row.targetSum6,
          )
        ) {
          continue;
        }

        const player =
          playersByName.get(
            normalizeName(
              row.playerName,
            ),
          );

        if (
          !player ||
          player.id == null
        ) {
          unmatched.add(
            row.playerName,
          );
          continue;
        }

        await upsertObjective({
          playerId: player.id,
          month: rowMonth,
          targetSum6:
            row.targetSum6,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });

        importedMonth =
          importedMonth ??
          rowMonth;

        loaded++;
      }

      if (importedMonth) {
        setMonth(importedMonth);
      }

      if (unmatched.size > 0) {
        window.alert(
          `Se cargaron ${loaded} objetivos.\n\nNo encontré estas jugadoras:\n${[
            ...unmatched,
          ].join("\n")}`,
        );
      } else {
        toast.success(
          `${loaded} objetivos importados correctamente`,
        );
      }
    } catch (error) {
      console.error(error);

      toast.error(
        "No se pudo importar el archivo de objetivos",
      );
    } finally {
      setImporting(false);

      if (fileRef.current) {
        fileRef.current.value =
          "";
      }
    }
  }

  return (
    <AppLayout
      title="Objetivos"
      subtitle="Objetivos mensuales de Sum 6 pliegues"
      actions={
        <Button
          onClick={() =>
            void guardar()
          }
          disabled={saving}
        >
          <Save className="h-4 w-4" />

          {saving
            ? "Guardando..."
            : "Guardar"}
        </Button>
      }
    >
      <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />

              <h2 className="font-display text-xl font-semibold">
                Objetivos de pliegues
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Objetivo mensual de
              Sumatoria de 6 pliegues
              para cada jugadora.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={
                nuevoObjetivo
              }
            >
              <CalendarPlus className="h-4 w-4" />
              Nuevo objetivo
            </Button>

            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file =
                  e.target.files?.[0];

                if (file) {
                  void importar(file);
                }
              }}
            />

            <Button
              type="button"
              variant="outline"
              disabled={importing}
              onClick={() =>
                fileRef.current?.click()
              }
            >
              <Upload className="h-4 w-4" />

              {importing
                ? "Importando..."
                : "Importar objetivos"}
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Mes
            </span>

            <input
              type="month"
              value={month}
              onChange={(e) =>
                setMonth(
                  e.target.value,
                )
              }
              className="mt-1 block h-10 rounded-md border border-input bg-background px-3"
            />
          </label>
        </div>

        {objectiveMonths.length >
          0 && (
          <div className="mt-5">
            <p className="panel-title text-xs text-muted-foreground">
              Meses cargados
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {objectiveMonths.map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setMonth(item)
                    }
                    className={
                      item === month
                        ? "rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                        : "rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                    }
                  >
                    {formatMonth(
                      item,
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {formatMonth(month)}
          </p>

          <h2 className="mt-1 font-display text-xl font-semibold">
            Objetivo Sum 6
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Dejá vacío si una
            jugadora no tiene objetivo
            asignado para este mes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-5 py-3 text-left">
                  Jugadora
                </th>

                <th className="px-5 py-3 text-right">
                  Objetivo a 1 mes
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (mm)
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {(players ?? []).map(
                (player) => {
                  if (
                    player.id == null
                  ) {
                    return null;
                  }

                  return (
                    <tr
                      key={player.id}
                      className="border-t border-border"
                    >
                      <td className="px-5 py-3 font-semibold">
                        {
                          player.name
                        }
                      </td>

                      <td className="px-5 py-2 text-right">
                        <input
                          inputMode="decimal"
                          value={
                            drafts[
                              player.id
                            ] ?? ""
                          }
                          onChange={(e) =>
                            setDrafts(
                              (
                                current,
                              ) => ({
                                ...current,
                                [player.id!]:
                                  e
                                    .target
                                    .value,
                              }),
                            )
                          }
                          placeholder="—"
                          className="numeric h-9 w-28 rounded-md border border-input bg-background px-3 text-right"
                        />
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm">
        Los objetivos quedan guardados
        por mes. Crear un objetivo nuevo
        no borra los meses anteriores.
      </div>
    </AppLayout>
  );
}
