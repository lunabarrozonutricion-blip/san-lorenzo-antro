import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardPlus,
  Database,
  FileText,
  GitCompareArrows,
  History,
  LineChart,
  Users,
} from "lucide-react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { OfflineBadge } from "@/components/offline-badge";
import { fmtDate } from "@/lib/calc";
import { useControls, usePlayers } from "@/lib/hooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seguimiento Antropométrico – San Lorenzo Fútbol Femenino" },
      {
        name: "description",
        content:
          "Panel local y offline para el control antropométrico de la Primera División de Fútbol Femenino de San Lorenzo.",
      },
      { property: "og:title", content: "Seguimiento Antropométrico – San Lorenzo Fútbol Femenino" },
      {
        property: "og:description",
        content: "Controles, comparativas, evolución e informes antropométricos, 100% offline.",
      },
    ],
  }),
  component: () => (
    <ClientOnly>
      <Inicio />
    </ClientOnly>
  ),
});

const TILES = [
  { to: "/jugadoras", label: "Jugadoras", desc: "Fichas y último control", icon: Users },
  { to: "/control", label: "Nuevo control", desc: "Cargar medición", icon: ClipboardPlus },
  { to: "/historial", label: "Historial", desc: "Todos los controles", icon: History },
  { to: "/comparativa", label: "Comparativas", desc: "Comparar dos controles", icon: GitCompareArrows },
  { to: "/evolucion", label: "Evolución", desc: "Gráficos temporales", icon: LineChart },
  { to: "/informes", label: "Informes", desc: "Armar informe a medida", icon: FileText },
  { to: "/plantel", label: "Plantel completo", desc: "Tabla general", icon: BarChart3 },
  { to: "/datos", label: "Importar / Exportar", desc: "Backup y restauración", icon: Database },
] as const;

function Inicio() {
  const players = usePlayers();
  const controls = useControls();
  const ultimo = controls && controls.length > 0 ? controls[0] : undefined;

  return (
    <AppLayout title="Inicio">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Jugadoras" value={players ? String(players.length) : "—"} />
        <Stat label="Controles cargados" value={controls ? String(controls.length) : "—"} />
        <Stat label="Último control" value={fmtDate(ultimo?.date)} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-lg border border-border bg-card p-4 shadow-panel transition-colors hover:border-accent"
            >
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-3 font-display text-base font-semibold uppercase tracking-wide">{t.label}</p>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 max-w-md">
        <OfflineBadge />
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
      <p className="panel-title text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
