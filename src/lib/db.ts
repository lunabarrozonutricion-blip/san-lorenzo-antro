import Dexie, { type Table } from "dexie";

import type {
  Control,
  FullAnthropometry,
  HydrationTest,
  ObjectivePeriod,
  Player,
  WeightRecord,
} from "./types";

export class AnthroDB extends Dexie {
  players!: Table<Player, number>;
  controls!: Table<Control, number>;
  weightRecords!: Table<WeightRecord, number>;
  objectivePeriods!: Table<ObjectivePeriod, number>;
  hydrationTests!: Table<HydrationTest, number>;

  /*
   * Evaluaciones antropométricas completas:
   * Kerr / 5 componentes / Antropogims.
   */
  fullAnthropometries!: Table<
    FullAnthropometry,
    number
  >;

  constructor() {
    super("sanlorenzo-antropometria");

    this.version(1).stores({
      players: "++id, name, active",
      controls:
        "++id, playerId, date, [playerId+date]",
    });

    this.version(2).stores({
      players: "++id, name, active",
      controls:
        "++id, playerId, date, [playerId+date]",
      weightRecords:
        "++id, playerId, date, condition, [playerId+date]",
    });

    // Migración aditiva:
    // conserva jugadoras, controles y pesajes existentes.
    this.version(3).stores({
      players: "++id, name, active",
      controls:
        "++id, playerId, date, [playerId+date]",
      weightRecords:
        "++id, playerId, date, condition, [playerId+date]",
      objectivePeriods:
        "++id, &key, year, month",
    });

    // Migración aditiva:
    // agrega tests de hidratación sin modificar
    // ninguna información existente.
    this.version(4).stores({
      players: "++id, name, active",
      controls:
        "++id, playerId, date, [playerId+date]",
      weightRecords:
        "++id, playerId, date, condition, [playerId+date]",
      objectivePeriods:
        "++id, &key, year, month",
      hydrationTests:
        "++id, date, round, dayType, context",
    });

    /*
     * Migración aditiva:
     * agrega antropometrías completas.
     *
     * NO modifica las tablas anteriores.
     *
     * El índice compuesto [playerId+date]
     * nos permite:
     * - encontrar la evaluación de una jugadora
     *   en una fecha determinada;
     * - evitar duplicaciones accidentales;
     * - vincularla luego con el control habitual.
     */
    this.version(5).stores({
      players: "++id, name, active",
      controls:
        "++id, playerId, date, [playerId+date]",
      weightRecords:
        "++id, playerId, date, condition, [playerId+date]",
      objectivePeriods:
        "++id, &key, year, month",
      hydrationTests:
        "++id, date, round, dayType, context",
      fullAnthropometries:
        "++id, playerId, date, source, [playerId+date]",
    });
  }
}

let _db: AnthroDB | null = null;

/** Dexie solo existe en el navegador; se crea de forma perezosa. */
export function db(): AnthroDB {
  if (typeof window === "undefined") {
    throw new Error(
      "La base local sólo está disponible en el navegador",
    );
  }

  if (!_db) _db = new AnthroDB();

  return _db;
}

export function nowISO() {
  return new Date().toISOString();
}

function emptyControl(
  playerId: number,
  date: string,
  v: Partial<Control>,
): Control {
  return {
    playerId,
    date,
    weight: null,
    triceps: null,
    subscapular: null,
    supraespinal: null,
    abdominal: null,
    thighSkinfold: null,
    calfSkinfold: null,
    armPerimeter: null,
    thighPerimeter: null,
    calfPerimeter: null,
    notes: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...v,
  };
}

let seeded = false;

