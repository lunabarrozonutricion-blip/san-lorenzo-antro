import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import {
  fmt,
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

function Pesajes() {
  const players = usePlayers();
  const records = useWeightRecords();

  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [drafts, setDrafts] = useState<
    Record<number, Draft>
  >({});

  const recordsForDate = useMemo(() => {
    const map = new Map<number, NonNullable<typeof records>[number]>();

    for (const record of records ?? []) {
      if (record.date === date && !map.has(record.playerId)) {
        map.set(record.playerId, record);
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
            ? String(existing.weight).replace(".", ",")
            : "",
        condition:
          existing?.condition ?? "normal",
        notes: existing?.notes ?? "",
      };
    }

    setDrafts(next);
  }, [players, records, date]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return players ?? [];

    return (players ?? []).filter((player) =>
      player.name.toLowerCase().includes(text),
    );
  }, [players, search]);

  const previousByPlayer = useMemo(() => {
    const map = new Map<number, NonNullable<typeof records>[number]>();

    for (const player of players ?? []) {
      if (player.id == null) continue;

      const previous = (records ?? [])
        .filter(
          (record) =>
            record.playerId === player.id &&
            record.date < date &&
            record.weight != null,
        )
        .sort((a, b) =>
          b.date.localeCompare(a.date),
        )[0];

      if (previous) {
        map.set(player.id, previous);
      }
    }

    return map;
  }, [players, records, date]);

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

        const draft = drafts[player.id];

        if (!draft) continue;

        const weight = parseNum(draft.weight);
        const notes = draft.notes.trim();

        const existing = recordsForDate.get(player.id);

        const hasData =
          weight !== null ||
          draft.condition !== "normal" ||
          notes !== "";

        if (!hasData && !existing) {
          continue;
        }

        await upsertWeightRecord({
          id: existing?.id,
          playerId: player.id,
          date,
          weight,
          condition: draft.condition,
          notes: notes || null,
          createdAt: existing?.createdAt ?? nowISO(),
          updatedAt: nowISO(),
        });

        saved++;
      }

      toast.success(
        `${saved} registros de pesaje guardados`,
      );
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron guardar los pesajes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout
      title="Pesajes"
      subtitle="Carga grupal y seguimiento semanal"
      actions={
        <Button
          onClick={() => void guardar()}
          disabled={saving}
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      }
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Fecha del pesaje
            </span>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 md:max-w-xs"
            />
          </label>

          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Buscar jugadora
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          “Indispuesta” funciona como contexto del pesaje:
          igualmente podés cargar su peso.
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
                Anterior
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
            {filteredPlayers.map((player) => {
              if (player.id == null) return null;

              const draft =
                drafts[player.id] ?? {
                  weight: "",
                  condition: "normal" as WeightCondition,
                  notes: "",
                };

              const previous =
                previousByPlayer.get(player.id);

              const currentWeight =
                parseNum(draft.weight);

              const difference =
                currentWeight !== null &&
                previous?.weight != null
                  ? currentWeight - previous.weight
                  : null;

              return (
                <tr
                  key={player.id}
                  className="border-t border-border"
                >
                  <td className="px-4 py-3 font-semibold">
                    {player.name}
                  </td>

                  <td className="px-4 py-2 text-right">
                    <input
                      inputMode="decimal"
                      value={draft.weight}
                      onChange={(e) =>
                        updateDraft(player.id!, {
                          weight: e.target.value,
                        })
                      }
                      placeholder="kg"
                      className="h-9 w-24 rounded-md border border-input bg-background px-2 text-right numeric"
                    />
                  </td>

                  <td className="numeric px-4 py-3 text-right text-muted-foreground">
                    {fmt(previous?.weight, 1)}
                  </td>

                  <td className="numeric px-4 py-3 text-right font-semibold">
                    {fmtDiff(difference, 1)}
                  </td>

                  <td className="px-4 py-2">
                    <select
                      value={draft.condition}
                      onChange={(e) =>
                        updateDraft(player.id!, {
                          condition:
                            e.target.value as WeightCondition,
                        })
                      }
                      className="h-9 w-full min-w-[140px] rounded-md border border-input bg-background px-2"
                    >
                      {WEIGHT_CONDITIONS.map(
                        (condition) => (
                          <option
                            key={condition.value}
                            value={condition.value}
                          >
                            {condition.label}
                          </option>
                        ),
                      )}
                    </select>
                  </td>

                  <td className="px-4 py-2">
                    <input
                      value={draft.notes}
                      onChange={(e) =>
                        updateDraft(player.id!, {
                          notes: e.target.value,
                        })
                      }
                      placeholder="Opcional"
                      className="h-9 w-full min-w-[180px] rounded-md border border-input bg-background px-2"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm">
        <strong>Cómo funciona:</strong> cargás todos los
        pesos del día en esta misma pantalla. La app muestra
        automáticamente el último peso anterior y calcula la
        diferencia.
      </div>
    </AppLayout>
  );
}
