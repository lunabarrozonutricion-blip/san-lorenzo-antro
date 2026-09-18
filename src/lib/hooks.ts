import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";

import { db, ensureSeed } from "./db";
import { sortByDateDesc } from "./calc";
import { ensureHydrationSeed } from "./hydration";
import { ensureObjectiveSeed } from "./objectives";
import type {
  Control,
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

export function usePlayers(): Player[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows = await db().players.toArray();

    return rows.sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "es",
      ),
    );
  }, []);
}

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

    return sortByDateDesc(rows);
  }, [playerId]);
}

export function useWeightRecords(
  playerId?: number | null,
): WeightRecord[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      playerId == null
        ? await db().weightRecords.toArray()
        : await db()
            .weightRecords
            .where("playerId")
            .equals(playerId)
            .toArray();

    return [...rows].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [playerId]);
}

export function useObjectivePeriods():
  | ObjectivePeriod[]
  | undefined {
  useEnsureSeed();

  useEffect(() => {
    void ensureObjectiveSeed();
  }, []);

  return useLiveQuery(async () => {
    const rows =
      await db().objectivePeriods.toArray();

    return [...rows].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  }, []);
}

/* ---------------------------
   TESTS DE HIDRATACIÓN
---------------------------- */

export function useHydrationTests():
  | HydrationTest[]
  | undefined {
  useEnsureSeed();

  /*
   * Carga las fechas históricas del Excel
   * una sola vez. Si ya existen, no las duplica.
   */
  useEffect(() => {
    void (async () => {
      await ensureSeed();
      await ensureHydrationSeed();
    })();
  }, []);

  return useLiveQuery(async () => {
    const rows =
      await db().hydrationTests.toArray();

    return [...rows].sort((a, b) => {
      const byDate =
        b.date.localeCompare(a.date);

      if (byDate !== 0) {
        return byDate;
      }

      return (
        (b.round ?? 0) -
        (a.round ?? 0)
      );
    });
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

export function lastControl(
  controls: Control[] | undefined,
  playerId: number,
): Control | undefined {
  if (!controls) return undefined;

  return sortByDateDesc(
    controls.filter(
      (c) =>
        c.playerId === playerId,
    ),
  )[0];
}
