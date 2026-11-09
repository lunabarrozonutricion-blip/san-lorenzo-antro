import { useEffect, useState } from "react";
import { Save, Trash2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Note = { id: number; category: "seguimiento" | "balance" | "proyeccion"; note_date: string; content: string; season: number };
const currentSeason = 2026;
export function PlayerNutritionNotes({ playerId, onSaved }: { playerId: number; onSaved?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [entry, setEntry] = useState("");
  const [balance, setBalance] = useState("");
  const [projection, setProjection] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  async function load() {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase.from("player_nutrition_notes")
      .select("id,category,note_date,content,season").eq("owner_id", user.id)
      .eq("player_id", playerId).order("note_date", { ascending: false }).order("id", { ascending: false });
    if (error) toast.error("No se pudieron cargar las observaciones");
    else {
      const all = (data ?? []) as Note[];
      setNotes(all);
      setBalance(all.find(n => n.category === "balance" && n.season === currentSeason)?.content ?? "");
      setProjection(all.find(n => n.category === "proyeccion" && n.season === currentSeason)?.content ?? "");
    }
    setLoading(false);
  }
  useEffect(() => { void load(); }, [playerId]);
  async function save(category: Note["category"], content: string) {
    if (!supabase) { toast.error("No hay conexión a la base de datos"); return; }
    if (!content.trim()) { toast.error("Escribí una observación antes de guardar"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Iniciá sesión para guardar");
      const previous = category === "seguimiento"
        ? notes.find(n => n.id === editingId)
        : notes.find(n => n.category === category && n.season === currentSeason);
      const payload = { owner_id: user.id, player_id: playerId, note_date: category === "seguimiento" ? date : `${currentSeason}-12-31`, category, season: currentSeason, content: content.trim() };
      const result = previous
        ? await supabase.from("player_nutrition_notes").update(payload).eq("id", previous.id).eq("owner_id", user.id)
        : await supabase.from("player_nutrition_notes").insert(payload);
      if (result.error) throw result.error;
      toast.success("Observación guardada");
      if (category === "seguimiento") { setEntry(""); setEditingId(null); }
      await load();
      onSaved?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar"); }
    finally { setSaving(false); }
  }
  async function remove(id: number) {
    if (!supabase || !window.confirm("¿Eliminar esta observación?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("player_nutrition_notes").delete().eq("id", id).eq("owner_id", user.id);
    if (error) toast.error("No se pudo eliminar");
    else { toast.success("Observación eliminada"); await load(); onSaved?.(); }
  }
  const history = notes.filter(n => n.category === "seguimiento");
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-panel">
      <div className="border-b border-border bg-gradient-to-r from-[#0B234A]/5 to-[#C8102E]/5 px-5 py-4">
        <div className="flex items-center gap-2"><NotebookPen className="h-5 w-5 text-[#C8102E]" /><h2 className="font-display text-xl font-semibold">Conclusiones y seguimiento individual</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Observaciones profesionales privadas de esta jugadora. No se comparten en el informe anual de invitados.</p>
      </div>
      <div className="space-y-6 p-5">
        <div className="space-y-3">
          <h3 className="font-semibold">Historial de seguimiento nutricional</h3>
          <label className="block text-sm">Fecha de observación
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block rounded-md border border-input bg-background px-3 py-2" />
          </label>
          <textarea value={entry} onChange={e => setEntry(e.target.value)} rows={4} placeholder="Evolución, hábitos, adherencia, dificultades, intervenciones y avances observados..." className="w-full rounded-md border border-input bg-background p-3 text-sm" />
          <div className="flex flex-wrap gap-2"><Button type="button" disabled={saving || !entry.trim()} onClick={() => void save("seguimiento", entry)}><Save className="mr-2 h-4 w-4" />{editingId ? "Guardar cambios" : "Agregar observación"}</Button>
            {editingId !== null && <Button type="button" variant="outline" onClick={() => {setEditingId(null);setEntry("");}}>Cancelar edición</Button>}</div>
          {loading ? <p className="text-sm text-muted-foreground">Cargando observaciones...</p> :
            history.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay observaciones registradas.</p> :
            <div className="space-y-2">{history.map(note => <div key={note.id} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-muted-foreground">{note.note_date.split("-").reverse().join("/")}</span>
                <div className="flex gap-1"><Button type="button" size="sm" variant="outline" onClick={() => {setEditingId(note.id);setDate(note.note_date);setEntry(note.content);}}>Editar</Button>
                <Button type="button" size="sm" variant="ghost" aria-label="Eliminar observación" onClick={() => void remove(note.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{note.content}</p></div>)}</div>}
        </div>
        <div className="border-t border-border pt-5 space-y-3">
          <h3 className="font-semibold">Balance nutricional individual · 2026</h3>
          <p className="text-sm text-muted-foreground">Conclusión profesional de la temporada. Podés editarla y volver a guardarla cuando quieras.</p>
          <textarea rows={5} value={balance} onChange={e => setBalance(e.target.value)} placeholder="Balance de la evolución antropométrica, hábitos, objetivos alcanzados y aspectos pendientes..." className="w-full rounded-md border border-input bg-background p-3 text-sm" />
          <Button type="button" disabled={saving || !balance.trim()} onClick={() => void save("balance", balance)}><Save className="mr-2 h-4 w-4" />Guardar balance</Button>
        </div>
        <div className="border-t border-border pt-5 space-y-3">
          <h3 className="font-semibold">Objetivos y recomendaciones · 2027</h3>
          <textarea rows={4} value={projection} onChange={e => setProjection(e.target.value)} placeholder="Objetivos individuales, estrategias de alimentación, hidratación y seguimiento para la próxima temporada..." className="w-full rounded-md border border-input bg-background p-3 text-sm" />
          <Button type="button" disabled={saving || !projection.trim()} onClick={() => void save("proyeccion", projection)}><Save className="mr-2 h-4 w-4" />Guardar proyecciones</Button>
        </div>
      </div>
    </section>
  );
}
