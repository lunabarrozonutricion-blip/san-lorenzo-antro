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
const interventionAxes=[["Monitoreo antropométrico y composición corporal","Seguimiento de la sumatoria de seis pliegues cutáneos con controles mensuales o quincenales y evaluaciones antropométricas completas aproximadamente cada dos meses. Se incluyen controles de peso corporal con una frecuencia de referencia de al menos una vez por semana, adaptados al calendario deportivo, los períodos de descanso y las necesidades de seguimiento individual. La frecuencia de las evaluaciones se ajusta a la planificación y a las necesidades del plantel."],["Atención nutricional individualizada","Espacios de consulta y seguimiento con las jugadoras, establecimiento de objetivos y elaboración de planes alimentarios individualizados, principalmente mediante un sistema de intercambios."],["Educación alimentaria y nutricional","Charlas educativas definidas a partir de diagnósticos de situación, necesidades identificadas y prioridades nutricionales surgidas durante la temporada."],["Monitoreo de hábitos y registros alimentarios","Implementación de una herramienta digital de registro alimentario fotográfico para observar hábitos, brindar devoluciones individuales y acompañar el seguimiento nutricional."],["Taller práctico de alimentación","Actividad participativa de cocina orientada a aplicar contenidos nutricionales en situaciones cotidianas y fortalecer la autonomía alimentaria."]];
const names=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function GuestReport(){
 const owner = new URLSearchParams(window.location.search).get("owner")??"";
 const [password,setPassword]=useState("");
 const [token,setToken]=useState("");
 const [report,setReport]=useState<Report|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [refreshedAt,setRefreshedAt]=useState<string>("");
 const [section,setSection]=useState<"anthro"|"hydration"|"interventions"|"conclusions">("anthro");
 const [months,setMonths]=useState<number[]>([]);
 const [stat,setStat]=useState<"mediana"|"media">("mediana");
 const [evolutionOnly,setEvolutionOnly]=useState(false);
 const [evolutionMonths,setEvolutionMonths]=useState<number[]>([]);
 const [compare,setCompare]=useState<string>("latest");
 const [showDay,setShowDay]=useState(false);
 const [showMonth,setShowMonth]=useState(false);
 const [expandedAxis,setExpandedAxis]=useState<number|null>(null);
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
   setToken(result.token);setReport(data);setPassword("");setRefreshedAt("");
  }catch(e){setError(e instanceof Error?e.message:"Error de acceso");}
  finally{setBusy(false);}
 };
 const reload=async()=>{
  setBusy(true);setError("");
  try{setReport(await call({action:"report",token}));setRefreshedAt(new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));}
  catch(e){setError(e instanceof Error?e.message:"Sesión vencida");setToken("");setReport(null);}
  finally{setBusy(false);}
 };
 const visible=useMemo(()=>report?.monthly.filter(m=>m.count>0&&(months.length===0||months.includes(m.month)))??[],[report,months]);
 const average=(values:number[])=>values.reduce((a,b)=>a+b,0)/values.length;
 const median=(values:number[])=>values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
 const evolution=(report?.monthly??[]).filter(m=>m.count>0&&(!evolutionOnly||evolutionMonths.length===0||evolutionMonths.includes(m.month))&&m[stat==="media"?"mean":"median"]!==null);
 const evolutionValues=evolution.map(m=>m[stat==="media"?"mean":"median"] as number);
 const evolutionLast=evolutionValues.at(-1);
 const evolutionDelta=evolutionValues.length>1?evolutionValues[evolutionValues.length-1]-evolutionValues[0]:null;
 const evolutionMin=evolutionValues.length?Math.floor((Math.min(...evolutionValues)-5)/5)*5:0;
 const evolutionMax=evolutionValues.length?Math.ceil((Math.max(...evolutionValues)+5)/5)*5:100;
 const chartX=(index:number)=>55+index*(650/Math.max(1,evolution.length-1));
 const chartY=(value:number)=>210-(value-evolutionMin)*150/Math.max(1,evolutionMax-evolutionMin);
 const days=report?.hydrationDays.filter(d=>d.count>0)??[];
 const current=days[days.length-1];
 const monthlyHydration=names.map((name,i)=>{const entries=days.filter(d=>Number(d.date.slice(5,7))===i+1);const count=entries.reduce((n,d)=>n+d.count,0);const inTarget=entries.reduce((n,d)=>n+d.inTarget,0);return {name,tests:entries.length,count,inTarget};}).filter(m=>m.tests>0);
 const hydrationCount=days.reduce((n,d)=>n+d.count,0);
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
     <nav className="flex flex-wrap gap-2">{([["anthro","Antropometría"],["hydration","Hidratación"],["interventions","Intervenciones"]] as const).map(([key,label])=><button key={key} onClick={()=>setSection(key)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${section===key?"border-[#0b234a] bg-[#0b234a] text-white":"border-slate-300 bg-white"}`}>{label}</button>)}</nav>
     <div className="flex flex-col items-end gap-1"><button disabled={busy} onClick={()=>void reload()} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-60">{busy?"Actualizando…":"Actualizar datos"}</button>{refreshedAt&&<span role="status" className="text-xs text-emerald-700">Datos actualizados a las {refreshedAt}</span>}</div>
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
      <section className="overflow-hidden rounded-2xl border border-[#d5deeb] bg-white">
       <div className="bg-[#153361] px-5 py-6 text-white sm:px-7"><p className="text-xs font-bold uppercase tracking-widest text-rose-200">Evolución de la temporada</p><h3 className="mt-1 text-xl font-bold">Evolución de la {stat} grupal de Sum6</h3><p className="mt-1 text-xs text-slate-200">Sumatoria de seis pliegues · milímetros</p></div>
       <div className="space-y-6 p-5 sm:p-7">
        <div className="rounded-xl border bg-[#f1f5fa] p-4"><label className="font-semibold"><input className="mr-2" type="checkbox" checked={evolutionOnly} onChange={e=>setEvolutionOnly(e.target.checked)}/>Comparar meses específicos en evolución grupal</label><p className="mt-2 text-xs text-slate-500">Por defecto se muestra toda la temporada. Este filtro es independiente de la distribución por rangos.</p>{evolutionOnly&&<div className="mt-3 flex flex-wrap gap-2">{(report?.monthly??[]).filter(m=>m.count>0).map(m=><label key={m.month} className="rounded-lg border bg-white px-3 py-2 text-xs"><input className="mr-2" type="checkbox" checked={evolutionMonths.includes(m.month)} onChange={e=>setEvolutionMonths(v=>e.target.checked?[...v,m.month]:v.filter(x=>x!==m.month))}/>{names[m.month-1]}</label>)}</div>}</div>
        <div className="inline-flex rounded-xl bg-[#eaf0f8] p-1">{(["media","mediana"] as const).map(option=><button key={option} onClick={()=>setStat(option)} className={`rounded-lg px-5 py-2 font-semibold ${stat===option?"bg-[#0b234a] text-white":"text-[#0b234a]"}`}>{option==="media"?"Media":"Mediana"}</button>)}</div>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Última {stat} disponible</p><p className="mt-1 text-4xl font-extrabold">{evolutionLast===undefined?"—":evolutionLast.toFixed(1).replace(".",",")} <span className="text-base font-normal text-slate-500">mm</span></p></div><div className="rounded-xl bg-[#eaf0f8] px-5 py-4 text-right"><p className="text-xs text-slate-500">Variación entre períodos mostrados</p><p className={`text-2xl font-bold ${evolutionDelta!==null&&evolutionDelta<0?"text-emerald-700":"text-[#0b234a]"}`}>{evolutionDelta===null?"—":(evolutionDelta>0?"+":"")+evolutionDelta.toFixed(1).replace(".",",")+" mm"}</p></div></div>
        {evolution.length>0?<div className="w-full overflow-x-auto"><svg viewBox="0 0 760 290" className="min-w-[520px] w-full" role="img" aria-label={`Evolución de la ${stat} grupal de Sum6`}>{Array.from({length:5},(_,j)=><line key={j} x1="45" x2="720" y1={60+j*38} y2={60+j*38} stroke="#d9e3ef" strokeDasharray="4 5"/>)}<polyline fill="none" stroke="#c8102e" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={evolutionValues.map((v,j)=>`${chartX(j)},${chartY(v)}`).join(" ")}/>{evolution.map((m,j)=><g key={m.month}><circle cx={chartX(j)} cy={chartY(evolutionValues[j])} r="6" fill="#c8102e" stroke="white" strokeWidth="2"/><text x={chartX(j)} y={chartY(evolutionValues[j])-15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0b234a">{evolutionValues[j].toFixed(1).replace(".",",")} mm</text><text x={chartX(j)} y="260" textAnchor="middle" fontSize="12" fill="#60738f">{names[m.month-1].slice(0,3)}</text></g>)}</svg></div>:<p className="text-sm text-slate-500">No hay mediciones disponibles.</p>}
       </div>
      </section>
     </>}
     {section==="hydration"&&<div className="space-y-6">
      <h2 className="text-xl font-bold">Hidratación del plantel</h2>
      <div className="overflow-hidden rounded-2xl border border-[#cbd6e5] bg-[#edf2f9]">
       <div className="bg-[#0b234a] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-rose-200">Evolución de la temporada</p><h3 className="mt-1 text-xl font-bold">Comparativa entre jornadas de hidratación</h3><p className="mt-1 text-xs text-slate-200">Resultados válidos · porcentaje dentro del objetivo y orina concentrada</p></div>
       <div className="p-5"><label className="text-sm font-semibold">Comparar el inicio con: <select value={compare} onChange={e=>setCompare(e.target.value)} className="ml-2 max-w-full rounded-lg border bg-white p-2"><option value="latest">Última jornada registrada</option>{days.slice(1).map(d=><option key={d.date} value={d.date}>{d.date}</option>)}</select></label>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{[days[0],compare==="latest"?current:days.find(d=>d.date===compare)].map((d,i)=><div key={i} className="rounded-xl border bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#c8102e]">{i===0?"Inicio":"Jornada seleccionada"}</p><p className="mt-1 text-sm font-semibold">{d?.date??"Sin datos"}</p>{d&&d.count>0?<><div className="mt-5 flex h-40 items-end justify-center gap-10 border-b pb-1">{[{name:"Dentro del objetivo",count:d.inTarget,color:"#14866d"},{name:"Orina concentrada",count:d.count-d.inTarget,color:"#c8102e"}].map(bar=><div key={bar.name} className="flex h-full w-24 flex-col items-center justify-end gap-1"><span className="text-sm font-bold">{(100*bar.count/d.count).toFixed(0)}%</span><div className="w-16 rounded-t-md" style={{height:`${Math.max(3,100*bar.count/d.count)}%`,backgroundColor:bar.color}}/></div>)}</div><div className="mt-3 grid grid-cols-2 text-center text-xs"><p className="font-bold text-emerald-700">Dentro del objetivo<br/>{d.inTarget} jugadoras</p><p className="font-bold text-rose-700">Orina concentrada<br/>{d.count-d.inTarget} jugadoras</p></div><p className="mt-3 text-center text-xs text-slate-500">{d.count} mediciones válidas</p></>:<p className="mt-4 text-sm">Sin mediciones válidas</p>}</div>)}</div>
       </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#cbd6e5] bg-[#f1f5fa]"><div className="bg-[#0b234a] p-5 text-white"><h3 className="text-lg font-bold">Evolución histórica de hidratación</h3><p className="text-xs text-slate-200">Consultá el seguimiento solo cuando lo necesites.</p></div><div className="space-y-4 p-5"><div className="flex flex-wrap gap-3"><label className="rounded-lg border bg-white px-4 py-3 text-sm font-semibold"><input className="mr-2" type="checkbox" checked={showDay} onChange={e=>setShowDay(e.target.checked)}/>Mostrar evolución por jornada</label><label className="rounded-lg border bg-white px-4 py-3 text-sm font-semibold"><input className="mr-2" type="checkbox" checked={showMonth} onChange={e=>setShowMonth(e.target.checked)}/>Mostrar evolución mensual</label></div>
      {showDay&&<div className="space-y-3 rounded-xl bg-white p-5"><h4 className="font-semibold">Evolución por jornada</h4>{days.map(d=><div key={d.date} className="grid grid-cols-[95px_1fr] items-center gap-3 text-xs"><span>{d.date}</span><div><div className="h-4 overflow-hidden rounded-full bg-rose-200"><div className="h-full bg-emerald-500" style={{width:`${100*d.inTarget/d.count}%`}}/></div><p className="mt-1 text-slate-500">{(100*d.inTarget/d.count).toFixed(0)}% dentro del objetivo · {d.count} resultados</p></div></div>)}</div>}
      {showMonth&&<div className="space-y-3 rounded-xl bg-white p-5"><h4 className="font-semibold">Evolución mensual de hidratación</h4>{monthlyHydration.map(m=><div key={m.name} className="grid grid-cols-[80px_1fr] items-center gap-3 text-xs"><span>{m.name}</span><div><div className="h-4 overflow-hidden rounded-full bg-rose-200"><div className="h-full bg-emerald-500" style={{width:`${m.count?100*m.inTarget/m.count:0}%`}}/></div><p className="mt-1 text-slate-500">{m.count?(100*m.inTarget/m.count).toFixed(0)+"% dentro del objetivo · "+m.count+" mediciones · "+m.tests+" tests":m.tests+" tests · sin mediciones válidas"}</p></div></div>)}</div>}</div></div>
      <div className="overflow-hidden rounded-2xl border"><div className="bg-[#0b234a] p-5 text-white"><p className="text-xs uppercase tracking-widest text-rose-200">Datos complementarios</p><h3 className="text-lg font-bold">Datos generales de hidratación</h3></div><div className="grid gap-3 p-5 sm:grid-cols-2"><div className="rounded-xl bg-[#0b234a] p-5 text-white"><p className="text-xs uppercase">Jornadas de test</p><p className="mt-2 text-4xl font-extrabold">{days.length}</p></div><div className="rounded-xl bg-[#eaf0f8] p-5"><p className="text-xs uppercase">Mediciones válidas</p><p className="mt-2 text-4xl font-extrabold">{hydrationCount}</p></div></div></div>
     </div>}
     {section==="interventions"&&<><h2 className="text-xl font-bold">Intervenciones y estrategias de abordaje nutricional</h2><div className="overflow-hidden rounded-2xl border bg-[#edf2f9]"><div className="bg-[#0b234a] p-4 text-white"><h3 className="font-semibold">Cinco ejes de intervención · Temporada 2026</h3><p className="mt-1 text-xs">Seleccioná cada eje para leer su descripción.</p></div><div className="space-y-3 p-4">{interventionAxes.map(([title,detail],i)=><div key={title} className="rounded-xl border bg-white"><button type="button" onClick={()=>setExpandedAxis(v=>v===i?null:i)} className="flex w-full items-center justify-between p-4 text-left font-semibold"><span>{i+1}. {title}</span><span>{expandedAxis===i?"−":"+"}</span></button>{expandedAxis===i&&<div className="space-y-3 px-4 pb-4"><p className="text-sm leading-7">{detail}</p>
          {i===2&&<div className="rounded-lg border border-[#d5deeb] bg-[#f4f7fb] p-4"><h4 className="font-semibold">Material de educación alimentaria y nutricional</h4><p className="mt-1 text-xs text-slate-600">Presentaciones y documentos de las charlas educativas.</p><div className="mt-3 space-y-2">{(report.materials??[]).filter(m=>m.kind==="charlas"&&!/carbohidratos en deportes intermitentes/i.test(m.name)).sort((a,b)=>{const rank=(name:string)=>/desayun/i.test(name)?0:/hidrat/i.test(name)?1:/carbohidr/i.test(name)?2:/cafe[ií]na/i.test(name)?3:4;return rank(a.name)-rank(b.name)||a.name.localeCompare(b.name);}).map(m=><a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border bg-white px-3 py-2 text-sm font-medium text-[#0b234a] underline">Ver material · {m.name}</a>)}{!(report.materials??[]).some(m=>m.kind==="charlas")&&<p className="text-sm text-slate-500">Todavía no hay PDF de charlas disponibles.</p>}</div></div>}
          {i===4&&<div className="space-y-4 rounded-lg border border-[#d5deeb] bg-[#f4f7fb] p-4"><div><h4 className="font-semibold">Ideas de recetas y materiales del taller</h4><div className="mt-3 space-y-2">{(report.materials??[]).filter(m=>m.kind==="talleres").map(m=><a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border bg-white px-3 py-2 text-sm font-medium underline">Ver material · {m.name}</a>)}{!(report.materials??[]).some(m=>m.kind==="talleres")&&<p className="text-sm text-slate-500">Todavía no hay documentos o recetas disponibles.</p>}</div></div><div><h4 className="font-semibold">Fotografías del taller</h4><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{(report.materials??[]).filter(m=>m.kind==="fotos").map(m=><a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer"><img src={m.url} alt="Fotografía del taller práctico de alimentación" loading="lazy" className="aspect-square w-full rounded-lg object-cover"/></a>)}</div>{!(report.materials??[]).some(m=>m.kind==="fotos")&&<p className="mt-2 text-sm text-slate-500">Todavía no hay fotografías disponibles.</p>}</div></div>}
         </div>}</div>)}</div></div><p className="whitespace-pre-wrap leading-7">{report.notes.interventions||"Todavía no hay textos publicados."}</p>
     </>}
     {section==="conclusions"&&<><h2 className="text-xl font-bold">Conclusiones y proyecciones</h2><p className="whitespace-pre-wrap leading-7">{report.notes.conclusions||"Todavía no hay conclusiones publicadas."}</p></>}
    </main>
    <p className="text-center text-xs text-slate-500">Información grupal agregada · Sin acceso a fichas individuales · La sesión vence automáticamente a los 30 minutos.</p>
   </>}
  </div>
 </div>;
}
