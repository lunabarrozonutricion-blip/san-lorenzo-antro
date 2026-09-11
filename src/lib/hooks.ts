import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";

import { db, ensureSeed } from "./db";
import { sortByDateDesc } from "./calc";
import type { Control, Player, WeightRecord } from "./types";

function useEnsureSeed() {
  useEffect(() => {
    void ensureSeed();
  }, []);
}

export function usePlayers(): Player[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows = await db().players.toArray();
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, []);
}

export function useControls(playerId?: number | null): Control[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      playerId == null
        ? await db().controls.toArray()
        : await db().controls.where("playerId").equals(playerId).toArray();

    return sortByDateDesc(rows);
  }, [playerId]);
}
export function useControls(playerId?: number | null): Control[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      playerId == null
        ? await db().controls.toArray()
        : await db().controls.where("playerId").equals(playerId).toArray();

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

export function usePlayer(id?: number | null): Player | undefined {
export function usePlayer(id?: number | null): Player | undefined {
  useEnsureSeed();

  return useLiveQuery(
    async () => (id == null ? undefined : db().players.get(id)),
    [id],
  );
}

export function lastControl(
  controls: Control[] | undefined,
  playerId: number,
): Control | undefined {
  if (!controls) return undefined;

  return sortByDateDesc(
    controls.filter((c) => c.playerId === playerId),
  )[0];
}
