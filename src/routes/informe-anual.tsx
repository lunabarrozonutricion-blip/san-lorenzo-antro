import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Droplets, ClipboardList, Target, Printer, FileBarChart, Save } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { useControls, useHydrationTests, usePlayers } from "@/lib/hooks";
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
function AnnualNutritionReport() {
  const players = usePlayers();
  const controls = useControls();
  const hydrationTests = useHydrationTests();
  const [year, setYear] = useState(2026);
  const [section, setSection] = useState<Section>("anthro");
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
  const activeMonths = monthly.filter(m => m.count > 0);
  const first = activeMonths[0], last = activeMonths[activeMonths.length - 1];
  const tests = useMemo(() => (hydrationTests ?? []).filter(t => t.date.startsWith(String(year))), [hydrationTests, year]);
  const hydration = useMemo(() => {
    const measured = tests.flatMap(t => t.entries).filter(e => e.value !== null && Number.isFinite(e.value));
    const hydrated = measured.filter(e => (e.value as number) <= 1020).length;
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
  const chart = <div className="space-y-4">{activeMonths.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay mediciones de Sum6 en esta temporada.</p> : activeMonths.map(m => <div key={m.name} className="grid grid-cols-[80px_1fr] items-center gap-3"><span className="text-sm font-medium">{m.name}</span><div><div className="flex h-5 overflow-hidden rounded-full bg-muted">{(["green","yellow","red"] as const).map(key => <div key={key} style={{width:`${m.groups[key]/m.count*100}%`,backgroundColor:bandColors[key]}} />)}</div><div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span>Verde {Math.round(m.groups.green/m.count*100)}%</span><span>Amarillo {Math.round(m.groups.yellow/m.count*100)}%</span><span>Rojo {Math.round(m.groups.red/m.count*100)}%</span><span>{m.count} jugadoras</span></div></div></div>)}</div>;
  const anthroContent = <div className="space-y-5"><SectionTitle subtitle="Última medición válida de cada jugadora por mes. Los porcentajes se calculan solo sobre jugadoras medidas.">Evolución antropométrica del plantel</SectionTitle><div className="grid gap-3 sm:grid-cols-3"><Metric label="Jugadoras evaluadas" value={String(measuredPlayers)} /><Metric label="Controles Sum6" value={String(yearControls.length)} /><Metric label="Último promedio mensual" value={last?.average != null ? `${number(last.average)} mm` : "—"} detail={last ? last.name : "Sin mediciones"} /></div><div className="rounded-xl border border-border p-5"><h3 className="mb-4 font-semibold">Distribución por rangos de Sum6</h3>{chart}<div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>🟢 Verde: &lt;70 mm</span><span>🟡 Amarillo: 70–90 mm</span><span>🔴 Rojo: &gt;90 mm</span></div></div><p className="text-xs text-muted-foreground">Los cambios en porcentajes no implican necesariamente una mejora individual: la cantidad e identidad de las jugadoras medidas puede variar entre meses. La Sum6 se interpreta en función de cada objetivo y contexto deportivo.</p></div>;
  const hydrationContent = <div className="space-y-5"><SectionTitle subtitle="Resultados de los registros de hidratación cargados durante la temporada.">Seguimiento del estado de hidratación</SectionTitle><div className="grid gap-3 sm:grid-cols-4"><Metric label="Jornadas de test" value={String(tests.length)} /><Metric label="Mediciones válidas" value={String(hydration.measured)} /><Metric label="Bien hidratadas" value={hydration.measured ? `${Math.round(hydration.hydrated/hydration.measured*100)}%` : "—"} /><Metric label="Deshidratadas" value={hydration.measured ? `${Math.round(hydration.dehydrated/hydration.measured*100)}%` : "—"} /></div><div className="rounded-xl border border-border p-5"><h3 className="mb-3 font-semibold">Distribución de resultados</h3>{hydration.measured ? <><div className="flex h-7 overflow-hidden rounded-full"><div className="bg-emerald-500" style={{width:`${hydration.hydrated/hydration.measured*100}%`}} /><div className="bg-rose-400" style={{width:`${hydration.dehydrated/hydration.measured*100}%`}} /></div><div className="mt-3 flex flex-wrap gap-5 text-sm"><span>Bien hidratadas: {hydration.hydrated}</span><span>Deshidratadas: {hydration.dehydrated}</span><span>Sin medición: {hydration.withoutValue}</span></div></> : <p className="text-sm text-muted-foreground">No hay resultados registrados para esta temporada.</p>}</div><p className="text-xs text-muted-foreground">Clasificación utilizada por el módulo de hidratación: valores hasta 1020 = bien hidratada; superiores a 1020 = deshidratada. Se cuentan resultados de tests, no personas únicas.</p></div>;
  const interventionsContent = <div className="space-y-4"><SectionTitle subtitle="Registrá el trabajo del área: educación alimentaria, desayunos, colaciones, viajes, estrategias de hidratación y seguimiento individual.">Intervenciones nutricionales realizadas</SectionTitle><textarea className="min-h-56 w-full rounded-xl border border-input bg-background p-4 text-sm leading-7" placeholder="Describí las actividades realizadas durante la temporada, su frecuencia y alcance..." value={notes.interventions} onChange={e=>{setNotes(n=>({...n,interventions:e.target.value}));setSaved(false);}} /><p className="text-xs text-muted-foreground">Este texto se guarda en el navegador actual. No se sincroniza todavía con Supabase.</p></div>;
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
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <label htmlFor="annual-year" className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#cbd7e9]">Temporada</label>
              <select id="annual-year" className="min-w-28 bg-transparent text-lg font-bold text-white outline-none [&>option]:text-[#0b234a]" value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:7},(_,i)=>2025+i).map(y=><option key={y} value={y}>{y}</option>)}</select>
            </div>
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
