import { readAll } from "./backup";
import { supabase } from "./supabase";

import type {
  Control,
  FullAnthropometry,
  HydrationTest,
  ObjectivePeriod,
  Player,
  WeightRecord,
} from "./types";

type PlayerProfile = Player & {
  phone?: string | null;
  email?: string | null;
  generalNotes?: string | null;
};

export interface MigrationResult {
  players: number;
  controls: number;
  weightRecords: number;
  objectivePeriods: number;
  hydrationTests: number;
  fullAnthropometries: number;
}

const CLOUD_TABLES = [
  "players",
  "controls",
  "weight_records",
  "objective_periods",
  "hydration_tests",
  "full_anthropometries",
] as const;

type CloudTable =
  (typeof CLOUD_TABLES)[number];

function errorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(error);
}

async function requireUser() {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      "No hay una sesión iniciada.",
    );
  }

  return data.user;
}

async function countCloudRows(
  table: CloudTable,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const {
    count,
    error,
  } =
    await supabase
      .from(table)
      .select("*", {
        count: "exact",
        head: true,
      });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function ensureCloudIsEmpty() {
  const counts =
    await Promise.all(
      CLOUD_TABLES.map(
        async (table) => ({
          table,
          count:
            await countCloudRows(
              table,
            ),
        }),
      ),
    );

  const withData =
    counts.filter(
      (row) =>
        row.count > 0,
    );

  if (
    withData.length > 0
  ) {
    throw new Error(
      "La nube ya contiene datos. La migración automática se detuvo para evitar duplicados.",
    );
  }
}

async function cleanupCloud(
  ownerId: string,
) {
  if (!supabase) {
    return;
  }

  /*
   * Orden inverso para respetar
   * las relaciones entre tablas.
   */
  const tables: CloudTable[] = [
    "full_anthropometries",
    "hydration_tests",
    "objective_periods",
    "weight_records",
    "controls",
    "players",
  ];

  for (
    const table
    of tables
  ) {
    const {
      error,
    } =
      await supabase
        .from(table)
        .delete()
        .eq(
          "owner_id",
          ownerId,
        );

    if (error) {
      console.error(
        `No se pudo limpiar ${table}`,
        error,
      );
    }
  }
}

function requireMappedPlayer(
  map: Map<
    number,
    number
  >,
  localPlayerId: number,
) {
  const cloudId =
    map.get(
      localPlayerId,
    );

  if (
    cloudId == null
  ) {
    throw new Error(
      `No se encontró la jugadora local ID ${localPlayerId} durante la migración.`,
    );
  }

  return cloudId;
}

async function insertPlayer(
  player: PlayerProfile,
  ownerId: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("players")
      .insert({
        owner_id:
          ownerId,

        name:
          player.name,

        position:
          player.position ??
          null,

        birth_date:
          player.birthDate ??
          null,

        phone:
          player.phone ??
          null,

        email:
          player.email ??
          null,

        general_notes:
          player.generalNotes ??
          null,

        active:
          player.active,

        created_at:
          player.createdAt,

        updated_at:
          player.updatedAt,
      })
      .select("id")
      .single();

  if (error) {
    throw error;
  }

  return Number(
    data.id,
  );
}

async function insertControl(
  control: Control,
  cloudPlayerId: number,
  ownerId: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("controls")
      .insert({
        owner_id:
          ownerId,

        player_id:
          cloudPlayerId,

        date:
          control.date,

        weight:
          control.weight,

        triceps:
          control.triceps,

        subscapular:
          control.subscapular,

        supraespinal:
          control.supraespinal,

        abdominal:
          control.abdominal,

        thigh_skinfold:
          control.thighSkinfold,

        calf_skinfold:
          control.calfSkinfold,

        arm_perimeter:
          control.armPerimeter,

        thigh_perimeter:
          control.thighPerimeter,

        calf_perimeter:
          control.calfPerimeter,

        notes:
          control.notes,

        created_at:
          control.createdAt,

        updated_at:
          control.updatedAt,
      })
      .select("id")
      .single();

  if (error) {
    throw error;
  }

  return Number(
    data.id,
  );
}

async function insertWeightRecord(
  record: WeightRecord,
  cloudPlayerId: number,
  ownerId: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "weight_records",
      )
      .insert({
        owner_id:
          ownerId,

        player_id:
          cloudPlayerId,

        date:
          record.date,

        weight:
          record.weight,

        condition:
          record.condition,

        notes:
          record.notes,

        created_at:
          record.createdAt,

        updated_at:
          record.updatedAt,
      });

  if (error) {
    throw error;
  }
}

