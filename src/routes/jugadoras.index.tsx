import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Value } from "@/components/metric-cells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, metricValue } from "@/lib/calc";
import { upsertPlayer, nowISO } from "@/lib/db";
import { lastControl, useControls, usePlayers } from "@/lib/hooks";

export const Route = createFileRoute("/jugadoras/")({
  head: () => ({
    meta: [
      { title: "Jugadoras – Seguimiento Antropométrico CASLA" },
      { name: "description", content: "Listado de jugadoras con su último control antropométrico registrado." },
      { property: "og:title", content: "Jugadoras – Seguimiento Antropométrico CASLA" },
      { property: "og:description", content: "Buscá una jugadora y accedé a su ficha, historial y evolución." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <Jugadoras />
    </ClientOnly>
  ),
});

function Jugadoras() {
  const players = usePlayers();
  const controls = useControls();
  const [q, setQ] = useState("");
  const [nueva, setNueva] = useState("");

  const filtered = useMemo(
    () => (players ?? []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())),
    [players, q],
  );

  async function agregar() {
    const name = nueva.trim();
    if (!name) return;
    await upsertPlayer({ name, active: 1, position: null, birthDate: null, createdAt: nowISO(), updatedAt: nowISO() });
    setNueva("");
    toast.success(`${name} agregada al plantel`);
  }

  return (
    <AppLayout title="Jugadoras">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar jugadora…" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nombre y apellido" />
          <Button onClick={agregar}>
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const last = lastControl(controls, p.id!);
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4 shadow-panel">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.position || "Sin posición"}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {(controls ?? []).filter((c) => c.playerId === p.id).length} controles
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-muted/60 p-3 text-center">
                <Field label="Último" value={fmtDate(last?.date)} />
                <Field label="Peso" value={<Value value={metricValue(last, "weight")} />} />
                <Field label="Sum6P" value={<Value value={metricValue(last, "sum6")} />} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/jugadoras/$id" params={{ id: String(p.id) }}>
                    Ver ficha
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/control" search={{ player: p.id, id: undefined }}>
                    Nuevo control
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay jugadoras que coincidan con la búsqueda.</p>
        )}
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="panel-title text-[10px] text-muted-foreground">{label}</p>
      <p className="numeric text-sm font-semibold">{value}</p>
    </div>
  );
}
