import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Ruler,
  Scale,
  Search,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import {
  fmtDate,
  todayISO,
} from "@/lib/calc";
import {
  useControls,
  useFullAnthropometries,
  usePlayers,
  useWeightRecords,
} from "@/lib/hooks";

export const Route =
  createFileRoute("/intercambios")({
    component: () => (
      <ClientOnly>
        <ExchangePlansPage />
      </ClientOnly>
    ),
  });

type WeightCandidate = {
  value: number;
  date: string;
  source: string;
};

type HeightCandidate = {
  value: number;
  date: string;
  source: string;
};

function calculateAge(
  birthDate?: string | null,
  referenceDate?: string | null,
): number | null {
  if (!birthDate) {
    return null;
  }

  const reference =
    referenceDate || todayISO();

  const birth =
    new Date(
      `${birthDate}T12:00:00`,
    );

  const current =
    new Date(
      `${reference}T12:00:00`,
    );

  if (
    Number.isNaN(
      birth.getTime(),
    ) ||
    Number.isNaN(
      current.getTime(),
    )
  ) {
    return null;
  }

  const milliseconds =
    current.getTime() -
    birth.getTime();

  if (milliseconds < 0) {
    return null;
  }

  const years =
    milliseconds /
    (365.2425 *
      24 *
      60 *
      60 *
      1000);

  return Math.round(
    years * 10,
  ) / 10;
}

function formatNumber(
  value: number | null,
  decimals = 1,
) {
  if (value == null) {
    return "—";
  }

  return value.toLocaleString(
    "es-AR",
    {
      minimumFractionDigits:
        decimals,
      maximumFractionDigits:
        decimals,
    },
  );
}

