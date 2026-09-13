import { db, nowISO } from "./db";
import type { WeightCondition } from "./types";

interface IncomingWeightRecord {
  playerName: string;
  date: string;
  weight: number | null;
  condition: WeightCondition;
  notes: string | null;
}

interface WeightHistoryFile {
  app: string;
  version: number;
  source?: string;
  records: IncomingWeightRecord[];
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/*
  En el Excel original aparecen nombre + apellido,
  mientras que en la base antropométrica varias
  jugadoras están guardadas solamente por apellido.
*/
const PLAYER_NAME_MAP: Record<string, string> = {
  "acuna ayelen": "acuna",
  "altamirano carolina": "altamirano",
  "arias emily": "arias",
  "barrera johana belen": "barrera",
  "barrios mabel": "barrios",
  "cardenas wendy": "cardenas",
  "castillo katherine": "castillo",
  "coronel florencia": "coronel florencia",
  "coronel sabina": "coronel sabina",
  "curril florencia": "curril",
  "godoy belen": "godoy",
  "gomez oriana": "gomez",
  "gonzales lourdes": "gonzalez",
  "ledesma giuliana": "ledesma",
  "lopez camila": "lopez camila",
  "lopez genesis belen": "lopez belen",
  "mereles daniela": "mereles",
  "molina debora": "molina",
  "muzio azul": "muzio",
  "pafundi delfina": "pafundi",
  "pavon crisely": "pavon",
  "pereyra solana": "pereyra",
  "puentes karen": "puentes",
  "rodriguez aldana": "rodriguez",
  "romeo jimena": "romeo",
  "salinas magaly": "salinas",
  "sanabria constanza": "sanabria",
  "vidal gisel": "vidal",
  "villalba priscila": "villalba",
  "zacmon luciana": "zacmon",
};

function isWeightCondition(
  value: string,
): value is WeightCondition {
  return [
    "normal",
    "indispuesta",
    "seleccion",
    "reserva",
    "ausente",
    "otro",
  ].includes(value);
}

export async function importWeightHistory(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as WeightHistoryFile;

  if (
    !parsed ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error(
      "El archivo no tiene el formato esperado de pesajes.",
    );
  }

  const d = db();
  const players = await d.players.toArray();

  const playersByName = new Map(
    players.map((player) => [
      normalizeName(player.name),
      player,
    ]),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const unmatched = new Set<string>();

  await d.transaction(
    "rw",
    d.weightRecords,
    async () => {
      for (const row of parsed.records) {
        const incomingName =
          normalizeName(row.playerName);

        const mappedName =
          PLAYER_NAME_MAP[incomingName] ??
          incomingName;

        const player =
          playersByName.get(mappedName);

        if (!player?.id) {
          unmatched.add(row.playerName);
          skipped++;
          continue;
        }

        if (
          !row.date ||
          !isWeightCondition(row.condition)
        ) {
          skipped++;
          continue;
        }

        const existing =
          await d.weightRecords
            .where("[playerId+date]")
            .equals([
              player.id,
              row.date,
            ])
            .first();

        if (existing?.id) {
          await d.weightRecords.update(
            existing.id,
            {
              weight: row.weight,
              condition: row.condition,
              notes: row.notes ?? null,
              updatedAt: nowISO(),
            },
          );

          updated++;
          continue;
        }

        await d.weightRecords.add({
          playerId: player.id,
          date: row.date,
          weight: row.weight,
          condition: row.condition,
          notes: row.notes ?? null,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });

        created++;
      }
    },
  );

  return {
    total: parsed.records.length,
    created,
    updated,
    skipped,
    unmatched: [...unmatched],
  };
}
