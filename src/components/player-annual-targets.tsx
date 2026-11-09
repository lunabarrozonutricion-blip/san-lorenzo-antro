import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Target = {weight_min:number|null;weight_max:number|null;sum6_expected:number|null;muscle_mass_target_kg:number|null;adipose_mass_target_kg:number|null;notes:string|null};
export function PlayerAnnualTargets({playerId, onSaved}:{playerId:number;onSaved?:()=>void}) {
  const [values,setValues]=useState({weight_min:"",weight_max:"",sum6_expected:"",muscle_mass_target_kg:"",adipose_mass_target_kg:"",notes:""});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    let active=true;setLoading(true);setValues({weight_min:"",weight_max:"",sum6_expected:"",notes:""});
    void (async()=>{
      if(!supabase){if(active)setLoading(false);return;}
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){if(active)setLoading(false);return;}
      const {data,error}=await supabase.from("player_annual_targets").select("weight_min,weight_max,sum6_expected,muscle_mass_target_kg,adipose_mass_target_kg,notes").eq("owner_id",user.id).eq("player_id",playerId).eq("season",2027).maybeSingle();
      if(!active)return;
      if(error)toast.error("No se pudieron cargar los objetivos 2027");
      if(data)setValues({weight_min:data.weight_min?.toString()??"",weight_max:data.weight_max?.toString()??"",sum6_expected:data.sum6_expected?.toString()??"",muscle_mass_target_kg:data.muscle_mass_target_kg?.toString()??"",adipose_mass_target_kg:data.adipose_mass_target_kg?.toString()??"",notes:data.notes??""});
      setLoading(false);
    })();
    return()=>{active=false;};
  },[playerId]);
  const update=(key:keyof typeof values,value:string)=>setValues(v=>({...v,[key]:value}));
  async function save(){
    if(!supabase)return;
    const parse=(v:string)=>v.trim()===""?null:Number(v.replace(",","."));
    const min=parse(values.weight_min),max=parse(values.weight_max),sum=parse(values.sum6_expected),muscle=parse(values.muscle_mass_target_kg),adipose=parse(values.adipose_mass_target_kg);
    if([min,max,sum,muscle,adipose].some(v=>v!==null&&(!Number.isFinite(v)||v<=0))){toast.error("Ingresá valores numéricos positivos");return;}
    if(min!==null&&max!==null&&min>max){toast.error("El peso mínimo no puede superar al máximo");return;}
    setSaving(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Iniciá sesión para guardar");
      const {error}=await supabase.from("player_annual_targets").upsert({owner_id:user.id,player_id:playerId,season:2027,weight_min:min,weight_max:max,sum6_expected:sum,muscle_mass_target_kg:muscle,adipose_mass_target_kg:adipose,notes:values.notes.trim()||null,updated_at:new Date().toISOString()},{onConflict:"owner_id,player_id,season"});
      if(error)throw error;
      toast.success("Proyección antropométrica 2027 guardada");
      onSaved?.();
    }catch(e){toast.error(e instanceof Error?e.message:"No se pudo guardar");}
    finally{setSaving(false);}
  }
  return <section className="rounded-xl border border-[#D6DDE8] bg-white p-5 shadow-panel">
    <div className="mb-4 rounded-lg bg-gradient-to-r from-[#0B234A] to-[#8D1731] px-4 py-3 text-white"><h3 className="text-lg font-semibold">Proyección antropométrica individual · 2027</h3><p className="mt-1 text-xs text-white/80">Objetivos definidos para el regreso del receso</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      {([{key:"weight_min",label:"Peso mínimo del carril (kg)"},{key:"weight_max",label:"Peso máximo del carril (kg)"},{key:"sum6_expected",label:"Sum6 esperada (mm)"},{key:"muscle_mass_target_kg",label:"Objetivo de masa muscular (kg)"},{key:"adipose_mass_target_kg",label:"Objetivo de masa adiposa (kg)"}] as const).map(f=><label key={f.key} className="rounded-lg border border-[#D6E0EE] bg-[#F0F4FA] p-3 text-xs font-semibold text-[#23416A]">{f.label}<input type="text" inputMode="decimal" value={values[f.key]} onChange={e=>update(f.key,e.target.value)} placeholder="Sin definir" className="mt-2 w-full rounded-md border border-input bg-white px-3 py-2 text-base text-[#0B234A]" /></label>)}
    </div>
    <label className="mt-4 block text-sm font-semibold text-[#0B234A]">Fundamento y observaciones de la proyección<textarea rows={3} value={values.notes} onChange={e=>update("notes",e.target.value)} placeholder="Justificación del carril de peso y de la Sum6 esperada, período de receso, contexto deportivo..." className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm font-normal" /></label>
    <Button type="button" className="no-print mt-3" disabled={loading||saving} onClick={()=>void save()}><Save className="mr-2 h-4 w-4" />Guardar objetivos 2027</Button>
  </section>;
}
