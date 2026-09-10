import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Value } from "@/components/metric-cells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, metricValue } from "@/lib/calc";
import { deleteControl } from "@/lib/db";
import { useControls, usePlayers } from "@/lib/hooks";

export const Route = createFileRoute("/historial")({
  validateSearch: (s: Record<string, unknown>): { player?: number } => ({
    player: s.player != null && s.player !== "" ? Number(s.player) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Historial de controles – Seguimiento Antropométrico CASLA" },
      { name: "description", content: "Todos los controles cargados, con filtros por jugadora y por fecha." },
      { property: "og:title", content: "Historial de controles – Seguimiento Antropométrico CASLA" },
      { property: "og:description", content: "Consultá, editá, eliminá y compará cualquier control registrado." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <Historial />
    </ClientOnly>
  ),
});

function Historial() {
  const search = Route.useSearch();
  const players = usePlayers();
  const controls = useControls();
  const [player, setPlayer] = useState<string>(search.player ? String(search.player) : "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const names = useMemo(() => new Map((players ?? []).map((p) => [p.id!, p.name])), [players]);

  const rows = useMemo(
    () =>
      (controls ?? []).filter(
        (c) =>
          (player === "" || c.playerId === Number(player)) &&
          (desde === "" || c.date >= desde) &&
          (hasta === "" || c.date <= hasta),
      ),
    [controls, player, desde, hasta],
  );

  async function eliminar(id: number) {
    if (!confirm("¿Eliminar este control? Esta acción no se puede deshacer.")) return;
    await deleteControl(id);
    toast.success("Control eliminado");
  }

  return (
    <AppLayout title="Historial">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-panel sm:grid-cols-3">
        <label className="text-sm">
          <span className="panel-title text-xs text-muted-foreground">Jugadora</span>
          <select
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            {(players ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="panel-title text-xs text-muted-foreground">Desde</span>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1" />
        </label>
        <label className="text-sm">
          <span className="panel-title text-xs text-muted-foreground">Hasta</span>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1" />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card shadow-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Jugadora</th>
              <th className="px-3 py-2 font-semibold">Peso (kg)</th>
              <th className="px-3 py-2 font-semibold">Sum6P (mm)</th>
              <th className="px-3 py-2 font-semibold">Observaciones</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2">{fmtDate(c.date)}</td>
                <td className="px-3 py-2 font-medium">{names.get(c.playerId) ?? "—"}</td>
                <td className="numeric px-3 py-2">
                  <Value value={metricValue(c, "weight")} />
                </td>
                <td className="numeric px-3 py-2">
                  <Value value={metricValue(c, "sum6")} />
                </td>
                <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">{c.notes || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/control" search={{ player: c.playerId, id: c.id }}>
                      Editar
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/comparativa" search={{ player: c.playerId, a: c.id, b: undefined }}>
                      Comparar
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => eliminar(c.id!)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay controles para los filtros elegidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
