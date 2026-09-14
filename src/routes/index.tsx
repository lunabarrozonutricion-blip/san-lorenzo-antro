import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardPlus,
  Database,
  FileText,
  GitCompareArrows,
  History,
  LineChart,
  Scale,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { OfflineBadge } from "@/components/offline-badge";
import { fmtDate } from "@/lib/calc";
import { useControls, usePlayers } from "@/lib/hooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "San Lorenzo Área Nutricional – Primera División Fútbol Femenino",
      },
      {
        name: "description",
        content:
          "Área Nutricional de la Primera División de Fútbol Femenino de San Lorenzo.",
      },
      {
        property: "og:title",
        content:
          "San Lorenzo Área Nutricional – Primera División Fútbol Femenino",
      },
      {
        property: "og:description",
        content:
          "Seguimiento antropométrico, pesajes, evolución e informes del plantel.",
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
  {
    to: "/jugadoras",
    label: "Jugadoras",
    desc: "Fichas y último control",
    icon: Users,
  },
  {
    to: "/control",
    label: "Nuevo control",
    desc: "Cargar medición",
    icon: ClipboardPlus,
  },
  {
    to: "/pesajes",
    label: "Pesajes",
    desc: "Carga y seguimiento semanal",
    icon: Scale,
  },
  {
    to: "/historial",
    label: "Historial",
    desc: "Todos los controles",
    icon: History,
  },
  {
    to: "/comparativa",
    label: "Comparativas",
    desc: "Comparar dos controles",
    icon: GitCompareArrows,
  },
  {
    to: "/evolucion",
    label: "Evolución",
    desc: "Gráficos temporales",
    icon: LineChart,
  },
  {
    to: "/informes",
    label: "Informes",
    desc: "Armar informe a medida",
    icon: FileText,
  },
  {
    to: "/plantel",
    label: "Plantel completo",
    desc: "Tabla general",
    icon: BarChart3,
  },
  {
    to: "/datos",
    label: "Importar / Exportar",
    desc: "Backup y restauración",
    icon: Database,
  },
] as const;

function Inicio() {
  const players = usePlayers();
  const controls = useControls();

  const [ready, setReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const ultimo =
    controls && controls.length > 0
      ? controls[0]
      : undefined;

  useEffect(() => {
    const alreadyEntered =
      sessionStorage.getItem(
        "casla-area-nutricional-entered",
      ) === "1";

    setShowWelcome(!alreadyEntered);
    setReady(true);
  }, []);

  function ingresar() {
    sessionStorage.setItem(
      "casla-area-nutricional-entered",
      "1",
    );

    setShowWelcome(false);
  }

  if (!ready) {
    return null;
  }

  if (showWelcome) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
        <div className="animate-in w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl fade-in zoom-in-95 duration-700">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent px-6 py-10 text-white sm:px-12 sm:py-14">
            {/* Decoración suave de fondo */}
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative flex flex-col items-center text-center">
              {/* Escudo */}
              <div className="animate-in flex h-36 w-36 items-center justify-center rounded-3xl bg-white p-4 shadow-xl fade-in zoom-in-90 duration-700 sm:h-40 sm:w-40">
                <img
                  src="/logo-san-lorenzo.png"
                  alt="Escudo del Club Atlético San Lorenzo de Almagro"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                Club Atlético San Lorenzo de Almagro
              </p>

              <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-white sm:text-5xl">
                San Lorenzo Área Nutricional
              </h1>

              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-white/30" />

              <p className="mt-5 text-base font-semibold text-white sm:text-lg">
                Primera División · Fútbol Femenino
              </p>

              <p className="mt-1 text-sm text-white/80 sm:text-base">
                Lic. Luna Barrozo
              </p>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65">
                Seguimiento nutricional, antropométrico,
                pesajes, evolución e informes del plantel.
              </p>

              <button
                type="button"
                onClick={ingresar}
                className="mt-8 inline-flex min-w-[220px] items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-primary shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-white/95 active:scale-[0.98]"
              >
                Ingresar al panel
              </button>
            </div>
          </div>

          {/* Franja CASLA */}
          <div className="flex h-2">
            <div className="w-1/2 bg-primary" />
            <div className="w-1/2 bg-accent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Inicio">
      {/* Encabezado del panel */}
      <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-r from-primary to-accent px-6 py-5 text-center text-white sm:flex-row sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow">
            <img
              src="/logo-san-lorenzo.png"
              alt="Escudo San Lorenzo"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Club Atlético San Lorenzo de Almagro
            </p>

            <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
              San Lorenzo Área Nutricional
            </h2>

            <p className="mt-1 text-sm font-semibold text-white/90">
              Primera División · Fútbol Femenino
            </p>

            <p className="mt-1 text-sm text-white/70">
              Lic. Luna Barrozo
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Jugadoras"
          value={
            players
              ? String(players.length)
              : "—"
          }
        />

        <Stat
          label="Controles cargados"
          value={
            controls
              ? String(controls.length)
              : "—"
          }
        />

        <Stat
          label="Último control"
          value={fmtDate(ultimo?.date)}
        />
      </div>

      {/* Accesos */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TILES.map((t) => {
          const Icon = t.icon;

          return (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-lg border border-border bg-card p-4 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
            >
              <Icon className="h-5 w-5 text-accent" />

              <p className="mt-3 font-display text-base font-semibold uppercase tracking-wide">
                {t.label}
              </p>

              <p className="text-sm text-muted-foreground">
                {t.desc}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Estado offline */}
      <div className="mt-5 max-w-md">
        <OfflineBadge />
      </div>
    </AppLayout>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-panel">
      <p className="panel-title text-xs text-muted-foreground">
        {label}
      </p>

      <p className="numeric mt-1 font-display text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}
