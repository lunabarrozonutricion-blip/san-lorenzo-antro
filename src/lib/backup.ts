import { db, nowISO } from "./db";
import {
  METRICS,
  type Control,
  type Player,
  type WeightRecord,
} from "./types";
import { fmtDate, metricValue } from "./calc";

export interface BackupFile {
  app: "seguimiento-antropometrico-casla";
  version: 1 | 2;
  exportedAt: string;
  players: Player[];
  controls: Control[];
  weightRecords?: WeightRecord[];
}

export async function readAll() {
  const d = db();

  const [players, controls, weightRecords] = await Promise.all([
    d.players.toArray(),
    d.controls.toArray(),
    d.weightRecords.toArray(),
  ]);

  return {
    players,
    controls,
    weightRecords,
  };
}

export async function buildBackup(): Promise<BackupFile> {
  const { players, controls, weightRecords } = await readAll();

  return {
    app: "seguimiento-antropometrico-casla",
    version: 2,
    exportedAt: nowISO(),
    players,
    controls,
    weightRecords,
  };
}

export function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function exportJSON() {
  const backup = await buildBackup();

  download(
    `antropometria-backup-${stamp()}.json`,
    new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    }),
  );
}

/** Filas planas: una por control, con derivados calculados. */
export async function flatRows() {
  const { players, controls } = await readAll();

  const byId = new Map(
    players.map((p) => [p.id!, p]),
  );

  return controls
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => {
      const row: Record<
        string,
        string | number | null
      > = {
        Jugadora:
          byId.get(c.playerId)?.name ?? "—",
        Fecha: fmtDate(c.date),
      };

      for (const m of METRICS) {
        row[`${m.label} (${m.unit})`] =
          metricValue(c, m.key);
      }

      row["Observaciones"] = c.notes ?? "";

      return row;
    });
}

export async function exportCSV() {
  const rows = await flatRows();

  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const esc = (v: unknown) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const csv = [
    headers.map(esc).join(";"),
    ...rows.map((r) =>
      headers.map((h) => esc(r[h])).join(";"),
    ),
  ].join("\n");

  download(
    `antropometria-${stamp()}.csv`,
    new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    }),
  );
}

export async function exportXLSX(
  rows?: Record<string, unknown>[],
  filename?: string,
) {
  const XLSX = await import("xlsx");

  const data = rows ?? (await flatRows());

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Antropometría",
  );

  const out = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;

  download(
    filename ??
      `antropometria-${stamp()}.xlsx`,
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
}

export async function importBackup(
  file: File,
  mode: "replace" | "merge",
) {
  const text = await file.text();
  const parsed = JSON.parse(text) as BackupFile;

  if (
    !parsed ||
    !Array.isArray(parsed.players) ||
    !Array.isArray(parsed.controls)
  ) {
    throw new Error(
      "El archivo no tiene el formato de backup esperado.",
    );
  }

  const incomingWeights =
    parsed.weightRecords ?? [];

  const d = db();

  await d.transaction(
    "rw",
    d.players,
    d.controls,
    d.weightRecords,
    async () => {
      if (mode === "replace") {
        await d.controls.clear();
        await d.weightRecords.clear();
        await d.players.clear();

        await d.players.bulkAdd(parsed.players);
        await d.controls.bulkAdd(parsed.controls);

        if (incomingWeights.length > 0) {
          await d.weightRecords.bulkAdd(
            incomingWeights,
          );
        }

        return;
      }

      const existing =
        await d.players.toArray();

      const byName = new Map(
        existing.map((p) => [
          p.name.toLowerCase(),
          p.id!,
        ]),
      );

      const idMap = new Map<
        number,
        number
      >();

      for (const p of parsed.players) {
        const key = p.name.toLowerCase();

        let id = byName.get(key);

        if (!id) {
          const { id: _omit, ...rest } = p;

          id = (await d.players.add({
            ...rest,
            createdAt:
              rest.createdAt ?? nowISO(),
            updatedAt: nowISO(),
          })) as number;

          byName.set(key, id);
        }

        if (p.id) {
          idMap.set(p.id, id);
        }
      }

      for (const c of parsed.controls) {
        const playerId =
          idMap.get(c.playerId);

        if (!playerId) continue;

        const dup = await d.controls
          .where("[playerId+date]")
          .equals([playerId, c.date])
          .first();

        if (dup) continue;

        const { id: _omit, ...rest } = c;

        await d.controls.add({
          ...rest,
          playerId,
          createdAt:
            rest.createdAt ?? nowISO(),
          updatedAt: nowISO(),
        });
      }

      for (const record of incomingWeights) {
        const playerId =
          idMap.get(record.playerId);

        if (!playerId) continue;

        const dup = await d.weightRecords
          .where("[playerId+date]")
          .equals([
            playerId,
            record.date,
          ])
          .first();

        if (dup) continue;

        const {
          id: _omit,
          ...rest
        } = record;

        await d.weightRecords.add({
          ...rest,
          playerId,
          createdAt:
            rest.createdAt ?? nowISO(),
          updatedAt: nowISO(),
        });
      }
    },
  );

  return {
    players: parsed.players.length,
    controls: parsed.controls.length,
    weightRecords:
      incomingWeights.length,
  };
}

export async function wipeAll() {
  const d = db();

  await d.transaction(
    "rw",
    d.players,
    d.controls,
    d.weightRecords,
    async () => {
      await d.controls.clear();
      await d.weightRecords.clear();
      await d.players.clear();
    },
  );
}
