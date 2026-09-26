import { createFileRoute } from "@tanstack/react-router";
import {
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

  return (
    <AppLayout
      title="Importar / Exportar"
      subtitle="Administración y copia de seguridad completa de los datos locales"
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
            Estos datos todavía están guardados localmente en este dispositivo.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          <Upload className="h-6 w-6 text-accent" />

          <h2 className="mt-3 font-display text-xl font-semibold">
            Importar base completa
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Reemplaza los datos actuales por una copia de seguridad completa de la aplicación.
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
            disabled={importing}
          >
            <Upload className="h-4 w-4" />

            {importing
              ? "Importando..."
              : "Seleccionar backup"}
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            Esta opción reemplaza toda la base actual.
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
              importingWeights
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
          >
            <Download className="h-4 w-4" />
            Backup JSON completo
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              void exportXLSX()
            }
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              void exportCSV()
            }
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
        <p className="text-sm font-semibold">
          Importante
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          La información todavía vive en este navegador/dispositivo. Antes de migrarla a Supabase vamos a generar este Backup JSON completo para tener una copia de seguridad independiente.
        </p>
      </div>
    </AppLayout>
  );
}
