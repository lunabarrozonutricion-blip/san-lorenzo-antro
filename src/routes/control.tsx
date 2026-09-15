import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Diff, Value } from "@/components/metric-cells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { diff, fmt, fmtDate, metricValue, parseNum, todayISO } from "@/lib/calc";
import { deleteControl, nowISO, upsertControl } from "@/lib/db";
import { useControls, usePlayers } from "@/lib/hooks";
import type { Control, MetricKey } from "@/lib/types";

export const Route = createFileRoute("/control")({
  validateSearch: (s: Record<string, unknown>): { player?: number; id?: number } => ({
    player: s.player != null && s.player !== "" ? Number(s.player) : undefined,
    id: s.id != null && s.id !== "" ? Number(s.id) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nuevo control – Seguimiento Antropométrico CASLA" },
      { name: "description", content: "Cargá una medición comparando en vivo con el control anterior." },
      { property: "og:title", content: "Nuevo control – Seguimiento Antropométrico CASLA" },
      { property: "og:description", content: "Peso, pliegues y perímetros con diferencias calculadas al instante." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <NuevoControl />
    </ClientOnly>
  ),
});

type FieldKey =
  | "weight"
  | "triceps"
  | "subscapular"
  | "supraespinal"
  | "abdominal"
  | "thighSkinfold"
  | "calfSkinfold"
  | "armPerimeter"
  | "thighPerimeter"
  | "calfPerimeter";

const FIELD_GROUPS: { title: string; unit: string; fields: { key: FieldKey; label: string }[] }[] = [
  { title: "Generales", unit: "kg", fields: [{ key: "weight", label: "Peso" }] },
  {
    title: "Pliegues",
    unit: "mm",
    fields: [
      { key: "triceps", label: "Tríceps" },
      { key: "subscapular", label: "Subescapular" },
      { key: "supraespinal", label: "Supraespinal" },
      { key: "abdominal", label: "Abdominal" },
      { key: "thighSkinfold", label: "Muslo" },
      { key: "calfSkinfold", label: "Pierna" },
    ],
  },
  {
    title: "Perímetros",
    unit: "cm",
    fields: [
      { key: "armPerimeter", label: "Brazo" },
      { key: "thighPerimeter", label: "Muslo" },
      { key: "calfPerimeter", label: "Pantorrilla" },
    ],
  },
];

const DERIVED: { key: MetricKey; label: string; unit: string; decimals: number }[] = [
  { key: "sum6", label: "Sum 6 pliegues", unit: "mm", decimals: 1 },
  { key: "armCorrected", label: "Brazo corregido", unit: "cm", decimals: 2 },
  { key: "thighCorrected", label: "Muslo corregido", unit: "cm", decimals: 2 },
  { key: "calfCorrected", label: "Pantorrilla corregida", unit: "cm", decimals: 2 },
];

const EMPTY: Record<FieldKey, string> = {
  weight: "",
  triceps: "",
  subscapular: "",
  supraespinal: "",
  abdominal: "",
  thighSkinfold: "",
  calfSkinfold: "",
  armPerimeter: "",
  thighPerimeter: "",
  calfPerimeter: "",
};

function NuevoControl() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const players = usePlayers();
  const [playerId, setPlayerId] = useState<number | null>(search.player ?? null);
  const [date, setDate] = useState(todayISO());
  const [values, setValues] = useState<Record<FieldKey, string>>({ ...EMPTY });
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<number | undefined>(search.id);

  const controls = useControls(playerId);

  useEffect(() => {
    if (players && players.length > 0 && playerId === null) setPlayerId(players[0].id!);
  }, [players, playerId]);

  // Cargar control existente para edición
  useEffect(() => {
    if (!search.id || !controls) return;
    const c = controls.find((x) => x.id === search.id);
    if (!c) return;
    setEditingId(c.id);
    setDate(c.date);
    setNotes(c.notes ?? "");
    const next = { ...EMPTY };
    (Object.keys(EMPTY) as FieldKey[]).forEach((k) => {
      const v = c[k];
      next[k] = v === null || v === undefined ? "" : String(v).replace(".", ",");
    });
    setValues(next);
  }, [search.id, controls]);

  const draft: Partial<Control> = useMemo(() => {
    const out: Partial<Control> = {};
    (Object.keys(EMPTY) as FieldKey[]).forEach((k) => {
      out[k] = parseNum(values[k]);
    });
    return out;
  }, [values]);

  const previous = useMemo(() => {
    if (!controls) return undefined;
    return controls.find((c) => c.id !== editingId && c.date <= date) ?? controls.find((c) => c.id !== editingId);
  }, [controls, date, editingId]);

  async function guardar() {
    if (!playerId) { toast.error("Elegí una jugadora"); return; }
    if (!date) { toast.error("Indicá la fecha del control"); return; }
    const payload: Control = {
      id: editingId,
      playerId,
      date,
      weight: draft.weight ?? null,
      triceps: draft.triceps ?? null,
      subscapular: draft.subscapular ?? null,
      supraespinal: draft.supraespinal ?? null,
      abdominal: draft.abdominal ?? null,
      thighSkinfold: draft.thighSkinfold ?? null,
      calfSkinfold: draft.calfSkinfold ?? null,
      armPerimeter: draft.armPerimeter ?? null,
      thighPerimeter: draft.thighPerimeter ?? null,
      calfPerimeter: draft.calfPerimeter ?? null,
      notes: notes.trim() === "" ? null : notes.trim(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await upsertControl(payload);
    toast.success(editingId ? "Control actualizado" : "Control guardado localmente");
    navigate({ to: "/jugadoras/$id", params: { id: String(playerId) } });
  }

  async function eliminar() {
    if (!editingId) return;
    if (!confirm("¿Eliminar este control? Esta acción no se puede deshacer.")) return;
    await deleteControl(editingId);
    toast.success("Control eliminado");
    navigate({ to: "/jugadoras/$id", params: { id: String(playerId) } });
  }

  return (
    <AppLayout
      title={editingId ? "Editar control" : "Nuevo control"}
      actions={
        editingId ? (
          <Button variant="ghost" size="sm" onClick={eliminar}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null
      }
    >
      <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">Jugadora</span>
            <select
              value={playerId ?? ""}
              onChange={(e) => {
                setPlayerId(Number(e.target.value));
                setEditingId(undefined);
              }}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(players ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">Fecha del control</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </label>
          <div className="rounded-md bg-muted/60 p-3">
            <p className="panel-title text-xs text-muted-foreground">Último control</p>
            <p className="font-display text-lg font-semibold">{fmtDate(previous?.date)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {FIELD_GROUPS.map((g) => (
          <div key={g.title} className="rounded-lg border border-border bg-card shadow-panel">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <h2 className="panel-title text-xs text-muted-foreground">
                {g.title} ({g.unit})
              </h2>
              <div className="hidden w-[19rem] grid-cols-2 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:grid">
                <span>Último control</span>
                <span>Diferencia</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {g.fields.map((f) => {
                const nuevo = parseNum(values[f.key]);
                const anterior = previous ? (previous[f.key] ?? null) : null;
                return (
                  <div key={f.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <span className="w-32 shrink-0 text-sm font-medium">{f.label}</span>
                    <Input
                      inputMode="decimal"
                      value={values[f.key]}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder="—"
                      className="numeric h-9 w-28"
                    />
                    <div className="ml-auto flex w-[19rem] items-center justify-end gap-6 text-sm">
                      <span className="numeric w-24 text-right text-muted-foreground">
                        <span className="sm:hidden">Ant. </span>
                        {fmt(anterior, 1)}
                      </span>
                      <span className="w-20 text-right">
                        <Diff value={diff(nuevo, anterior)} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-border bg-card shadow-panel">
          <div className="border-b border-border px-4 py-2">
            <h2 className="panel-title text-xs text-muted-foreground">Cálculos automáticos</h2>
          </div>
          <div className="divide-y divide-border">
            {DERIVED.map((d) => {
              const nuevo = metricValue(draft, d.key);
              const anterior = metricValue(previous, d.key);
              return (
                <div key={d.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="w-48 shrink-0 text-sm font-medium">
                    {d.label} <span className="text-xs text-muted-foreground">({d.unit})</span>
                  </span>
                  <span className="numeric w-24 font-display text-lg font-semibold">
                    <Value value={nuevo} decimals={d.decimals} />
                  </span>
                  <div className="ml-auto flex w-[19rem] items-center justify-end gap-6 text-sm">
                    <span className="numeric w-24 text-right text-muted-foreground">{fmt(anterior, d.decimals)}</span>
                    <span className="w-20 text-right">
                      <Diff value={diff(nuevo, anterior)} decimals={d.decimals} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
          <label className="text-sm">
            <span className="panel-title text-xs text-muted-foreground">Observaciones (opcional)</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
          </label>
        </div>

        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={guardar}>
            <Save className="h-4 w-4" /> {editingId ? "Guardar cambios" : "Guardar control"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
