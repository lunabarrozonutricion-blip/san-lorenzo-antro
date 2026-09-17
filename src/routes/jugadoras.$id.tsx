import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Diff, Value } from "@/components/metric-cells";
import { Button } from "@/components/ui/button";
import { diff, fmt, fmtDate, metricValue } from "@/lib/calc";
import { deletePlayer } from "@/lib/db";
import {
  useControls,
  useObjectivePeriods,
  usePlayer,
} from "@/lib/hooks";
import { targetForPlayer } from "@/lib/objectives";
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
  const objectivePeriods = useObjectivePeriods();
  const navigate = useNavigate();

  const last = controls?.[0];
  const prev = controls?.[1];

  const latestSum6Control = controls?.find(
    (control) =>
      metricValue(control, "sum6") !== null,
  );

  const latestSum6 = latestSum6Control
    ? metricValue(latestSum6Control, "sum6")
    : null;

  const currentObjectivePeriod =
    objectivePeriods && objectivePeriods.length > 0
      ? objectivePeriods[objectivePeriods.length - 1]
      : undefined;

  const currentTarget =
    targetForPlayer(currentObjectivePeriod, player);

  const deltaTarget =
    latestSum6 !== null && currentTarget !== null
      ? latestSum6 - currentTarget
      : null;

  const objectiveHistory =
    (objectivePeriods ?? [])
      .map((period) => ({
        period,
        target: targetForPlayer(period, player),
      }))
      .filter((item) => item.target !== null)
      .reverse();

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
        <Button asChild size="sm" variant="outline">
          <Link to="/objetivos">
            Objetivos
          </Link>
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="panel-title text-xs text-muted-foreground">
              Objetivo actual
            </p>

            <p className="mt-1 font-display text-xl font-semibold">
              {currentObjectivePeriod?.label ?? "Sin período"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Objetivo Sum6
              </p>
              <p className="numeric mt-1 text-sm font-semibold">
                {currentTarget !== null
                  ? `${fmt(currentTarget, 1)} mm`
                  : "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Último Sum6
              </p>
              <p className="numeric mt-1 text-sm font-semibold">
                {latestSum6 !== null
                  ? `${fmt(latestSum6, 1)} mm`
                  : "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Δ vs objetivo
              </p>
              <p
                className={`numeric mt-1 text-sm font-semibold ${
                  deltaTarget === null
                    ? ""
                    : deltaTarget <= 0
                      ? "text-emerald-700"
                      : "text-rose-700"
                }`}
              >
                {deltaTarget !== null
                  ? `${deltaTarget > 0 ? "+" : ""}${fmt(deltaTarget, 1)} mm`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {objectiveHistory.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de objetivos
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {objectiveHistory.map(({ period, target }) => (
                <span
                  key={period.key}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  <strong>{period.label}:</strong>{" "}
                  {fmt(target, 1)} mm
                </span>
              ))}
            </div>
          </div>
        )}
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
