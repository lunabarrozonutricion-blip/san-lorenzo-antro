import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  CalendarDays,
  Mail,
  NotebookPen,
  Phone,
  Ruler,
  Save,
  Scale,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import {
  Diff,
  Value,
} from "@/components/metric-cells";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";
import {
  diff,
  fmt,
  fmtDate,
  metricValue,
} from "@/lib/calc";
import {
  deletePlayer,
  upsertPlayer,
} from "@/lib/db";
import {
  useControls,
  useFullAnthropometries,
  useObjectivePeriods,
  usePlayer,
  useWeightRecords,
} from "@/lib/hooks";
import { targetForPlayer } from "@/lib/objectives";
import {
  METRICS,
  type Player,
} from "@/lib/types";

export const Route = createFileRoute(
  "/jugadoras/$id",
)({
  head: () => ({
    meta: [
      {
        title:
          "Ficha de jugadora – Seguimiento Antropométrico CASLA",
      },
      {
        name: "description",
        content:
          "Ficha individual con datos personales, último control, historial y evolución.",
      },
      {
        property: "og:title",
        content:
          "Ficha de jugadora – Seguimiento Antropométrico CASLA",
      },
      {
        property: "og:description",
        content:
          "Datos personales, último control, historial completo y evolución de la jugadora.",
      },
    ],
  }),

  component: () => (
    <ClientOnly>
      <Ficha />
    </ClientOnly>
  ),
});

type PlayerProfile =
  Player & {
    phone?: string | null;
    email?: string | null;
    generalNotes?: string | null;
  };

type ReferenceValue = {
  value: number;
  date: string;
  source: string;
};

function calculateCurrentAge(
  birthDate?: string | null,
): number | null {
  if (!birthDate) {
    return null;
  }

  const parts =
    birthDate.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    year;

  const currentMonth =
    today.getMonth() + 1;

  const currentDay =
    today.getDate();

  if (
    currentMonth < month ||
    (currentMonth === month &&
      currentDay < day)
  ) {
    age -= 1;
  }

  return age >= 0
    ? age
    : null;
}

function formatOneDecimal(
  value: number,
) {
  return value.toLocaleString(
    "es-AR",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  );
}

