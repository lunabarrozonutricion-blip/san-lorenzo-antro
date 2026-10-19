import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { metricValue } from "@/lib/calc";
import { useControls, useObjectivePeriods, usePlayers } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";

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
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setMessage("Se requiere conexión con Supabase para guardar excepciones."); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setMessage("Iniciá sesión para guardar las multas."); return; }
      setOwnerId(user.id);
      const { data, error } = await supabase.from("player_fine_adjustments").select("*").eq("owner_id", user.id).eq("period_key", MONTH);
      if (!active) return;
      if (error) { setMessage("No se pudieron recuperar las excepciones: " + error.message); return; }
      const values = (data ?? []) as Adjustment[];
      setAdjustments(values);
      setDrafts(Object.fromEntries(values.map(a => [a.player_id, { exempt: a.exempt, manual: a.manual_amount == null ? "" : String(a.manual_amount), note: a.note }])));
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
  const update = (id: number, patch: Partial<Draft>, previous: Draft) => setDrafts(current => ({ ...current, [id]: { ...previous, ...patch } }));
  async function save(id: number, draft: Draft) {
    if (!supabase || !ownerId) { setMessage("Iniciá sesión para guardar."); return; }
    const amount = draft.manual.trim() === "" ? null : Number(draft.manual);
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) { setMessage("El importe manual debe ser cero o positivo."); return; }
    setSaving(id); setMessage("");
    const payload = { owner_id: ownerId, period_key: MONTH, player_id: id, exempt: draft.exempt, manual_amount: amount, note: draft.note, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("player_fine_adjustments").upsert(payload, { onConflict: "owner_id,period_key,player_id" }).select().single();
    setSaving(null);
    if (error) { setMessage("No se guardó la excepción: " + error.message); return; }
    setAdjustments(current => [...current.filter(a => a.player_id !== id), data as Adjustment]);
    setMessage("Cambio guardado correctamente.");
  }
  return <AppLayout title="Multas" subtitle="Octubre 2026 · Sum6 y objetivos del plantel">
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-xl font-bold">Multas · Octubre 2026</h2>
        <p className="mt-1 text-sm text-muted-foreground">Primer milímetro de diferencia sin cargo; cada mm adicional: {money(PRICE)}. Los medios milímetros se cobran proporcionalmente.</p>
        <p className="mt-2 text-sm">Sin medición u objetivo, no se calcula una multa automática. Podés asignar un importe manual o marcar exenta.</p>
        <p className="mt-3 text-lg font-semibold">Total a cobrar: {money(total)}</p>
        <p className="text-xs text-muted-foreground">Incluye los importes manuales y excluye las jugadoras exentas. No modifica controles ni objetivos.</p>
      </div>
      {message && <p role="status" className="rounded-md border p-3 text-sm">{message}</p>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-muted/50"><tr>{["Jugadora","Sum6 octubre","Objetivo octubre","Δ (mm)","Multa calculada","Exenta","Importe manual ($)","Observación","Multa final","Guardar"].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.player.id} className="border-t">
            <td className="px-3 py-3 font-medium">{row.player.name}</td>
            <td className="px-3 py-3">{mm(row.current)}</td>
            <td className="px-3 py-3">{mm(row.target)}</td>
            <td className="px-3 py-3">{row.difference == null ? "—" : (row.difference > 0 ? "+" : "") + mm(row.difference)}</td>
            <td className="px-3 py-3">{row.calculated == null ? "—" : money(row.calculated)}</td>
            <td className="px-3 py-3"><input aria-label={`Exenta: ${row.player.name}`} type="checkbox" checked={row.draft.exempt} onChange={e => update(row.player.id!, {exempt:e.target.checked}, row.draft)} /></td>
            <td className="px-3 py-3"><input aria-label={`Importe manual: ${row.player.name}`} type="number" min="0" step="1000" placeholder="Automático" className="w-32 rounded border bg-background p-2" value={row.draft.manual} onChange={e => update(row.player.id!, {manual:e.target.value}, row.draft)} /></td>
            <td className="px-3 py-3"><input aria-label={`Observación: ${row.player.name}`} className="w-44 rounded border bg-background p-2" placeholder="Motivo / aclaración" value={row.draft.note} onChange={e => update(row.player.id!, {note:e.target.value}, row.draft)} /></td>
            <td className="px-3 py-3 font-semibold">{row.payable == null ? "—" : money(row.payable)}</td>
            <td className="px-3 py-3"><button type="button" disabled={saving === row.player.id} className="rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50" onClick={() => void save(row.player.id!,row.draft)}>{saving === row.player.id ? "Guardando" : "Guardar"}</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </AppLayout>;
}
