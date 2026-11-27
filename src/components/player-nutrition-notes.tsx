import { useEffect, useRef, useState } from "react";
import { Save, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Note = { id: number; category: "seguimiento" | "balance" | "proyeccion"; note_date: string; content: string; season: number };
const currentSeason = 2026;
export function PlayerNutritionNotes({ playerId, playerName, includeInPrint = false, onSaved }: { playerId: number; playerName?: string; includeInPrint?: boolean; onSaved?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState("");
  const request = useRef(0);
  const [loadFailed, setLoadFailed] = useState(false);
  async function load() {
    const token = ++request.current;
    setLoadFailed(false);
    setNotes([]);
    setBalance("");
    if (!supabase) { setLoadFailed(true); setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (token !== request.current) return;
    if (!user) { setLoadFailed(true); setLoading(false); return; }
    const { data, error } = await supabase.from("player_nutrition_notes")
      .select("id,category,note_date,content,season").eq("owner_id", user.id)
      .eq("player_id", playerId).order("note_date", { ascending: false }).order("id", { ascending: false });
    if (token !== request.current) return;
    if (error) { setLoadFailed(true); toast.error("No se pudieron cargar las observaciones"); }
    else {
      const all = (data ?? []) as Note[];
      setNotes(all);
      setBalance(all.find(n => n.category === "balance" && n.season === currentSeason)?.content ?? "");
    }
    setLoading(false);
  }
  useEffect(() => { void load(); return () => { request.current++; }; }, [playerId]);
  async function save(category: Note["category"], content: string) {
    if (!supabase) { toast.error("No hay conexión a la base de datos"); return; }
    if (loading || loadFailed || saving) return;
    if (!content.trim()) { toast.error("Escribí una observación antes de guardar"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Iniciá sesión para guardar");
      const previous = notes.find(n => n.category === category && n.season === currentSeason);
      const payload = { owner_id: user.id, player_id: playerId, note_date: `${currentSeason}-12-31`, category, season: currentSeason, content: content.trim() };
      const result = previous
        ? await supabase.from("player_nutrition_notes").update(payload).eq("id", previous.id).eq("owner_id", user.id).eq("player_id", playerId).eq("season", currentSeason).eq("category", category)
        : await supabase.from("player_nutrition_notes").insert(payload);
      if (result.error) throw result.error;
      toast.success("Observación guardada");
      await load();
      onSaved?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar"); }
    finally { setSaving(false); }
  }
  const history = notes.filter(n => n.category === "seguimiento");
  return (
    <section className={"mt-6 overflow-hidden rounded-xl border border-[#D6DDE8] bg-white shadow-panel print-balance"} data-balance-print={includeInPrint ? "yes" : "no"} data-player-id={playerId}>
      <div className="m-4 mb-0 rounded-lg bg-gradient-to-r from-[#0B234A] to-[#8D1731] px-4 py-4 text-white">
        <div className="flex items-center gap-2"><NotebookPen className="h-5 w-5" /><h2 className="font-display text-xl font-semibold">Balance nutricional individual 2026{playerName ? ` · ${playerName}` : ""}</h2></div>
      </div>
      <div className="space-y-6 p-5 no-print">
        <div className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Cargando balance de la jugadora...</p>}
          {loadFailed && <Button type="button" onClick={() => void load()}>Reintentar carga</Button>}
          <textarea key={playerId} id={`balance-${playerId}`} name={`balance-${playerId}`} autoComplete="off" disabled={loading || loadFailed || saving} rows={5} value={balance} onChange={e => setBalance(e.target.value)} placeholder="Balance de la evolución antropométrica, hábitos, objetivos alcanzados y aspectos pendientes..." className="w-full rounded-md border border-input bg-background p-3 text-sm" />
          <Button type="button" disabled={loading || loadFailed || saving || !balance.trim()} onClick={() => void save("balance", balance)}><Save className="mr-2 h-4 w-4" />Guardar balance</Button>
        </div>
        {history.length > 0 && <details className="rounded-lg border border-border bg-muted/20 p-3"><summary className="cursor-pointer text-sm font-medium">Ver observaciones anteriores ({history.length})</summary><div className="mt-3 space-y-3">{history.map(note => <div key={note.id} className="border-l-2 border-[#8D1731] pl-3"><p className="text-xs text-muted-foreground">{note.note_date.split("-").reverse().join("/")}</p><p className="whitespace-pre-wrap text-sm">{note.content}</p></div>)}</div></details>}

      </div>
      <div className="hidden print:block p-5 whitespace-pre-wrap text-sm" data-balance-print-content>{notes.find(n => n.category === "balance" && n.season === currentSeason)?.content || "Pendiente de completar."}</div>
    </section>
  );
}
