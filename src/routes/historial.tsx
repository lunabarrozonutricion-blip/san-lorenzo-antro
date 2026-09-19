import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Value } from "@/components/metric-cells";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fmtDate,
  metricValue,
} from "@/lib/calc";
import { deleteControl } from "@/lib/db";
import {
  useControls,
  usePlayer,
  usePlayers,
} from "@/lib/hooks";

export const Route = createFileRoute(
  "/historial",
)({
  validateSearch: (
    s: Record<string, unknown>,
  ): { player?: number } => ({
    player:
      s.player != null &&
      s.player !== ""
        ? Number(s.player)
        : undefined,
  }),

  head: () => ({
    meta: [
      {
        title:
          "Historial de controles – Seguimiento Antropométrico CASLA",
      },
      {
        name: "description",
        content:
          "Historial individual de controles antropométricos.",
      },
      {
        property: "og:title",
        content:
          "Historial de controles – Seguimiento Antropométrico CASLA",
      },
      {
        property: "og:description",
        content:
          "Consultá y editá los controles registrados de cada jugadora.",
      },
    ],
  }),

  component: () => (
    <ClientOnly>
      <Historial />
    </ClientOnly>
  ),
});

function Historial() {
  const search =
    Route.useSearch();

  const players =
    usePlayers();

  const [
    playerId,
    setPlayerId,
  ] = useState<number | null>(
    search.player ?? null,
  );

  const [desde, setDesde] =
    useState("");

  const [hasta, setHasta] =
    useState("");

  const player =
    usePlayer(playerId);

  const controls =
    useControls(playerId);

  useEffect(() => {
    if (
      playerId === null &&
      players &&
      players.length > 0
    ) {
      setPlayerId(
        players[0].id!,
      );
    }
  }, [
    players,
    playerId,
  ]);

  const rows =
    useMemo(() => {
      return (
        controls ?? []
      ).filter(
        (control) =>
          (desde === "" ||
            control.date >=
              desde) &&
          (hasta === "" ||
            control.date <=
              hasta),
      );
    }, [
      controls,
      desde,
      hasta,
    ]);

  async function eliminar(
    id: number,
  ) {
    if (
      !confirm(
        "¿Eliminar este control? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }

    await deleteControl(id);

    toast.success(
      "Control eliminado",
    );
  }

  return (
    <AppLayout
      title={
        player
          ? `Historial · ${player.name}`
          : "Historial"
      }
      subtitle="Controles antropométricos de la jugadora"
    >
      <PlayerNav
        playerId={playerId}
        playerName={
          player?.name
        }
        current="historial"
      />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-panel sm:grid-cols-3">
        <label className="text-sm">
          <span className="panel-title text-xs text-muted-foreground">
            Jugadora
          </span>

          <select
            value={
              playerId ?? ""
            }
            onChange={(e) =>
              setPlayerId(
                e.target.value
                  ? Number(
                      e.target
                        .value,
                    )
                  : null,
              )
            }
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {(
              players ?? []
            ).map(
              (p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="text-sm">
          <span className="panel-title text-xs text-muted-foreground">
            Desde
          </span>

          <Input
            type="date"
            value={desde}
            onChange={(e) =>
              setDesde(
                e.target.value,
              )
            }
            className="mt-1"
          />
        </label>

        <label className="text-sm">
          <span className="panel-title text-xs text-muted-foreground">
            Hasta
          </span>

          <Input
            type="date"
            value={hasta}
            onChange={(e) =>
              setHasta(
                e.target.value,
              )
            }
            className="mt-1"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card shadow-panel">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">
                Fecha
              </th>

              <th className="px-3 py-2 font-semibold">
                Peso (kg)
              </th>

              <th className="px-3 py-2 font-semibold">
                Sum6P (mm)
              </th>

              <th className="px-3 py-2 font-semibold">
                Observaciones
              </th>

              <th className="px-3 py-2" />
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (control) => (
                <tr
                  key={
                    control.id
                  }
                  className="border-t border-border"
                >
                  <td className="px-3 py-2">
                    {fmtDate(
                      control.date,
                    )}
                  </td>

                  <td className="numeric px-3 py-2">
                    <Value
                      value={metricValue(
                        control,
                        "weight",
                      )}
                    />
                  </td>

                  <td className="numeric px-3 py-2">
                    <Value
                      value={metricValue(
                        control,
                        "sum6",
                      )}
                    />
                  </td>

                  <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">
                    {control.notes ||
                      "—"}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                    >
                      <Link
                        to="/control"
                        search={{
                          player:
                            control.playerId,
                          id: control.id,
                        }}
                      >
                        Editar
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void eliminar(
                          control.id!,
                        )
                      }
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ),
            )}

            {rows.length ===
              0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No hay controles
                  para las fechas
                  seleccionadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