async function insertObjectivePeriod(
  period: ObjectivePeriod,
  playerIdMap: Map<
    number,
    number
  >,
  ownerId: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const targets =
    period.targets.map(
      (target) => ({
        ...target,

        playerId:
          requireMappedPlayer(
            playerIdMap,
            target.playerId,
          ),
      }),
    );

  const {
    error,
  } =
    await supabase
      .from(
        "objective_periods",
      )
      .insert({
        owner_id:
          ownerId,

        key:
          period.key,

        label:
          period.label,

        year:
          period.year,

        month:
          period.month,

        targets,

        created_at:
          period.createdAt,

        updated_at:
          period.updatedAt,
      });

  if (error) {
    throw error;
  }
}

async function insertHydrationTest(
  test: HydrationTest,
  playerIdMap: Map<
    number,
    number
  >,
  ownerId: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const entries =
    test.entries.map(
      (entry) => ({
        ...entry,

        playerId:
          entry.playerId ==
          null
            ? null
            : requireMappedPlayer(
                playerIdMap,
                entry.playerId,
              ),
      }),
    );

  const {
    error,
  } =
    await supabase
      .from(
        "hydration_tests",
      )
      .insert({
        owner_id:
          ownerId,

        date:
          test.date,

        round:
          test.round,

        rival:
          test.rival,

        day_type:
          test.dayType,

        context:
          test.context,

        custom_context:
          test.customContext,

        entries,

        created_at:
          test.createdAt,

        updated_at:
          test.updatedAt,
      });

  if (error) {
    throw error;
  }
}

async function insertFullAnthropometry(
  anthropometry: FullAnthropometry,
  cloudPlayerId: number,
  cloudControlId: number | null,
  ownerId: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado.",
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "full_anthropometries",
      )
      .insert({
        owner_id:
          ownerId,

        player_id:
          cloudPlayerId,

        date:
          anthropometry.date,

        measurement_number:
          anthropometry.measurementNumber,

        sport:
          anthropometry.sport,

        physical_activity:
          anthropometry.physicalActivity,

        activity_type:
          anthropometry.activityType,

        sex:
          anthropometry.sex,

        birth_date:
          anthropometry.birthDate,

        age_years:
          anthropometry.ageYears,

        measures:
          anthropometry.measures,

        bone_reference_kg:
          anthropometry.boneReferenceKg,

        results:
          anthropometry.results,

        linked_control_id:
          cloudControlId,

        source:
          anthropometry.source,

        source_file_name:
          anthropometry.sourceFileName,

        source_sheet_name:
          anthropometry.sourceSheetName,

        source_player_name:
          anthropometry.sourcePlayerName,

        notes:
          anthropometry.notes,

        created_at:
          anthropometry.createdAt,

        updated_at:
          anthropometry.updatedAt,
      });

  if (error) {
    throw error;
  }
}

