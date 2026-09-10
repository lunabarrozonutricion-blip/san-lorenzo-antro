import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Diff, Value } from "@/components/metric-cells";
import { Button } from "@/components/ui/button";
import { diff, fmtDate, metricValue } from "@/lib/calc";
import { deletePlayer } from "@/lib/db";
import { useControls, usePlayer } from "@/lib/hooks";
import { METRICS } from "@/lib/types";

export const Route = createFileRoute("/jugadoras/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de jugadora – Seguimiento Antropométrico CASLA" },
      { name: "description", content: "Ficha individual con último control, historial y accesos rápidos." },
      { property: "og:title", content: "Ficha de jugadora – Seguimiento Antropométrico CASLA" },
      { property: "og:description", content: "Último control, historial completo y evolución de la jugadora." },
    ],
  }),
  component: () => (
    <ClientOnly>
      <Ficha />
    </ClientOnly>
  ),
});

function Ficha() {
  const { id } = Route.useParams();
  const playerId = Number(id);
  const player = usePlayer(playerId);
  const controls = useControls(playerId);
  const navigate = useNavigate();

  const last = controls?.[0];
  const prev = controls?.[1];

  async function eliminar() {
    if (!confirm(`¿Eliminar a ${player?.name} y todos sus controles? Esta acción no se puede deshacer.`)) return;
    await deletePlayer(playerId);
    toast.success("Jugadora eliminada");
    navigate({ to: "/jugadoras" });
  }

  if (!player) {
    return (
      <AppLayout title="Ficha de jugadora">
        <p className="text-sm text-muted-foreground">Jugadora no encontrada.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={player.name}
      subtitle={player.position || "Primera División Fútbol Femenino"}
      actions={
        <Button variant="ghost" size="sm" onClick={eliminar}>
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/control" search={{ player: playerId, id: undefined }}>
            Nuevo control
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/evolucion" search={{ player: playerId }}>
            Evolución
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/informes" search={{ player: playerId }}>
            Informe
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/historial" search={{ player: playerId }}>
            Historial
          </Link>
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3">
          <p className="panel-title text-xs text-muted-foreground">Último control</p>
          <p className="font-display text-lg font-semibold">{fmtDate(last?.date)}</p>
        </div>
        <div className="grid gap-x-6 p-4 sm:grid-cols-2">
          {METRICS.map((m) => {
            const a = metricValue(last, m.key);
            const b = metricValue(prev, m.key);
            return (
              <div key={m.key} className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                <span className="text-muted-foreground">
                  {m.label} <span className="text-xs">({m.unit})</span>
                </span>
                <span className="flex items-center gap-3">
                  <Value value={a} decimals={m.decimals} />
                  <Diff value={diff(a, b)} decimals={m.decimals} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="panel-title mt-6 mb-2 text-xs text-muted-foreground">Historial</h2>
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-panel">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Peso</th>
              <th className="px-3 py-2 font-semibold">Sum6P</th>
              <th className="px-3 py-2 font-semibold">Observaciones</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(controls ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2">{fmtDate(c.date)}</td>
                <td className="numeric px-3 py-2">
                  <Value value={metricValue(c, "weight")} />
                </td>
                <td className="numeric px-3 py-2">
                  <Value value={metricValue(c, "sum6")} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.notes || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/control" search={{ player: playerId, id: c.id }}>
                      Editar
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {(controls ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Todavía no hay controles cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