/** Datos de ejemplo mínimos, sólo si la base está vacía. */
export async function ensureSeed() {
  if (seeded) return;

  seeded = true;

  const d = db();
  const count = await d.players.count();

  if (count > 0) return;

  const players: Player[] = [
    {
      name: "Camila Rodríguez",
      position: "Delantera",
      birthDate: "2001-04-12",
      active: 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      name: "Martina Gómez",
      position: "Mediocampista",
      birthDate: "1999-09-03",
      active: 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      name: "Lucía Fernández",
      position: "Defensora",
      birthDate: "2003-01-25",
      active: 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ];

  const ids = await d.players.bulkAdd(
    players,
    {
      allKeys: true,
    },
  );

  const samples: Array<
    [number, string, Partial<Control>]
  > = [
    [
      0,
      "2026-03-10",
      {
        weight: 58.4,
        triceps: 14.2,
        subscapular: 10.1,
        supraespinal: 8.4,
        abdominal: 15.3,
        thighSkinfold: 20.5,
        calfSkinfold: 12.1,
        armPerimeter: 26.4,
        thighPerimeter: 52.1,
        calfPerimeter: 34.2,
      },
    ],
    [
      0,
      "2026-06-08",
      {
        weight: 57.6,
        triceps: 13.1,
        subscapular: 9.6,
        supraespinal: 7.8,
        abdominal: 13.9,
        thighSkinfold: 19.2,
        calfSkinfold: 11.4,
        armPerimeter: 26.8,
        thighPerimeter: 52.6,
        calfPerimeter: 34.5,
      },
    ],
    [
      0,
      "2026-09-01",
      {
        weight: 57.9,
        triceps: 12.6,
        subscapular: 9.2,
        supraespinal: 7.5,
        abdominal: 13.2,
        thighSkinfold: 18.6,
        calfSkinfold: 11.0,
        armPerimeter: 27.1,
        thighPerimeter: 53.0,
        calfPerimeter: 34.8,
        notes:
          "Pretemporada finalizada.",
      },
    ],
    [
      1,
      "2026-03-11",
      {
        weight: 62.1,
        triceps: 16.4,
        subscapular: 12.3,
        supraespinal: 10.2,
        abdominal: 18.6,
        thighSkinfold: 24.1,
        calfSkinfold: 14.3,
        armPerimeter: 28.0,
        thighPerimeter: 55.4,
        calfPerimeter: 36.1,
      },
    ],
    [
      1,
      "2026-06-09",
      {
        weight: 61.4,
        triceps: 15.5,
        subscapular: 11.8,
        supraespinal: 9.6,
        abdominal: 17.4,
        thighSkinfold: 23.0,
        calfSkinfold: 13.8,
        armPerimeter: 28.3,
        thighPerimeter: 55.7,
        calfPerimeter: 36.3,
      },
    ],
    [
      2,
      "2026-03-12",
      {
        weight: 55.2,
        triceps: 12.8,
        subscapular: 9.4,
        supraespinal: 7.1,
        abdominal: 12.4,
        thighSkinfold: 17.9,
        calfSkinfold: 10.6,
        armPerimeter: 25.2,
        thighPerimeter: 50.3,
        calfPerimeter: 33.1,
      },
    ],
    [
      2,
      "2026-08-20",
      {
        weight: 55.8,
        triceps: 12.4,
        subscapular: 9.1,
        supraespinal: 7.0,
        abdominal: 12.0,
        thighSkinfold: 17.4,
        calfSkinfold: 10.2,
        armPerimeter: 25.6,
        thighPerimeter: 50.8,
        calfPerimeter: 33.4,
      },
    ],
  ];

  await d.controls.bulkAdd(
    samples.map(
      ([i, date, v]) =>
        emptyControl(
          ids[i] as number,
          date,
          v,
        ),
    ),
  );
}

export async function deleteControl(
  id: number,
) {
  await db().controls.delete(id);
}

export async function upsertControl(
  c: Control,
) {
  const d = db();

  if (c.id) {
    await d.controls.update(c.id, {
      ...c,
      updatedAt: nowISO(),
    });

    return c.id;
  }

  return await d.controls.add({
    ...c,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

export async function upsertWeightRecord(
  record: WeightRecord,
) {
  const d = db();

  if (record.id) {
    await d.weightRecords.update(
      record.id,
      {
        ...record,
        updatedAt: nowISO(),
      },
    );

    return record.id;
  }

  return await d.weightRecords.add({
    ...record,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

export async function deleteWeightRecord(
  id: number,
) {
  await db().weightRecords.delete(id);
}

export async function upsertPlayer(
  p: Player,
) {
  const d = db();

  if (p.id) {
    await d.players.update(p.id, {
      ...p,
      updatedAt: nowISO(),
    });

    return p.id;
  }

  return await d.players.add({
    ...p,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

export async function deletePlayer(
  id: number,
) {
  const d = db();

  /*
   * Si alguna vez se elimina definitivamente
   * una jugadora, también eliminamos sus
   * controles y sus evaluaciones completas.
   *
   * Esto NO afecta a las jugadoras inactivas.
   * Solamente ocurre al borrar una jugadora.
   */
  await d.transaction(
    "rw",
    d.players,
    d.controls,
    d.fullAnthropometries,
    async () => {
      await d.controls
        .where("playerId")
        .equals(id)
        .delete();

      await d.fullAnthropometries
        .where("playerId")
        .equals(id)
        .delete();

      await d.players.delete(id);
    },
  );
}

export async function upsertObjectivePeriod(
  period: ObjectivePeriod,
) {
  const d = db();

  if (period.id) {
    await d.objectivePeriods.update(
      period.id,
      {
        ...period,
        updatedAt: nowISO(),
      },
    );

    return period.id;
  }

  return await d.objectivePeriods.add({
    ...period,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

/* ---------------------------
   TESTS DE HIDRATACIÓN
---------------------------- */

export async function upsertHydrationTest(
  test: HydrationTest,
) {
  const d = db();

  if (test.id) {
    await d.hydrationTests.update(
      test.id,
      {
        ...test,
        updatedAt: nowISO(),
      },
    );

    return test.id;
  }

  return await d.hydrationTests.add({
    ...test,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

export async function deleteHydrationTest(
  id: number,
) {
  await db().hydrationTests.delete(id);
}

/* =========================================
   ANTROPOMETRÍAS COMPLETAS
   5 COMPONENTES / KERR / ANTROPOGIMS
========================================= */

export async function upsertFullAnthropometry(
  anthropometry: FullAnthropometry,
) {
  const d = db();

  if (anthropometry.id) {
    await d.fullAnthropometries.update(
      anthropometry.id,
      {
        ...anthropometry,
        updatedAt: nowISO(),
      },
    );

    return anthropometry.id;
  }

  return await d.fullAnthropometries.add({
    ...anthropometry,
    createdAt:
      anthropometry.createdAt ??
      nowISO(),
    updatedAt: nowISO(),
  });
}

export async function deleteFullAnthropometry(
  id: number,
) {
  await db().fullAnthropometries.delete(
    id,
  );
}

/*
 * Busca una antropometría completa de una
 * jugadora en una fecha determinada.
 *
 * Nos va a servir mucho cuando importemos
 * Antropogims para evitar duplicar una
 * evaluación que ya existe.
 */
export async function findFullAnthropometryByDate(
  playerId: number,
  date: string,
) {
  return await db()
    .fullAnthropometries
    .where("[playerId+date]")
    .equals([
      playerId,
      date,
    ])
    .first();
}
