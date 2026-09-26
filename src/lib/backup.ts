import { db, nowISO } from "./db";
import {
  METRICS,
  type Control,
  type FullAnthropometry,
  type HydrationTest,
  type ObjectivePeriod,
  type Player,
  type WeightRecord,
} from "./types";
import { fmtDate, metricValue } from "./calc";

export interface BackupFile {
  app: "seguimiento-antropometrico-casla";
  version: 1 | 2 | 3 | 4;
  exportedAt: string;

  players: Player[];
  controls: Control[];

  weightRecords?: WeightRecord[];
  objectivePeriods?: ObjectivePeriod[];
  hydrationTests?: HydrationTest[];
  fullAnthropometries?: FullAnthropometry[];
}

/* ============================================================
   LEER TODA LA BASE LOCAL
============================================================ */

export async function readAll() {
  const d = db();

  const [
    players,
    controls,
    weightRecords,
    objectivePeriods,
    hydrationTests,
    fullAnthropometries,
  ] = await Promise.all([
    d.players.toArray(),
    d.controls.toArray(),
    d.weightRecords.toArray(),
    d.objectivePeriods.toArray(),
    d.hydrationTests.toArray(),
    d.fullAnthropometries.toArray(),
  ]);

  return {
    players,
    controls,
    weightRecords,
    objectivePeriods,
    hydrationTests,
    fullAnthropometries,
  };
}

/* ============================================================
   CREAR BACKUP COMPLETO
============================================================ */

export async function buildBackup(): Promise<BackupFile> {
  const {
    players,
    controls,
    weightRecords,
    objectivePeriods,
    hydrationTests,
    fullAnthropometries,
  } = await readAll();

  return {
    app: "seguimiento-antropometrico-casla",
    version: 4,
    exportedAt: nowISO(),

    players,
    controls,
    weightRecords,
    objectivePeriods,
    hydrationTests,
    fullAnthropometries,
  };
}

/* ============================================================
   DESCARGA
============================================================ */

export function download(
  filename: string,
  blob: Blob,
) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function stamp() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

export async function exportJSON() {
  const backup = await buildBackup();

  download(
    `antropometria-backup-${stamp()}.json`,
    new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    ),
  );
}

/* ============================================================
   EXPORTACIÓN PLANA
============================================================ */

/**
 * Filas planas:
 * una por control,
 * con derivados calculados.
 */
export async function flatRows() {
  const {
    players,
    controls,
  } = await readAll();

  const byId = new Map(
    players.map((p) => [
      p.id!,
      p,
    ]),
  );

  return controls
    .sort((a, b) =>
      a.date.localeCompare(
        b.date,
      ),
    )
    .map((c) => {
      const row: Record<
        string,
        string | number | null
      > = {
        Jugadora:
          byId.get(c.playerId)
            ?.name ?? "—",

        Fecha:
          fmtDate(c.date),
      };

      for (const m of METRICS) {
        row[
          `${m.label} (${m.unit})`
        ] =
          metricValue(
            c,
            m.key,
          );
      }

      row["Observaciones"] =
        c.notes ?? "";

      return row;
    });
}

export async function exportCSV() {
  const rows =
    await flatRows();

  if (rows.length === 0) {
    return;
  }

  const headers =
    Object.keys(
      rows[0],
    );

  const esc = (
    v: unknown,
  ) =>
    `"${String(
      v ?? "",
    ).replace(
      /"/g,
      '""',
    )}"`;

  const csv = [
    headers
      .map(esc)
      .join(";"),

    ...rows.map((r) =>
      headers
        .map((h) =>
          esc(r[h]),
        )
        .join(";"),
    ),
  ].join("\n");

  download(
    `antropometria-${stamp()}.csv`,
    new Blob(
      [
        "\uFEFF" +
          csv,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      },
    ),
  );
}

export async function exportXLSX(
  rows?: Record<
    string,
    unknown
  >[],
  filename?: string,
) {
  const XLSX =
    await import("xlsx");

  const data =
    rows ??
    (await flatRows());

  const ws =
    XLSX.utils.json_to_sheet(
      data,
    );

  const wb =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Antropometría",
  );

  const out = XLSX.write(
    wb,
    {
      bookType: "xlsx",
      type: "array",
    },
  ) as ArrayBuffer;

  download(
    filename ??
      `antropometria-${stamp()}.xlsx`,

    new Blob(
      [out],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ),
  );
}

/* ============================================================
   IMPORTAR BACKUP
============================================================ */

