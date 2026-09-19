import { Link } from "@tanstack/react-router";
import {
  ClipboardPlus,
  FileText,
  History,
  LineChart,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type PlayerSection =
  | "ficha"
  | "control"
  | "evolucion"
  | "informe"
  | "historial";

export function PlayerNav({
  playerId,
  playerName,
  current,
}: {
  playerId: number | null | undefined;
  playerName?: string;
  current: PlayerSection;
}) {
  if (playerId == null) {
    return null;
  }

  return (
    <div className="no-print mb-4 rounded-lg border border-border bg-card p-3 shadow-panel">
      {playerName && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Jugadora
          </p>

          <p className="font-display text-sm font-semibold">
            {playerName}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          variant={
            current === "ficha"
              ? "default"
              : "outline"
          }
        >
          <Link
            to="/jugadoras/$id"
            params={{
              id: String(playerId),
            }}
          >
            <UserRound className="h-4 w-4" />
            Ficha
          </Link>
        </Button>

        <Button
          asChild
          size="sm"
          variant={
            current === "control"
              ? "default"
              : "outline"
          }
        >
          <Link
            to="/control"
            search={{
              player: playerId,
              id: undefined,
            }}
          >
            <ClipboardPlus className="h-4 w-4" />
            Nuevo control
          </Link>
        </Button>

        <Button
          asChild
          size="sm"
          variant={
            current === "evolucion"
              ? "default"
              : "outline"
          }
        >
          <Link
            to="/evolucion"
            search={{
              player: playerId,
            }}
          >
            <LineChart className="h-4 w-4" />
            Evolución
          </Link>
        </Button>

        <Button
          asChild
          size="sm"
          variant={
            current === "informe"
              ? "default"
              : "outline"
          }
        >
          <Link
            to="/informes"
            search={{
              player: playerId,
            }}
          >
            <FileText className="h-4 w-4" />
            Informe
          </Link>
        </Button>

        <Button
          asChild
          size="sm"
          variant={
            current === "historial"
              ? "default"
              : "outline"
          }
        >
          <Link
            to="/historial"
            search={{
              player: playerId,
            }}
          >
            <History className="h-4 w-4" />
            Historial
          </Link>
        </Button>
      </div>
    </div>
  );
}