function Ficha() {
  const { id } =
    Route.useParams();

  const playerId =
    Number(id);

  const player =
    usePlayer(playerId);

  const profile =
    player as
      | PlayerProfile
      | undefined;

  const controls =
    useControls(playerId);

  const weightRecords =
    useWeightRecords(
      playerId,
    );

  const fullAnthropometries =
    useFullAnthropometries(
      playerId,
    );

  const objectivePeriods =
    useObjectivePeriods();

  const navigate =
    useNavigate();

  const [name, setName] =
    useState("");

  const [
    position,
    setPosition,
  ] =
    useState("");

  const [
    birthDate,
    setBirthDate,
  ] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    generalNotes,
    setGeneralNotes,
  ] =
    useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  const anthropometryBirthDate =
    useMemo(() => {
      return (
        (
          fullAnthropometries ??
          []
        ).find(
          (row) =>
            row.birthDate !=
            null,
        )?.birthDate ?? null
      );
    }, [
      fullAnthropometries,
    ]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(
      profile.name ?? "",
    );

    setPosition(
      profile.position ?? "",
    );

    setBirthDate(
      profile.birthDate ??
        anthropometryBirthDate ??
        "",
    );

    setPhone(
      profile.phone ?? "",
    );

    setEmail(
      profile.email ?? "",
    );

    setGeneralNotes(
      profile.generalNotes ??
        "",
    );
  }, [
    profile,
    anthropometryBirthDate,
  ]);

  const age =
    calculateCurrentAge(
      birthDate,
    );

  const latestWeight =
    useMemo(() => {
      const candidates:
        ReferenceValue[] =
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
      weightRecords,
      controls,
      fullAnthropometries,
    ]);

  const referenceHeight =
    useMemo(() => {
      const candidates:
        ReferenceValue[] =
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
      fullAnthropometries,
    ]);

  const last =
    controls?.[0];

  const prev =
    controls?.[1];

  const latestSum6Control =
    controls?.find(
      (control) =>
        metricValue(
          control,
          "sum6",
        ) !== null,
    );

  const latestSum6 =
    latestSum6Control
      ? metricValue(
          latestSum6Control,
          "sum6",
        )
      : null;

  const currentObjectivePeriod =
    objectivePeriods &&
    objectivePeriods.length > 0
      ? objectivePeriods[
          objectivePeriods.length -
            1
        ]
      : undefined;

  const currentTarget =
    targetForPlayer(
      currentObjectivePeriod,
      player,
    );

  const deltaTarget =
    latestSum6 !== null &&
    currentTarget !== null
      ? latestSum6 -
        currentTarget
      : null;

  const objectiveHistory =
    (objectivePeriods ?? [])
      .map((period) => ({
        period,
        target:
          targetForPlayer(
            period,
            player,
          ),
      }))
      .filter(
        (item) =>
          item.target !==
          null,
      )
      .reverse();

  async function saveProfile() {
    if (!profile) {
      return;
    }

    const cleanName =
      name.trim();

    if (!cleanName) {
      toast.error(
        "El nombre no puede quedar vacío",
      );

      return;
    }

    setSavingProfile(true);

    try {
      const updatedPlayer:
        PlayerProfile = {
        ...profile,

        name: cleanName,

        position:
          position.trim() ||
          null,

        birthDate:
          birthDate ||
          null,

        phone:
          phone.trim() ||
          null,

        email:
          email.trim() ||
          null,

        generalNotes:
          generalNotes.trim() ||
          null,

        updatedAt:
          new Date().toISOString(),
      };

      await upsertPlayer(
        updatedPlayer,
      );

      toast.success(
        "Ficha personal guardada",
      );
    } catch (error) {
      console.error(
        error,
      );

      toast.error(
        "No se pudo guardar la ficha personal",
      );
    } finally {
      setSavingProfile(
        false,
      );
    }
  }

  async function eliminar() {
    if (
      !confirm(
        `¿Eliminar a ${player?.name} y todos sus controles? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    await deletePlayer(
      playerId,
    );

    toast.success(
      "Jugadora eliminada",
    );

    navigate({
      to: "/jugadoras",
    });
  }

  if (!player) {
    return (
      <AppLayout title="Ficha de jugadora">
        <p className="text-sm text-muted-foreground">
          Jugadora no encontrada.
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={player.name}
      subtitle={
        player.position ||
        "Primera División Fútbol Femenino"
      }
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={eliminar}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    >
      <PlayerNav
        playerId={
          playerId
        }
        playerName={
          player.name
        }
        current="ficha"
      />

      {/* ===================================================
          FICHA PERSONAL
      ==================================================== */}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        <div className="border-b border-border bg-gradient-to-r from-[#0B234A]/5 via-background to-[#C8102E]/5 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                Ficha personal
              </p>

              <h2 className="mt-1 font-display text-xl font-semibold">
                Datos de la jugadora
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Estos datos se cargan
                una sola vez y después
                pueden ser utilizados
                por los demás módulos
                de la app.
              </p>
            </div>

            <Button
              type="button"
              onClick={() =>
                void saveProfile()
              }
              disabled={
                savingProfile
              }
            >
              <Save className="h-4 w-4" />

              {savingProfile
                ? "Guardando..."
                : "Guardar ficha"}
            </Button>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Nombre completo
              </span>

              <div className="relative mt-1">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={name}
                  onChange={(
                    event,
                  ) =>
                    setName(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Nombre y apellido"
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3"
                />
              </div>
            </label>

            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Fecha de nacimiento
              </span>

              <div className="relative mt-1">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="date"
                  value={
                    birthDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setBirthDate(
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3"
                />
              </div>
            </label>

            <div className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Edad actual
              </span>

              <div className="mt-1 flex h-11 items-center rounded-md border border-border bg-muted/40 px-3">
                <span className="font-semibold">
                  {age != null
                    ? `${age} años`
                    : "Sin fecha de nacimiento"}
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Se calcula
                automáticamente con
                la fecha actual.
              </p>
            </div>

            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Posición
              </span>

              <input
                value={
                  position
                }
                onChange={(
                  event,
                ) =>
                  setPosition(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Ej. Delantera"
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3"
              />
            </label>

            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Celular / WhatsApp
              </span>

              <div className="relative mt-1">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="tel"
                  value={
                    phone
                  }
                  onChange={(
                    event,
                  ) =>
                    setPhone(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ej. 11 1234 5678"
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3"
                />
              </div>
            </label>

            <label className="text-sm">
              <span className="panel-title text-xs text-muted-foreground">
                Email
              </span>

              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="email"
                  value={
                    email
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmail(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Opcional"
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3"
                />
              </div>
            </label>
          </div>

          <label className="mt-4 block text-sm">
            <span className="panel-title text-xs text-muted-foreground">
              Observaciones generales
            </span>

            <div className="relative mt-1">
              <NotebookPen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <textarea
                value={
                  generalNotes
                }
                onChange={(
                  event,
                ) =>
                  setGeneralNotes(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Cualquier información general que quieras conservar sobre la jugadora..."
                rows={3}
                className="w-full resize-y rounded-md border border-input bg-background py-3 pl-10 pr-3"
              />
            </div>
          </label>
        </div>
      </section>

      {/* ===================================================
          DATOS DE REFERENCIA
      ==================================================== */}

      <section className="mt-4">
        <p className="panel-title mb-2 text-xs text-muted-foreground">
          Datos de referencia
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Scale className="h-4 w-4 text-primary" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Último peso
                </p>

                <p className="mt-0.5 text-xl font-bold">
                  {latestWeight
                    ? `${formatOneDecimal(
                        latestWeight.value,
                      )} kg`
                    : "Sin dato"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {latestWeight
                ? `${latestWeight.source} · ${fmtDate(
                    latestWeight.date,
                  )}`
                : "Todavía no hay ningún peso registrado."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Ruler className="h-4 w-4 text-primary" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Talla de referencia
                </p>

                <p className="mt-0.5 text-xl font-bold">
                  {referenceHeight
                    ? `${formatOneDecimal(
                        referenceHeight.value,
                      )} cm`
                    : "Sin dato"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {referenceHeight
                ? `${referenceHeight.source} · ${fmtDate(
                    referenceHeight.date,
                  )}`
                : "Todavía no hay una talla registrada en antropometría."}
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          OBJETIVO ACTUAL
      ==================================================== */}

      <div className="mt-4 rounded-lg border border-border bg-card p-4 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="panel-title text-xs text-muted-foreground">
              Objetivo actual
            </p>

            <p className="mt-1 font-display text-xl font-semibold">
              {currentObjectivePeriod
                ?.label ??
                "Sin período"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Objetivo Sum6
              </p>

              <p className="numeric mt-1 text-sm font-semibold">
                {currentTarget !==
                null
                  ? `${fmt(
                      currentTarget,
                      1,
                    )} mm`
                  : "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Último Sum6
              </p>

              <p className="numeric mt-1 text-sm font-semibold">
                {latestSum6 !==
                null
                  ? `${fmt(
                      latestSum6,
                      1,
                    )} mm`
                  : "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Δ vs objetivo
              </p>

              <p
                className={`numeric mt-1 text-sm font-semibold ${
                  deltaTarget ===
                  null
                    ? ""
                    : deltaTarget <=
                        0
                      ? "text-emerald-700"
                      : "text-rose-700"
                }`}
              >
                {deltaTarget !==
                null
                  ? `${
                      deltaTarget >
                      0
                        ? "+"
                        : ""
                    }${fmt(
                      deltaTarget,
                      1,
                    )} mm`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {objectiveHistory.length >
          0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de objetivos
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {objectiveHistory.map(
                ({
                  period,
                  target,
                }) => (
                  <span
                    key={
                      period.key
                    }
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                  >
                    <strong>
                      {
                        period.label
                      }
                      :
                    </strong>{" "}
                    {fmt(
                      target,
                      1,
                    )}{" "}
                    mm
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          ÚLTIMO CONTROL
      ==================================================== */}

      <div className="mt-4 rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border px-4 py-3">
          <p className="panel-title text-xs text-muted-foreground">
            Último control
          </p>

          <p className="font-display text-lg font-semibold">
            {fmtDate(
              last?.date,
            )}
          </p>
        </div>

        <div className="grid gap-x-6 p-4 sm:grid-cols-2">
          {METRICS.map(
            (m) => {
              const a =
                metricValue(
                  last,
                  m.key,
                );

              const b =
                metricValue(
                  prev,
                  m.key,
                );

              return (
                <div
                  key={
                    m.key
                  }
                  className="flex items-center justify-between border-b border-border/60 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {m.label}{" "}
                    <span className="text-xs">
                      ({m.unit})
                    </span>
                  </span>

                  <span className="flex items-center gap-3">
                    <Value
                      value={a}
                      decimals={
                        m.decimals
                      }
                    />

                    <Diff
                      value={diff(
                        a,
                        b,
                      )}
                      decimals={
                        m.decimals
                      }
                    />
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* ===================================================
          HISTORIAL
      ==================================================== */}

      <h2 className="panel-title mt-6 mb-2 text-xs text-muted-foreground">
        Historial
      </h2>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-panel">
        <table className="w-full text-sm">
          <thead className="bg-muted/70 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">
                Fecha
              </th>

              <th className="px-3 py-2 font-semibold">
                Peso
              </th>

              <th className="px-3 py-2 font-semibold">
                Sum6P
              </th>

              <th className="px-3 py-2 font-semibold">
                Observaciones
              </th>

              <th className="px-3 py-2" />
            </tr>
          </thead>

          <tbody>
            {(controls ?? []).map(
              (c) => (
                <tr
                  key={c.id}
                  className="border-t border-border"
                >
                  <td className="px-3 py-2">
                    {fmtDate(
                      c.date,
                    )}
                  </td>

                  <td className="numeric px-3 py-2">
                    <Value
                      value={metricValue(
                        c,
                        "weight",
                      )}
                    />
                  </td>

                  <td className="numeric px-3 py-2">
                    <Value
                      value={metricValue(
                        c,
                        "sum6",
                      )}
                    />
                  </td>

                  <td className="px-3 py-2 text-muted-foreground">
                    {c.notes ||
                      "—"}
                  </td>

                  <td className="px-3 py-2 text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                    >
                      <Link
                        to="/control"
                        search={{
                          player:
                            playerId,
                          id: c.id,
                        }}
                      >
                        Editar
                      </Link>
                    </Button>
                  </td>
                </tr>
              ),
            )}

            {(controls ?? [])
              .length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Todavía no hay
                  controles cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