export async function importBackup(
  file: File,
  mode:
    | "replace"
    | "merge",
) {
  const text =
    await file.text();

  const parsed =
    JSON.parse(
      text,
    ) as BackupFile;

  if (
    !parsed ||
    !Array.isArray(
      parsed.players,
    ) ||
    !Array.isArray(
      parsed.controls,
    )
  ) {
    throw new Error(
      "El archivo no tiene el formato de backup esperado.",
    );
  }

  /*
   * Backups anteriores a versión 4
   * pueden no tener estas tablas.
   */
  const incomingWeights =
    parsed.weightRecords ??
    [];

  const incomingObjectives =
    parsed.objectivePeriods ??
    [];

  const incomingHydration =
    parsed.hydrationTests ??
    [];

  const incomingFullAnthropometries =
    parsed.fullAnthropometries ??
    [];

  const d = db();

  await d.transaction(
    "rw",

    d.players,
    d.controls,
    d.weightRecords,
    d.objectivePeriods,
    d.hydrationTests,
    d.fullAnthropometries,

    async () => {
      /* ======================================================
         REEMPLAZAR BASE COMPLETA
      ====================================================== */

      if (
        mode ===
        "replace"
      ) {
        /*
         * Primero borramos tablas dependientes.
         */
        await d.fullAnthropometries.clear();
        await d.hydrationTests.clear();
        await d.controls.clear();
        await d.weightRecords.clear();
        await d.objectivePeriods.clear();
        await d.players.clear();

        /*
         * Después restauramos respetando
         * los IDs originales.
         */
        if (
          parsed.players
            .length > 0
        ) {
          await d.players.bulkAdd(
            parsed.players,
          );
        }

        if (
          parsed.controls
            .length > 0
        ) {
          await d.controls.bulkAdd(
            parsed.controls,
          );
        }

        if (
          incomingWeights
            .length > 0
        ) {
          await d.weightRecords.bulkAdd(
            incomingWeights,
          );
        }

        if (
          incomingObjectives
            .length > 0
        ) {
          await d.objectivePeriods.bulkAdd(
            incomingObjectives,
          );
        }

        if (
          incomingHydration
            .length > 0
        ) {
          await d.hydrationTests.bulkAdd(
            incomingHydration,
          );
        }

        if (
          incomingFullAnthropometries
            .length > 0
        ) {
          await d.fullAnthropometries.bulkAdd(
            incomingFullAnthropometries,
          );
        }

        return;
      }

      /* ======================================================
         MERGE
      ====================================================== */

      const existingPlayers =
        await d.players.toArray();

      const byName =
        new Map(
          existingPlayers.map(
            (p) => [
              p.name
                .trim()
                .toLowerCase(),
              p.id!,
            ],
          ),
        );

      /*
       * ID de jugadora del backup
       * -> ID actual de la base.
       */
      const playerIdMap =
        new Map<
          number,
          number
        >();

      /* --------------------------
         JUGADORAS
      --------------------------- */

      for (
        const p
        of parsed.players
      ) {
        const key =
          p.name
            .trim()
            .toLowerCase();

        let id =
          byName.get(key);

        if (
          id == null
        ) {
          const {
            id: _omit,
            ...rest
          } = p;

          id =
            await d.players.add(
              {
                ...rest,

                createdAt:
                  rest.createdAt ??
                  nowISO(),

                updatedAt:
                  nowISO(),
              },
            );

          byName.set(
            key,
            Number(id),
          );
        }

        if (
          p.id != null
        ) {
          playerIdMap.set(
            p.id,
            Number(id),
          );
        }
      }

      /*
       * ID de control del backup
       * -> ID actual.
       */
      const controlIdMap =
        new Map<
          number,
          number
        >();

      /* --------------------------
         CONTROLES
      --------------------------- */

      for (
        const c
        of parsed.controls
      ) {
        const playerId =
          playerIdMap.get(
            c.playerId,
          );

        if (
          playerId == null
        ) {
          continue;
        }

        const existing =
          await d.controls
            .where(
              "[playerId+date]",
            )
            .equals([
              playerId,
              c.date,
            ])
            .first();

        let finalId:
          number;

        if (
          existing?.id !=
          null
        ) {
          finalId =
            existing.id;
        } else {
          const {
            id: _omit,
            ...rest
          } = c;

          const added =
            await d.controls.add(
              {
                ...rest,

                playerId,

                createdAt:
                  rest.createdAt ??
                  nowISO(),

                updatedAt:
                  nowISO(),
              },
            );

          finalId =
            Number(added);
        }

        if (
          c.id != null
        ) {
          controlIdMap.set(
            c.id,
            finalId,
          );
        }
      }

      /* --------------------------
         PESAJES
      --------------------------- */

      for (
        const record
        of incomingWeights
      ) {
        const playerId =
          playerIdMap.get(
            record.playerId,
          );

        if (
          playerId == null
        ) {
          continue;
        }

        const existing =
          await d.weightRecords
            .where(
              "[playerId+date]",
            )
            .equals([
              playerId,
              record.date,
            ])
            .first();

        if (existing) {
          continue;
        }

        const {
          id: _omit,
          ...rest
        } = record;

        await d.weightRecords.add(
          {
            ...rest,

            playerId,

            createdAt:
              rest.createdAt ??
              nowISO(),

            updatedAt:
              nowISO(),
          },
        );
      }

      /* --------------------------
         OBJETIVOS
      --------------------------- */

      for (
        const period
        of incomingObjectives
      ) {
        const remappedTargets =
          period.targets
            .map(
              (
                target,
              ) => {
                const playerId =
                  playerIdMap.get(
                    target.playerId,
                  );

                if (
                  playerId ==
                  null
                ) {
                  return null;
                }

                return {
                  ...target,
                  playerId,
                };
              },
            )
            .filter(
              (
                target,
              ): target is NonNullable<
                typeof target
              > =>
                target !==
                null,
            );

        const existing =
          await d.objectivePeriods
            .where("key")
            .equals(
              period.key,
            )
            .first();

        const nextPeriod = {
          ...period,

          targets:
            remappedTargets,

          updatedAt:
            nowISO(),
        };

        if (
          existing?.id !=
          null
        ) {
          await d.objectivePeriods.update(
            existing.id,
            nextPeriod,
          );
        } else {
          const {
            id: _omit,
            ...rest
          } =
            nextPeriod;

          await d.objectivePeriods.add(
            {
              ...rest,

              createdAt:
                rest.createdAt ??
                nowISO(),
            },
          );
        }
      }

      /* --------------------------
         HIDRATACIÓN
      --------------------------- */

      for (
        const test
        of incomingHydration
      ) {
        const remappedEntries =
          test.entries.map(
            (entry) => ({
              ...entry,

              playerId:
                entry.playerId ==
                null
                  ? null
                  : playerIdMap.get(
                      entry.playerId,
                    ) ??
                    null,
            }),
          );

        const existing =
          await d.hydrationTests
            .where("date")
            .equals(
              test.date,
            )
            .filter(
              (current) =>
                current.round ===
                  test.round &&
                current.dayType ===
                  test.dayType &&
                current.context ===
                  test.context &&
                current.customContext ===
                  test.customContext &&
                current.rival ===
                  test.rival,
            )
            .first();

        if (existing) {
          continue;
        }

        const {
          id: _omit,
          ...rest
        } = test;

        await d.hydrationTests.add(
          {
            ...rest,

            entries:
              remappedEntries,

            createdAt:
              rest.createdAt ??
              nowISO(),

            updatedAt:
              nowISO(),
          },
        );
      }

      /* --------------------------
         ANTROPOMETRÍAS COMPLETAS
      --------------------------- */

      for (
        const anthropometry
        of incomingFullAnthropometries
      ) {
        const playerId =
          playerIdMap.get(
            anthropometry.playerId,
          );

        if (
          playerId == null
        ) {
          continue;
        }

        const existing =
          await d.fullAnthropometries
            .where(
              "[playerId+date]",
            )
            .equals([
              playerId,
              anthropometry.date,
            ])
            .first();

        if (existing) {
          continue;
        }

        const {
          id: _omit,
          ...rest
        } =
          anthropometry;

        const linkedControlId =
          rest.linkedControlId ==
          null
            ? null
            : controlIdMap.get(
                rest.linkedControlId,
              ) ??
              null;

        await d.fullAnthropometries.add(
          {
            ...rest,

            playerId,

            linkedControlId,

            createdAt:
              rest.createdAt ??
              nowISO(),

            updatedAt:
              nowISO(),
          },
        );
      }
    },
  );

  return {
    players:
      parsed.players.length,

    controls:
      parsed.controls.length,

    weightRecords:
      incomingWeights.length,

    objectivePeriods:
      incomingObjectives.length,

    hydrationTests:
      incomingHydration.length,

    fullAnthropometries:
      incomingFullAnthropometries.length,
  };
}

/* ============================================================
   BORRAR TODA LA BASE LOCAL
============================================================ */

export async function wipeAll() {
  const d = db();

  await d.transaction(
    "rw",

    d.players,
    d.controls,
    d.weightRecords,
    d.objectivePeriods,
    d.hydrationTests,
    d.fullAnthropometries,

    async () => {
      await d.fullAnthropometries.clear();
      await d.hydrationTests.clear();
      await d.controls.clear();
      await d.weightRecords.clear();
      await d.objectivePeriods.clear();
      await d.players.clear();
    },
  );
}
