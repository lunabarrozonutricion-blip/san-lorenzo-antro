// Servidor privado: no publicar claves ni service_role en el navegador.
// Configuración del propietario: Authorization: Bearer <Supabase access_token>
// Invitados: contraseña -> token firmado (30 min) -> datos agregados del informe.
import { createClient } from "jsr:@supabase/supabase-js@2";
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, secret, { auth: { persistSession: false } });
const encoder = new TextEncoder();
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" };
const json = (value: unknown, status=200) => new Response(JSON.stringify(value), {status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const unb64 = (value: string) => Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")), c=>c.charCodeAt(0));
const hex = (bytes: Uint8Array) => [...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");
async function hashPassword(password:string,salt:string) {
  const key = await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:unb64(salt),iterations:210000,hash:"SHA-256"},key,256)));
}
function safeEqual(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++) diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function sign(payload:string) {
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),"HMAC",{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return b64(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(payload))));
}
async function ownerFromAuth(req:Request) {
 const token=req.headers.get("authorization")?.replace(/^Bearer /i,"");
 if(!token) return null;
 const client=createClient(url,anon,{auth:{persistSession:false}});
 const {data,error}=await client.auth.getUser(token);
 return error?null:data.user?.id??null;
}
async function getAll(table:string,columns:string,owner:string) {
 const rows:Record<string,unknown>[]=[];
 for(let offset=0;offset<20000;offset+=1000){
  const {data,error}=await admin.from(table).select(columns).eq("owner_id",owner).range(offset,offset+999);
  if(error) throw error;
  rows.push(...(data??[]));
  if(!data || data.length<1000) break;
 }
 return rows;
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:cors});
 if(req.method!=="POST") return json({error:"Método no permitido"},405);
 let body:Record<string,unknown>;
 try {body=await req.json();} catch {return json({error:"Solicitud inválida"},400);}
 const action=String(body.action??"");
 const owner=String(body.ownerId??"");
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(owner)) return json({error:"Enlace inválido"},400);
 if(action==="configure"){
  const userId=await ownerFromAuth(req);
  if(!userId || userId!==owner) return json({error:"No autorizado"},403);
  const password=String(body.password??"");
  if(password.length<12 || password.length>128) return json({error:"La clave debe tener entre 12 y 128 caracteres"},400);
  const salt=b64(crypto.getRandomValues(new Uint8Array(24)));
  const password_hash=await hashPassword(password,salt);
  const {error}=await admin.from("annual_report_guest_access").upsert({owner_id:owner,password_salt:salt,password_hash,enabled:true,failed_attempts:0,locked_until:null,updated_at:new Date().toISOString()});
  return error?json({error:"No se pudo configurar"},500):json({ok:true});
 }
 if(action==="disable"){
  const userId=await ownerFromAuth(req);
  if(!userId || userId!==owner) return json({error:"No autorizado"},403);
  const {error}=await admin.from("annual_report_guest_access").update({enabled:false,updated_at:new Date().toISOString()}).eq("owner_id",owner);
  return error?json({error:"No se pudo desactivar"},500):json({ok:true});
 }
 const {data:config,error:configError}=await admin.from("annual_report_guest_access").select("*").eq("owner_id",owner).maybeSingle();
 if(configError || !config?.enabled) return json({error:"El informe compartido no está disponible"},403);
 if(action==="login"){
  if(config.locked_until && Date.parse(config.locked_until)>Date.now()) return json({error:"Demasiados intentos. Probá más tarde."},429);
  const password=String(body.password??"");
  if(password.length>128) return json({error:"Clave incorrecta"},403);
  const candidate=await hashPassword(password,config.password_salt);
  if(!safeEqual(candidate,config.password_hash)){
   const attempts=Number(config.failed_attempts??0)+1;
   await admin.from("annual_report_guest_access").update({failed_attempts:attempts>=5?0:attempts,locked_until:attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null}).eq("owner_id",owner);
   return json({error:"Clave incorrecta"},403);
  }
  await admin.from("annual_report_guest_access").update({failed_attempts:0,locked_until:null}).eq("owner_id",owner);
  const payload=b64(encoder.encode(JSON.stringify({owner,exp:Date.now()+30*60*1000,version:config.updated_at})));
  return json({token:payload+"."+await sign(payload),expiresIn:1800});
 }
 if(action==="report"){
  const token=String(body.token??"");
  const [payload,signature,extra]=token.split(".");
  if(!payload||!signature||extra||!safeEqual(await sign(payload),signature)) return json({error:"Sesión inválida"},403);
  let claims:{owner:string;exp:number;version:string};
  try{claims=JSON.parse(new TextDecoder().decode(unb64(payload)));}catch{return json({error:"Sesión inválida"},403);}
  if(claims.owner!==owner || claims.exp<Date.now() || claims.version!==config.updated_at) return json({error:"Sesión vencida"},403);
  try {
   const [controls,hydration,weights,notes]=await Promise.all([
    getAll("controls","player_id,date,triceps,subscapular,supraespinal,abdominal,thigh_skinfold,calf_skinfold",owner),
    getAll("hydration_tests","date,entries",owner),
    getAll("weight_records","date,player_id,weight",owner),
    admin.from("annual_report_notes").select("interventions,conclusions").eq("owner_id",owner).eq("report_year",2026).maybeSingle()
   ]);
   // Solo métricas agregadas: no nombres, DNI, teléfonos, emails ni fichas individuales.
   const monthly=Array.from({length:12},(_,month)=>{
    const prefix="2026-"+String(month+1).padStart(2,"0");
    const latest=new Map<number, {date:string;sum6:number}>();
    for(const row of controls){
     if(!String(row.date).startsWith(prefix)) continue;
     const values=["triceps","subscapular","supraespinal","abdominal","thigh_skinfold","calf_skinfold"].map(k=>Number(row[k]));
     if(values.some(v=>!Number.isFinite(v)||v<=0)) continue;
     const id=Number(row.player_id), date=String(row.date), sum6=values.reduce((a,b)=>a+b,0);
     if(!latest.has(id)||latest.get(id)!.date<=date) latest.set(id,{date,sum6});
    }
    const values=[...latest.values()].map(v=>v.sum6).sort((a,b)=>a-b);
    return {month:month+1,count:values.length,values};
   });
   const hydrationDays=hydration.filter(row=>String(row.date).startsWith("2026")).map(row=>{
    const entries=Array.isArray(row.entries)?row.entries:[];
    const values=entries.map((entry:Record<string,unknown>)=>Number(entry?.value)).filter((v:number)=>Number.isFinite(v)&&v>=1000&&v<=1100);
    return {date:row.date,count:values.length,inTarget:values.filter((v:number)=>v<1020).length};
   }).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
   const weightDays=[...new Set(weights.filter(row=>String(row.date).startsWith("2026")).map(row=>String(row.date)))];
   return json({year:2026,monthly,hydrationDays,weightDays:weightDays.length,notes:notes.data??{interventions:"",conclusions:""}});
  }catch{return json({error:"No se pudo consultar el informe"},500);}
 }
 return json({error:"Acción desconocida"},400);
});
