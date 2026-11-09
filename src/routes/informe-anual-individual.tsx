import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";
import { usePlayers, useControls, useWeightRecords, useFullAnthropometries, useHydrationTests, useObjectivePeriods } from "@/lib/hooks";
import { metricValue } from "@/lib/calc";
import { targetForPlayer } from "@/lib/objectives";
import { supabase } from "@/lib/supabase";
type Note = { category: string; note_date: string; content: string; season: number };
export const Route = createFileRoute("/informe-anual-individual")({
  validateSearch: (s: Record<string, unknown>): { player?: number } => ({ player: s.player != null && Number.isFinite(Number(s.player)) ? Number(s.player) : undefined }),
  component: () => <ClientOnly><IndividualReport /></ClientOnly>
});
const fmt = (v: number | null | undefined, unit = "") => v == null ? "Sin datos" : `${v.toLocaleString("es-AR",{maximumFractionDigits:1})}${unit}`;
const dateFmt = (s: string) => s.split("-").reverse().join("/");
function IndividualReport() {
  const search = Route.useSearch();
  const players = usePlayers();
  const [playerId, setPlayerId] = useState<number | null>(search.player ?? null);
  const [notes,setNotes] = useState<Note[]>([]);
  useEffect(() => { if (playerId == null && players?.length) setPlayerId(players[0].id ?? null); },[players,playerId]);
  const player = players?.find(p => p.id === playerId);
  const controls = useControls(playerId);
  const weights = useWeightRecords(playerId);
  const full = useFullAnthropometries(playerId);
  const hydration = useHydrationTests();
  const objectives = useObjectivePeriods();
  useEffect(() => {
    let active = true;
    setNotes([]);
    if (!supabase || playerId == null) return;
    void (async () => {
      const {data:{user}} = await supabase.auth.getUser();
      if (!user) return;
      const {data} = await supabase.from("player_nutrition_notes").select("category,note_date,content,season").eq("owner_id",user.id).eq("player_id",playerId).eq("season",2026).order("note_date",{ascending:false});
      if(active) setNotes((data ?? []) as Note[]);
    })();
    return () => { active=false; };
  },[playerId]);
  const yearControls = useMemo(() => (controls ?? []).filter(c => c.date.startsWith("2026")).sort((a,b)=>a.date.localeCompare(b.date)),[controls]);
  const sum6 = yearControls.map(c=>({date:c.date,value:metricValue(c,"sum6")})).filter((v):v is {date:string;value:number}=>v.value!=null);
  const yearWeights = (weights ?? []).filter(w=>w.date.startsWith("2026") && w.weight != null).sort((a,b)=>a.date.localeCompare(b.date));
  const yearFull = (full ?? []).filter(f=>f.date.startsWith("2026")).sort((a,b)=>a.date.localeCompare(b.date));
  const hydrationRows = (hydration ?? []).filter(t=>t.date.startsWith("2026")).flatMap(t=>t.entries.filter(e=>e.playerId === playerId && e.value != null).map(e=>({date:t.date,value:e.value!}))).sort((a,b)=>a.date.localeCompare(b.date));
  const objectiveRows = (objectives ?? []).filter(o=>o.year === 2026).map(o=>({label:o.label,target:targetForPlayer(o,player)})).filter(o=>o.target!=null);
  const balance = notes.find(n=>n.category==="balance")?.content;
  const projection = notes.find(n=>n.category==="proyeccion")?.content;
  const history = notes.filter(n=>n.category==="seguimiento");
  const card = "rounded-xl border border-border bg-card p-5 shadow-panel";
  return <AppLayout title="Informe Anual Nutricional Individual" subtitle="Temporada 2026 · Uso profesional privado" actions={<Button className="no-print" variant="outline" onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir / PDF</Button>}>
    <div className="no-print mb-5 flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium" htmlFor="individual-player">Seleccionar jugadora</label>
      <select id="individual-player" className="min-w-56 rounded-md border border-input bg-background px-3 py-2" value={playerId ?? ""} onChange={e=>setPlayerId(Number(e.target.value))}>
        {(players ?? []).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    {playerId != null && <PlayerNav playerId={playerId} playerName={player?.name} current="informe-anual-individual" />}
    {!player ? <p>Seleccioná una jugadora para visualizar su informe.</p> : <div className="space-y-5">
      <header className="rounded-xl bg-[#0B234A] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Club Atlético San Lorenzo de Almagro · Fútbol Femenino</p>
        <h2 className="mt-2 text-2xl font-bold">Informe nutricional individual 2026</h2>
        <p className="mt-2 text-lg">{player.name}{player.position ? ` · ${player.position}` : ""}</p>
      </header>
      <section className={card}><h3 className="mb-4 text-lg font-semibold">Resumen de evaluaciones</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[ "Controles Sum6",String(sum6.length)],["Pesajes",String(yearWeights.length)],["Antropometrías completas",String(yearFull.length)],["Tests de hidratación",String(hydrationRows.length)]].map(([label,value])=><div key={label} className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
        </div>
      </section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Evolución antropométrica · Sumatoria de seis pliegues</h3>
        {sum6.length ? <><div className="grid gap-3 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Primera medición</p><p className="font-bold">{fmt(sum6[0].value," mm")}</p><p className="text-xs">{dateFmt(sum6[0].date)}</p></div>
          <div><p className="text-xs text-muted-foreground">Última medición</p><p className="font-bold">{fmt(sum6[sum6.length-1].value," mm")}</p><p className="text-xs">{dateFmt(sum6[sum6.length-1].date)}</p></div>
          <div><p className="text-xs text-muted-foreground">Variación</p><p className="font-bold">{fmt(sum6[sum6.length-1].value-sum6[0].value," mm")}</p></div>
        </div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Fecha</th><th>Sum6</th></tr></thead><tbody>{sum6.map((v,i)=><tr key={i} className="border-b border-border/50"><td className="py-2">{dateFmt(v.date)}</td><td>{fmt(v.value," mm")}</td></tr>)}</tbody></table></div></> : <p className="text-sm text-muted-foreground">No hay controles Sum6 registrados para 2026.</p>}
      </section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Evolución del peso corporal</h3>
        {yearWeights.length ? <><p className="mb-3 text-sm">Primer registro: <strong>{fmt(yearWeights[0].weight," kg")}</strong> · Último registro: <strong>{fmt(yearWeights[yearWeights.length-1].weight," kg")}</strong> · Variación: <strong>{fmt((yearWeights[yearWeights.length-1].weight ?? 0)-(yearWeights[0].weight ?? 0)," kg")}</strong></p><p className="text-xs text-muted-foreground">Registros de peso: {yearWeights.length}. Se muestran el primero y el último para evitar repetir toda la planilla.</p></> : <p className="text-sm text-muted-foreground">Sin pesajes en 2026.</p>}
      </section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Objetivos antropométricos 2026</h3>
        {objectiveRows.length ? <div className="space-y-2">{objectiveRows.map((o,i)=><div key={i} className="flex justify-between border-b border-border/50 py-2 text-sm"><span>{o.label}</span><strong>{fmt(o.target," mm")}</strong></div>)}</div> : <p className="text-sm text-muted-foreground">Sin objetivos individuales registrados.</p>}
      </section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Monitoreo de hidratación</h3>
        {hydrationRows.length ? <><p className="mb-3 text-sm">Mediciones válidas: <strong>{hydrationRows.length}</strong> · Valores hasta 1.020: <strong>{hydrationRows.filter(r=>r.value<=1020).length}</strong> · Valores superiores a 1.020: <strong>{hydrationRows.filter(r=>r.value>1020).length}</strong></p>
          <div className="max-h-64 overflow-y-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Fecha</th><th>UGS</th></tr></thead><tbody>{hydrationRows.map((r,i)=><tr key={i} className="border-b border-border/50"><td className="py-2">{dateFmt(r.date)}</td><td>{(r.value/1000).toFixed(3)}</td></tr>)}</tbody></table></div></> : <p className="text-sm text-muted-foreground">No hay tests de hidratación vinculados a esta jugadora en 2026.</p>}
      </section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Seguimiento nutricional y observaciones profesionales</h3>
        {history.length ? <div className="space-y-3">{history.map((n,i)=><div key={i} className="border-l-2 border-[#C8102E] pl-3"><p className="text-xs text-muted-foreground">{dateFmt(n.note_date)}</p><p className="whitespace-pre-wrap text-sm">{n.content}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Sin observaciones de seguimiento cargadas.</p>}
      </section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Balance nutricional individual · 2026</h3><p className="whitespace-pre-wrap text-sm">{balance || "Pendiente de completar en la ficha de la jugadora."}</p></section>
      <section className={card}><h3 className="mb-3 text-lg font-semibold">Proyecciones y recomendaciones · 2027</h3><p className="whitespace-pre-wrap text-sm">{projection || "Pendiente de completar en la ficha de la jugadora."}</p></section>
      <p className="text-xs text-muted-foreground">Informe interno. Los datos corresponden a registros disponibles de la temporada 2026. La interpretación profesional debe considerar el contexto individual.</p>
    </div>}
  </AppLayout>;
}
