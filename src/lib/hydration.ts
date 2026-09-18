import { db, nowISO } from "./db";
import type { HydrationTest, Player } from "./types";

type RawEntry = readonly [string, number | null, string?];

type RawTest = {
  date: string;
  round: number;
  rival: string;
  entries: readonly RawEntry[];
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const PLAYER_ALIASES: Record<string, string> = {
  "romeo jimena": "romero jimena",
  "gonzales lourdes maria": "gonzalez lourdes maria",
  "zacmon luciana": "sacmon luciana",
};

function resolvePlayerId(name: string, players: Player[]) {
  const normalized = normalizeName(name);

  const exactOriginal = players.find(
    (player) => normalizeName(player.name) === normalized,
  );

  if (exactOriginal?.id != null) return exactOriginal.id;

  const target = PLAYER_ALIASES[normalized] ?? normalized;

  const exactAlias = players.find(
    (player) => normalizeName(player.name) === target,
  );

  if (exactAlias?.id != null) return exactAlias.id;

  const tokens = target.split(" ");

  if (tokens.length === 1) {
    const matches = players.filter((player) =>
      normalizeName(player.name).split(" ").includes(tokens[0]),
    );

    if (matches.length === 1 && matches[0].id != null) {
      return matches[0].id;
    }
  }

  return null;
}

export function hydrationStatus(value: number | null) {
  if (value == null) return null;
  return value <= 1020 ? "Bien hidratada" : "Deshidratada";
}

const HYDRATION_HISTORY: readonly RawTest[] = [
  {
    date: "2026-07-26",
    round: 1,
    rival: "Boca",
    entries: [
      ["Acuña Ayelen", null, "Indispuesta"],
      ["Altamirano", 1022],
      ["Arias Espinales Emily Rosa", 1024],
      ["Barrera Johana Belen", 1022],
      ["Cardenas Wendy", 1016],
      ["Castillo Katherine", null, "Qx"],
      ["Coronel Florencia", null, "Indispuesta (ult dia)"],
      ["Coronel Sabina", 1016],
      ["Curril Florencia", null, "Indispuesta"],
      ["Gomez Oriana Nicole", 1014],
      ["Gonzales Lourdes María", 1020],
      ["Ledesma Giuliana", 1013],
      ["Lopez Genesis Belen", 1004],
      ["Lopez Camila", 1016],
      ["Mereles Daniela", 1014],
      ["Molina Debora", 1015],
      ["Muzio Maria Azul", 1014],
      ["Pafundi Delfina", 1020],
      ["Pavon Stephaniecrisely", 1002],
      ["Pereyra Solana", null, "Qx"],
      ["Puentes Karen Daiana", 1012],
      ["Rodriguez Aldana", 1024],
      ["Salinas Magaly", null, "Indispuesta"],
      ["Sanabria Constanza", 1012],
      ["Vidal Gisel Antonella", 1018],
      ["Villalba Ariadna", null],
      ["Villalba Priscila", 1017],
      ["Zacmon Luciana", 1018],
    ],
  },
  {
    date: "2026-08-02",
    round: 2,
    rival: "Ferro",
    entries: [
      ["Acuña Ayelen", 1012],
      ["Altamirano", 1020],
      ["Arias Espinales Emily Rosa", 1006],
      ["Barrera Johana Belen", 1016],
      ["Cardenas Wendy", 1020],
      ["Castillo Katherine", null, "Qx"],
      ["Coronel Florencia", 1008],
      ["Coronel Sabina", 1020],
      ["Curril Florencia", 1010],
      ["Gomez Oriana Nicole", 1016],
      ["Gonzales Lourdes María", 1012, "(ayer su ult dia)"],
      ["Ledesma Giuliana", 1006],
      ["Lopez Genesis Belen", 1008],
      ["Lopez Camila", 1020],
      ["Mereles Daniela", 1022],
      ["Molina Debora", 1018],
      ["Muzio Maria Azul", null, "Indispuesta"],
      ["Pafundi Delfina", null, "Indispuesta"],
      ["Pavon Stephaniecrisely", 1006],
      ["Pereyra Solana", null, "Qx"],
      ["Puentes Karen Daiana", 1020],
      ["Rodriguez Aldana", 1019],
      ["Salinas Magaly", 1016],
      ["Sanabria Constanza", 1009],
      ["Vidal Gisel Antonella", 1020],
      ["Villalba Priscila", 1020],
      ["Zacmon Luciana", 1020],
    ],
  },
  {
    date: "2026-08-10",
    round: 3,
    rival: "Talleres",
    entries: [
      ["Acuña Ayelen", 1012],
      ["Altamirano", 1016],
      ["Arias Espinales Emily Rosa", 1028],
      ["Barrera Johana Belen", null, "Indispuesta"],
      ["Cardenas Wendy", 1021],
      ["Castillo Katherine", null, "No citada"],
      ["Coronel Florencia", 1014],
      ["Coronel Sabina", 1020],
      ["Curril Florencia", null, "Indispuesta"],
      ["Gomez Oriana Nicole", null, "Indispuesta"],
      ["Gonzales Lourdes María", 1012],
      ["Ledesma Giuliana", 1019],
      ["Lopez Genesis Belen", 1008],
      ["Lopez Camila", 1028],
      ["Mereles Daniela", 1014],
      ["Molina Debora", null, "Indispuesta"],
      ["Muzio Maria Azul", null],
      ["Pafundi Delfina", 1020],
      ["Pavon Stephaniecrisely", 1004],
      ["Pereyra Solana", null, "No citada"],
      ["Puentes Karen Daiana", 1020],
      ["Rodriguez Aldana", null, "No citada"],
      ["Salinas Magaly", null, "No citada"],
      ["Sanabria Constanza", null, "No citada"],
      ["Vidal Gisel Antonella", null, "Indispuesta"],
      ["Villalba Priscila", null, "No citada"],
      ["Zacmon Luciana", null, "Indispuesta"],
    ],
  },
  {
    date: "2026-08-16",
    round: 4,
    rival: "SAT",
    entries: [
      ["Acuña Ayelen", 1006],
      ["Altamirano", 1016],
      ["Arias Espinales Emily Rosa", 1006],
      ["Barrios", 1020],
      ["Barrera Johana Belen", 1018],
      ["Cardenas Wendy", 1018],
      ["Castillo Katherine", 1020],
      ["Coronel Florencia", null, "Indispuesta"],
      ["Coronel Sabina", 1022],
      ["Curril Florencia", 1010],
      ["Godoy", 1021],
      ["Gomez Oriana Nicole", 1022],
      ["Gonzales Lourdes María", 1020],
      ["Ledesma Giuliana", 1008],
      ["Lopez Genesis Belen", 1014],
      ["Lopez Camila", 1026],
      ["Mereles Daniela", 1014],
      ["Molina Debora", 1017],
      ["Muzio Maria Azul", 1016],
      ["Pafundi Delfina", 1024],
      ["Pavon Stephaniecrisely", 1004],
      ["Pereyra Solana", null, "cx"],
      ["Puentes Karen Daiana", 1021],
      ["Romero Jimena", 1017],
      ["Rodriguez Aldana", null, "-"],
      ["Salinas Magaly", 1024],
      ["Sanabria Constanza", null, "Indispuesta"],
      ["Vidal Gisel Antonella", 1022],
      ["Villalba Priscila", 1028],
      ["Zacmon Luciana", 1012],
    ],
  },
  {
    date: "2026-08-23",
    round: 5,
    rival: "Racing",
    entries: [
      ["Acuña Ayelen", 1008],
      ["Altamirano", null, "Indispuesta"],
      ["Arias Espinales Emily Rosa", null, "Indispuesta"],
      ["Barrios", 1022],
      ["Barrera Johana Belen", 1012],
      ["Cardenas Wendy", 1015],
      ["Castillo Katherine", null, "Indispuesta"],
      ["Coronel Florencia", 1008],
      ["Coronel Sabina", null, "Indispuesta"],
      ["Curril Florencia", 1008],
      ["Godoy", null, "Reserva"],
      ["Gomez Oriana Nicole", 1020],
      ["Gonzales Lourdes María", 1010],
      ["Ledesma Giuliana", 1004],
      ["Lopez Genesis Belen", null, "Indispuesta"],
      ["Lopez Camila", 1017],
      ["Mereles Daniela", null, "Indispuesta"],
      ["Molina Debora", 1011],
      ["Muzio Maria Azul", 1018],
      ["Pafundi Delfina", 1007],
      ["Pavon Stephaniecrisely", 1007],
      ["Pereyra Solana", null, "cx"],
      ["Puentes Karen Daiana", 1030],
      ["Romeo Jimena", 1028],
      ["Rodriguez Aldana", null, "Reserva"],
      ["Salinas Magaly", 1004],
      ["Sanabria Constanza", 1012],
      ["Vidal Gisel Antonella", 1010],
      ["Villalba Priscila", null, "Reserva"],
      ["Zacmon Luciana", 1004],
    ],
  },
  {
    date: "2026-08-29",
    round: 6,
    rival: "Newell´s",
    entries: [
      ["Acuña Ayelen", null],
      ["Altamirano", 1024],
      ["Arias Espinales Emily Rosa", 1006],
      ["Barrios", null],
      ["Barrera Johana Belen", null],
      ["Cardenas Wendy", 1024],
      ["Castillo Katherine", 1010],
      ["Coronel Florencia", 1010],
      ["Coronel Sabina", 1014],
      ["Curril Florencia", 1014],
      ["Godoy", null],
      ["Gomez Oriana Nicole", null],
      ["Gonzales Lourdes María", null, "Indispuesta"],
      ["Ledesma Giuliana", 1020],
      ["Lopez Genesis Belen", 1018],
      ["Lopez Camila", null],
      ["Mereles Daniela", 1006],
      ["Molina Debora", 1024],
      ["Muzio Maria Azul", 1029],
      ["Pafundi Delfina", 1031],
      ["Pavon Stephaniecrisely", 1008],
      ["Pereyra Solana", null],
      ["Puentes Karen Daiana", 1022],
      ["Romeo Jimena", null],
      ["Rodriguez Aldana", null],
      ["Salinas Magaly", null],
      ["Sanabria Constanza", 1011],
      ["Vidal Gisel Antonella", null, "Indispuesta"],
      ["Villalba Priscila", 1024],
      ["Zacmon Luciana", 1010],
    ],
  },
  {
    date: "2026-09-03",
    round: 7,
    rival: "Gimnasia",
    entries: [
      ["Acuña Ayelen", null, "Indispuesta"],
      ["Altamirano", 1018],
      ["Arias Espinales Emily Rosa", 1012],
      ["Barrios", null, "Indispuesta"],
      ["Barrera Johana Belen", 1014],
      ["Cardenas Wendy", null, "Indispuesta"],
      ["Castillo Katherine", 1003],
      ["Coronel Florencia", 1006],
      ["Coronel Sabina", 1008],
      ["Curril Florencia", 1012],
      ["Godoy", null, "Indispuesta"],
      ["Gomez Oriana Nicole", 1019],
      ["Gonzales Lourdes María", 1006],
      ["Ledesma Giuliana", null, "Indispuesta"],
      ["Lopez Genesis Belen", 1010],
      ["Lopez Camila", null, "Indispuesta"],
      ["Mereles Daniela", 1020],
      ["Molina Debora", 1010],
      ["Muzio Maria Azul", null, "Indispuesta"],
      ["Pafundi Delfina", null, "Indispuesta"],
      ["Pavon Stephaniecrisely", null, "Indispuesta"],
      ["Pereyra Solana", null, "Cx"],
      ["Puentes Karen Daiana", 1006],
      ["Romeo Jimena", null, "Indispuesta"],
      ["Rodriguez Aldana", 1030],
      ["Salinas Magaly", 1010],
      ["Sanabria Constanza", 1014],
      ["Vidal Gisel Antonella", 1010],
      ["Villalba Priscila", 1008],
      ["Zacmon Luciana", 1016],
    ],
  },
  {
    date: "2026-09-10",
    round: 8,
    rival: "Banfield",
    entries: [
      ["Acuña Ayelen", 1016],
      ["Altamirano", 1021],
      ["Arias Espinales Emily Rosa", 1010],
      ["Barrios", 1020],
      ["Barrera Johana Belen", null, "Indispuesta"],
      ["Cardenas Wendy", 1012],
      ["Castillo Katherine", 1016],
      ["Coronel Florencia", 1010],
      ["Coronel Sabina", 1021],
      ["Curril Florencia", 1021],
      ["Godoy", 1018],
      ["Gomez Oriana Nicole", 1024],
      ["Gonzales Lourdes María", 1014],
      ["Ledesma Giuliana", 1006],
      ["Lopez Genesis Belen", null, "Indispuesta"],
      ["Lopez Camila", 1028],
      ["Mereles Daniela", 1012],
      ["Molina Debora", null, "Indispuesta"],
      ["Muzio Maria Azul", 1014],
      ["Pafundi Delfina", 1020],
      ["Pavon Stephaniecrisely", 1006],
      ["Pereyra Solana", null, "CX"],
      ["Puentes Karen Daiana", 1010],
      ["Romeo Jimena", 1009],
      ["Rodriguez Aldana", 1022],
      ["Salinas Magaly", 1009],
      ["Sanabria Constanza", 1014],
      ["Vidal Gisel Antonella", 1019],
      ["Villalba Priscila", null, "Indispuesta"],
      ["Zacmon Luciana", 1014],
    ],
  },
];

export async function ensureHydrationSeed() {
  const d = db();
  const players = await d.players.toArray();

  for (const seed of HYDRATION_HISTORY) {
    const sameDate = await d.hydrationTests
      .where("date")
      .equals(seed.date)
      .toArray();

    if (sameDate.some((test) => test.round === seed.round)) continue;

    const test: HydrationTest = {
      date: seed.date,
      round: seed.round,
      rival: seed.rival,
      dayType: "sin_especificar",
      context: "pre_entreno",
      customContext: null,
      entries: seed.entries.map(([playerName, value, observation]) => ({
        playerId: resolvePlayerId(playerName, players),
        playerName,
        value,
        observation: observation ?? null,
      })),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    await d.hydrationTests.add(test);
  }
}
