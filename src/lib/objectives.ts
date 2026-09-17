import { db, nowISO } from "./db";
import type {
  ObjectivePeriod,
  Player,
} from "./types";

const SEPTEMBER_SUM6_TARGETS: Record<string, number> = {
  acuna: 60,
  altamirano: 99,
  barrera: 71.5,
  castillo: 64.5,
  "coronel florencia": 75,
  curril: 65,
  gomez: 78,
  gonzalez: 88,
  godoy: 88,
  ledesma: 71,
  "lopez belen": 68,
  mereles: 79,
  muzio: 63,
  pafundi: 73.5,
  rodriguez: 90,
  salinas: 75,
  vidal: 67,
  villalba: 77,
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function normalizeObjectiveName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameMatches(playerName: string, referenceName: string) {
  const playerTokens = new Set(
    normalizeObjectiveName(playerName).split(" "),
  );

  const referenceTokens =
    normalizeObjectiveName(referenceName).split(" ");

  return referenceTokens.every((token) =>
    playerTokens.has(token),
  );
}

export function initialSeptemberTargetFor(name: string) {
  const key = Object.keys(SEPTEMBER_SUM6_TARGETS).find(
    (reference) => nameMatches(name, reference),
  );

  return key ? SEPTEMBER_SUM6_TARGETS[key] : null;
}

export function objectivePeriodLabel(key: string) {
  const [yearText, monthText] = key.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || month < 1 || month > 12) return key;

  return `${MONTHS[month - 1]} ${year}`;
}

export function targetForPlayer(
  period: ObjectivePeriod | null | undefined,
  player: Player | null | undefined,
) {
  if (!period || !player?.id) return null;

  return (
    period.targets.find(
      (target) => target.playerId === player.id,
    )?.target ?? null
  );
}

export async function ensureObjectiveSeed() {
  const d = db();

  const existing = await d.objectivePeriods
    .where("key")
    .equals("2026-09")
    .first();

  if (existing) return;

  const players = await d.players.toArray();

  if (players.length === 0) return;

  const now = nowISO();

  await d.objectivePeriods.add({
    key: "2026-09",
    label: "Septiembre 2026",
    year: 2026,
    month: 9,
    targets: players
      .filter((player) => player.id != null)
      .map((player) => ({
        playerId: player.id!,
        playerName: player.name,
        target: initialSeptemberTargetFor(player.name),
      })),
    createdAt: now,
    updatedAt: now,
  });
}
