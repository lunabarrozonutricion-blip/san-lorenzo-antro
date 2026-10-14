import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { metricValue } from "@/lib/calc";
import { adiposeGoalEquivalence } from "@/lib/goal-equivalences";
import { useControls, useFullAnthropometries, useObjectivePeriods } from "@/lib/hooks";
import { targetForPlayer } from "@/lib/objectives";
import type { Player } from "@/lib/types";

type Goal = {
 id: number; created_at: string; target_date: string | null;
 target_muscle_kg: number | null; target_imo: number | null;
 target_z: number | null; target_adipose_excel_kg: number | null;
 target_sum6_equivalent_mm: number | null;
};
const number = (value: string) => value.trim() === "" ? null : Number(value.replace(",", "."));
const fmt = (n: number | null | undefined, unit = "") => n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(2)}${unit}`;

export function PlayerGoalPlanning({ player }: { player: Player }) {
 const playerId = player.id!;
 const evaluations = useFullAnthropometries(playerId);
 const controls = useControls();
 const periods = useObjectivePeriods();
 const latest = evaluations?.[0];
 const masses = latest?.results?.weightAdjustedMassesKg;
 const muscle = masses?.muscle ?? null;
 const bone = masses?.bone ?? null;
 const height = latest?.measures.stature?.median ?? null;
 const [muscleText, setMuscleText] = useState("");
 const [adiposeText, setAdiposeText] = useState("");
 const [muscleMode, setMuscleMode] = useState<"kg" | "imo">("kg");
 const [adiposeMode, setAdiposeMode] = useState<"kg" | "z" | "sum6">("kg");
 const [targetDate, setTargetDate] = useState("");
 const [showFinal, setShowFinal] = useState(false);
 const [goals, setGoals] = useState<Goal[]>([]);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const monthly = useMemo(() => (periods ?? []).map(period => ({ period, target: targetForPlayer(period, player) })).filter(x => x.target != null).sort((a,b) => b.period.key.localeCompare(a.period.key)), [periods, player]);
 const activeMonth = new Date().toISOString().slice(0, 7);
 const currentPeriod = (periods ?? []).find(period => period.key === activeMonth);
 const currentMonthlyTarget = currentPeriod ? targetForPlayer(currentPeriod, player) : null;
 const currentMonthlyControl = (controls ?? []).filter(control => control.playerId === playerId && control.date.startsWith(activeMonth) && metricValue(control, "sum6") != null).sort((a,b) => b.date.localeCompare(a.date))[0];
 const currentMonthlySum6 = currentMonthlyControl ? metricValue(currentMonthlyControl, "sum6") : null;
 const currentMonthlyDelta = currentMonthlySum6 != null && currentMonthlyTarget != null ? currentMonthlySum6 - currentMonthlyTarget : null;
 const muscleValue = number(muscleText);
 const adiposeValue = number(adiposeText);
 const targetMuscle = muscleValue == null ? null : muscleMode === "imo" ? (bone != null && bone > 0 ? muscleValue * bone : null) : muscleValue;
 const targetIMO = targetMuscle != null && bone != null && bone > 0 ? targetMuscle / bone : null;
 const equivalence = adiposeValue != null && height != null ? adiposeGoalEquivalence({ heightCm: height, ...(adiposeMode === "kg" ? { excelAdiposeKg: adiposeValue } : adiposeMode === "z" ? { z: adiposeValue } : { sum6mm: adiposeValue }) }) : null;
 const currentSkinfolds = (["triceps", "subscapular", "supraespinal", "abdominal", "thighSkinfold", "calfSkinfold"] as const).map(key => latest?.measures[key]?.median);
 const currentSum6 = currentSkinfolds.every((value): value is number => value != null && Number.isFinite(value)) ? (currentSkinfolds as number[]).reduce((sum, value) => sum + value, 0) : null;
 const currentAdipose = currentSum6 != null && height != null ? adiposeGoalEquivalence({ heightCm: height, sum6mm: currentSum6 }) : null;
 const adiposeDelta = equivalence && currentAdipose ? {
   kg: equivalence.excelAdiposeKg != null && currentAdipose.excelAdiposeKg != null ? equivalence.excelAdiposeKg - currentAdipose.excelAdiposeKg : null,
   z: equivalence.z != null && currentAdipose.z != null ? equivalence.z - currentAdipose.z : null,
   sum6: equivalence.sum6mm != null && currentAdipose.sum6mm != null ? equivalence.sum6mm - currentAdipose.sum6mm : null
 } : null;
 const latestGoal = goals.find(goal => goal.target_sum6_equivalent_mm != null);
 const muscleDelta = targetMuscle != null && muscle != null ? targetMuscle - muscle : null;
 useEffect(() => {
   try { setShowFinal(localStorage.getItem("sl-show-final-goal-individual") === "true"); } catch { /* optional preference */ }
 }, []);
 useEffect(() => {
   let active = true;
   async function load() {
     if (!supabase) return;
     setLoading(true);
     const { data, error } = await supabase.from("long_term_anthropometry_goals").select("*").eq("player_id", playerId).order("created_at", { ascending: false });
     if (active) {
       if (error) toast.error("No se pudieron cargar las metas finales: " + error.message);
       else setGoals((data ?? []) as Goal[]);
       setLoading(false);
     }
   }
   void load();
   return () => { active = false; };
 }, [playerId]);
 async function save() {
   if (!supabase || !latest || !height) { toast.error("Se necesita una antropometría completa y conexión a Supabase."); return; }
   if ((muscleValue != null && (!Number.isFinite(muscleValue) || muscleValue <= 0)) || (adiposeValue != null && (!Number.isFinite(adiposeValue) || (adiposeMode !== "z" && adiposeValue < 0)))) { toast.error("Revisá los valores ingresados."); return; }
   if (targetMuscle == null && equivalence == null) { toast.error("Ingresá al menos un objetivo válido."); return; }
   setSaving(true);
   try {
     const { data: auth, error: authError } = await supabase.auth.getUser();
     if (authError || !auth.user) throw new Error("Iniciá sesión.");
     const payload = {
       owner_id: auth.user.id, player_id: playerId, baseline_anthropometry_id: latest.id ?? null,
       baseline_date: latest.date, target_date: targetDate || null,
       target_muscle_kg: targetMuscle, target_imo: targetIMO,
       target_z: equivalence?.z ?? null, target_adipose_excel_kg: equivalence?.excelAdiposeKg ?? null,
       target_sum6_equivalent_mm: equivalence?.sum6mm ?? null,
       baseline_muscle_kg: muscle, baseline_imo: muscle != null && bone != null && bone > 0 ? muscle / bone : null,
       baseline_z: currentAdipose?.z ?? null, baseline_adipose_excel_kg: currentAdipose?.excelAdiposeKg ?? null, baseline_sum6_mm: currentSum6
     };
     const { data, error } = await supabase.from("long_term_anthropometry_goals").insert(payload).select("*").single();
     if (error) throw error;
     setGoals(old => [data as Goal, ...old]);
     toast.success("Meta de largo plazo guardada. Los objetivos mensuales no se modificaron.");
   } catch (error) { toast.error("No se pudo guardar: " + (error instanceof Error ? error.message : "error desconocido")); }
   finally { setSaving(false); }
 }
 return <section className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5 shadow-panel">
   <div><h2 className="text-xl font-bold">Planificación antropométrica</h2><p className="text-sm text-muted-foreground">Objetivos de largo plazo (5 componentes) y seguimiento mensual de Sum6. Son independientes.</p></div>
   <div className="rounded-lg border p-4">
     <h3 className="font-semibold">Sum6 · objetivo mensual ({currentPeriod?.label ?? activeMonth})</h3>
     <p className="mt-2 text-lg font-bold">{currentMonthlyTarget == null ? "Sin objetivo mensual cargado para este mes" : fmt(currentMonthlyTarget, " mm")}</p>
     <p className="text-xs text-muted-foreground">Último control de este mes: {fmt(currentMonthlySum6, " mm")} · Diferencia con objetivo: {fmt(currentMonthlyDelta, " mm")}. Se carga desde Objetivos del plantel.</p>
   </div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showFinal} onChange={e => { const checked = e.target.checked; setShowFinal(checked); try { localStorage.setItem("sl-show-final-goal-individual", String(checked)); } catch { /* optional preference */ } }} />Mostrar meta final</label>
   {showFinal && <div className="rounded-lg border p-4"><h3 className="font-semibold">Meta final adiposa</h3><p className="text-xl font-bold">{fmt(latestGoal?.target_sum6_equivalent_mm, " mm")}</p><p className="text-xs text-muted-foreground">Equivalencia calculada a partir del objetivo adiposo de largo plazo, no es el objetivo mensual.</p></div>}
   <div className="grid gap-4 md:grid-cols-2">
     <div className="space-y-2"><h3 className="font-semibold">Objetivo muscular</h3><p className="text-xs text-muted-foreground">MM actual: {fmt(muscle, " kg")} · IMO actual: {fmt(muscle != null && bone != null && bone > 0 ? muscle / bone : null)}</p><select className="w-full rounded-md border bg-background p-2" value={muscleMode} onChange={e => setMuscleMode(e.target.value as "kg" | "imo")}><option value="kg">Masa muscular objetivo (kg)</option><option value="imo">IMO objetivo</option></select><input className="w-full rounded-md border bg-background p-2" type="text" inputMode="decimal" placeholder="Valor objetivo" value={muscleText} onChange={e => setMuscleText(e.target.value)} /><p className="text-sm">MM proyectada: {fmt(targetMuscle, " kg")} · Δ muscular: {fmt(muscleDelta, " kg")} · IMO: {fmt(targetIMO)}</p></div>
     <div className="space-y-2"><h3 className="font-semibold">Objetivo adiposo</h3><p className="text-xs text-muted-foreground">Valores actuales de la última antropometría completa · {latest?.date ?? "sin evaluación"}. Kg estimados según Excel, distintos de masa adiposa Kerr.</p><div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-semibold">Valores actuales</p><p>TA estimado: {fmt(currentAdipose?.excelAdiposeKg, " kg")} · Z-score: {fmt(currentAdipose?.z)} · Sum6: {fmt(currentSum6, " mm")}</p>{currentSum6 == null && <p className="text-xs text-muted-foreground">No hay seis pliegues completos en la última evaluación; no se pueden calcular estas equivalencias.</p>}</div><select className="w-full rounded-md border bg-background p-2" value={adiposeMode} onChange={e => setAdiposeMode(e.target.value as "kg" | "z" | "sum6")}><option value="kg">Tejido adiposo estimado (kg)</option><option value="z">Z-score adiposo</option><option value="sum6">Sum6 equivalente (mm)</option></select><input className="w-full rounded-md border bg-background p-2" type="text" inputMode="decimal" placeholder="Valor objetivo" value={adiposeText} onChange={e => setAdiposeText(e.target.value)} /><p className="text-sm">Objetivo: TA estimado {fmt(equivalence?.excelAdiposeKg, " kg")} · Z {fmt(equivalence?.z)} · Sum6 {fmt(equivalence?.sum6mm, " mm")}</p><p className="text-sm">Diferencia respecto del valor actual: TA {fmt(adiposeDelta?.kg, " kg")} · Z {fmt(adiposeDelta?.z)} · Sum6 {fmt(adiposeDelta?.sum6, " mm")}</p>{showFinal && <p className="text-sm font-semibold">Sum6 equivalente: {fmt(equivalence?.sum6mm, " mm")}</p>}</div>
   </div>
   <label className="block text-sm">Fecha estimada (opcional)<input className="mt-1 block rounded-md border bg-background p-2" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></label>
   <button type="button" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50" disabled={saving || !latest} onClick={() => void save()}>{saving ? "Guardando..." : "Guardar objetivo de largo plazo"}</button>
   <div className="border-t pt-3"><h3 className="font-semibold">Historial de metas finales</h3>{loading ? <p className="text-sm">Cargando…</p> : goals.length ? <div className="mt-2 space-y-2">{goals.map(goal => <div key={goal.id} className="rounded-lg border p-3 text-sm"><p>{new Date(goal.created_at).toLocaleDateString("es-AR")} · MM: {fmt(goal.target_muscle_kg, " kg")} · IMO: {fmt(goal.target_imo)}</p><p>TA estimado: {fmt(goal.target_adipose_excel_kg, " kg")} · Z: {fmt(goal.target_z)}{showFinal ? ` · Sum6 final: ${fmt(goal.target_sum6_equivalent_mm, " mm")}` : ""}</p>{goal.target_date && <p>Fecha estimada: {goal.target_date}</p>}</div>)}</div> : <p className="text-sm text-muted-foreground">Todavía no hay metas finales guardadas.</p>}</div>
 </section>;
}
