import { createFileRoute } from "@tanstack/react-router";
import {
  CloudUpload,
  Database,
  Download,
  FileSpreadsheet,
  Scale,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";

import {
  exportCSV,
  exportJSON,
  exportXLSX,
  importBackup,
} from "@/lib/backup";

import {
  importWeightHistory,
} from "@/lib/import-weights";

import {
  useControls,
  useFullAnthropometries,
  useHydrationTests,
  useObjectivePeriods,
  usePlayers,
  useWeightRecords,
} from "@/lib/hooks";

import {
  migrateLocalDataToSupabase,
} from "@/lib/migrate-to-supabase";

export const Route =
  createFileRoute("/datos")({
    component: () => (
      <ClientOnly>
        <Datos />
      </ClientOnly>
    ),
  });

function Datos() {
  const players =
    usePlayers();

  const controls =
    useControls();

  const weightRecords =
    useWeightRecords();

  const objectivePeriods =
    useObjectivePeriods();

  const hydrationTests =
    useHydrationTests();

  const fullAnthropometries =
    useFullAnthropometries();

  const fileRef =
    useRef<HTMLInputElement>(
      null,
    );

  const weightFileRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    importing,
    setImporting,
  ] = useState(false);

  const [
    importingWeights,
    setImportingWeights,
  ] = useState(false);

  const [
    migrating,
    setMigrating,
  ] = useState(false);

  const [
    migrationProgress,
    setMigrationProgress,
  ] = useState<string | null>(
    null,
  );

  async function importar(
    file: File,
  ) {
    const confirmar =
      window.confirm(
        `Vas a reemplazar la base actual por los datos de "${file.name}".\n\n` +
          `Actualmente hay:\n` +
          `• ${players?.length ?? 0} jugadoras\n` +
          `• ${controls?.length ?? 0} controles\n` +
          `• ${weightRecords?.length ?? 0} pesajes\n` +
          `• ${objectivePeriods?.length ?? 0} períodos de objetivos\n` +
          `• ${hydrationTests?.length ?? 0} tests de hidratación\n` +
          `• ${fullAnthropometries?.length ?? 0} antropometrías completas\n\n` +
          `¿Querés continuar?`,
      );

    if (!confirmar) {
      if (fileRef.current) {
        fileRef.current.value =
          "";
      }

      return;
    }

    try {
      setImporting(true);

      const result =
        await importBackup(
          file,
          "replace",
        );

      window.alert(
        `Importación terminada correctamente.\n\n` +
          `Jugadoras: ${result.players}\n` +
          `Controles: ${result.controls}\n` +
          `Pesajes: ${result.weightRecords}\n` +
          `Objetivos: ${result.objectivePeriods}\n` +
          `Tests de hidratación: ${result.hydrationTests}\n` +
          `Antropometrías completas: ${result.fullAnthropometries}`,
      );

      window.location.href =
        "/";
    } catch (error) {
      console.error(
        error,
      );

      window.alert(
        "No se pudo importar el archivo. Verificá que sea un backup válido de esta aplicación.",
      );
    } finally {
      setImporting(false);

      if (fileRef.current) {
        fileRef.current.value =
          "";
      }
    }
  }

  async function importarPesajes(
    file: File,
  ) {
    const confirmar =
      window.confirm(
        `Vas a importar el historial de pesajes desde "${file.name}".\n\n` +
          `Esto NO borra tus jugadoras ni los controles antropométricos.\n\n` +
          `Los pesajes ya existentes para la misma jugadora y fecha se actualizarán.\n\n` +
          `¿Querés continuar?`,
      );

    if (!confirmar) {
      if (
        weightFileRef.current
      ) {
        weightFileRef.current.value =
          "";
      }

      return;
    }

    try {
      setImportingWeights(
        true,
      );

      const result =
        await importWeightHistory(
          file,
        );

      let message =
        `Importación de pesajes terminada.\n\n` +
        `Registros del archivo: ${result.total}\n` +
        `Nuevos: ${result.created}\n` +
        `Actualizados: ${result.updated}\n` +
        `Omitidos: ${result.skipped}`;

      if (
        result.unmatched.length >
        0
      ) {
        message +=
          `\n\nJugadoras no encontradas:\n` +
          result.unmatched.join(
            "\n",
          );
      }

      window.alert(
        message,
      );

      window.location.href =
        "/pesajes";
    } catch (error) {
      console.error(
        error,
      );

      window.alert(
        "No se pudo importar el historial de pesajes. Verificá que sea el archivo JSON preparado para Pesajes.",
      );
    } finally {
      setImportingWeights(
        false,
      );

      if (
        weightFileRef.current
      ) {
        weightFileRef.current.value =
          "";
      }
    }
  }

  async function migrarANube() {
    const totalLocal =
      (players?.length ?? 0) +
      (controls?.length ?? 0) +
      (weightRecords?.length ?? 0) +
      (objectivePeriods?.length ?? 0) +
      (hydrationTests?.length ?? 0) +
      (fullAnthropometries?.length ?? 0);

    if (
      totalLocal === 0
    ) {
      window.alert(
        "No hay datos locales para subir.",
      );

      return;
    }

    const confirmar =
      window.confirm(
        `Vas a copiar la base local completa a Supabase.\n\n` +
          `Se van a subir:\n` +
          `• ${players?.length ?? 0} jugadoras\n` +
          `• ${controls?.length ?? 0} controles\n` +
          `• ${weightRecords?.length ?? 0} pesajes\n` +
          `• ${objectivePeriods?.length ?? 0} períodos de objetivos\n` +
          `• ${hydrationTests?.length ?? 0} tests de hidratación\n` +
          `• ${fullAnthropometries?.length ?? 0} antropometrías completas\n\n` +
          `Tus datos locales NO se van a borrar.\n\n` +
          `¿Ya descargaste el Backup JSON completo y querés continuar?`,
      );

    if (!confirmar) {
      return;
    }

    try {
      setMigrating(true);

      setMigrationProgress(
        "Preparando migración...",
      );

      const result =
        await migrateLocalDataToSupabase(
          (message) => {
            setMigrationProgress(
              message,
            );
          },
        );

      setMigrationProgress(
        "Migración terminada correctamente.",
      );

      window.alert(
        `Datos subidos correctamente a Supabase.\n\n` +
          `Jugadoras: ${result.players}\n` +
          `Controles: ${result.controls}\n` +
          `Pesajes: ${result.weightRecords}\n` +
          `Objetivos: ${result.objectivePeriods}\n` +
          `Tests de hidratación: ${result.hydrationTests}\n` +
          `Antropometrías completas: ${result.fullAnthropometries}\n\n` +
          `La base local sigue intacta.`,
      );
    } catch (error) {
      console.error(
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido.";

      setMigrationProgress(
        null,
      );

      window.alert(
        `No se pudo completar la migración.\n\n${message}\n\nLa base local no fue modificada.`,
      );
    } finally {
      setMigrating(false);
    }
  }

  return (
    <AppLayout
      title="Importar / Exportar"
      subtitle="Administración y copia de seguridad completa de los datos"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          <Database className="h-6 w-6 text-accent" />

          <h2 className="mt-3 font-display text-xl font-semibold">
            Base actual
          </h2>

          <div className="mt-4 grid gap-3">
            <div className="rounded-md bg-muted p-3">
              <p className="panel-title text-xs text-muted-foreground">
                Jugadoras
              </p>

              <p className="numeric mt-1 text-2xl font-bold">
                {players?.length ??
                  "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="panel-title text-xs text-muted-foreground">
                Controles antropométricos
              </p>

              <p className="numeric mt-1 text-2xl font-bold">
                {controls?.length ??
                  "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="panel-title text-xs text-muted-foreground">
                Registros de pesaje
              </p>

              <p className="numeric mt-1 text-2xl font-bold">
                {weightRecords?.length ??
                  "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="panel-title text-xs text-muted-foreground">
                Períodos de objetivos
              </p>

              <p className="numeric mt-1 text-2xl font-bold">
                {objectivePeriods?.length ??
                  "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="panel-title text-xs text-muted-foreground">
                Tests de hidratación
              </p>

              <p className="numeric mt-1 text-2xl font-bold">
                {hydrationTests?.length ??
                  "—"}
              </p>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="panel-title text-xs text-muted-foreground">
                Antropometrías completas
              </p>

              <p className="numeric mt-1 text-2xl font-bold">
                {fullAnthropometries?.length ??
                  "—"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Estos números corresponden a la base local de este dispositivo.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          <Upload className="h-6 w-6 text-accent" />

          <h2 className="mt-3 font-display text-xl font-semibold">
            Importar base completa
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Reemplaza los datos locales actuales por una copia de seguridad completa de la aplicación.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file =
                e.target.files?.[0];

              if (file) {
                void importar(
                  file,
                );
              }
            }}
          />

          <Button
            className="mt-4"
            onClick={() =>
              fileRef.current?.click()
            }
            disabled={
              importing ||
              migrating
            }
          >
            <Upload className="h-4 w-4" />

            {importing
              ? "Importando..."
              : "Seleccionar backup"}
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            Esta opción reemplaza toda la base local actual.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          <Scale className="h-6 w-6 text-accent" />

          <h2 className="mt-3 font-display text-xl font-semibold">
            Importar historial de pesajes
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Agrega el historial de pesajes sin borrar las jugadoras ni los controles antropométricos.
          </p>

          <input
            ref={weightFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file =
                e.target.files?.[0];

              if (file) {
                void importarPesajes(
                  file,
                );
              }
            }}
          />

          <Button
            className="mt-4"
            variant="outline"
            onClick={() =>
              weightFileRef.current?.click()
            }
            disabled={
              importingWeights ||
              migrating
            }
          >
            <Scale className="h-4 w-4" />

            {importingWeights
              ? "Importando pesajes..."
              : "Importar pesajes"}
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            Si una jugadora y fecha ya existen, ese registro se actualiza.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-panel">
        <Download className="h-6 w-6 text-accent" />

        <h2 className="mt-3 font-display text-xl font-semibold">
          Exportar / Backup
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          El Backup JSON guarda una copia completa de la base local: jugadoras, controles antropométricos, pesajes, objetivos, tests de hidratación y antropometrías completas de 5 componentes.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              void exportJSON()
            }
            disabled={migrating}
          >
            <Download className="h-4 w-4" />
            Backup JSON completo
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              void exportXLSX()
            }
            disabled={migrating}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              void exportCSV()
            }
            disabled={migrating}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/30 bg-card p-5 shadow-panel">
        <CloudUpload className="h-7 w-7 text-primary" />

        <h2 className="mt-3 font-display text-xl font-semibold">
          Migrar datos a la nube
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Copia toda la información de este dispositivo a tu base segura de Supabase.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Esta operación no borra ni modifica los datos locales. Si Supabase ya contiene información, la migración se detiene automáticamente para evitar duplicados.
        </p>

        <Button
          className="mt-4"
          onClick={() =>
            void migrarANube()
          }
          disabled={
            migrating ||
            players == null ||
            controls == null ||
            weightRecords == null ||
            objectivePeriods == null ||
            hydrationTests == null ||
            fullAnthropometries == null
          }
        >
          <CloudUpload className="h-4 w-4" />

          {migrating
            ? "Subiendo datos..."
            : "Subir datos a Supabase"}
        </Button>

        {migrationProgress && (
          <div className="mt-4 rounded-md bg-muted p-3">
            <p className="text-sm font-medium">
              {migrationProgress}
            </p>

            {migrating && (
              <p className="mt-1 text-xs text-muted-foreground">
                No cierres esta pestaña hasta que termine.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-sm font-semibold">
          Importante
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Ya tenés un Backup JSON completo guardado. La migración a Supabase crea una copia en la nube y mantiene intacta la base local hasta que verifiquemos que todo se haya transferido correctamente.
        </p>
      </div>
    </AppLayout>
  );
}