export async function migrateLocalDataToSupabase(
  onProgress?: (
    message: string,
  ) => void,
): Promise<MigrationResult> {
  const user =
    await requireUser();

  const ownerId =
    user.id;

  /*
   * Seguridad:
   *
   * si ya existen datos en Supabase,
   * no hacemos nada.
   */
  onProgress?.(
    "Verificando la nube...",
  );

  await ensureCloudIsEmpty();

  /*
   * Leer todos los datos locales.
   */
  onProgress?.(
    "Leyendo datos locales...",
  );

  const local =
    await readAll();

  const totalLocal =
    local.players.length +
    local.controls.length +
    local.weightRecords.length +
    local.objectivePeriods.length +
    local.hydrationTests.length +
    local.fullAnthropometries.length;

  if (
    totalLocal === 0
  ) {
    throw new Error(
      "No hay datos locales para migrar.",
    );
  }

  const playerIdMap =
    new Map<
      number,
      number
    >();

  const controlIdMap =
    new Map<
      number,
      number
    >();

  try {
    /* ========================================================
       JUGADORAS
    ======================================================== */

    onProgress?.(
      "Subiendo jugadoras...",
    );

    for (
      const player
      of local.players
    ) {
      const cloudId =
        await insertPlayer(
          player as PlayerProfile,
          ownerId,
        );

      if (
        player.id != null
      ) {
        playerIdMap.set(
          player.id,
          cloudId,
        );
      }
    }

    /* ========================================================
       CONTROLES
    ======================================================== */

    onProgress?.(
      "Subiendo controles antropométricos...",
    );

    for (
      const control
      of local.controls
    ) {
      const cloudPlayerId =
        requireMappedPlayer(
          playerIdMap,
          control.playerId,
        );

      const cloudControlId =
        await insertControl(
          control,
          cloudPlayerId,
          ownerId,
        );

      if (
        control.id != null
      ) {
        controlIdMap.set(
          control.id,
          cloudControlId,
        );
      }
    }

    /* ========================================================
       PESAJES
    ======================================================== */

    onProgress?.(
      "Subiendo pesajes...",
    );

    for (
      const record
      of local.weightRecords
    ) {
      await insertWeightRecord(
        record,

        requireMappedPlayer(
          playerIdMap,
          record.playerId,
        ),

        ownerId,
      );
    }

    /* ========================================================
       OBJETIVOS
    ======================================================== */

    onProgress?.(
      "Subiendo objetivos...",
    );

    for (
      const period
      of local.objectivePeriods
    ) {
      await insertObjectivePeriod(
        period,
        playerIdMap,
        ownerId,
      );
    }

    /* ========================================================
       HIDRATACIÓN
    ======================================================== */

    onProgress?.(
      "Subiendo tests de hidratación...",
    );

    for (
      const test
      of local.hydrationTests
    ) {
      await insertHydrationTest(
        test,
        playerIdMap,
        ownerId,
      );
    }

    /* ========================================================
       ANTROPOMETRÍAS COMPLETAS
    ======================================================== */

    onProgress?.(
      "Subiendo antropometrías completas...",
    );

    for (
      const anthropometry
      of local.fullAnthropometries
    ) {
      const cloudPlayerId =
        requireMappedPlayer(
          playerIdMap,
          anthropometry.playerId,
        );

      const cloudControlId =
        anthropometry.linkedControlId ==
        null
          ? null
          : controlIdMap.get(
              anthropometry.linkedControlId,
            ) ??
            null;

      await insertFullAnthropometry(
        anthropometry,
        cloudPlayerId,
        cloudControlId,
        ownerId,
      );
    }

    onProgress?.(
      "Verificando datos subidos...",
    );

    const result: MigrationResult = {
      players:
        await countCloudRows(
          "players",
        ),

      controls:
        await countCloudRows(
          "controls",
        ),

      weightRecords:
        await countCloudRows(
          "weight_records",
        ),

      objectivePeriods:
        await countCloudRows(
          "objective_periods",
        ),

      hydrationTests:
        await countCloudRows(
          "hydration_tests",
        ),

      fullAnthropometries:
        await countCloudRows(
          "full_anthropometries",
        ),
    };

    /*
     * Validación final.
     */
    if (
      result.players !==
        local.players.length ||
      result.controls !==
        local.controls.length ||
      result.weightRecords !==
        local.weightRecords.length ||
      result.objectivePeriods !==
        local.objectivePeriods.length ||
      result.hydrationTests !==
        local.hydrationTests.length ||
      result.fullAnthropometries !==
        local.fullAnthropometries.length
    ) {
      throw new Error(
        "La cantidad de datos subida no coincide con la base local.",
      );
    }

    onProgress?.(
      "Migración terminada correctamente.",
    );

    return result;
  } catch (error) {
    /*
     * Como verificamos al principio que
     * la nube estaba vacía, si algo falla
     * limpiamos únicamente lo que esta
     * migración pudo haber agregado.
     *
     * La base local NO se toca.
     */
    onProgress?.(
      "Ocurrió un error. Revirtiendo la migración...",
    );

    await cleanupCloud(
      ownerId,
    );

    throw new Error(
      `No se pudo completar la migración: ${errorMessage(
        error,
      )}`,
    );
  }
}
