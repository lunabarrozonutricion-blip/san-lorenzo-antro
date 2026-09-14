import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";

import { sortByDateDesc } from "./calc";
import { db, ensureSeed } from "./db";

import type {
  Control,
  ObjectiveRecord,
  Player,
  WeightRecord,
} from "./types";

function useEnsureSeed() {
  useEffect(() => {
    void ensureSeed();
  }, []);
}

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

export function useObjectives(
  playerId?: number | null,
): ObjectiveRecord[] | undefined {
  useEnsureSeed();

  return useLiveQuery(async () => {
    const rows =
      playerId == null
        ? await db().objectives.toArray()
        : await db()
            .objectives
            .where("playerId")
            .equals(playerId)
            .toArray();

    return [...rows].sort((a, b) => {
      const byMonth =
        b.month.localeCompare(a.month);

      if (byMonth !== 0) {
        return byMonth;
      }

      return (
        a.playerId -
        b.playerId
      );
    });
  }, [playerId]);
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
  if (!controls) {
    return undefined;
  }

  return sortByDateDesc(
    controls.filter(
      (control) =>
        control.playerId ===
        playerId,
    ),
  )[0];
}

export function latestObjective(
  objectives:
    | ObjectiveRecord[]
    | undefined,
  playerId: number,
  maxMonth?: string,
):
  | ObjectiveRecord
  | undefined {
  if (!objectives) {
    return undefined;
  }

  return [...objectives]
    .filter(
      (objective) =>
        objective.playerId ===
          playerId &&
        (!maxMonth ||
          objective.month <=
            maxMonth),
    )
    .sort((a, b) =>
      b.month.localeCompare(
        a.month,
      ),
    )[0];
}
