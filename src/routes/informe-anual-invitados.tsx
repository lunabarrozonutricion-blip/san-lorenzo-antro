import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClientOnly } from "@/components/client-only";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/informe-anual-invitados")({
  component: () => <ClientOnly><GuestReport /></ClientOnly>,
});
type Month = { month:number; count:number; mean:number|null; median:number|null; groups:number[] };
type Day = {date:string;count:number;inTarget:number};
type Report = {year:number;monthly:Month[];hydrationDays:Day[];weightDays:number;materials:{kind:string;name:string;url:string}[];notes:{interventions:string;conclusions:string}};
const names=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function GuestReport(){
 const owner = new URLSearchParams(window.location.search).get("owner")??"";
 const [password,setPassword]=useState("");
 const [token,setToken]=useState("");
 const [report,setReport]=useState<Report|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [section,setSection]=useState<"anthro"|"hydration"|"interventions"|"conclusions">("anthro");
 const [months,setMonths]=useState<number[]>([]);
 const [stat,setStat]=useState<"mediana"|"media">("mediana");
 const [compare,setCompare]=useState<string>("latest");
 const call=async(body:Record<string,unknown>)=>{
  if(!supabase) throw Error("La conexión no está disponible.");
  const {data,error}=await supabase.functions.invoke("annual-report-guest",{body:{...body,ownerId:owner}});
  if(error||data?.error) throw Error(data?.error??"No se pudo consultar el informe.");
  return data;
 };
 const enter=async(e:React.FormEvent)=>{
  e.preventDefault();setBusy(true);setError("");
  try{
   const result=await call({action:"login",password});
   const data=await call({action:"report",token:result.token});
   setToken(result.token);setReport(data);setPassword("");
  }catch(e){setError(e instanceof Error?e.message:"Error de acceso");}
  finally{setBusy(false);}
 };
 const reload=async()=>{
  setBusy(true);setError("");
  try{setReport(await call({action:"report",token}));}
  catch(e){setError(e instanceof Error?e.message:"Sesión vencida");setToken("");setReport(null);}
  finally{setBusy(false);}
 };
 const visible=useMemo(()=>report?.monthly.filter(m=>m.count>0&&(months.length===0||months.includes(m.month)))??[],[report,months]);
 const average=(values:number[])=>values.reduce((a,b)=>a+b,0)/values.length;
 const median=(values:number[])=>values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
 const days=report?.hydrationDays.filter(d=>d.count>0)??[];
 const current=days[days.length-1];
 const baseline=compare==="latest"?days[0]:days.find(d=>d.date===compare);
 return <div className="min-h-screen bg-[#f0f4f9] px-4 py-8 text-[#0b234a]">
  <div className="mx-auto max-w-5xl space-y-5">
   <header className="rounded-2xl border-t-4 border-[#c8102e] bg-[#0b234a] p-7 text-white shadow">
    <p className="text-xs font-semibold uppercase tracking-widest text-[#f4b4c0]">San Lorenzo · Fútbol Femenino</p>
    <h1 className="mt-2 text-2xl font-bold">Informe Anual Nutricional · 2026</h1>
    <p className="mt-2 text-sm text-[#d3ddea]">Acceso de invitados · Consulta interactiva de solo lectura</p>
   </header>
   {!report?<form onSubmit={enter} className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-7 shadow">
    <h2 className="text-lg font-bold">Clave de acceso</h2>
    <p className="text-sm text-slate-600">Ingresá la clave que te compartieron para consultar el informe.</p>
    <input required type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Clave de acceso" className="w-full rounded-xl border border-slate-300 p-3" />
    <button disabled={busy||!owner} className="w-full rounded-xl bg-[#0b234a] p-3 font-semibold text-white disabled:opacity-50">{busy?"Verificando...":"Ingresar al informe"}</button>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   </form>:<>
    <div className="flex flex-wrap items-center justify-between gap-3">
     <nav className="flex flex-wrap gap-2">{([["anthro","Antropometría"],["hydration","Hidratación"],["interventions","Intervenciones"],["conclusions","Conclusiones"]] as const).map(([key,label])=><button key={key} onClick={()=>setSection(key)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${section===key?"border-[#0b234a] bg-[#0b234a] text-white":"border-slate-300 bg-white"}`}>{label}</button>)}</nav>
     <button disabled={busy} onClick={()=>void reload()} className="rounded-lg border bg-white px-4 py-2 text-sm">Actualizar datos</button>
    </div>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <main className="space-y-5 rounded-2xl bg-white p-5 shadow sm:p-8">
     {section==="anthro"&&<>
      <h2 className="text-xl font-bold">Evolución antropométrica · Sumatoria de 6 pliegues</h2>
      <p className="text-sm text-slate-600">Se utiliza la última evaluación disponible de cada jugadora por mes. No se muestran datos individuales.</p>
      <div className="flex flex-wrap items-center gap-4"><label className="text-sm">Estadístico <select value={stat} onChange={e=>setStat(e.target.value as "media"|"mediana")} className="ml-2 rounded border p-2"><option value="mediana">Mediana</option><option value="media">Media</option></select></label><button onClick={()=>setMonths([])} className="text-sm underline">Todos los meses</button></div>
      <div className="flex flex-wrap gap-2">{report.monthly.filter(m=>m.count>0).map(m=><label key={m.month} className="rounded-lg border px-3 py-2 text-xs"><input type="checkbox" className="mr-2" checked={months.includes(m.month)} onChange={e=>setMonths(v=>e.target.checked?[...v,m.month]:v.filter(x=>x!==m.month))}/>{names[m.month-1]}</label>)}</div>
      <div className="space-y-4">{visible.map(m=>{
       const value=stat==="media"?m.mean:m.median;
       const groups=m.groups;
       return <div key={m.month} className="rounded-xl border p-4"><div className="mb-2 flex justify-between gap-2"><strong>{names[m.month-1]}</strong><span className="text-sm">{stat}: {value?.toFixed(1)??"—"} mm · {m.count} evaluadas</span></div><div className="flex h-4 overflow-hidden rounded-full bg-slate-100">{groups.map((n,i)=><div key={i} style={{width:`${100*n/m.count}%`,backgroundColor:["#32a47a","#e7b64b","#c8102e"][i]}}/>)}</div><p className="mt-2 text-xs text-slate-600">Menos de 70 mm: {groups[0]} · 70–90 mm: {groups[1]} · Más de 90 mm: {groups[2]}</p></div>;
      })}{visible.length===0&&<p>No hay mediciones disponibles.</p>}</div>
     </>}
     {section==="hydration"&&<>
      <h2 className="text-xl font-bold">Seguimiento de hidratación</h2>
      <p className="text-sm text-slate-600">Porcentaje de registros con densidad urinaria inferior a 1.020. Indicador descriptivo, no diagnóstico.</p>
      <label className="text-sm">Comparar la última jornada con <select value={compare} onChange={e=>setCompare(e.target.value)} className="ml-2 rounded border p-2"><option value="latest">Primera jornada registrada</option>{days.map(d=><option key={d.date} value={d.date}>{d.date}</option>)}</select></label>
      {current&&baseline&&<div className="grid gap-3 sm:grid-cols-2">{[baseline,current].map((d,i)=><div key={i} className="rounded-xl bg-[#eef3f9] p-5"><p className="text-sm">{i===0?"Jornada de comparación":"Última jornada"} · {d.date}</p><p className="mt-2 text-3xl font-bold">{(100*d.inTarget/d.count).toFixed(1)}%</p><p className="text-sm">{d.inTarget} de {d.count} registros dentro del objetivo</p></div>)}</div>}
      <h3 className="font-semibold">Evolución por jornada</h3>
      <div className="space-y-3">{days.map(d=><div key={d.date} className="grid grid-cols-[100px_1fr_55px] items-center gap-3 text-xs"><span>{d.date}</span><div className="h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0b234a]" style={{width:`${100*d.inTarget/d.count}%`}}/></div><span>{(100*d.inTarget/d.count).toFixed(0)}%</span></div>)}</div>
     </>}
     {section==="interventions"&&<><h2 className="text-xl font-bold">Intervenciones nutricionales</h2><p className="whitespace-pre-wrap leading-7">{report.notes.interventions||"Todavía no hay textos publicados."}</p>
      <h3 className="mt-6 font-semibold">Material educativo y talleres</h3>
      <div className="space-y-2">{(report.materials??[]).filter(m=>m.kind!=="fotos").map(m=><a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-slate-200 p-3 text-sm text-[#0b234a] underline">{m.kind==="charlas"?"Charla":"Taller"} · {decodeURIComponent(m.name.split("--").slice(1).join("--")||m.name)}</a>)}</div>
      <h3 className="mt-6 font-semibold">Registro fotográfico del taller</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(report.materials??[]).filter(m=>m.kind==="fotos").map(m=><a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer"><img src={m.url} alt="Registro fotográfico de taller" loading="lazy" className="aspect-square w-full rounded-lg object-cover" /></a>)}</div>
      {(report.materials??[]).length===0&&<p className="text-sm text-slate-500">Todavía no hay materiales compartidos.</p>}
     </>}
     {section==="conclusions"&&<><h2 className="text-xl font-bold">Conclusiones y proyecciones</h2><p className="whitespace-pre-wrap leading-7">{report.notes.conclusions||"Todavía no hay conclusiones publicadas."}</p></>}
    </main>
    <p className="text-center text-xs text-slate-500">Información grupal agregada · Sin acceso a fichas individuales · La sesión vence automáticamente a los 30 minutos.</p>
   </>}
  </div>
 </div>;
}
