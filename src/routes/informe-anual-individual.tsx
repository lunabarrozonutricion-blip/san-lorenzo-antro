import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { PlayerNutritionNotes } from "@/components/player-nutrition-notes";
import { PlayerAnnualTargets } from "@/components/player-annual-targets";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";
import { usePlayers, useControls, useWeightRecords, useFullAnthropometries, useHydrationTests } from "@/lib/hooks";
import { metricValue } from "@/lib/calc";
import { supabase } from "@/lib/supabase";
type Note = { category: string; note_date: string; content: string; season: number };
export const Route = createFileRoute("/informe-anual-individual")({
  validateSearch: (s: Record<string, unknown>): { player?: number } => ({ player: s.player != null && Number.isFinite(Number(s.player)) ? Number(s.player) : undefined }),
  component: () => <ClientOnly><IndividualReport /></ClientOnly>
});
const fmt = (v: number | null | undefined, unit = "") => v == null ? "Sin datos" : `${v.toLocaleString("es-AR",{maximumFractionDigits:1})}${unit}`;
const dateFmt = (s: string) => s.split("-").reverse().join("/");
const printOptions = [["summary","Resumen de evaluaciones",false],["sum6","Evolución Sum6 y gráfico",true],["sum6Details","Detalle de controles antropométricos",false],["weight","Evolución del peso",true],["weightDetails","Todos los pesajes",false],["composition","IMO, masa muscular y adiposa",true],["hydration","Monitoreo de hidratación",true],["hydrationDetails","Todos los tests de hidratación",false],["balance","Balance nutricional individual",true]] as const;
type PrintKey = typeof printOptions[number][0];
function IndividualReport() {
  const search = Route.useSearch();
  const players = usePlayers();
  const [playerId, setPlayerId] = useState<number | null>(search.player ?? null);
  const [notes,setNotes] = useState<Note[]>([]);
  const [notesVersion,setNotesVersion] = useState(0);
  const [printSettings,setPrintSettings] = useState(false);
  const [printSelection,setPrintSelection] = useState<Record<PrintKey,boolean>>(()=>Object.fromEntries(printOptions.map(([key,,enabled])=>[key,enabled])) as Record<PrintKey,boolean>);
  const printClass = (key:PrintKey)=>printSelection[key]?"":" no-print";
  const [showSum6Details,setShowSum6Details] = useState(false);
  const [showWeightDetails,setShowWeightDetails] = useState(false);
  const [showHydrationDetails,setShowHydrationDetails] = useState(false);
  useEffect(() => { if (playerId == null && players?.length) setPlayerId(players[0].id ?? null); },[players,playerId]);
  const player = players?.find(p => p.id === playerId);
  const controls = useControls(playerId);
  const weights = useWeightRecords(playerId);
  const full = useFullAnthropometries(playerId);
  const hydration = useHydrationTests();
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
  },[playerId,notesVersion]);
  const yearControls = useMemo(() => (controls ?? []).filter(c => c.date.startsWith("2026")).sort((a,b)=>a.date.localeCompare(b.date)),[controls]);
  const sum6 = yearControls.map(c=>({date:c.date,value:metricValue(c,"sum6")})).filter((v):v is {date:string;value:number}=>v.value!=null);
  const monthNames = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const sum6Min = Math.floor(Math.min(40,...sum6.map(x=>x.value))/20)*20;
  const sum6Max = Math.ceil(Math.max(120,...sum6.map(x=>x.value))/20)*20;
  const sum6Y = (value:number)=>30+(sum6Max-value)*4;
  const sum6Bottom = sum6Y(sum6Min);
  const sum6Height = sum6Bottom+70;
  const sum6Ticks = Array.from({length:(sum6Max-sum6Min)/20+1},(_,i)=>sum6Min+i*20);
  const sum6Months = sum6.reduce<{key:string;start:number;end:number;label:string}[]>((groups,point,index)=>{
    const key=point.date.slice(0,7);
    const previous=groups[groups.length-1];
    if(previous?.key===key){previous.end=index;return groups;}
    groups.push({key,start:index,end:index,label:monthNames[Number(key.slice(5,7))-1]??key});
    return groups;
  },[]);
  const yearWeights = (weights ?? []).filter(w=>w.date.startsWith("2026") && w.weight != null).sort((a,b)=>a.date.localeCompare(b.date));
  const yearFull = (full ?? []).filter(f=>f.date.startsWith("2026")).sort((a,b)=>a.date.localeCompare(b.date));
  const hydrationRows = (hydration ?? []).filter(t=>t.date.startsWith("2026")).flatMap(t=>t.entries.filter(e=>e.playerId === playerId && e.value != null).map(e=>({date:t.date,value:e.value!}))).sort((a,b)=>a.date.localeCompare(b.date));
  const firstFull = yearFull[0], lastFull = yearFull[yearFull.length-1];
  const mass = (f: typeof firstFull, key: "muscle"|"adipose"|"bone") => f?.results?.weightAdjustedMassesKg?.[key] ?? null;
  const imo = (f: typeof firstFull) => { const m=mass(f,"muscle"),b=mass(f,"bone");return m!=null&&b!=null&&b>0?m/b:null; };
  const composition = [
    {label:"Índice músculo-óseo (IMO)",unit:"",initial:imo(firstFull),final:imo(lastFull)},
    {label:"Masa muscular",unit:" kg",initial:mass(firstFull,"muscle"),final:mass(lastFull,"muscle")},
    {label:"Masa adiposa (cinco componentes)",unit:" kg",initial:mass(firstFull,"adipose"),final:mass(lastFull,"adipose")}
  ];
  const balance = notes.find(n=>n.category==="balance")?.content;
  const objectiveCount = hydrationRows.filter(r => r.value <= 1020).length;
  const concentratedCount = hydrationRows.filter(r => r.value > 1020).length;
  const card = "overflow-hidden rounded-xl border border-[#D6DDE8] bg-white p-5 shadow-panel";
  return <AppLayout title="Informe Anual Nutricional Individual" subtitle="Temporada 2026 · Uso profesional privado" actions={<Button className="no-print" variant="outline" onClick={()=>setPrintSettings(v=>!v)}><Printer className="mr-2 h-4 w-4"/>Imprimir / PDF</Button>}>
    {printSettings && <div className="no-print mb-5 rounded-xl border bg-white p-4">
      <h3 className="mb-3 font-semibold">Seleccionar secciones para imprimir / PDF</h3>
      <div className="grid gap-2 sm:grid-cols-2">{printOptions.map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={printSelection[key]} onChange={e=>setPrintSelection(v=>({...v,[key]:e.target.checked}))}/>{label}</label>)}</div>
      <div className="mt-4 flex gap-2"><Button onClick={()=>window.print()} disabled={!player}>Imprimir selección</Button><Button variant="outline" onClick={()=>setPrintSettings(false)}>Cerrar</Button></div>
    </div>}
    <style>{`@media print {
      @page { size: A4 portrait; margin: 10mm; }
      .individual-report { background: white !important; padding: 0 !important; }
      .individual-report, .individual-report * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .individual-report > section, .individual-report > header { break-inside: avoid; page-break-inside: avoid; overflow: visible !important; box-shadow: none !important; margin-top: 8px !important; padding: 10px !important; }
      .individual-report .print-chart-scroll { overflow: visible !important; width: 100% !important; }
      .individual-report .print-chart-scroll svg { min-width: 0 !important; width: 100% !important; height: auto !important; max-height: 115mm; display: block; }
      .individual-report .print-three { grid-template-columns: repeat(3,minmax(0,1fr)) !important; }
      .individual-report .print-balance { break-inside: auto; page-break-inside: auto; box-shadow: none !important; }
      .individual-report .print-balance h3 { break-after: avoid; }
      .individual-report .print-detail { display: block !important; }
      .individual-report .print-detail.no-print { display: none !important; }
    }`}</style>
    <div className="no-print mb-5 flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium" htmlFor="individual-player">Seleccionar jugadora</label>
      <select id="individual-player" className="min-w-56 rounded-md border border-input bg-background px-3 py-2" value={playerId ?? ""} onChange={e=>setPlayerId(Number(e.target.value))}>
        {(players ?? []).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
    <div className="no-print">{playerId != null && <PlayerNav playerId={playerId} playerName={player?.name} current="informe-anual-individual" />}</div>
    {!player ? <p>Seleccioná una jugadora para visualizar su informe.</p> : <div className="individual-report space-y-5 rounded-2xl bg-gradient-to-b from-[#EFF3FA] via-[#F7F0F2] to-[#EFF4F6] p-3 sm:p-5">
      <header className="rounded-xl bg-gradient-to-r from-[#0B234A] via-[#152E58] to-[#8D1731] p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/75">Club Atlético San Lorenzo de Almagro · Fútbol Femenino</p>
        <h2 className="mt-2 text-2xl font-bold">Informe nutricional individual 2026</h2>
        <p className="mt-2 text-lg">{player.name}{player.position ? ` · ${player.position}` : ""}</p>
      </header>
      <section className={card+printClass("summary")}><h3 className="mb-4 text-lg font-semibold">Resumen de evaluaciones</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[ "Controles Sum6",String(sum6.length)],["Pesajes",String(yearWeights.length)],["Antropometrías completas",String(yearFull.length)],["Tests de hidratación",String(hydrationRows.length)]].map(([label,value])=><div key={label} className="rounded-lg border border-[#DCE5F1] bg-gradient-to-br from-[#EDF3FA] to-[#F7F9FC] p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
        </div>
      </section>
      <section className={card+printClass("sum6")}>
        <div className="mb-4 rounded-lg bg-gradient-to-r from-[#0B234A] via-[#183761] to-[#8D1731] px-4 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Composición corporal · Temporada 2026</p>
          <h3 className="mt-1 text-lg font-semibold">Evolución antropométrica · Sumatoria de seis pliegues</h3>
        </div>
        {sum6.length ? <>
          <div className="print-three grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#C8D9EE] bg-[#EDF3FA] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#466083]">Primera medición</p>
              <p className="mt-2 text-2xl font-bold text-[#0B234A]">{fmt(sum6[0].value," mm")}</p>
              <p className="mt-1 text-xs text-[#466083]">{dateFmt(sum6[0].date)}</p>
            </div>
            <div className="rounded-xl border border-[#E6C6CE] bg-[#FCF0F3] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9C3149]">Última medición</p>
              <p className="mt-2 text-2xl font-bold text-[#8D1731]">{fmt(sum6[sum6.length-1].value," mm")}</p>
              <p className="mt-1 text-xs text-[#9C3149]">{dateFmt(sum6[sum6.length-1].date)}</p>
            </div>
            <div className="rounded-xl border border-[#D4DFEB] bg-gradient-to-br from-[#E8F0F9] to-[#F7F0F2] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#466083]">Variación del período</p>
              <p className="mt-2 text-2xl font-bold text-[#0B234A]">{fmt(sum6[sum6.length-1].value-sum6[0].value," mm")}</p>
              <p className="mt-1 text-xs text-[#466083]">Primera vs. última evaluación</p>
            </div>
          </div>
          {sum6.length > 1 && <div className="mt-5 rounded-xl border border-[#D6E0ED] bg-[#F5F8FC] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold text-[#0B234A]">Tendencia de Sum6 <span className="font-normal text-xs text-[#526A89]">· Valores en mm</span></h4>
              <span className="rounded-full bg-[#E3EAF5] px-3 py-1 text-xs font-medium text-[#365478]">{sum6.length} mediciones</span>
            </div>
            <div className="print-chart-scroll overflow-x-auto pb-1">
              <svg viewBox={"0 0 855 "+sum6Height} role="img" aria-label="Gráfico de evolución de Sum6 con agrupación mensual y referencias internas de 70 y 60 mm" className="block w-full min-w-[855px]" style={{height:sum6Height}} preserveAspectRatio="xMidYMid meet">
                {sum6Ticks.map(value=><g key={value}><line x1="30" x2="676" y1={sum6Y(value)} y2={sum6Y(value)} stroke="#CBD8E8" strokeDasharray="4 5"/><text x="24" y={sum6Y(value)} dominantBaseline="middle" textAnchor="end" fontSize="10" fill="#526A89">{value}</text></g>)}
                {[{value:70,color:"#16A34A",label:"70 mm · Mínimo esperado",width:2.5},{value:60,color:"#007A29",label:"60 mm · Nivel óptimo",width:3}].map(ref=><g key={ref.value}><line x1="30" x2="676" y1={sum6Y(ref.value)} y2={sum6Y(ref.value)} stroke={ref.color} strokeWidth={ref.width} strokeDasharray="7 4"/><text x="684" y={sum6Y(ref.value)} dominantBaseline="middle" fontSize="11" fontWeight="700" fill={ref.color}>{ref.label}</text></g>)}
                <polyline fill="none" stroke="#8D1731" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  points={sum6.map((v,i)=>`${34+i*632/(sum6.length-1)},${sum6Y(v.value)}`).join(" ")} />
                {sum6.map((v,i)=>{
                  const x=34+i*632/(sum6.length-1);
                  const y=sum6Y(v.value);
                  const labelY=y<45?y+23:y-12;
                  return <g key={i}>
                    <circle cx={x} cy={y} r="4.5" fill="#8D1731" stroke="white" strokeWidth="1.8" />
                    <text x={x} y={labelY} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B234A" stroke="#F5F8FC" strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">{fmt(v.value)}</text>
                    <title>{dateFmt(v.date)}: {fmt(v.value," mm")}</title>
                  </g>;
                })}
                {sum6Months.map(group=>{
                  const position=(i:number)=>34+i*632/(sum6.length-1);
                  const first=position(group.start),last=position(group.end);
                  const left=Math.max(18,first-9),right=Math.min(682,last+9);
                  return <g key={group.key}>
                    <path d={"M "+left+" "+(sum6Bottom+18)+" V "+(sum6Bottom+26)+" H "+right+" V "+(sum6Bottom+18)} fill="none" stroke="#607797" strokeWidth="1.5" strokeLinecap="round"/>
                    <text x={(left+right)/2} y={sum6Bottom+45} textAnchor="middle" fontSize="11" fontWeight="600" fill="#365478">{group.label}</text>
                  </g>;
                })}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-[#526A89]"><span>{dateFmt(sum6[0].date)}</span><span>{dateFmt(sum6[sum6.length-1].date)}</span></div>
          </div>}
          <label className="no-print mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-[#D6DFEC] bg-[#EFF3FA] px-4 py-3 text-sm font-semibold text-[#0B234A]"><input type="checkbox" checked={showSum6Details} onChange={e=>setShowSum6Details(e.target.checked)} className="h-4 w-4 accent-[#8D1731]"/>Mostrar detalle de controles antropométricos</label>
          {(showSum6Details||printSelection.sum6Details) && <>
          <div className={(showSum6Details?"":"hidden print:block")+" mt-3 overflow-hidden rounded-xl border border-[#D6DFEC]"+printClass("sum6Details")}>
            <div className="bg-[#E7EDF6] px-4 py-3 text-sm font-semibold text-[#0B234A]">Detalle de controles antropométricos</div>
            <table className="w-full text-sm">
              <thead className="bg-[#F1F5FA] text-left text-[#365478]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Sum6</th><th className="px-4 py-3">Cambio vs. anterior</th></tr></thead>
              <tbody>{sum6.map((v,i)=><tr key={i} className={i%2===0?"border-t border-[#E2E8F1] bg-white":"border-t border-[#E2E8F1] bg-[#F7F9FD]"}>
                <td className="px-4 py-3 text-[#203858]">{dateFmt(v.date)}</td>
                <td className="px-4 py-3 font-semibold text-[#0B234A]">{fmt(v.value," mm")}</td>
                <td className="px-4 py-3">{i===0?<span className="text-xs text-muted-foreground">Inicial</span>:<span className={v.value-sum6[i-1].value<0?"rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800":v.value-sum6[i-1].value>0?"rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800":"rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"}>{v.value-sum6[i-1].value>0?"+":""}{fmt(v.value-sum6[i-1].value," mm")}</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
          </>}
          <p className="mt-3 text-xs text-muted-foreground">Los cambios se muestran de forma descriptiva; su interpretación depende de los objetivos y del contexto de cada jugadora.</p>
        </> : <p className="text-sm text-muted-foreground">No hay controles Sum6 registrados para 2026.</p>}
      </section>
      <section className={card+printClass("weight")}>
        <h3 className="mb-3 text-lg font-semibold text-[#0B234A]">Evolución del peso corporal</h3>
        {yearWeights.length ? <>
          <div className="print-three grid gap-3 sm:grid-cols-3">
            {[
              {label:"Primer registro",value:yearWeights[0].weight,date:yearWeights[0].date},
              {label:"Último registro",value:yearWeights[yearWeights.length-1].weight,date:yearWeights[yearWeights.length-1].date},
              {label:"Variación",value:(yearWeights[yearWeights.length-1].weight??0)-(yearWeights[0].weight??0),date:null}
            ].map((item,i)=><div key={item.label} className={i===1?"rounded-xl border border-[#E6C6CE] bg-[#FCF0F3] p-4":"rounded-xl border border-[#C8D9EE] bg-[#EDF3FA] p-4"}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#466083]">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#0B234A]">{fmt(item.value," kg")}</p>
              {item.date&&<p className="mt-1 text-xs text-[#466083]">{dateFmt(item.date)}</p>}
            </div>)}
          </div>
          <label className="no-print mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-[#D6DFEC] bg-[#EFF3FA] px-4 py-3 text-sm font-semibold text-[#0B234A]"><input type="checkbox" checked={showWeightDetails} onChange={e=>setShowWeightDetails(e.target.checked)} className="h-4 w-4 accent-[#8D1731]"/>Mostrar todos los registros de peso ({yearWeights.length})</label>
          {(showWeightDetails||printSelection.weightDetails)&&<div className={(showWeightDetails?"":"hidden print:block")+" mt-3 overflow-hidden rounded-xl border border-[#D6DFEC]"+printClass("weightDetails")}><table className="w-full text-sm"><thead className="bg-[#E7EDF6] text-left text-[#0B234A]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Peso</th></tr></thead><tbody>{yearWeights.map((w,i)=><tr key={i} className={i%2?"border-t bg-[#F7F9FD]":"border-t bg-white"}><td className="px-4 py-3">{dateFmt(w.date)}</td><td className="px-4 py-3 font-semibold">{fmt(w.weight," kg")}</td></tr>)}</tbody></table></div>}
        </>:<p className="text-sm text-muted-foreground">Sin pesajes en 2026.</p>}
      </section>
      <section className={card+printClass("composition")}>
        <div className="mb-4 rounded-lg bg-gradient-to-r from-[#0B234A] to-[#8D1731] px-4 py-4 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-white/70">Composición corporal · Antropometrías completas</p><h3 className="mt-1 text-lg font-semibold">Evolución de indicadores antropométricos</h3></div>
        {firstFull&&lastFull&&yearFull.length>1?<>
          <p className="mb-4 text-xs text-muted-foreground">Primera evaluación: {dateFmt(firstFull.date)} · Última evaluación: {dateFmt(lastFull.date)}</p>
          <div className="print-three grid gap-3 md:grid-cols-3">{composition.map((item,i)=><div key={item.label} className={i===1?"rounded-xl border border-[#C8D9EE] bg-[#EDF3FA] p-4":i===2?"rounded-xl border border-[#E6C6CE] bg-[#FCF0F3] p-4":"rounded-xl border border-[#D4DFEB] bg-[#F0F3FA] p-4"}>
            <h4 className="mb-3 font-semibold text-[#0B234A]">{item.label}</h4>
            <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Inicial</span><strong>{fmt(item.initial,item.unit)}</strong></div><div className="flex justify-between"><span>Final</span><strong>{fmt(item.final,item.unit)}</strong></div></div>
            <div className="mt-3 border-t border-[#CED8E5] pt-3"><p className="text-xs text-[#466083]">Variación</p><p className="mt-1 text-xl font-bold text-[#0B234A]">{item.initial!=null&&item.final!=null?fmt(item.final-item.initial,item.unit):"Sin datos"}</p></div>
          </div>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Masas del modelo de cinco componentes, no equivalencias adiposas de Sum6. Las variaciones son descriptivas.</p>
        </>:<p className="text-sm text-muted-foreground">Se necesitan al menos dos antropometrías completas de 2026 para comparar estos indicadores.</p>}
      </section>
      <section className={card+printClass("hydration")}>
        <div className="mb-4 rounded-lg bg-gradient-to-r from-[#0B234A] to-[#274B75] px-4 py-3 text-white">
          <h3 className="text-lg font-semibold">Monitoreo de hidratación</h3>
          <p className="text-xs text-white/80">Clasificación por densidad urinaria (UGS) · Objetivo ≤ 1.020</p>
        </div>
        {hydrationRows.length ? <>
          <div className="print-three grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#D7E1F0] bg-[#EDF3FA] p-4"><p className="text-sm text-[#425C7E]">Tests realizados</p><p className="mt-1 text-3xl font-bold text-[#0B234A]">{hydrationRows.length}</p></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-800">Orina dentro del objetivo</p><p className="mt-1 text-3xl font-bold text-emerald-800">{objectiveCount}</p></div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-800">Orina concentrada</p><p className="mt-1 text-3xl font-bold text-rose-800">{concentratedCount}</p></div>
          </div>
          <label className="no-print mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-[#D6DFEC] bg-[#EFF3FA] px-4 py-3 text-sm font-semibold text-[#0B234A]"><input type="checkbox" checked={showHydrationDetails} onChange={e=>setShowHydrationDetails(e.target.checked)} className="h-4 w-4 accent-[#8D1731]"/>Mostrar todos los tests de hidratación ({hydrationRows.length})</label>
          {(showHydrationDetails||printSelection.hydrationDetails) && <>
          <div className={(showHydrationDetails?"":"hidden print:block")+" mt-4 overflow-hidden rounded-lg border border-[#D6DDE8]"+printClass("hydrationDetails")}>
            <table className="w-full text-sm">
              <thead className="bg-[#E6ECF5] text-left text-[#0B234A]"><tr><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">UGS</th><th className="px-3 py-3">Clasificación</th></tr></thead>
              <tbody>{hydrationRows.map((r,i) => {
                const within = r.value <= 1020;
                return <tr key={i} className={within ? "border-t border-emerald-100 bg-emerald-50/80 text-emerald-950" : "border-t border-rose-100 bg-rose-50/90 text-rose-950"}>
                  <td className="px-3 py-3">{dateFmt(r.date)}</td>
                  <td className="px-3 py-3 font-semibold">{(r.value/1000).toFixed(3)}</td>
                  <td className="px-3 py-3"><span className={within ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900" : "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-900"}>{within ? "Dentro del objetivo" : "Orina concentrada"}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          </>}
          <div className="mt-4 rounded-lg border border-[#C9D5E5] bg-[#EDF3FA] p-4">
            <h4 className="font-semibold text-[#0B234A]">Recuento final de la temporada 2026</h4>
            <p className="mt-2 text-xs text-[#466083]">Distribución porcentual de los tests realizados</p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#D8E0EA]">
              <div className="bg-emerald-500" style={{width: `${objectiveCount / hydrationRows.length * 100}%`}} />
              <div className="bg-rose-400" style={{width: `${concentratedCount / hydrationRows.length * 100}%`}} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs"><span className="text-emerald-800">Dentro del objetivo: {Math.round(objectiveCount / hydrationRows.length * 100)}%</span><span className="text-rose-800">Orina concentrada: {Math.round(concentratedCount / hydrationRows.length * 100)}%</span></div>
          </div>
        </> : <p className="text-sm text-muted-foreground">No hay tests de hidratación vinculados a esta jugadora en 2026.</p>}
      </section>
      <div className="no-print">
        <PlayerNutritionNotes key={playerId} playerId={playerId} onSaved={()=>setNotesVersion(v=>v+1)} />
        <PlayerAnnualTargets key={playerId} playerId={playerId} />
      </div>
      {printSelection.balance && <div className="hidden print:block">
        <section className={card+" print-balance"}><h3 className="mb-3 text-lg font-semibold">Balance nutricional individual · 2026</h3><p className="whitespace-pre-wrap text-sm">{balance||"Pendiente de completar."}</p></section>
      </div>}
      <p className="text-xs text-muted-foreground">Informe interno. Los datos corresponden a registros disponibles de la temporada 2026. La interpretación profesional debe considerar el contexto individual.</p>
    </div>}
  </AppLayout>;
}
