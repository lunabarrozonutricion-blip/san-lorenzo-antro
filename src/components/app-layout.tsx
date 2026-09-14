import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardPlus,
  Database,
  FileText,
  GitCompareArrows,
  History,
  Home,
  LineChart,
  Menu,
  Scale,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { OfflineBadge } from "./offline-badge";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/jugadoras", label: "Jugadoras", icon: Users },
  { to: "/control", label: "Nuevo control", icon: ClipboardPlus },
  { to: "/pesajes", label: "Pesajes", icon: Scale },
  { to: "/objetivos", label: "Objetivos", icon: Target },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/comparativa", label: "Comparativa", icon: GitCompareArrows },
  { to: "/evolucion", label: "Evolución", icon: LineChart },
  { to: "/informes", label: "Informes", icon: FileText },
  { to: "/plantel", label: "Plantel completo", icon: BarChart3 },
  { to: "/datos", label: "Importar / Exportar", icon: Database },
] as const;

function Crest() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
      CASLA
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.to === "/"
            ? pathname === "/"
            : pathname.startsWith(item.to);

        const Icon = item.icon;

        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-3">
          <Crest />

          <div className="leading-tight">
            <p className="panel-title text-xs text-sidebar-foreground/60">
              San Lorenzo
            </p>

            <p className="font-display text-sm font-semibold text-sidebar-foreground">
              Fútbol Femenino
            </p>
          </div>
        </div>

        <div className="mt-6 flex-1">
          <NavList />
        </div>

        <OfflineBadge variant="sidebar" />
      </aside>

      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crest />

                <p className="font-display text-sm font-semibold text-sidebar-foreground">
                  Fútbol Femenino
                </p>
              </div>

              <button
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-sidebar-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>

            <OfflineBadge variant="sidebar" />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              aria-label="Abrir menú"
              onClick={() => setOpen(true)}
              className="rounded-md border border-border p-2 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold uppercase tracking-wide sm:text-xl">
                {title}
              </h1>

              <p className="truncate text-xs text-muted-foreground">
                {subtitle ??
                  "Seguimiento Antropométrico – Primera División Fútbol Femenino"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          </div>
        </header>

        <main className="print-area px-4 py-5 pb-24 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
