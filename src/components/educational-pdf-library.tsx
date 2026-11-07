import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const BUCKET = "sl-educational-pdfs";
type Kind = "charlas" | "talleres";
type PdfItem = { name: string; path: string };

export function EducationalPdfLibrary({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const folder = owner ? `${owner}/${kind}` : null;

  const refresh = useCallback(async (folderPath: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from(BUCKET).list(folderPath, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) { toast.error("No se pudieron consultar los PDF: " + error.message); return; }
    setItems((data ?? []).filter(file => file.name.toLowerCase().endsWith(".pdf")).map(file => ({ name: file.name, path: `${folderPath}/${file.name}` })));
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const id = data.user?.id ?? null;
      setOwner(id);
      if (id) void refresh(`${id}/${kind}`);
    });
    return () => { active = false; };
  }, [kind, refresh]);

  const upload = async (file: File) => {
    if (!supabase || !folder) { toast.error("Iniciá sesión para guardar materiales."); return; }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { toast.error("Solo se admiten archivos PDF."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Este PDF supera los 50 MB. Reducí su tamaño para subirlo."); return; }
    const cleanTitle = (title.trim() || file.name.replace(/\.pdf$/i, "")).replace(/[\\/]/g, "-");
    const name = `${crypto.randomUUID()}--${encodeURIComponent(cleanTitle)}.pdf`;
    setBusy(true);
    const { error } = await supabase.storage.from(BUCKET).upload(`${folder}/${name}`, file, { contentType: "application/pdf", upsert: false });
    setBusy(false);
    if (error) { toast.error("No se pudo guardar el PDF: " + error.message); return; }
    setTitle("");
    if (input.current) input.current.value = "";
    toast.success("PDF guardado correctamente");
    await refresh(folder);
  };

  const open = async (path: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
    if (error || !data?.signedUrl) { toast.error("No se pudo abrir el PDF"); return; }
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const remove = async (item: PdfItem) => {
    if (!supabase || !folder || !window.confirm("¿Eliminar este PDF de la biblioteca?")) return;
    setBusy(true);
    const { error } = await supabase.storage.from(BUCKET).remove([item.path]);
    setBusy(false);
    if (error) { toast.error("No se pudo eliminar el PDF: " + error.message); return; }
    toast.success("PDF eliminado");
    await refresh(folder);
  };

  const label = (name: string) => {
    const encoded = name.replace(/^[0-9a-f-]{36}--/, "").replace(/\.pdf$/i, "");
    try { return decodeURIComponent(encoded); } catch { return encoded; }
  };

  return <div className="mt-4 rounded-xl border border-[#d5deeb] bg-[#f1f5fa] p-4">
    <h4 className="font-semibold text-[#0b234a]">{kind === "charlas" ? "Materiales de las charlas" : "Materiales de los talleres"}</h4>
    {!supabase || !owner ? <p className="mt-2 text-sm text-[#60738f]">Iniciá sesión con tu cuenta para subir y consultar los PDF guardados en la nube.</p> : <>
      <div className="mt-3 space-y-2">{items.length === 0 && <p className="text-sm text-[#60738f]">Todavía no hay archivos PDF cargados.</p>}
        {items.map(item => <div key={item.path} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d5deeb] bg-white p-3"><span className="min-w-0 flex-1 break-words text-sm font-medium text-[#0b234a]">{label(item.name)}</span><div className="flex gap-2"><button type="button" onClick={() => void open(item.path)} className="rounded-lg bg-[#0b234a] px-3 py-2 text-xs font-semibold text-white">Ver PDF</button><button type="button" disabled={busy} onClick={() => void remove(item)} className="rounded-lg border border-[#c8102e] px-3 py-2 text-xs font-semibold text-[#c8102e]">Eliminar</button></div></div>)}
      </div>
      <div className="mt-4 border-t border-[#d5deeb] pt-4"><label className="block text-xs font-semibold text-[#0b234a]">Título del material (opcional)</label><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej.: Charla sobre hidratación" className="mt-1 w-full rounded-lg border border-[#b6c7dd] bg-white px-3 py-2 text-sm" /><label className="mt-3 block text-xs font-semibold text-[#0b234a]">Subir nuevo PDF (máximo 50 MB)</label><input ref={input} type="file" accept=".pdf,application/pdf" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b234a] file:px-4 file:py-2 file:font-semibold file:text-white" /></div>
    </>}
  </div>;
}
