import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useFullAnthropometries } from "@/lib/hooks";
import { adiposeGoalEquivalence } from "@/lib/goal-equivalences";
import { Button } from "@/components/ui/button";

const parse = (v:string) => v.trim() === "" ? null : Number(v.replace(",","."));
const fmt = (v:number|null|undefined,unit="") => v==null || !Number.isFinite(v) ? "—" : v.toLocaleString("es-AR",{maximumFractionDigits:2})+unit;
type Values = {weight_min:string;weight_max:string;muscle:string;adipose:string;notes:string};
const empty:Values={weight_min:"",weight_max:"",muscle:"",adipose:"",notes:""};
export function PlayerAnnualTargets({playerId,onSaved}:{playerId:number;onSaved?:()=>void}){
 const evaluations=useFullAnthropometries(playerId);
 const baseline=(evaluations??[]).filter(e=>e.date.startsWith("2026")).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const muscle=baseline?.results?.weightAdjustedMassesKg?.muscle??null;
 const bone=baseline?.results?.weightAdjustedMassesKg?.bone??null;
 const height=baseline?.measures.stature?.median??null;
 const folds=(["triceps","subscapular","supraespinal","abdominal","thighSkinfold","calfSkinfold"] as const).map(k=>baseline?.measures[k]?.median);
 const baselineSum6=folds.every(v=>v!=null&&Number.isFinite(v))?folds.reduce<number>((s,v)=>s+(v??0),0):null;
 const [values,setValues]=useState<Values>(empty);
 const [muscleMode,setMuscleMode]=useState<"kg"|"imo">("kg");
 const [adiposeMode,setAdiposeMode]=useState<"kg"|"z"|"sum6">("sum6");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);setValues(empty);
  void(async()=>{if(!supabase){if(active)setLoading(false);return;}
   const {data:{user}}=await supabase.auth.getUser();if(!user){if(active)setLoading(false);return;}
   const {data,error}=await supabase.from("player_annual_targets").select("*").eq("owner_id",user.id).eq("player_id",playerId).eq("season",2027).maybeSingle();
   if(!active)return;if(error)toast.error("No se pudieron cargar los objetivos 2027");
   if(data){const mm=data.muscle_input_mode==="imo"?"imo":"kg",am=["kg","z","sum6"].includes(data.adipose_input_mode)?data.adipose_input_mode:"sum6";setMuscleMode(mm);setAdiposeMode(am);
    setValues({weight_min:data.weight_min?.toString()??"",weight_max:data.weight_max?.toString()??"",muscle:(mm==="imo"?data.target_imo:data.muscle_mass_target_kg)?.toString()??"",adipose:(am==="kg"?data.target_adipose_excel_kg:am==="z"?data.target_z:data.sum6_expected)?.toString()??"",notes:data.notes??""});}
   setLoading(false);
  })();return()=>{active=false;};},[playerId]);
 const update=(key:keyof Values,value:string)=>setValues(v=>({...v,[key]:value}));
 const mv=parse(values.muscle),av=parse(values.adipose),min=parse(values.weight_min),max=parse(values.weight_max);
 const targetMuscle=mv==null?null:muscleMode==="imo"?(bone!=null&&bone>0?mv*bone:null):mv;
 const targetIMO=targetMuscle!=null&&bone!=null&&bone>0?targetMuscle/bone:null;
 const equivalent=av!=null&&height!=null?adiposeGoalEquivalence({heightCm:height,...(adiposeMode==="kg"?{excelAdiposeKg:av}:adiposeMode==="z"?{z:av}:{sum6mm:av})}):null;
 const deltaMuscle=targetMuscle!=null&&muscle!=null?targetMuscle-muscle:null;
 const deltaSum6=equivalent?.sum6mm!=null&&baselineSum6!=null?equivalent.sum6mm-baselineSum6:null;
 async function save(){
  if(!supabase||!baseline||height==null){toast.error("Se necesita una antropometría completa de 2026 para calcular los objetivos.");return;}
  if([mv,av,min,max].some(v=>v!=null&&!Number.isFinite(v))||[mv,min,max].some(v=>v!=null&&v<=0)||(av!=null&&adiposeMode!=="z"&&av<0)){toast.error("Revisá los valores ingresados.");return;}
  if(min!=null&&max!=null&&min>max){toast.error("El peso mínimo supera al máximo.");return;}
  if(mv!=null&&targetMuscle==null){toast.error("No se pudo calcular la masa muscular: falta masa ósea para el IMO.");return;}
  if(av!=null&&!equivalent){toast.error("No se pudieron calcular las equivalencias adiposas.");return;}
  setSaving(true);try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error("Iniciá sesión.");
   const payload={owner_id:user.id,player_id:playerId,season:2027,baseline_anthropometry_id:baseline.id??null,baseline_date:baseline.date,
    weight_min:min,weight_max:max,muscle_mass_target_kg:targetMuscle,target_imo:targetIMO,
    sum6_expected:equivalent?.sum6mm??null,target_z:equivalent?.z??null,target_adipose_excel_kg:equivalent?.excelAdiposeKg??null,
    adipose_mass_target_kg:null,muscle_input_mode:muscleMode,adipose_input_mode:adiposeMode,notes:values.notes.trim()||null,updated_at:new Date().toISOString()};
   const {error}=await supabase.from("player_annual_targets").upsert(payload,{onConflict:"owner_id,player_id,season"});if(error)throw error;
   toast.success("Proyección 2027 guardada sin modificar los objetivos actuales.");onSaved?.();
  }catch(e){toast.error(e instanceof Error?e.message:"No se pudo guardar");}finally{setSaving(false);}
 }
 const input="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-base text-[#0B234A]";
 return <section className="rounded-xl border border-[#D6DDE8] bg-white p-5 shadow-panel">
  <div className="mb-4 rounded-lg bg-gradient-to-r from-[#0B234A] to-[#8D1731] px-4 py-3 text-white"><h3 className="text-lg font-semibold">Proyección antropométrica individual · 2027</h3><p className="mt-1 text-xs text-white/80">Objetivos definidos para el regreso del receso</p></div>
  <div className="mb-4 rounded-lg border border-[#D6E0EE] bg-[#F0F4FA] p-4 text-sm"><p className="font-semibold text-[#0B234A]">Antropometría de referencia · {baseline?.date??"Pendiente"}</p>
   {baseline?<p className="mt-2">Masa muscular: <strong>{fmt(muscle," kg")}</strong> · IMO: <strong>{fmt(muscle!=null&&bone!=null&&bone>0?muscle/bone:null)}</strong> · Sum6: <strong>{fmt(baselineSum6," mm")}</strong></p>:<p className="mt-2 text-amber-800">Todavía no hay una antropometría completa de 2026 para usar como referencia.</p>}
   <p className="mt-2 text-xs text-muted-foreground">Se utiliza la última antropometría completa de 2026. Los objetivos 2027 se guardan por separado de los objetivos de la temporada.</p>
  </div>
  <div className="grid gap-4 md:grid-cols-2">
   <div className="rounded-lg border border-[#D6E0EE] bg-[#F0F4FA] p-4"><h4 className="font-semibold text-[#0B234A]">Objetivo muscular</h4><select className={input} value={muscleMode} onChange={e=>{setMuscleMode(e.target.value as "kg"|"imo");update("muscle","");}}><option value="kg">Masa muscular (kg)</option><option value="imo">IMO objetivo</option></select><input className={input} inputMode="decimal" value={values.muscle} onChange={e=>update("muscle",e.target.value)} placeholder="Valor objetivo"/><p className="mt-3 text-sm">MM proyectada: <strong>{fmt(targetMuscle," kg")}</strong> · IMO: <strong>{fmt(targetIMO)}</strong></p><p className="text-xs text-muted-foreground">Variación muscular: {fmt(deltaMuscle," kg")}</p></div>
   <div className="rounded-lg border border-[#E6C6CE] bg-[#FCF0F3] p-4"><h4 className="font-semibold text-[#8D1731]">Objetivo adiposo</h4><select className={input} value={adiposeMode} onChange={e=>{setAdiposeMode(e.target.value as "kg"|"z"|"sum6");update("adipose","");}}><option value="sum6">Sum6 equivalente (mm)</option><option value="z">Z-score adiposo</option><option value="kg">Tejido adiposo estimado (kg)</option></select><input className={input} inputMode="decimal" value={values.adipose} onChange={e=>update("adipose",e.target.value)} placeholder="Valor objetivo"/><p className="mt-3 text-sm">Sum6: <strong>{fmt(equivalent?.sum6mm," mm")}</strong> · Z: <strong>{fmt(equivalent?.z)}</strong></p><p className="text-sm">TA estimado: <strong>{fmt(equivalent?.excelAdiposeKg," kg")}</strong></p><p className="text-xs text-muted-foreground">Variación Sum6: {fmt(deltaSum6," mm")}. TA estimado por equivalencias, no masa adiposa Kerr.</p></div>
  </div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">{([{key:"weight_min",label:"Carril de peso mínimo (kg)"},{key:"weight_max",label:"Carril de peso máximo (kg)"}] as const).map(f=><label key={f.key} className="rounded-lg border border-[#D6E0EE] bg-[#F0F4FA] p-3 text-xs font-semibold text-[#23416A]">{f.label}<input className={input} inputMode="decimal" value={values[f.key]} onChange={e=>update(f.key,e.target.value)} placeholder="Opcional · definir al cierre"/></label>)}</div>
  <label className="mt-4 block text-sm font-semibold text-[#0B234A]">Fundamento y observaciones<textarea rows={3} value={values.notes} onChange={e=>update("notes",e.target.value)} placeholder="Criterio profesional para los objetivos de regreso del receso..." className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm font-normal"/></label>
  <Button type="button" className="no-print mt-3" disabled={loading||saving||!baseline} onClick={()=>void save()}><Save className="mr-2 h-4 w-4"/>Guardar proyección 2027</Button>
 </section>;
}
