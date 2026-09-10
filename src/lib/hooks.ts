import { useLiveQuery } from "dexie-react-hooks";

import { db, ensureSeed } from "./db";
import { sortByDateDesc } from "./calc";
import type { Control, Player } from "./types";

export function usePlayers(): Player[] | undefined {
  return useLiveQuery(async () => {
    await ensureSeed();
    const rows = await db().players.toArray();
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, []);
}

export function useControls(playerId?: number | null): Control[] | undefined {
  return useLiveQuery(async () => {
    await ensureSeed();
    const rows =
      playerId == null
        ? await db().controls.toArray()
        : await db().controls.where("playerId").equals(playerId).toArray();
    return sortByDateDesc(rows);
  }, [playerId]);
}

export function usePlayer(id?: number | null): Player | undefined {
  return useLiveQuery(async () => (id == null ? undefined : db().players.get(id)), [id]);
}

export function lastControl(controls: Control[] | undefined, playerId: number): Control | undefined {
  if (!controls) return undefined;
  return sortByDateDesc(controls.filter((c) => c.playerId === playerId))[0];
}
