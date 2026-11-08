import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Droplets, ClipboardList, Target, Printer, FileBarChart, Save } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { EducationalPdfLibrary } from "@/components/educational-pdf-library";
import { WorkshopPhotoGallery } from "@/components/workshop-photo-gallery";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { useControls, useHydrationTests, usePlayers, useWeightRecords } from "@/lib/hooks";
import { metricValue } from "@/lib/calc";

export const Route = createFileRoute("/informe-anual")({
  component: () => <ClientOnly><AnnualNutritionReport /></ClientOnly>,
});

type Section = "anthro" | "hydration" | "interventions" | "conclusions";
type Notes = { interventions: string; conclusions: string };
const emptyNotes: Notes = { interventions: "", conclusions: "" };
const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const number = (value: number, digits = 1) => value.toLocaleString("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const band = (value: number) => value < 70 ? "green" : value <= 90 ? "yellow" : "red";
const bandColors = { green: "#10b981", yellow: "#fbbf24", red: "#fb6380" };
function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}
function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return <div className="mb-5"><h2 className="font-display text-xl font-bold text-[#0b234a]">{children}</h2>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>;
}
const interventionAxes = [
  { title: "Monitoreo antropométrico y composición corporal", detail: "Seguimiento de la sumatoria de seis pliegues cutáneos con controles mensuales o quincenales, y evaluaciones antropométricas completas aproximadamente cada dos meses. La frecuencia se adapta a la planificación y a las necesidades del plantel." },
  { title: "Seguimiento del peso corporal", detail: "Controles de peso con frecuencia de referencia de al menos una vez por semana, adaptados al calendario deportivo, los períodos de descanso y las necesidades de seguimiento individual." },
  { title: "Atención nutricional individualizada", detail: "Espacios de consulta y seguimiento con las jugadoras, establecimiento de objetivos y elaboración de planes alimentarios individualizados, principalmente mediante un sistema de intercambios." },
  { title: "Educación alimentaria y nutricional", detail: "Charlas educativas definidas a partir de diagnósticos de situación, necesidades identificadas y prioridades nutricionales surgidas durante la temporada." },
  { title: "Monitoreo de hábitos y registros alimentarios", detail: "Implementación de una herramienta digital de registro alimentario fotográfico para observar hábitos, brindar devoluciones individuales y acompañar el seguimiento nutricional." },
  { title: "Talleres prácticos de alimentación", detail: "Actividades participativas de cocina orientadas a aplicar contenidos nutricionales en situaciones cotidianas y fortalecer la autonomía alimentaria." },
] as const;
function AnnualNutritionReport() {
  const players = usePlayers();
  const weightRecords = useWeightRecords();
  const controls = useControls();
  const hydrationTests = useHydrationTests();
  const year = 2026;
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [sum6Statistic, setSum6Statistic] = useState<"media" | "mediana">("media");
  const [compareOnly, setCompareOnly] = useState(false);
  const [section, setSection] = useState<Section>("anthro");
  const [comparisonDate, setComparisonDate] = useState<string>("");
  const [showHydrationByDay, setShowHydrationByDay] = useState(false);
  const [showHydrationByMonth, setShowHydrationByMonth] = useState(false);
  const [expandedIntervention, setExpandedIntervention] = useState<number | null>(null);
  const [notes, setNotes] = useState<Notes>(emptyNotes);
  const [saved, setSaved] = useState(true);
  const storageKey = `sl-annual-nutrition-${year}`;
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      setNotes(parsed && typeof parsed.interventions === "string" && typeof parsed.conclusions === "string" ? parsed : emptyNotes);
    } catch { setNotes(emptyNotes); }
    setSaved(true);
  }, [storageKey]);
  const saveNotes = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(notes)); setSaved(true); toast.success("Textos guardados en este dispositivo"); }
    catch { toast.error("No se pudieron guardar los textos"); }
  };
  const yearControls = useMemo(() => (controls ?? []).filter(c => c.date.startsWith(String(year)) && metricValue(c, "sum6") != null), [controls, year]);
  const monthly = useMemo(() => monthNames.map((name, month) => {
    const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
    const latest = new Map<number, (typeof yearControls)[number]>();
    for (const control of yearControls) {
      const previous = latest.get(control.playerId);
      if (control.date.startsWith(prefix) && (!previous || control.date > previous.date || (control.date === previous.date && (control.id ?? 0) > (previous.id ?? 0)))) latest.set(control.playerId, control);
    }
    const values = [...latest.values()].map(c => metricValue(c,"sum6")).filter((v): v is number => v !== null);
    const groups = { green: 0, yellow: 0, red: 0 };
    values.forEach(v => groups[band(v)]++);
    return { name, values, groups, count: values.length, average: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null };
  }), [yearControls, year]);
  const measuredPlayers = new Set(yearControls.map(c => c.playerId)).size;
  const yearWeightRecords = (weightRecords ?? []).filter(record => record.date.startsWith("2026"));
  const weightDates = [...new Set(yearWeightRecords.map(record => record.date))];
  const visibleMonthly = monthly.filter((month,index) => !compareOnly || selectedMonths.length === 0 || selectedMonths.includes(index));
  const monthlySum6 = monthly.map((month,index)=>({...month,index})).filter(month=>month.count>0 && (!compareOnly || selectedMonths.length === 0 || selectedMonths.includes(month.index)));

  const sum6Stats = monthlySum6.map(month => {
    const values = month.values;
    const mean = month.average!;
    const variance = values.length > 1 ? values.reduce((total,value)=>total+(value-mean)**2,0)/(values.length-1) : null;
    const sorted = [...values].sort((a,b)=>a-b);
    const middle = Math.floor(sorted.length/2);
    const median = sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
    return {...month, median, min:Math.min(...values), max:Math.max(...values), sd:variance===null?null:Math.sqrt(variance)};
  });
  const firstStats = sum6Stats[0];
  const lastStats = sum6Stats[sum6Stats.length-1];
  const statisticValue = (month: (typeof sum6Stats)[number]) => sum6Statistic === "media" ? month.average! : month.median;
  const activeMonths = monthly.filter(m => m.count > 0);
  const first = activeMonths[0], last = activeMonths[activeMonths.length - 1];
  const tests = useMemo(() => (hydrationTests ?? []).filter(t => t.date.startsWith(String(year))).sort((a,b)=>a.date.localeCompare(b.date)), [hydrationTests, year]);
  const hydrationEvolution = tests.map(test=>{
    const measured=test.entries.filter(entry=>entry.value != null && Number.isFinite(entry.value));
    const hydrated=measured.filter(entry=>(entry.value as number)<1020).length;
    return {date:test.date,count:measured.length,hydrated,percent:measured.length?hydrated/measured.length*100:null};
  });
  const hydrationByMonth = useMemo(() => monthNames.map((name, index) => {
    const prefix = `${year}-${String(index + 1).padStart(2, "0")}`;
    const monthTests = tests.filter(test => test.date.startsWith(prefix));
    const values = monthTests.flatMap(test => test.entries).map(entry => entry.value).filter((value): value is number => value != null && Number.isFinite(value));
    const inTarget = values.filter(value => value < 1020).length;
    return { name, tests: monthTests.length, measured: values.length, inTarget, concentrated: values.length - inTarget, percent: values.length ? inTarget / values.length * 100 : null };
  }), [tests, year]);
  const firstHydration=hydrationEvolution.find(item=>item.count>0);
  const lastHydration=[...hydrationEvolution].reverse().find(item=>item.count>0);
  const comparisonOptions = hydrationEvolution.map((item,index)=>({...item,index})).filter(item=>item.count>0);
  const comparisonValue = comparisonOptions.find(item=>String(item.index)===comparisonDate) ?? lastHydration;

  const hydration = useMemo(() => {
    const measured = tests.flatMap(t => t.entries).filter(e => e.value !== null && Number.isFinite(e.value));
    const hydrated = measured.filter(e => (e.value as number) < 1020).length;
    return { measured: measured.length, hydrated, dehydrated: measured.length - hydrated, withoutValue: tests.flatMap(t=>t.entries).length - measured.length };
  }, [tests]);
  const selectSection = (next: Section) => { setSection(next); document.getElementById("annual-report-details")?.scrollIntoView({ behavior:"smooth",block:"start" }); };
  const sections = [
    { id:"anthro" as const, label:"Antropometría", sub:"Resultados y evolución", Icon:BarChart3 },
    { id:"hydration" as const, label:"Hidratación", sub:"Seguimiento del plantel", Icon:Droplets },
    { id:"interventions" as const, label:"Intervenciones", sub:"Trabajo nutricional", Icon:ClipboardList },
    { id:"conclusions" as const, label:"Conclusiones", sub:"Balance y proyecciones", Icon:Target },
  ];
  const printReport = () => {
    window.print();
  };
  const chart = <div className="space-y-4">{monthlySum6.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay mediciones de Sum6 en esta temporada.</p> : monthlySum6.map(m => <div key={m.name} className="grid grid-cols-[80px_1fr] items-center gap-3"><span className="text-sm font-medium">{m.name}</span><div><div className="flex h-5 overflow-hidden rounded-full bg-muted">{(["green","yellow","red"] as const).map(key => <div key={key} style={{width:`${m.groups[key]/m.count*100}%`,backgroundColor:bandColors[key]}} />)}</div><div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span>Verde {Math.round(m.groups.green/m.count*100)}%</span><span>Amarillo {Math.round(m.groups.yellow/m.count*100)}%</span><span>Rojo {Math.round(m.groups.red/m.count*100)}%</span><span>{m.count} jugadoras</span></div></div></div>)}</div>;
  const anthroContent = <div className="space-y-6">
    <SectionTitle subtitle="Seguimiento antropométrico del plantel durante 2026.">Evolución antropométrica del plantel</SectionTitle>
    <div className="rounded-xl border border-[#cbd6e5] bg-[#edf2f9] p-4">
      <h3 className="mb-2 font-semibold text-[#0b234a]">Criterios de clasificación · Sumatoria de seis pliegues</h3>
      <div className="flex flex-wrap gap-3 text-sm"><span className="rounded-lg bg-emerald-100 px-3 py-2 text-emerald-900">Verde: &lt;70 mm</span><span className="rounded-lg bg-amber-100 px-3 py-2 text-amber-900">Amarillo: 70–90 mm</span><span className="rounded-lg bg-rose-100 px-3 py-2 text-rose-900">Rojo: &gt;90 mm</span></div>
      <p className="mt-2 text-xs text-muted-foreground">Rangos descriptivos utilizados por el área; no sustituyen la evaluación individual.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Jugadoras evaluadas" value={String(measuredPlayers)} /><Metric label="Controles antropométricos con Sum6" value={String(yearControls.length)} /><Metric label="Jornadas de pesaje" value={String(weightDates.length)} detail={`${yearWeightRecords.length} registros de peso`} /></div>
    <div className="annual-screen-only rounded-xl border border-[#cbd6e5] bg-white p-4">
      <label className="flex items-center gap-2 font-semibold text-[#0b234a]"><input type="checkbox" checked={compareOnly} onChange={e=>setCompareOnly(e.target.checked)} /> Comparar meses seleccionados</label>
      <p className="mt-1 text-xs text-muted-foreground">Elegí los meses que querés mostrar en los gráficos. Si no seleccionás ninguno, se mostrarán todos.</p>
      <div className="mt-3 flex flex-wrap gap-2">{monthNames.map((name,index)=><label key={name} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${selectedMonths.includes(index)?"border-[#c8102e] bg-rose-50 text-[#0b234a]":"border-[#dbe3ef]"}`}><input type="checkbox" className="mr-2" checked={selectedMonths.includes(index)} onChange={e=>setSelectedMonths(old=>e.target.checked?[...old,index]:old.filter(item=>item!==index))} />{name}</label>)}</div>
    </div>
    <div className="rounded-xl border border-border p-5"><h3 className="mb-4 font-semibold text-[#0b234a]">Distribución mensual por rangos de Sum6</h3>{chart}</div>
    <div className="overflow-hidden rounded-2xl border border-[#d5deeb] bg-white shadow-[0_5px_20px_rgba(11,35,74,0.07)]">
      <div className="border-b border-[#dbe3ef] bg-gradient-to-r from-[#0b234a] to-[#173b70] px-5 py-5 text-white sm:px-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f3a4b1]">Evolución de la temporada</p>
        <h3 className="mt-1 text-xl font-bold">Evolución grupal de Sum6</h3>
        <p className="mt-1 text-xs text-[#cbd7e9]">Sumatoria de seis pliegues · milímetros</p>
      </div>
      <div className="p-5 sm:p-7">
        <div className="mb-5 inline-flex rounded-xl border border-[#dbe3ef] bg-[#edf2f9] p-1" role="group" aria-label="Indicador estadístico de Sum6">
          {(["media","mediana"] as const).map(option => <button key={option} type="button" aria-pressed={sum6Statistic===option} onClick={() => setSum6Statistic(option)} className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${sum6Statistic===option?"bg-[#0b234a] text-white shadow-sm":"text-[#0b234a] hover:bg-white"}`}>{option==="media"?"Media":"Mediana"}</button>)}
        </div>
        {monthlySum6.length === 0 ? <p className="text-sm text-muted-foreground">No hay mediciones para los meses seleccionados.</p> : <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-[#60738f]">Última {sum6Statistic} disponible</p><p className="mt-1 text-3xl font-extrabold text-[#0b234a]">{number(statisticValue(lastStats))} <span className="text-base font-medium text-[#60738f]">mm</span></p></div>
            {monthlySum6.length>1&&<div className="rounded-xl bg-[#edf2f9] px-4 py-3 text-right"><p className="text-xs text-[#60738f]">Variación entre períodos mostrados</p><p className={`text-lg font-bold ${statisticValue(lastStats) - statisticValue(firstStats) <= 0?"text-emerald-700":"text-[#c8102e]"}`}>{statisticValue(lastStats) - statisticValue(firstStats) > 0?"+":""}{number(statisticValue(lastStats) - statisticValue(firstStats))} mm</p></div>}
          </div>
          {(() => {
            const values=sum6Stats.map(statisticValue);
            const low=Math.min(...values),high=Math.max(...values),span=Math.max(4,high-low);
            const min=low-span*.2,max=high+span*.2;
            const points=values.map((value,i)=>({x:55+(monthlySum6.length===1?0:i* (580/(monthlySum6.length-1))),y:210-(value-min)/(max-min)*160,value,label:monthlySum6[i].name}));
            const line=points.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
            return <div className="overflow-x-auto"><svg viewBox="0 0 700 265" className="h-auto min-w-[480px] w-full" role="img" aria-label={`Gráfico de evolución de la ${sum6Statistic} grupal de sumatoria de seis pliegues por mes`}>
              {[0,1,2,3,4].map(i=><line key={i} x1="45" x2="650" y1={40+i*42} y2={40+i*42} stroke="#e4eaf2" strokeDasharray="4 5" />)}
              {points.length>1&&<path d={line} fill="none" stroke="#c8102e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
              {points.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="6" fill="#c8102e" stroke="white" strokeWidth="2"/><text x={p.x} y={p.y-14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b234a">{number(p.value)} mm</text><text x={p.x} y="241" textAnchor="middle" fontSize="12" fill="#60738f">{p.label.slice(0,3)}</text></g>)}
            </svg></div>;
          })()}
          <div className="mt-5"><h4 className="text-base font-bold text-[#0b234a]">Estadísticas del último período</h4><p className="mt-1 text-xs text-[#60738f]">{lastStats.name} {year} · {lastStats.count} jugadoras con mediciones válidas</p></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {[
              {label:sum6Statistic==="media"?"Media grupal":"Mediana grupal",value:`${number(statisticValue(lastStats))} mm`},
              {label:"Valor mínimo",value:`${number(lastStats.min)} mm`},
              {label:"Valor máximo",value:`${number(lastStats.max)} mm`},
              {label:"Desviación estándar",value:lastStats.sd===null?"—":`${number(lastStats.sd)} mm`}
            ].map(item=><div key={item.label} className="rounded-xl border border-[#dbe3ef] bg-[#f4f7fb] px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#60738f]">{item.label}</p><p className="mt-2 text-xl font-extrabold text-[#0b234a]">{item.value}</p></div>)}
          </div>
          <p className="mt-2 text-xs text-[#60738f]">El mínimo y el máximo corresponden a las mediciones individuales más baja y más alta de este período. La desviación estándar describe la dispersión de los valores.</p>
          {sum6Stats.length>1&&<div className="mt-5 rounded-xl border border-[#dbe3ef] bg-white p-4">
            <p className="text-sm font-bold text-[#0b234a]">Evolución de los valores extremos</p>
            <p className="mt-1 text-xs text-[#60738f]">{firstStats.name} → {lastStats.name}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[{label:"Mínimo",start:firstStats.min,end:lastStats.min},{label:"Máximo",start:firstStats.max,end:lastStats.max}].map(item=><div key={item.label} className="rounded-lg bg-[#edf2f9] p-3">
                <p className="text-xs font-semibold text-[#60738f]">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-[#0b234a]">{number(item.start)} → {number(item.end)} mm</p>
                <p className="text-xs text-[#60738f]">Variación: {item.end-item.start>0?"+":""}{number(item.end-item.start)} mm</p>
              </div>)}
            </div>
            
          </div>}
          
        </>}
      </div>
    </div>
    
  </div>;
  const hydrationContent = <div className="space-y-6">
    <SectionTitle subtitle="Seguimiento del estado de hidratación y evolución de las jornadas registradas.">Hidratación del plantel</SectionTitle>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#173b70] bg-[#0b234a] p-5 text-white"><p className="text-xs font-semibold uppercase tracking-wider text-[#cbd7e9]">Jornadas de test</p><p className="mt-2 text-4xl font-extrabold">{tests.length}</p></div><div className="rounded-xl border border-[#cbd6e5] bg-[#eaf0f8] p-5"><p className="text-xs font-semibold uppercase tracking-wider text-[#60738f]">Mediciones válidas</p><p className="mt-2 text-4xl font-extrabold text-[#0b234a]">{hydration.measured}</p></div></div>
    <div className="overflow-hidden rounded-2xl border border-[#cbd6e5] bg-[#edf2f9] shadow-sm">
      <div className="bg-[#0b234a] px-5 py-5 text-white sm:px-6"><h3 className="text-lg font-bold">Comparativa de jornadas</h3><p className="mt-1 text-xs text-[#cbd7e9]">Resultados válidos · barras de porcentaje dentro del objetivo y orina concentrada</p></div>
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3"><label htmlFor="hydration-compare-date" className="text-sm font-semibold text-[#0b234a]">Comparar el inicio con:</label><select id="hydration-compare-date" value={comparisonDate} onChange={event=>setComparisonDate(event.target.value)} className="max-w-full rounded-lg border border-[#b6c7dd] bg-white px-3 py-2 text-sm text-[#0b234a]"><option value="">Última jornada registrada</option>{comparisonOptions.map(item=><option key={item.index} value={String(item.index)}>{item.date} · Test {item.index+1}{tests[item.index]?.context === "pre_entreno" ? " · Preentreno" : tests[item.index]?.context === "otro" ? " · Otro" : " · "+tests[item.index]?.context.replaceAll("_"," ")}</option>)}</select></div>
        <div className="grid gap-4 md:grid-cols-2">{[{label:"Inicio",data:firstHydration},{label:comparisonDate?"Jornada seleccionada":"Última jornada",data:comparisonValue}].map(({label,data})=><div key={label} className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[#c8102e]">{label}</p><p className="mt-1 text-sm font-semibold text-[#0b234a]">{data?.date ?? "Sin datos"}</p>{data&&data.count>0?<><div className="mt-5 flex h-44 items-end justify-center gap-10 border-b border-[#dbe3ef] pb-1">{[{name:"Dentro del objetivo",count:data.hydrated,color:"#14866d"},{name:"Orina concentrada",count:data.count-data.hydrated,color:"#c8102e"}].map(bar=><div key={bar.name} className="flex h-full w-24 flex-col items-center justify-end gap-1"><span className="text-sm font-bold text-[#0b234a]">{number(bar.count/data.count*100,0)}%</span><div className="w-16 rounded-t-md" style={{height:`${Math.max(3,bar.count/data.count*100)}%`,backgroundColor:bar.color}} /></div>)}</div><div className="mt-3 grid grid-cols-2 gap-3 text-center text-xs"><div><span className="font-bold text-[#14866d]">Dentro del objetivo</span><p className="mt-1 text-[#60738f]">{data.hydrated} jugadoras</p></div><div><span className="font-bold text-[#c8102e]">Orina concentrada</span><p className="mt-1 text-[#60738f]">{data.count-data.hydrated} jugadoras</p></div></div><p className="mt-3 text-center text-xs text-[#60738f]">{data.count} mediciones válidas</p></>:<p className="mt-5 text-sm text-[#60738f]">Sin mediciones válidas</p>}</div>)}</div>
      </div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-[#cbd6e5] bg-[#f1f5fa]">
      <div className="border-b border-[#d5deeb] bg-[#e6edf6] px-5 py-4"><h3 className="font-bold text-[#0b234a]">Evolución histórica de hidratación</h3><p className="mt-1 text-xs text-[#60738f]">Consultá el seguimiento solo cuando lo necesites.</p></div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#b6c7dd] bg-white px-4 py-3 text-sm font-semibold text-[#0b234a]"><input type="checkbox" checked={showHydrationByDay} onChange={event=>setShowHydrationByDay(event.target.checked)} /> Mostrar evolución por jornada</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#b6c7dd] bg-white px-4 py-3 text-sm font-semibold text-[#0b234a]"><input type="checkbox" checked={showHydrationByMonth} onChange={event=>setShowHydrationByMonth(event.target.checked)} /> Mostrar evolución mensual</label>
        </div>
        {showHydrationByDay && <div className="rounded-xl border border-[#d5deeb] bg-white p-5"><h4 className="mb-4 font-semibold text-[#0b234a]">Evolución por jornada</h4><div className="space-y-4">{hydrationEvolution.map((item,index)=><div key={`${item.date}-${index}`} className="grid grid-cols-[90px_1fr] items-center gap-3"><span className="text-xs">{item.date}</span><div><div className="h-4 overflow-hidden rounded-full bg-rose-200">{item.percent!==null&&<div className="h-full bg-emerald-500" style={{width:`${item.percent}%`}} />}</div><p className="mt-1 text-xs text-muted-foreground">{item.percent===null?"Sin mediciones válidas":`${number(item.percent,0)}% dentro del objetivo · ${item.count} resultados`}</p></div></div>)}{hydrationEvolution.length===0&&<p className="text-sm text-muted-foreground">No hay jornadas registradas en 2026.</p>}</div></div>}
        {showHydrationByMonth && <div className="rounded-xl border border-[#d5deeb] bg-white p-5"><h4 className="mb-3 font-semibold text-[#0b234a]">Evolución mensual de hidratación</h4><div className="space-y-3">{hydrationByMonth.filter(month => month.tests > 0).map(month => <div key={month.name} className="grid grid-cols-[75px_1fr] items-center gap-3"><span className="text-sm font-medium">{month.name}</span><div><div className="h-4 overflow-hidden rounded-full bg-rose-200">{month.percent !== null && <div className="h-full bg-emerald-500" style={{width:`${month.percent}%`}} />}</div><p className="mt-1 text-xs text-muted-foreground">{month.measured ? `${number(month.percent!, 0)}% dentro del objetivo · ${month.measured} mediciones · ${month.tests} tests` : `${month.tests} tests · sin mediciones válidas`}</p></div></div>)}{tests.length === 0 && <p className="text-sm text-muted-foreground">No hay tests registrados.</p>}</div></div>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Criterio operativo: USG &lt;1,020 dentro del objetivo; USG ≥1,020 indica orina concentrada / posible hipohidratación, no un diagnóstico clínico. Se excluyen valores ausentes; el momento de muestreo y la composición del plantel pueden variar.</p>
  </div>;
  const interventionsContent = <div className="space-y-5">
    <SectionTitle subtitle="Estrategias de seguimiento, atención individual, educación y actividades prácticas desarrolladas durante la temporada.">Intervenciones y estrategias de abordaje nutricional</SectionTitle>
    <div className="overflow-hidden rounded-2xl border border-[#cbd6e5] bg-[#edf2f9]">
      <div className="border-l-4 border-[#c8102e] bg-[#0b234a] px-5 py-4 text-white"><h3 className="font-semibold">Seis ejes de intervención · Temporada 2026</h3><p className="mt-1 text-xs text-[#cbd7e9]">Seleccioná cada eje para leer su descripción.</p></div>
      <div className="space-y-3 p-4 sm:p-5">{interventionAxes.map((axis,index)=><div key={axis.title} className="overflow-hidden rounded-xl border border-[#d5deeb] bg-white">
        <button type="button" aria-expanded={expandedIntervention===index} onClick={()=>setExpandedIntervention(current=>current===index?null:index)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-[#0b234a] hover:bg-[#f5f8fc]"><span className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8eff8] text-sm font-bold text-[#c8102e]">{index+1}</span><span className="font-semibold">{axis.title}</span></span><span aria-hidden="true" className="text-lg font-bold">{expandedIntervention===index?"−":"+"}</span></button>
        {expandedIntervention===index&&<div className="border-t border-[#e1e7f0] px-5 py-4 text-sm leading-7 text-[#42536c]">{axis.detail}{index===3 && <EducationalPdfLibrary kind="charlas" />}{index===5 && <EducationalPdfLibrary kind="talleres" />}{index===5 && <WorkshopPhotoGallery />}</div>}
      </div>)}</div>
    </div>
    <div className="rounded-xl border border-[#d5deeb] bg-white p-5"><h3 className="mb-2 font-semibold text-[#0b234a]">Actividades y documentación complementaria</h3><p className="mb-3 text-sm text-muted-foreground">Podés agregar títulos de charlas, fechas confirmadas, detalles del taller de cocina y referencias a materiales. No es necesario indicar una frecuencia de consultas que no esté documentada.</p><textarea className="min-h-44 w-full rounded-xl border border-input bg-background p-4 text-sm leading-7" placeholder="Ej.: Charlas realizadas, temáticas, taller de cocina, implementación del registro fotográfico..." value={notes.interventions} onChange={e=>{setNotes(n=>({...n,interventions:e.target.value}));setSaved(false);}} /><p className="mt-2 text-xs text-muted-foreground">Las notas se guardan con el botón Guardar del informe en este dispositivo. Los PDFs todavía no se adjuntan ni se sincronizan con Supabase.</p></div>
  </div>;
  const conclusionsContent = <div className="space-y-4"><SectionTitle subtitle="Interpretación profesional, limitaciones de los registros y prioridades de la próxima temporada.">Conclusiones y proyecciones</SectionTitle><textarea className="min-h-56 w-full rounded-xl border border-input bg-background p-4 text-sm leading-7" placeholder="Escribí las conclusiones, los resultados observados y las propuestas para la próxima temporada..." value={notes.conclusions} onChange={e=>{setNotes(n=>({...n,conclusions:e.target.value}));setSaved(false);}} /><p className="text-xs text-muted-foreground">Evitá atribuir causalidad a las intervenciones sin una evaluación específica.</p></div>;
  return <AppLayout title="Informe Anual Nutricional" subtitle="San Lorenzo · Primera División – Fútbol Femenino">
    <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } body { background: white !important; } .annual-screen-only { display:none !important; } .annual-print { display:block !important; } .annual-print-section { break-inside:avoid; margin-bottom:16mm; } .annual-report-shell { border:0 !important; box-shadow:none !important; } .print-area { padding:0 !important; } .annual-print h2 { color:#0b234a !important; } }`}</style>
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="annual-screen-only overflow-hidden rounded-2xl border border-[#d6deea] bg-white shadow-[0_12px_32px_rgba(11,35,74,0.10)]">
        <div className="relative overflow-hidden bg-[#0b234a] px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border-[45px] border-white/[0.05]" />
          <div className="pointer-events-none absolute bottom-[-90px] right-[22%] h-52 w-52 rotate-45 border-[35px] border-[#c8102e]/20" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10"><FileBarChart className="h-7 w-7 text-white" /></div>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f1a4b1]">San Lorenzo de Almagro · Área Nutricional</p>
                <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">Informe Anual Nutricional</h2>
                <p className="mt-2 text-sm text-[#cbd7e9]">Primera División · Fútbol Femenino</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><p className="text-[10px] font-bold uppercase tracking-widest text-[#cbd7e9]">Temporada</p><p className="mt-1 text-2xl font-extrabold text-white">2026</p></div>
          </div>
        </div>
        <div className="h-1.5 bg-[#c8102e]" />
        <div className="bg-gradient-to-b from-[#f2f5fa] to-white px-5 py-7 sm:px-9 sm:py-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c8102e]">Panel de gestión</p><h3 className="mt-1 text-lg font-bold text-[#0b234a]">Resultados de la temporada</h3></div>
            <p className="text-xs text-[#60738f]">Seleccioná una sección para explorar los datos</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map(({id,label,sub,Icon},index)=><button type="button" key={id} onClick={()=>selectSection(id)} aria-pressed={section===id} className={`group relative flex min-h-36 items-start gap-4 overflow-hidden rounded-xl border bg-white p-5 text-left shadow-[0_3px_12px_rgba(11,35,74,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8102e] ${section===id?"border-[#c8102e] ring-1 ring-[#c8102e]/20":"border-[#dbe3ef] hover:border-[#9aaecb]"}`}>
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${section===id?"bg-[#0b234a] text-white":"bg-[#eaf0f8] text-[#0b234a]"}`}><Icon className="h-6 w-6" /></span>
              <span className="pt-1"><span className="block text-base font-bold text-[#0b234a]">{label}</span><span className="mt-1 block text-sm text-[#60738f]">{sub}</span><span className="mt-3 block text-xs font-semibold text-[#c8102e]">Explorar sección →</span></span>
              <span className="absolute right-4 top-4 text-xs font-bold text-[#c6d0df]">0{index+1}</span>
              {section===id && <span className="absolute bottom-0 left-0 h-1 w-full bg-[#c8102e]" />}
            </button>)}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe3ef] pt-5">
            <p className="text-xs text-[#60738f]">Los indicadores se actualizan con los registros de la aplicación.</p>
            <div className="flex flex-wrap gap-3"><Button variant="outline" className="border-[#b7c6d9] bg-white text-[#0b234a] hover:bg-[#edf2f9]" onClick={saveNotes}><Save className="mr-2 h-4 w-4" />{saved?"Guardar textos":"Guardar cambios"}</Button><Button className="bg-[#0b234a] text-white hover:bg-[#173c71]" onClick={printReport}><Printer className="mr-2 h-4 w-4" />Imprimir / Guardar PDF</Button></div>
          </div>
        </div>
      </div>
      <div id="annual-report-details" className="annual-screen-only annual-report-shell overflow-hidden rounded-2xl border border-[#d6deea] bg-white shadow-[0_8px_24px_rgba(11,35,74,0.07)]">
        <div className="flex items-center gap-3 border-b border-[#dbe3ef] bg-[#0b234a] px-6 py-4 text-white"><span className="h-7 w-1 rounded-full bg-[#c8102e]" /><span className="text-sm font-bold uppercase tracking-wider">{sections.find(item=>item.id===section)?.label}</span><span className="ml-auto text-xs text-[#cbd7e9]">Temporada {year}</span></div>
        <div className="p-5 sm:p-8">{section==="anthro"?anthroContent:section==="hydration"?hydrationContent:section==="interventions"?interventionsContent:conclusionsContent}</div>
      </div>
      <div className="annual-print hidden space-y-8">
        <div className="border-b-4 border-[#c8102e] pb-5"><p className="text-sm font-semibold uppercase tracking-widest text-[#c8102e]">San Lorenzo de Almagro · Fútbol Femenino</p><h1 className="mt-2 text-3xl font-bold text-[#0b234a]">Informe Anual de Gestión Nutricional</h1><p className="mt-2 text-lg">Temporada {year}</p></div>
        <div className="annual-print-section">{anthroContent}</div>
        <div className="annual-print-section">{hydrationContent}</div>
        <div className="annual-print-section"><SectionTitle>Intervenciones nutricionales</SectionTitle><p className="whitespace-pre-wrap text-sm leading-7">{notes.interventions || "Pendiente de completar."}</p></div>
        <div className="annual-print-section"><SectionTitle>Conclusiones y proyecciones</SectionTitle><p className="whitespace-pre-wrap text-sm leading-7">{notes.conclusions || "Pendiente de completar."}</p></div>
        <p className="border-t pt-3 text-xs text-muted-foreground">Informe generado a partir de los registros disponibles en la aplicación. Los resultados descriptivos deben interpretarse según la cobertura de cada período.</p>
      </div>
    </div>
  </AppLayout>;
}
