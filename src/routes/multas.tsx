import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { metricValue } from "@/lib/calc";
import { useControls, useObjectivePeriods, usePlayers } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";

export const Route = createFileRoute("/multas")({
  component: () => <ClientOnly><Multas /></ClientOnly>,
});

type Adjustment = { id?: number; owner_id: string; period_key: string; player_id: number; exempt: boolean; manual_amount: number | null; note: string };
type Draft = { exempt: boolean; manual: string; note: string };
const MONTH = "2026-10";
const PRICE = 50000;
const money = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const mm = (n: number | null) => n == null ? "—" : n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
function Multas() {
  const players = usePlayers();
  const controls = useControls();
  const periods = useObjectivePeriods();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [onlyPaying, setOnlyPaying] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      const local = await db().fineAdjustments.where("period_key").equals(MONTH).toArray();
      if (!active) return;
      setAdjustments(local.map(a => ({ ...a, owner_id: "" })));
      setDrafts(Object.fromEntries(local.map(a => [a.player_id, { exempt: a.exempt, manual: a.manual_amount == null ? "" : String(a.manual_amount), note: a.note }])));
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) return;
      setOwnerId(user.id);
      const { data, error } = await supabase.from("player_fine_adjustments").select("*").eq("owner_id", user.id).eq("period_key", MONTH);
      if (!active) return;
      if (error) return;
      const values = (data ?? []) as Adjustment[];
      const missing = values.filter(a => !local.some(l => l.player_id === a.player_id));
      if (missing.length) {
        await db().fineAdjustments.bulkPut(missing.map(a => ({ key: `${MONTH}:${a.player_id}`, period_key: MONTH, player_id: a.player_id, exempt: a.exempt, manual_amount: a.manual_amount, note: a.note, updated_at: new Date().toISOString() })));
        setAdjustments(current => [...current, ...missing]);
        setDrafts(current => ({...Object.fromEntries(missing.map(a => [a.player_id, { exempt: a.exempt, manual: a.manual_amount == null ? "" : String(a.manual_amount), note: a.note }])), ...current}));
      }
    }
    void load();
    return () => { active = false; };
  }, []);
  const rows = useMemo(() => {
    const period = periods?.find(p => p.key === MONTH);
    return (players ?? []).filter(p => p.id != null).map(player => {
      const playerControls = (controls ?? []).filter(c => c.playerId === player.id && c.date.startsWith(MONTH) && metricValue(c, "sum6") != null).sort((a,b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
      const control = playerControls[0];
      const current = control ? metricValue(control, "sum6") : null;
      const target = period?.targets.find(t => t.playerId === player.id)?.target ?? null;
      const difference = current != null && target != null ? current - target : null;
      const calculated = difference == null ? null : Math.max(0, difference - 1) * PRICE;
      const saved = adjustments.find(a => a.player_id === player.id);
      const draft = drafts[player.id!] ?? { exempt: saved?.exempt ?? false, manual: saved?.manual_amount == null ? "" : String(saved.manual_amount), note: saved?.note ?? "" };
      const manualAmount = draft.manual.trim() === "" ? null : Number(draft.manual);
      const payable = draft.exempt ? 0 : manualAmount != null && Number.isFinite(manualAmount) && manualAmount >= 0 ? manualAmount : calculated;
      return { player, current, target, difference, calculated, payable, draft, date: control?.date ?? null };
    });
  }, [players, controls, periods, adjustments, drafts]);
  const total = rows.reduce((sum, row) => sum + (row.payable ?? 0), 0);
  const visibleRows = onlyPaying ? rows.filter(row => row.payable != null && row.payable > 0) : rows;
  const shareText = () => {
    const payableRows = visibleRows.filter(row => row.payable != null && row.payable > 0);
    return [
      "SAN LORENZO · MULTAS SUM6 · OCTUBRE 2026",
      "",
      ...payableRows.map(row => `${row.player.name}: ${money(row.payable!)} (Sum6 ${mm(row.current)} mm; objetivo ${mm(row.target)} mm; Δ ${mm(row.difference)} mm)`),
      "",
      `Total a cobrar: ${money(payableRows.reduce((sum, row) => sum + (row.payable ?? 0), 0))}`,
      onlyPaying ? "Listado filtrado: solo jugadoras que deben pagar." : "Listado de jugadoras con importe a cobrar."
    ].join("\n");
  };
  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener,noreferrer");
  };
  const printReport = () => {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
    const selectedTotal = visibleRows.reduce((sum, row) => sum + (row.payable ?? 0), 0);
    const report = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Multas Sum6 - Octubre 2026</title><style>
      body{font-family:Arial,sans-serif;color:#132b50;margin:28px}h1{font-size:22px;margin-bottom:4px}.sub{color:#65748b;font-size:12px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:11px}th{background:#eaf0f7;text-align:left}td,th{border-bottom:1px solid #d8e0ea;padding:8px 5px}td.num{text-align:right}
      .total{margin-top:20px;text-align:right;font-size:18px;font-weight:bold}.note{font-size:11px;color:#536174;margin-top:14px}
      @page{size:A4 landscape;margin:14mm}
    </style></head><body><h1>San Lorenzo de Almagro · Multas Sum6</h1><div class="sub">Octubre 2026 · ${onlyPaying ? "Solo jugadoras que deben pagar" : "Todas las jugadoras"} · Generado el ${new Date().toLocaleDateString("es-AR")}</div>
    <table><thead><tr><th>Jugadora</th><th>Sum6 octubre</th><th>Objetivo octubre</th><th>Δ (mm)</th><th>Multa a cobrar</th><th>Estado</th><th>Observación</th></tr></thead><tbody>
    ${visibleRows.map(row => `<tr><td>${escapeHtml(row.player.name)}</td><td>${mm(row.current)}</td><td>${mm(row.target)}</td><td>${row.difference == null ? "—" : mm(row.difference)}</td><td>${row.payable == null ? "—" : money(row.payable)}</td><td>${row.draft.exempt ? "No paga" : "Paga"}</td><td>${escapeHtml(row.draft.note)}</td></tr>`).join("")}
    </tbody></table><div class="total">Total a cobrar: ${money(selectedTotal)}</div><p class="note">Primer milímetro por encima del objetivo sin cargo; $50.000 por mm adicional. Los importes pueden incluir ajustes manuales.</p></body></html>`;
    const popup = window.open("", "_blank");
    if (!popup) { setMessage("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes e intentá nuevamente."); return; }
    popup.document.open(); popup.document.write(report); popup.document.close(); popup.focus();
    popup.addEventListener("load", () => popup.print(), { once: true });
  };
  const update = (id: number, patch: Partial<Draft>, previous: Draft) => setDrafts(current => ({ ...current, [id]: { ...previous, ...patch } }));
  async function save(id: number, draft: Draft) {
    const amount = draft.manual.trim() === "" ? null : Number(draft.manual);
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) { setMessage("El importe manual debe ser cero o positivo."); return; }
    setSaving(id); setMessage("");
    try {
      const local = { key: `${MONTH}:${id}`, period_key: MONTH, player_id: id, exempt: draft.exempt, manual_amount: amount, note: draft.note, updated_at: new Date().toISOString() };
      await db().fineAdjustments.put(local);
      setAdjustments(current => [...current.filter(a => a.player_id !== id), { ...local, owner_id: ownerId ?? "" }]);
      setMessage("Multa guardada en este dispositivo.");
      if (supabase && ownerId) {
        const { error } = await supabase.from("player_fine_adjustments").upsert({ owner_id: ownerId, period_key: MONTH, player_id: id, exempt: draft.exempt, manual_amount: amount, note: draft.note, updated_at: local.updated_at }, { onConflict: "owner_id,period_key,player_id" });
        if (error) setMessage("Guardada en este dispositivo. No se pudo sincronizar con la nube: " + error.message);
        else setMessage("Multa guardada y sincronizada.");
      }
    } catch (error) {
      setMessage("No se pudo guardar la multa: " + String(error));
    } finally {
      setSaving(null);
    }
  }
  return <AppLayout title="Multas" subtitle="Octubre 2026 · Sum6 y objetivos del plantel">
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-xl font-bold">Multas · Octubre 2026</h2>
        <p className="mt-1 text-sm text-muted-foreground">Primer milímetro de diferencia sin cargo; cada mm adicional: {money(PRICE)}. Los medios milímetros se cobran proporcionalmente.</p>
        <p className="mt-2 text-sm">La columna Multa muestra el cálculo automático y permite editarlo directamente. Sin medición u objetivo podés ingresar un importe manual. Para volver al cálculo automático, borrá el importe editado y guardá. También podés seleccionar "No paga" para excluir a una jugadora del total.</p>
        <p className="mt-3 text-lg font-semibold">Total a cobrar: {money(total)}</p>
        <p className="text-xs text-muted-foreground">Incluye importes editados y excluye a quienes tengan estado "No paga". Las excepciones se guardan en este dispositivo y se sincronizan con Supabase si hay sesión. No modifica controles ni objetivos.</p>
      </div>
      {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={onlyPaying} onChange={e => setOnlyPaying(e.target.checked)} /> Mostrar solo las que deben pagar ({rows.filter(row => row.payable != null && row.payable > 0).length})</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={printReport} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Imprimir / Guardar PDF</button>
          <button type="button" onClick={shareWhatsApp} className="rounded border border-primary px-4 py-2 text-sm font-semibold text-primary">Compartir por WhatsApp</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-muted/50"><tr>{["Jugadora","Sum6 octubre","Objetivo octubre","Δ (mm)","Multa ($)","Estado","Observación","Guardar"].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>{visibleRows.map(row => <tr key={row.player.id} className="border-t">
            <td className="px-3 py-3 font-medium">{row.player.name}</td>
            <td className="px-3 py-3">{mm(row.current)}</td>
            <td className="px-3 py-3">{mm(row.target)}</td>
            <td className="px-3 py-3">{row.difference == null ? "—" : (row.difference > 0 ? "+" : "") + mm(row.difference)}</td>
            <td className="px-3 py-3"><input aria-label={`Multa editable: ${row.player.name}`} type="number" min="0" step="any" placeholder="Sin multa automática" className="w-36 rounded border bg-background p-2 font-semibold" value={row.draft.manual !== "" ? row.draft.manual : row.calculated ?? ""} onChange={e => update(row.player.id!, {manual:e.target.value}, row.draft)} /><p className="mt-1 text-xs text-muted-foreground">{row.draft.exempt ? "No paga · excluida del total" : row.draft.manual !== "" ? "Importe editado" : "Cálculo automático"}</p></td>
            <td className="px-3 py-3"><select aria-label={`Estado de pago: ${row.player.name}`} className="rounded border bg-background p-2" value={row.draft.exempt ? "no-paga" : "paga"} onChange={e => update(row.player.id!, {exempt:e.target.value === "no-paga"}, row.draft)}><option value="paga">Paga</option><option value="no-paga">No paga</option></select></td>
            <td className="px-3 py-3"><input aria-label={`Observación: ${row.player.name}`} className="w-44 rounded border bg-background p-2" placeholder="Motivo / aclaración" value={row.draft.note} onChange={e => update(row.player.id!, {note:e.target.value}, row.draft)} /></td>
            <td className="px-3 py-3"><button type="button" disabled={saving === row.player.id} className="rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50" onClick={() => void save(row.player.id!,row.draft)}>{saving === row.player.id ? "Guardando" : "Guardar"}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </AppLayout>;
}
