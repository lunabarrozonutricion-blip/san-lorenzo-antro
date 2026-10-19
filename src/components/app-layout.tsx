import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardPlus,
  Database,
  Droplets,
  Home,
  Menu,
  Receipt,
  Scale,
  Target,
  UtensilsCrossed,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { OfflineBadge } from "./offline-badge";
import { SignOutButton } from "./auth-gate";
import { cn } from "@/lib/utils";

export const NAV = [
  {
    to: "/",
    label: "Inicio",
    icon: Home,
  },
  {
    to: "/jugadoras",
    label: "Jugadoras",
    icon: Users,
  },
  {
    to: "/control",
    label: "Nuevo control",
    icon: ClipboardPlus,
  },
  {
    to: "/pesajes",
    label: "Pesajes",
    icon: Scale,
  },
  {
    to: "/hidratacion",
    label: "Test de hidratación",
    icon: Droplets,
  },
  {
    to: "/intercambios",
    label: "Plan de intercambios",
    icon: UtensilsCrossed,
  },
  {
    to: "/objetivos",
    label: "Objetivos del plantel",
    icon: Target,
  },
  {
    to: "/multas",
    label: "Multas",
    icon: Receipt,
  },
  {
    to: "/plantel",
    label: "Plantel completo",
    icon: BarChart3,
  },
  {
    to: "/datos",
    label: "Importar / Exportar",
    icon: Database,
  },
] as const;

function Crest() {
  return (
    <img
      src="data:image/png;base64,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"
      alt="Escudo del Club Atlético San Lorenzo de Almagro"
      className="h-12 w-12 shrink-0 object-contain"
    />
  );
}

function NavList({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({
    select: (s) =>
      s.location.pathname,
  });

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.to === "/"
            ? pathname === "/"
            : pathname.startsWith(
                item.to,
              );

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
  const [open, setOpen] =
    useState(false);

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
        <SignOutButton />
      </aside>

      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() =>
              setOpen(false)
            }
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
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-md p-2 text-sidebar-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto">
              <NavList
                onNavigate={() =>
                  setOpen(false)
                }
              />
            </div>

            <OfflineBadge variant="sidebar" />
            <SignOutButton />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              aria-label="Abrir menú"
              onClick={() =>
                setOpen(true)
              }
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
