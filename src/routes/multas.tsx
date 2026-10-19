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
      const septemberControl = (controls ?? []).filter(c => c.playerId === player.id && c.date.startsWith("2026-09") && metricValue(c, "sum6") != null).sort((a,b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))[0];
      const september = septemberControl ? metricValue(septemberControl, "sum6") : null;
      const current = control ? metricValue(control, "sum6") : null;
      const target = period?.targets.find(t => t.playerId === player.id)?.target ?? null;
      const difference = current != null && target != null ? current - target : null;
      const calculated = difference == null ? null : Math.max(0, difference - 1) * PRICE;
      const saved = adjustments.find(a => a.player_id === player.id);
      const draft = drafts[player.id!] ?? { exempt: saved?.exempt ?? false, manual: saved?.manual_amount == null ? "" : String(saved.manual_amount), note: saved?.note ?? "" };
      const manualAmount = draft.manual.trim() === "" ? null : Number(draft.manual);
      const payable = draft.exempt ? 0 : manualAmount != null && Number.isFinite(manualAmount) && manualAmount >= 0 ? manualAmount : calculated;
      return { player, september, current, target, difference, calculated, payable, draft, date: control?.date ?? null };
    });
  }, [players, controls, periods, adjustments, drafts]);
  const total = rows.reduce((sum, row) => sum + (row.payable ?? 0), 0);
  const visibleRows = onlyPaying ? rows.filter(row => row.payable != null && row.payable > 0) : rows;
  const shareWhatsApp = () => {
    const payableRows = visibleRows.filter(row => row.payable != null && row.payable > 0);
    const subtotal = payableRows.reduce((sum, row) => sum + (row.payable ?? 0), 0);
    const summary = [
      "*SAN LORENZO DE ALMAGRO*",
      "*Multas por antropometría · Octubre 2026*",
      "",
      ...payableRows.map(row => `• ${row.player.name}: Septiembre ${mm(row.september)} mm | Objetivo octubre ${mm(row.target)} mm | Octubre ${mm(row.current)} mm | Multa ${money(row.payable!)}`),
      "",
      `*TOTAL A COBRAR: ${money(subtotal)}*`
    ].join("\\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
  };
  const printReport = () => {
    const escapeHtml = (s: string) => s.replace(/[&<>"']/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x] ?? x));
    const selectedTotal = visibleRows.reduce((sum, row) => sum + (row.payable ?? 0), 0);
    const report = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Multas por antropometría - Octubre 2026</title>
    <style>
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#102c52;margin:20px;font-size:11px}
    .header{text-align:center;margin-bottom:22px}.official-crest{display:block;width:75px;height:85px;object-fit:contain;margin:0 auto 8px}.shield{margin:auto;width:58px;height:65px;border:3px solid #0e2d55;border-radius:10px 10px 28px 28px;background:repeating-linear-gradient(90deg,#0e2d55 0 10px,#d51e31 10px 20px);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:15px;text-shadow:1px 1px #0e2d55}
    .stripe{height:5px;background:linear-gradient(90deg,#102e58 0 48%,#cf1f30 48% 52%,#102e58 52%);margin:12px 0}h1{font-size:26px;letter-spacing:1px;text-transform:uppercase;margin:6px 0}h2{font-size:16px;color:#c92031;text-transform:uppercase;margin:4px 0}.meta{color:#63748c;margin-top:9px}
    table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}
    th{background:#102e58;color:white;padding:10px 7px;text-align:left}td{padding:9px 7px;border-bottom:1px solid #d9e1eb;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f2f6fa}
    .num{text-align:right}.player{font-weight:700}.fine{font-weight:700;color:#bd1d2d}.total{text-align:right;margin-top:20px;font-size:18px;font-weight:bold}.total span{background:#eef2f7;border-left:5px solid #c92031;padding:12px 17px;display:inline-block}.total strong{color:#c92031;margin-left:12px}
    .foot{border-top:1px solid #d9e1eb;padding-top:10px;margin-top:25px;color:#52647b;font-size:10px}
    @page{size:A4 landscape;margin:12mm}@media print{body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}th{background:#102e58!important;color:white!important}}
    </style></head><body>
    <header class="header"><img class="official-crest" alt="Escudo San Lorenzo de Almagro" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAABVCAMAAAA2TOkzAAAAYFBMVEUpJEyhDzNNG0NwFjyWm6ra295rdIobJEcZJEpPWXQgJUY5RWUnKDi3usO9wcl8g5UADz5/Hx9VVVUhJT8AAP9VOFV/fwCqqlX/AAD//wAAAAAUI03XCCr7+/rkBigIGEUEpR9UAAAAIHRSTlP4/v7+/v7+YaD+Iv4S/v7+/gMDRAEJAgMBAQD9/v7+/uGsdM8AAAZ+SURBVHjarZmNmqMqDIYjICjV6e6e/8XW+7/LzZcAUsfWzjnHfWZmq/CafIYYUvr5xhGG+M4wegeVEoX/hTWFRDalMP13VhwSdfeO0rmfdGpUMt19AYxCPGP9Hp8O+SNQShYgxrGfQ/zn6U0jWJGGEA/E+DuGQY1iihKZdmjbFAMNwuKRPCa05v0VGUQgMcJggEBB29+ZR+KeKUVmhWRlONHARDkGcBKBJEbJQWzaoiOHdiTJSCOsIeGOncHJepCAmPRwEqeORvJ5mwJYPETmMbCzcvBFnOiYRF0xzFrYJiO7MrLLI1kJsOJAy6JwPpuPRQxVvwqLg8zKqXbkoiPN0qXhJ01E/J9srZpljRG9YETLEr1USVMHir8wZ5goJnMvrFYHvi63bVnLos+yVStfZNcmCpVlxeAux0AyixyPLIbl2aYTsRaTLxqKzLJ5uM2TX7KWwrL5Y2UlsLo8O7OWN1kPo2FPOGHd60esovsJi0N1ecLSEF7LgfDd9HocDc2VRccsjicmjN7h8CM+2O5fscjwXO/6Wzl654mNO9T+hJVWAqj/cB6Hm/HhSms6sgvxPjBrOWatIyb7Syp6XcW4cT2y6yWLjcLEJILxMV5Wr666tH6NtdIss9ZR/MTPPGfdnPh5zDrQa6UPeLNexDheqE544mSvln3W/oHVXHWC8j0fEmDUezgNqy6Avf8cV57GGjOQ3EdKnuf2/pvq5VaG+fUZa7eGaB1vtytQ7Iz7WC+3HqysPZ8bb/1lNQexul+PWMszz+ap0P6ABbPdWtb6fm0/5Bwxa2RPes72h6xEPQ8w+5wTJH9tuRAvAXGOf42rdwesVULNocrY568tR6uaBtqObBtEPmTxHVLfX9IDi3M0s+q7w2YXPdRyNxJZlDWOLUsu+eykKe8OJuE9pEEhrE6VJTZpvGWWRGnL8mI2tawO76HvNRnaLNcsYz2CTFj0iTWz+j0cKywJ+1wD2KIXWJDLsx69sMTfHYuf8Mw/Ipiaoe/tn/VBWo0uNuPCCEqcTEcRJjll8VLse7BuON+yJCSkZjJ7FoGlSQvrSGDMQqaGjs7xzW6XjUVQCXVOFX9vF7IW/GMY9cryI7P4SDsWHuOEerWsyKI99GIWqV5lCTJrdj3/Wy/e06OPKj1YRbDtObL2tzHNhcUceogvuVnzHDspv5RlKqvE16jPLbPm9SHuOU2kjz7V+CL8noRVBNM1hLjH3BkiISY4SX+kHSshliuL36SQC6yYI2xbj708p28Ibjfznz0Ldo+rLesREg1/6l4hO9nkiSsD55ED4Jub1z3L6bOpa1siIuR9x6QeN/mrJxUKdu1Z4l51keeJi7HsYeBkl4skeCsJvT9g4SXk+K1y5ZvZklc7jYjMCuCQ3oi3F5rQkR52PvYjLwOJkGqWTFMXlRVJ1N8yuONUgBogszQXjlfxHC8UVkvN4llQXlzM+zQN16qAhIPCmMWPQVioB+S8R1GRXSTSdb2xIrK33bKuYHJNwS9pEhZXUD3+eHCVxQZY7Lliu38cGsNMLnJQN3j8QVlx81JZuIIqkS3iDN9bVkQ5b5uMBOlRBvBLu+dcg8yFB+uTy1WTZE7bmlX3tY1hJtWiiZOhFE1XTj90wcrEmihvLZkAs3asSRWzTS0nxdzsqRRzI6qca2pqOYmtalZl/RgkxuDlVq8mPyM+nbteHWrMHgVrrVc1vE0apv3ePcpODEZvdTSLf2G99Jgdl5vUdZXVkcyoZjV9gKDOm4f6HlU5b6AuF3iqG91akxv4SSkc9BQm0mvt3uouu2JRi3fSsg2pLNwWr4fpqD/xm3qZ6K39EEkLJDVmPfQ6BnjZla3hCUtOUBp+HLN4iTPAvsmyeOIUn/VgQmpi4oQlYqXwvJ8TsuXnLLPsxPrEmkpT6YxlpCUzTK/6TBwYpJ2blyy9IcXXPaup3PPV3p1UiHjW/woFlmvbPatTlNmLddhLqzCtF3Ysq4vrCHXUlwt1uP3UNzEvUIc9vg1munvDEmPtU9RxvzCoJjZpgqy9IRFRiOH93qPC1I7as8p2PkU962MG7ZyV/LO1O2RfEb7WE80dzK3Fp3DxO361vxqH7FLbg5FWZvx6r5bXpprSUWNUetGwfdX3DaSmLZbEKHPS46aTXrQahHVoX/p33o9GO1oattqmPemVn/XJYVpu5p42ys977kETKZ038N/4XkEe6BtfBbz1HQXb9tb3Hb8AN9EE31rnIBMAAAAASUVORK5CYII="><div class="stripe"></div><h1>San Lorenzo de Almagro</h1><h2>Multas por antropometría · Octubre 2026</h2>
    <div class="meta">${onlyPaying ? "Solo jugadoras que deben pagar" : "Todas las jugadoras"} · ${visibleRows.length} jugadoras · Generado el ${new Date().toLocaleDateString("es-AR")}</div></header>
    <table><colgroup><col style="width:17%"><col style="width:11%"><col style="width:11%"><col style="width:12%"><col style="width:8%"><col style="width:14%"><col style="width:10%"><col style="width:17%"></colgroup>
    <thead><tr><th>Jugadora</th><th class="num">Sum6 septiembre</th><th class="num">Sum6 octubre</th><th class="num">Objetivo octubre</th><th class="num">Δ (mm)</th><th class="num">Multa a cobrar</th><th>Estado</th><th>Observación</th></tr></thead><tbody>
    ${visibleRows.map(row => `<tr><td class="player">${escapeHtml(row.player.name)}</td><td class="num">${mm(row.september)}</td><td class="num">${mm(row.current)}</td><td class="num">${mm(row.target)}</td><td class="num">${row.difference == null ? "—" : (row.difference > 0 ? "+" : "") + mm(row.difference)}</td><td class="num fine">${row.payable == null ? "—" : money(row.payable)}</td><td>${row.draft.exempt ? "No paga" : "Paga"}</td><td>${escapeHtml(row.draft.note)}</td></tr>`).join("")}
    </tbody></table><div class="total"><span>TOTAL A COBRAR <strong>${money(selectedTotal)}</strong></span></div>
    <footer class="foot">Primer milímetro por encima del objetivo sin cargo. Cada mm adicional: $50.000. Los importes pueden incluir ajustes manuales. Fecha de emisión: ${new Date().toLocaleDateString("es-AR")}.</footer></body></html>`;
    const popup = window.open("", "_blank");
    if (!popup) { setMessage("Permití las ventanas emergentes para imprimir el informe."); return; }
    popup.document.open(); popup.document.write(report); popup.document.close(); popup.focus();
    popup.setTimeout(() => popup.print(), 350);
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
          <thead className="bg-muted/50"><tr>{["Jugadora","Sum6 septiembre","Sum6 octubre","Objetivo octubre","Δ (mm)","Multa ($)","Estado","Observación","Guardar"].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
          <tbody>{visibleRows.map(row => <tr key={row.player.id} className="border-t">
            <td className="px-3 py-3 font-medium">{row.player.name}</td>
            <td className="px-3 py-3">{mm(row.september)}</td><td className="px-3 py-3">{mm(row.current)}</td>
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