function ExchangePlansPage() {
  const players =
    usePlayers();

  const [search, setSearch] =
    useState("");

  const [
    selectedPlayerId,
    setSelectedPlayerId,
  ] =
    useState<number | null>(
      null,
    );

  const [planDate, setPlanDate] =
    useState(todayISO());

  const [weight, setWeight] =
    useState("");

  const [height, setHeight] =
    useState("");

  const controls =
    useControls(
      selectedPlayerId,
    );

  const weightRecords =
    useWeightRecords(
      selectedPlayerId,
    );

  const fullAnthropometries =
    useFullAnthropometries(
      selectedPlayerId,
    );

  const selectedPlayer =
    useMemo(
      () =>
        (players ?? []).find(
          (player) =>
            player.id ===
            selectedPlayerId,
        ),
      [
        players,
        selectedPlayerId,
      ],
    );

  const filteredPlayers =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return [];
      }

      return (
        players ?? []
      )
        .filter(
          (player) =>
            player.active ===
              1 &&
            player.name
              .toLowerCase()
              .includes(text),
        )
        .slice(0, 8);
    }, [players, search]);

  const latestWeight =
    useMemo(() => {
      if (
        selectedPlayerId ==
        null
      ) {
        return null;
      }

      const candidates:
        WeightCandidate[] =
        [];

      for (
        const record of
        weightRecords ?? []
      ) {
        if (
          record.weight !=
          null
        ) {
          candidates.push({
            value:
              record.weight,
            date: record.date,
            source:
              "Pesajes",
          });
        }
      }

      for (
        const control of
        controls ?? []
      ) {
        if (
          control.weight !=
          null
        ) {
          candidates.push({
            value:
              control.weight,
            date: control.date,
            source:
              "Control antropométrico",
          });
        }
      }

      for (
        const anthropometry of
        fullAnthropometries ??
        []
      ) {
        const value =
          anthropometry
            .measures
            .weight
            ?.median;

        if (
          value != null
        ) {
          candidates.push({
            value,
            date:
              anthropometry.date,
            source:
              "Antropometría completa",
          });
        }
      }

      return (
        candidates.sort(
          (a, b) =>
            b.date.localeCompare(
              a.date,
            ),
        )[0] ?? null
      );
    }, [
      selectedPlayerId,
      weightRecords,
      controls,
      fullAnthropometries,
    ]);

  const latestHeight =
    useMemo(() => {
      if (
        selectedPlayerId ==
        null
      ) {
        return null;
      }

      const candidates:
        HeightCandidate[] =
        [];

      for (
        const anthropometry of
        fullAnthropometries ??
        []
      ) {
        const value =
          anthropometry
            .measures
            .stature
            ?.median;

        if (
          value != null
        ) {
          candidates.push({
            value,
            date:
              anthropometry.date,
            source:
              "Antropometría completa",
          });
        }
      }

      return (
        candidates.sort(
          (a, b) =>
            b.date.localeCompare(
              a.date,
            ),
        )[0] ?? null
      );
    }, [
      selectedPlayerId,
      fullAnthropometries,
    ]);

  useEffect(() => {
    if (
      selectedPlayerId ==
      null
    ) {
      setWeight("");
      setHeight("");

      return;
    }

    if (
      latestWeight != null
    ) {
      setWeight(
        String(
          latestWeight.value,
        ),
      );
    } else {
      setWeight("");
    }

    if (
      latestHeight != null
    ) {
      setHeight(
        String(
          latestHeight.value,
        ),
      );
    } else {
      setHeight("");
    }
  }, [
    selectedPlayerId,
    latestWeight?.value,
    latestHeight?.value,
  ]);

  const age =
    calculateAge(
      selectedPlayer
        ?.birthDate,
      planDate,
    );

  function choosePlayer(
    playerId: number,
    playerName: string,
  ) {
    setSelectedPlayerId(
      playerId,
    );

    setSearch(
      playerName,
    );
  }

  function clearPlayer() {
    setSelectedPlayerId(
      null,
    );

    setSearch("");
    setWeight("");
    setHeight("");
  }

  return (
    <AppLayout
      title="Plan de intercambios"
      subtitle="Estimación y distribución de intercambios"
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
          <div className="border-b border-border bg-gradient-to-r from-[#0B234A]/5 via-background to-[#C8102E]/5 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
              Nuevo plan
            </p>

            <h2 className="mt-1 font-display text-2xl font-semibold">
              Datos de la jugadora
            </h2>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Buscá a la
              jugadora por apellido.
              La aplicación toma
              automáticamente los
              últimos datos disponibles.
            </p>
          </div>

          <div className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <label className="text-sm">
                  <span className="panel-title text-xs text-muted-foreground">
                    Jugadora
                  </span>

                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <input
                      value={
                        search
                      }
                      onChange={(
                        event,
                      ) => {
                        setSearch(
                          event
                            .target
                            .value,
                        );

                        if (
                          selectedPlayerId !=
                          null
                        ) {
                          setSelectedPlayerId(
                            null,
                          );
                        }
                      }}
                      placeholder="Escribí el apellido..."
                      className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3"
                    />
                  </div>
                </label>

                {selectedPlayerId ==
                  null &&
                  filteredPlayers.length >
                    0 && (
                    <div className="absolute left-0 right-0 top-[68px] z-20 overflow-hidden rounded-md border border-border bg-card shadow-lg">
                      {filteredPlayers.map(
                        (
                          player,
                        ) => (
                          <button
                            key={
                              player.id
                            }
                            type="button"
                            onClick={() =>
                              choosePlayer(
                                player.id!,
                                player.name,
                              )
                            }
                            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted"
                          >
                            <UserRound className="h-4 w-4 text-muted-foreground" />

                            <span className="font-medium">
                              {
                                player.name
                              }
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  )}

                {selectedPlayer && (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <span>
                      Seleccionada:{" "}
                      <strong>
                        {
                          selectedPlayer.name
                        }
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={
                        clearPlayer
                      }
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

              <label className="text-sm">
                <span className="panel-title text-xs text-muted-foreground">
                  Fecha del plan
                </span>

                <input
                  type="date"
                  value={
                    planDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setPlanDate(
                      event
                        .target
                        .value,
                    )
                  }
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3"
                />
              </label>
            </div>
          </div>
        </section>

        {!selectedPlayer ? (
          <section className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <UserRound className="mx-auto h-9 w-9 text-muted-foreground" />

            <h3 className="mt-3 font-display text-lg font-semibold">
              Elegí una jugadora
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Cuando selecciones
              un apellido se
              cargarán sus datos
              automáticamente.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon={
                  CalendarDays
                }
                label="Fecha de nacimiento"
                value={
                  selectedPlayer.birthDate
                    ? fmtDate(
                        selectedPlayer.birthDate,
                      )
                    : "Sin dato"
                }
                note="Ficha de la jugadora"
              />

              <InfoCard
                icon={
                  UserRound
                }
                label="Edad"
                value={
                  age == null
                    ? "Sin dato"
                    : `${formatNumber(
                        age,
                        1,
                      )} años`
                }
                note={`Calculada al ${fmtDate(
                  planDate,
                )}`}
              />

              <InfoCard
                icon={Scale}
                label="Último peso"
                value={
                  latestWeight
                    ? `${formatNumber(
                        latestWeight.value,
                        1,
                      )} kg`
                    : "Sin dato"
                }
                note={
                  latestWeight
                    ? `${latestWeight.source} · ${fmtDate(
                        latestWeight.date,
                      )}`
                    : "Se puede cargar manualmente"
                }
              />

              <InfoCard
                icon={Ruler}
                label="Última talla"
                value={
                  latestHeight
                    ? `${formatNumber(
                        latestHeight.value,
                        1,
                      )} cm`
                    : "Sin dato"
                }
                note={
                  latestHeight
                    ? `${latestHeight.source} · ${fmtDate(
                        latestHeight.date,
                      )}`
                    : "Se puede cargar manualmente"
                }
              />
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-panel">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                  Datos que usará el plan
                </p>

                <h3 className="mt-1 font-display text-xl font-semibold">
                  Peso y talla
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Se completan con
                  los últimos datos
                  disponibles, pero
                  podés modificarlos
                  para este plan sin
                  cambiar el historial
                  de la jugadora.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="panel-title text-xs text-muted-foreground">
                    Peso para este plan
                  </span>

                  <div className="relative mt-1">
                    <input
                      inputMode="decimal"
                      value={
                        weight
                      }
                      onChange={(
                        event,
                      ) =>
                        setWeight(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Ej. 61,5"
                      className="h-11 w-full rounded-md border border-input bg-background px-3 pr-12"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      kg
                    </span>
                  </div>

                  {latestWeight && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Original:{" "}
                      {formatNumber(
                        latestWeight.value,
                        1,
                      )}{" "}
                      kg ·{" "}
                      {fmtDate(
                        latestWeight.date,
                      )}
                    </p>
                  )}
                </label>

                <label className="text-sm">
                  <span className="panel-title text-xs text-muted-foreground">
                    Talla para este plan
                  </span>

                  <div className="relative mt-1">
                    <input
                      inputMode="decimal"
                      value={
                        height
                      }
                      onChange={(
                        event,
                      ) =>
                        setHeight(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Ej. 165,0"
                      className="h-11 w-full rounded-md border border-input bg-background px-3 pr-12"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      cm
                    </span>
                  </div>

                  {latestHeight && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Original:{" "}
                      {formatNumber(
                        latestHeight.value,
                        1,
                      )}{" "}
                      cm ·{" "}
                      {fmtDate(
                        latestHeight.date,
                      )}
                    </p>
                  )}
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="text-sm font-semibold">
                Primera parte lista
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Después de
                confirmar que estos
                datos se cargan bien,
                agregamos el
                guardado histórico y
                recién después la
                estimación energética
                del Excel.
              </p>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>

      <p className="mt-3 text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {note}
      </p>
    </div>
  );
}
