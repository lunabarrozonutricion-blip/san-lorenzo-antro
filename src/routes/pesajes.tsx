import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock3,
  GitCompareArrows,
  Printer,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import {
  fmt,
  fmtDate,
  fmtDiff,
  parseNum,
  todayISO,
} from "@/lib/calc";
import {
  nowISO,
  upsertWeightRecord,
} from "@/lib/db";
import {
  usePlayers,
  useWeightRecords,
} from "@/lib/hooks";
import {
  WEIGHT_CONDITIONS,
  type WeightCondition,
} from "@/lib/types";

export const Route = createFileRoute("/pesajes")({
  component: () => (
    <ClientOnly>
      <Pesajes />
    </ClientOnly>
  ),
});

type Draft = {
  weight: string;
  condition: WeightCondition;
  notes: string;
};

type ComparisonMode = "previous" | "date";

function dateMs(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function conditionLabel(value: WeightCondition) {
  return (
    WEIGHT_CONDITIONS.find(
      (condition) => condition.value === value,
    )?.label ?? value
  );
}

function formatKg(
  value: number | null | undefined,
) {
  if (value == null) return "—";
  return `${fmt(value, 1)} kg`;
}

function formatDiffKg(
  value: number | null | undefined,
) {
  if (value == null) return "—";
  return `${fmtDiff(value, 1)} kg`;
}

function Pesajes() {
  const players = usePlayers();
  const records = useWeightRecords();

  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>("previous");

  const [referenceDate, setReferenceDate] =
    useState("");

  const [drafts, setDrafts] = useState<
    Record<number, Draft>
  >({});

  const weightDates = useMemo(() => {
    return [
      ...new Set(
        (records ?? []).map(
          (record) => record.date,
        ),
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [records]);

  const latestWeightDate =
    weightDates[0] ?? null;

  const availableReferenceDates =
    useMemo(() => {
      return weightDates.filter(
        (weightDate) => weightDate < date,
      );
    }, [weightDates, date]);

  useEffect(() => {
    if (comparisonMode !== "date") return;

    if (
      referenceDate &&
      availableReferenceDates.includes(
        referenceDate,
      )
    ) {
      return;
    }

    setReferenceDate(
      availableReferenceDates[0] ?? "",
    );
  }, [
    comparisonMode,
    referenceDate,
    availableReferenceDates,
  ]);

  const selectedDateHasRecords =
    weightDates.includes(date);

  const recordsForDate = useMemo(() => {
    const map = new Map<
      number,
      NonNullable<typeof records>[number]
    >();

    for (const record of records ?? []) {
      if (
        record.date === date &&
        !map.has(record.playerId)
      ) {
        map.set(
          record.playerId,
          record,
        );
      }
    }

    return map;
  }, [records, date]);

  useEffect(() => {
    if (!players || !records) return;

    const next: Record<number, Draft> = {};

    for (const player of players) {
      if (player.id == null) continue;

      const existing = records.find(
        (record) =>
          record.playerId === player.id &&
          record.date === date,
      );

      next[player.id] = {
        weight:
          existing?.weight != null
            ? String(
                existing.weight,
              ).replace(".", ",")
            : "",
        condition:
          existing?.condition ?? "normal",
        notes: existing?.notes ?? "",
      };
    }

    setDrafts(next);
  }, [players, records, date]);

  const filteredPlayers = useMemo(() => {
    const text =
      search.trim().toLowerCase();

    if (!text) {
      return players ?? [];
    }

    return (players ?? []).filter(
      (player) =>
        player.name
          .toLowerCase()
          .includes(text),
    );
  }, [players, search]);

  const referenceByPlayer = useMemo(() => {
    const map = new Map<
      number,
      NonNullable<typeof records>[number]
    >();

    for (const player of players ?? []) {
      if (player.id == null) continue;

      const candidates = (
        records ?? []
      ).filter(
        (record) =>
          record.playerId === player.id &&
          record.date < date &&
          record.weight != null,
      );

      if (candidates.length === 0) {
        continue;
      }

      if (
        comparisonMode === "previous"
      ) {
        const previous = [
          ...candidates,
        ].sort((a, b) =>
          b.date.localeCompare(a.date),
        )[0];

        if (previous) {
          map.set(
            player.id,
            previous,
          );
        }

        continue;
      }

      if (!referenceDate) {
        continue;
      }

      const refTime =
        dateMs(referenceDate);

      const closest = [
        ...candidates,
      ].sort((a, b) => {
        const diffA = Math.abs(
          dateMs(a.date) - refTime,
        );

        const diffB = Math.abs(
          dateMs(b.date) - refTime,
        );

        if (diffA !== diffB) {
          return diffA - diffB;
        }

        const aIsBefore =
          a.date <= referenceDate;

        const bIsBefore =
          b.date <= referenceDate;

        if (aIsBefore !== bIsBefore) {
          return aIsBefore ? -1 : 1;
        }

        return b.date.localeCompare(
          a.date,
        );
      })[0];

      if (closest) {
        map.set(
          player.id,
          closest,
        );
      }
    }

    return map;
  }, [
    players,
    records,
    date,
    comparisonMode,
    referenceDate,
  ]);

  const reportRows = useMemo(() => {
    return (players ?? [])
      .filter(
        (player) =>
          player.id != null,
      )
      .map((player) => {
        const playerId =
          player.id as number;

        const draft =
          drafts[playerId] ?? {
            weight: "",
            condition:
              "normal" as WeightCondition,
            notes: "",
          };

        const currentWeight =
          parseNum(draft.weight);

        const reference =
          referenceByPlayer.get(
            playerId,
          );

        const difference =
          currentWeight !== null &&
          reference?.weight != null
            ? currentWeight -
              reference.weight
            : null;

        const hasCurrentRecord =
          recordsForDate.has(
            playerId,
          );

        const hasData =
          hasCurrentRecord ||
          currentWeight !== null ||
          draft.condition !==
            "normal" ||
          draft.notes.trim() !== "";

        return {
          player,
          currentWeight,
          reference,
          difference,
          condition:
            draft.condition,
          notes:
            draft.notes.trim(),
          hasData,
          usedDifferentDate:
            comparisonMode ===
              "date" &&
            Boolean(
              referenceDate &&
                reference?.date &&
                reference.date !==
                  referenceDate,
            ),
        };
      })
      .filter(
        (row) => row.hasData,
      );
  }, [
    players,
    drafts,
    referenceByPlayer,
    recordsForDate,
    comparisonMode,
    referenceDate,
  ]);

  const comparisonDescription =
    comparisonMode === "previous"
      ? "Último pesaje previo de cada jugadora"
      : referenceDate
        ? `Fecha objetivo ${fmtDate(referenceDate)}`
        : "Fecha de referencia";

  function updateDraft(
    playerId: number,
    patch: Partial<Draft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [playerId]: {
        ...(current[playerId] ?? {
          weight: "",
          condition: "normal",
          notes: "",
        }),
        ...patch,
      },
    }));
  }

  async function guardar() {
    if (!players) return;

    try {
      setSaving(true);

      let saved = 0;

      for (const player of players) {
        if (player.id == null) continue;

        const draft =
          drafts[player.id];

        if (!draft) continue;

        const weight =
          parseNum(draft.weight);

        const notes =
          draft.notes.trim();

        const existing =
          recordsForDate.get(
            player.id,
          );

        const hasData =
          weight !== null ||
          draft.condition !==
            "normal" ||
          notes !== "";

        if (
          !hasData &&
          !existing
        ) {
          continue;
        }

        await upsertWeightRecord({
          id: existing?.id,
          playerId: player.id,
          date,
          weight,
          condition:
            draft.condition,
          notes: notes || null,
          createdAt:
            existing?.createdAt ??
            nowISO(),
          updatedAt: nowISO(),
        });

        saved++;
      }

      toast.success(
        `${saved} registros de pesaje guardados`,
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "No se pudieron guardar los pesajes",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout
      title="Pesajes"
      subtitle="Carga grupal y seguimiento semanal"
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={
              reportRows.length === 0
            }
            onClick={() =>
              window.print()
            }
          >
            <Printer className="h-4 w-4" />
            Imprimir informe
          </Button>

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
        </>
      }
    >
      <div className="no-print">
        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Fecha del pesaje
              </span>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value,
                  )
                }
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 md:max-w-xs"
              />
            </label>

            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Buscar jugadora
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
                placeholder="Buscar..."
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                !latestWeightDate
              }
              onClick={() => {
                if (
                  latestWeightDate
                ) {
                  setDate(
                    latestWeightDate,
                  );
                }
              }}
            >
              <Clock3 className="h-4 w-4" />
              Último pesaje
            </Button>

            {latestWeightDate && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Último registrado:
                </span>{" "}
                <strong>
                  {fmtDate(
                    latestWeightDate,
                  )}
                </strong>
              </div>
            )}
          </div>

          {!selectedDateHasRecords && (
            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3 text-sm">
              No hay pesajes cargados
              para{" "}
              <strong>
                {fmtDate(date)}
              </strong>
              .
            </div>
          )}

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />

              <p className="panel-title text-xs text-muted-foreground">
                Fechas con pesajes
              </p>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {weightDates.map(
                (weightDate) => (
                  <button
                    key={
                      weightDate
                    }
                    type="button"
                    onClick={() =>
                      setDate(
                        weightDate,
                      )
                    }
                    className={
                      weightDate ===
                      date
                        ? "rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                        : "rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                    }
                  >
                    {fmtDate(
                      weightDate,
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-accent" />

            <div>
              <h2 className="font-display font-semibold">
                Comparación
              </h2>

              <p className="text-xs text-muted-foreground">
                Elegí contra qué
                pesaje calcular la
                diferencia.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={
                comparisonMode ===
                "previous"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setComparisonMode(
                  "previous",
                )
              }
            >
              Último pesaje de cada jugadora
            </Button>

            <Button
              type="button"
              variant={
                comparisonMode ===
                "date"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setComparisonMode(
                  "date",
                )
              }
            >
              Comparar con una fecha
            </Button>
          </div>

          {comparisonMode ===
            "previous" && (
            <p className="mt-3 text-sm text-muted-foreground">
              Cada jugadora se
              compara con su último
              peso real disponible,
              aunque haya faltado a
              controles intermedios.
            </p>
          )}

          {comparisonMode ===
            "date" && (
            <div className="mt-4">
              <label className="text-sm">
                <span className="panel-title text-xs text-muted-foreground">
                  Fecha de referencia
                </span>

                <select
                  value={
                    referenceDate
                  }
                  onChange={(e) =>
                    setReferenceDate(
                      e.target.value,
                    )
                  }
                  className="mt-1 h-10 w-full max-w-xs rounded-md border border-input bg-background px-3"
                >
                  {availableReferenceDates.map(
                    (
                      weightDate,
                    ) => (
                      <option
                        key={
                          weightDate
                        }
                        value={
                          weightDate
                        }
                      >
                        {fmtDate(
                          weightDate,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {referenceDate && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Fecha objetivo:{" "}
                  <strong>
                    {fmtDate(
                      referenceDate,
                    )}
                  </strong>
                  . Si una jugadora
                  no tiene peso ese
                  día, se usa su
                  pesaje más cercano
                  disponible y se
                  muestra la fecha
                  realmente utilizada.
                </p>
              )}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            “Indispuesta” funciona
            como contexto del pesaje:
            igualmente podés cargar su
            peso.
          </p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card shadow-panel">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-4 py-3 text-left">
                  Jugadora
                </th>

                <th className="px-4 py-3 text-right">
                  Peso
                </th>

                <th className="px-4 py-3 text-right">
                  {comparisonMode ===
                  "previous"
                    ? "Anterior"
                    : "Referencia"}
                </th>

                <th className="px-4 py-3 text-right">
                  Diferencia
                </th>

                <th className="px-4 py-3 text-left">
                  Condición
                </th>

                <th className="px-4 py-3 text-left">
                  Observación
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPlayers.map(
                (player) => {
                  if (
                    player.id == null
                  ) {
                    return null;
                  }

                  const draft =
                    drafts[
                      player.id
                    ] ?? {
                      weight: "",
                      condition:
                        "normal" as WeightCondition,
                      notes: "",
                    };

                  const reference =
                    referenceByPlayer.get(
                      player.id,
                    );

                  const currentWeight =
                    parseNum(
                      draft.weight,
                    );

                  const difference =
                    currentWeight !==
                      null &&
                    reference?.weight !=
                      null
                      ? currentWeight -
                        reference.weight
                      : null;

                  const usedDifferentDate =
                    comparisonMode ===
                      "date" &&
                    referenceDate &&
                    reference?.date &&
                    reference.date !==
                      referenceDate;

                  return (
                    <tr
                      key={
                        player.id
                      }
                      className="border-t border-border"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {
                          player.name
                        }
                      </td>

                      <td className="px-4 py-2 text-right">
                        <input
                          inputMode="decimal"
                          value={
                            draft.weight
                          }
                          onChange={(
                            e,
                          ) =>
                            updateDraft(
                              player.id!,
                              {
                                weight:
                                  e
                                    .target
                                    .value,
                              },
                            )
                          }
                          placeholder="kg"
                          className="numeric h-9 w-24 rounded-md border border-input bg-background px-2 text-right"
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="numeric text-muted-foreground">
                          {fmt(
                            reference?.weight,
                            1,
                          )}
                        </div>

                        {reference?.date && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {fmtDate(
                              reference.date,
                            )}
                          </div>
                        )}

                        {usedDifferentDate && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            más cercano
                            a{" "}
                            {fmtDate(
                              referenceDate,
                            )}
                          </div>
                        )}
                      </td>

                      <td className="numeric px-4 py-3 text-right font-semibold">
                        {fmtDiff(
                          difference,
                          1,
                        )}
                      </td>

                      <td className="px-4 py-2">
                        <select
                          value={
                            draft.condition
                          }
                          onChange={(
                            e,
                          ) =>
                            updateDraft(
                              player.id!,
                              {
                                condition:
                                  e
                                    .target
                                    .value as WeightCondition,
                              },
                            )
                          }
                          className="h-9 w-full min-w-[140px] rounded-md border border-input bg-background px-2"
                        >
                          {WEIGHT_CONDITIONS.map(
                            (
                              condition,
                            ) => (
                              <option
                                key={
                                  condition.value
                                }
                                value={
                                  condition.value
                                }
                              >
                                {
                                  condition.label
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={
                            draft.notes
                          }
                          onChange={(
                            e,
                          ) =>
                            updateDraft(
                              player.id!,
                              {
                                notes:
                                  e
                                    .target
                                    .value,
                              },
                            )
                          }
                          placeholder="Opcional"
                          className="h-9 w-full min-w-[180px] rounded-md border border-input bg-background px-2"
                        />
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm">
          <strong>
            Cómo funciona:
          </strong>{" "}
          podés comparar cada pesaje
          contra el último registro de
          cada jugadora o elegir una
          fecha histórica como
          referencia. Si una jugadora
          faltó en la fecha elegida, la
          app utiliza automáticamente
          su medición más cercana y te
          indica qué fecha usó.
        </div>
      </div>

      <div className="hidden print:block">
        <div className="mb-6 border-b border-black pb-3">
          <p className="text-sm font-semibold">
            SAN LORENZO DE ALMAGRO
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Informe de Pesajes
          </h1>

          <div className="mt-3 text-sm">
            <p>
              <strong>
                Fecha del pesaje:
              </strong>{" "}
              {fmtDate(date)}
            </p>

            <p>
              <strong>
                Comparación:
              </strong>{" "}
              {comparisonDescription}
            </p>

            {comparisonMode ===
              "date" && (
              <p className="mt-1 text-xs">
                Cuando una jugadora no
                posee registro en la
                fecha objetivo, se
                utiliza su pesaje más
                cercano disponible.
              </p>
            )}
          </div>
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-black px-2 py-2 text-left">
                Jugadora
              </th>

              <th className="border border-black px-2 py-2 text-right">
                Peso
              </th>

              <th className="border border-black px-2 py-2 text-right">
                Referencia
              </th>

              <th className="border border-black px-2 py-2 text-right">
                Diferencia
              </th>

              <th className="border border-black px-2 py-2 text-left">
                Condición
              </th>

              <th className="border border-black px-2 py-2 text-left">
                Observación
              </th>
            </tr>
          </thead>

          <tbody>
            {reportRows.map(
              (row) => (
                <tr
                  key={
                    row.player.id
                  }
                >
                  <td className="border border-black px-2 py-2 font-semibold">
                    {
                      row.player.name
                    }
                  </td>

                  <td className="border border-black px-2 py-2 text-right">
                    {formatKg(
                      row.currentWeight,
                    )}
                  </td>

                  <td className="border border-black px-2 py-2 text-right">
                    <div>
                      {formatKg(
                        row.reference
                          ?.weight,
                      )}
                    </div>

                    {row.reference
                      ?.date && (
                      <div className="mt-1 text-[10px]">
                        {fmtDate(
                          row.reference
                            .date,
                        )}
                        {row.usedDifferentDate
                          ? " *"
                          : ""}
                      </div>
                    )}
                  </td>

                  <td className="border border-black px-2 py-2 text-right font-semibold">
                    {formatDiffKg(
                      row.difference,
                    )}
                  </td>

                  <td className="border border-black px-2 py-2">
                    {conditionLabel(
                      row.condition,
                    )}
                  </td>

                  <td className="border border-black px-2 py-2">
                    {row.notes ||
                      "—"}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        {comparisonMode ===
          "date" &&
          reportRows.some(
            (row) =>
              row.usedDifferentDate,
          ) && (
            <p className="mt-3 text-[10px]">
              * La fecha utilizada no
              coincide exactamente con
              la fecha objetivo; se
              utilizó el pesaje más
              cercano disponible para
              esa jugadora.
            </p>
          )}

        <div className="mt-6 text-xs">
          <p>
            Total de jugadoras incluidas:{" "}
            <strong>
              {reportRows.length}
            </strong>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
