import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";

import { db, ensureSeed } from "./db";
import { sortByDateDesc } from "./calc";
import { ensureHydrationSeed } from "./hydration";
import { ensureObjectiveSeed } from "./objectives";

import type {
  Control,
  FullAnthropometry,
  HydrationTest,
  ObjectivePeriod,
  Player,
  WeightRecord,
} from "./types";

function useEnsureSeed() {
  useEffect(() => {
    void ensureSeed();
  }, []);
}

/* ============================================================
   JUGADORAS
============================================================ */

export function usePlayers():
  | Player[]
  | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      await db().players.toArray();

    return rows.sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "es",
      ),
    );
  }, []);
}

export function usePlayer(
  id?: number | null,
): Player | undefined {
  useEnsureSeed();

  return useLiveQuery(
    async () =>
      id == null
        ? undefined
        : db().players.get(id),
    [id],
  );
}

/* ============================================================
   CONTROLES HABITUALES
============================================================ */

export function useControls(
  playerId?: number | null,
): Control[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      playerId == null
        ? await db().controls.toArray()
        : await db()
            .controls
            .where("playerId")
            .equals(playerId)
            .toArray();

    return sortByDateDesc(
      rows,
    );
  }, [playerId]);
}

export function lastControl(
  controls:
    | Control[]
    | undefined,
  playerId: number,
): Control | undefined {
  if (!controls) {
    return undefined;
  }

  return sortByDateDesc(
    controls.filter(
      (c) =>
        c.playerId ===
        playerId,
    ),
  )[0];
}

/* ============================================================
   ANTROPOMETRÍAS COMPLETAS
   5 COMPONENTES / KERR / ANTROPOGIMS
============================================================ */

/*
 * Si recibe playerId:
 * devuelve solamente las evaluaciones completas
 * de esa jugadora.
 *
 * Si no recibe playerId:
 * devuelve todas las antropometrías completas.
 *
 * Siempre van ordenadas:
 * más reciente -> más antigua.
 */
export function useFullAnthropometries(
  playerId?: number | null,
):
  | FullAnthropometry[]
  | undefined {
  useEnsureSeed();

  return useLiveQuery(
    async () => {
      const rows =
        playerId == null
          ? await db()
              .fullAnthropometries
              .toArray()
          : await db()
              .fullAnthropometries
              .where(
                "playerId",
              )
              .equals(
                playerId,
              )
              .toArray();

      return [
        ...rows,
      ].sort(
        (a, b) => {
          const byDate =
            b.date.localeCompare(
              a.date,
            );

          if (
            byDate !== 0
          ) {
            return byDate;
          }

          /*
           * Si hubiera más de una medición
           * en la misma fecha, usamos el
           * número de medición como segundo
           * criterio.
           */
          return (
            (b.measurementNumber ??
              0) -
            (a.measurementNumber ??
              0)
          );
        },
      );
    },
    [playerId],
  );
}

/*
 * Lee una sola evaluación completa
 * por su ID.
 *
 * Nos va a servir para abrir el
 * futuro informe/presentación.
 */
export function useFullAnthropometry(
  id?: number | null,
):
  | FullAnthropometry
  | undefined {
  useEnsureSeed();

  return useLiveQuery(
    async () =>
      id == null
        ? undefined
        : db()
            .fullAnthropometries
            .get(id),
    [id],
  );
}

/*
 * Devuelve la última antropometría
 * completa de una jugadora.
 */
export function lastFullAnthropometry(
  anthropometries:
    | FullAnthropometry[]
    | undefined,
  playerId: number,
):
  | FullAnthropometry
  | undefined {
  if (!anthropometries) {
    return undefined;
  }

  return [
    ...anthropometries,
  ]
    .filter(
      (row) =>
        row.playerId ===
        playerId,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ),
    )[0];
}

/*
 * Busca la evaluación inmediatamente
 * anterior a otra.
 *
 * Ejemplo:
 *
 * actual = 21/09/2026
 *
 * busca la evaluación completa más
 * reciente anterior al 21/09/2026.
 *
 * Esto va a alimentar automáticamente
 * la columna "Anterior" de la futura
 * presentación.
 */
export function previousFullAnthropometry(
  anthropometries:
    | FullAnthropometry[]
    | undefined,
  current:
    | FullAnthropometry
    | undefined,
):
  | FullAnthropometry
  | undefined {
  if (
    !anthropometries ||
    !current
  ) {
    return undefined;
  }

  return [
    ...anthropometries,
  ]
    .filter(
      (row) =>
        row.playerId ===
          current.playerId &&
        row.id !==
          current.id &&
        row.date <
          current.date,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ),
    )[0];
}

/* ============================================================
   PESAJES
============================================================ */

export function useWeightRecords(
  playerId?: number | null,
):
  | WeightRecord[]
  | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      playerId == null
        ? await db()
            .weightRecords
            .toArray()
        : await db()
            .weightRecords
            .where(
              "playerId",
            )
            .equals(
              playerId,
            )
            .toArray();

    return [
      ...rows,
    ].sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ),
    );
  }, [playerId]);
}

/* ============================================================
   OBJETIVOS
============================================================ */

export function useObjectivePeriods():
  | ObjectivePeriod[]
  | undefined {
  useEnsureSeed();

  useEffect(() => {
    void ensureObjectiveSeed();
  }, []);

  return useLiveQuery(async () => {
    const rows =
      await db()
        .objectivePeriods
        .toArray();

    return [
      ...rows,
    ].sort(
      (a, b) =>
        a.key.localeCompare(
          b.key,
        ),
    );
  }, []);
}

/* ============================================================
   TESTS DE HIDRATACIÓN
============================================================ */

export function useHydrationTests():
  | HydrationTest[]
  | undefined {
  useEnsureSeed();

  /*
   * Carga las fechas históricas del Excel
   * una sola vez.
   *
   * Si ya existen, no las duplica.
   */
  useEffect(() => {
    void (async () => {
      await ensureSeed();
      await ensureHydrationSeed();
    })();
  }, []);

  return useLiveQuery(async () => {
    const rows =
      await db()
        .hydrationTests
        .toArray();

    return [
      ...rows,
    ].sort(
      (a, b) => {
        const byDate =
          b.date.localeCompare(
            a.date,
          );

        if (
          byDate !== 0
        ) {
          return byDate;
        }

        return (
          (b.round ??
            0) -
          (a.round ??
            0)
        );
      },
    );
  }, []);
}
