import { FileSpreadsheet } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDate } from "@/lib/calc";
import { nowISO, upsertHydrationTest } from "@/lib/db";
import {
  buildPreview,
  findExisting,
  readWorkbook,
  testFromBlock,
  type PreviewBlock,
} from "@/lib/hydration-excel-import";
import type { HydrationTest, Player } from "@/lib/types";

export function HydrationExcelImport({
  players,
  tests,
}: {
  players: Player[] | undefined;
  tests: HydrationTest[] | undefined;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [blocks, setBlocks] = useState<PreviewBlock[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const sheets = await readWorkbook(file);
      const b = buildPreview(sheets, players ?? [], tests ?? []);
      setFileName(file.name);
      setBlocks(b);
      setDates(Object.fromEntries(b.map((x) => [x.key, x.date])));
      setSelected(Object.fromEntries(b.map((x) => [x.key, x.existingTestId == null && !!x.date])));
      setOpen(true);
    } catch {
      toast.error("No se pudo leer el archivo Excel.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const resolved = useMemo(
    () =>
      blocks.map((b) => {
        const date = dates[b.key] ?? b.date;
        const existingTestId = findExisting(date, b.side, tests ?? []);
        return { ...b, date, existingTestId };
      }),
    [blocks, dates, tests],
  );

  // Pre y post de la misma fecha son contextos distintos; dentro del archivo
  // no puede haber dos bloques con mismo día + contexto.
  const conflictKeys = useMemo(() => {
    const seen = new Map<string, string>();
    const out = new Set<string>();
    for (const b of resolved) {
      if (!selected[b.key] || !b.date) continue;
      const k = `${b.date}|${b.side}`;
      if (seen.has(k)) out.add(b.key);
      else seen.set(k, b.key);
    }
    return out;
  }, [resolved, selected]);

  const importable = resolved.filter(
    (b) => selected[b.key] && b.date && b.existingTestId == null && !conflictKeys.has(b.key),
  );

  async function confirmImport() {
    if (importable.length === 0) return;
    const total = importable.reduce((n: number, b) => n + testFromBlock(b, "").entries.length, 0);
    if (!window.confirm(`Se crearán ${importable.length} test(s) nuevos con ${total} registro(s) vinculados. Los tests existentes no se modifican. ¿Confirmar?`)) return;
    setImporting(true);
    try {
      for (const b of importable) {
        await upsertHydrationTest(testFromBlock(b, nowISO()));
      }
      toast.success(`Importados ${importable.length} test(s).`);
      setOpen(false);
      setBlocks([]);
    } catch {
      toast.error("Error al importar. Revisá los datos.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        aria-label="Archivo Excel de hidratación"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={!players}
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Importar Excel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa de importación</DialogTitle>
            <DialogDescription>
              {fileName} · Todavía no se guardó nada. Revisá fechas y anomalías, elegí qué hojas importar y confirmá.
            </DialogDescription>
          </DialogHeader>

          {resolved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron datos en el formato esperado (A:D pre entreno, F:I post entreno).</p>
          ) : (
            <div className="space-y-3">
              {resolved.map((b) => {
                const linked = b.rows.filter((r) => r.playerId != null && !r.duplicateInSheet).length;
                const blocked = b.existingTestId != null || !b.date || conflictKeys.has(b.key);
                return (
                  <div key={b.key} className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={!!selected[b.key]}
                          onChange={(e) => setSelected((s) => ({ ...s, [b.key]: e.target.checked }))}
                        />
                        {b.sheetName} · {b.side === "pre" ? "Pre entreno" : "Post entreno"}
                      </label>
                      <input
                        type="date"
                        aria-label="Fecha del test"
                        value={b.date}
                        onChange={(e) => setDates((d) => ({ ...d, [b.key]: e.target.value }))}
                        className="h-8 rounded-md border border-input bg-background px-2"
                      />
                      <span className="text-muted-foreground">
                        {b.dateSource}
                        {b.round != null ? ` · Fecha ${b.round}` : ""}
                        {b.rival ? ` · vs ${b.rival}` : ""}
                      </span>
                      <span className="ml-auto text-muted-foreground">
                        {linked} vinculadas / {b.rows.length} filas
                      </span>
                    </div>

                    {(b.warnings.length > 0 || conflictKeys.has(b.key)) && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-destructive">
                        {b.warnings
                          .filter((w) => !w.startsWith("Ya existe") && !(b.date && w.startsWith("La hoja no tiene fecha")))
                          .map((w) => <li key={w}>{w}</li>)}
                        {b.existingTestId != null && (
                          <li>Ya existe un test el {fmtDate(b.date)} con este contexto: no se importará.</li>
                        )}
                        {conflictKeys.has(b.key) && <li>Otra hoja seleccionada tiene la misma fecha y contexto.</li>}
                      </ul>
                    )}
                    {selected[b.key] && blocked && (
                      <p className="mt-1 text-xs text-muted-foreground">Esta hoja quedará fuera de la importación hasta resolver lo indicado.</p>
                    )}

                    <button
                      type="button"
                      className="mt-2 text-xs text-primary underline"
                      onClick={() => setExpanded(expanded === b.key ? null : b.key)}
                    >
                      {expanded === b.key ? "Ocultar filas" : "Ver filas"}
                    </button>

                    {expanded === b.key && (
                      <table className="mt-2 w-full text-xs">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="py-1">Fila</th>
                            <th>Excel</th>
                            <th>Jugadora</th>
                            <th>Valor</th>
                            <th>Observación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {b.rows.map((r) => (
                            <tr key={r.rowNumber} className="border-t border-border">
                              <td className="py-1">{r.rowNumber}</td>
                              <td>{r.rawName}</td>
                              <td className={r.playerId == null || r.duplicateInSheet ? "text-destructive" : ""}>
                                {r.playerId == null ? "Sin vincular" : r.duplicateInSheet ? "Repetida" : r.playerName}
                              </td>
                              <td className={r.invalid ? "font-semibold text-destructive" : ""}>
                                {r.invalid ? `${r.rawValue} (inválido)` : r.value ?? "—"}
                              </td>
                              <td>{r.observation ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={importing || importable.length === 0} onClick={() => void confirmImport()}>
              {importing ? "Importando..." : `Confirmar importación (${importable.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
