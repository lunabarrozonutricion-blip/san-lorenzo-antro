import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const BUCKET = "sl-workshop-photos";
type Photo = { name: string; path: string; url: string };

export function WorkshopPhotoGallery() {
  const [owner, setOwner] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (userId: string) => {
    if (!supabase) return;
    const folder = `${userId}/talleres`;
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) { toast.error("No se pudieron consultar las fotos: " + error.message); return; }
    const files = (data ?? []).filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file.name));
    const signed = await Promise.all(files.map(async file => {
      const path = `${folder}/${file.name}`;
      const { data: link } = await supabase!.storage.from(BUCKET).createSignedUrl(path, 3600);
      return link?.signedUrl ? { name: file.name, path, url: link.signedUrl } : null;
    }));
    setPhotos(signed.filter((photo): photo is Photo => photo !== null));
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const userId = data.user?.id ?? null;
      setOwner(userId);
      if (userId) void refresh(userId);
    });
    return () => { active = false; };
  }, [refresh]);

  const upload = async (files: FileList | null) => {
    if (!supabase || !owner || !files?.length) return;
    const selectedFiles = Array.from(files);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (selectedFiles.some(file => !allowed.includes(file.type))) { toast.error("Solo se admiten fotos JPG, PNG o WEBP."); return; }
    if (selectedFiles.some(file => file.size > 10 * 1024 * 1024)) { toast.error("Cada foto debe pesar menos de 10 MB."); return; }
    setBusy(true);
    let success = 0;
    for (const file of selectedFiles) {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${owner}/talleres/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) toast.error(`No se pudo subir ${file.name}: ${error.message}`);
      else success++;
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (success) toast.success(`${success} foto(s) guardada(s)`);
    await refresh(owner);
  };

  const remove = async (photo: Photo) => {
    if (!supabase || !owner || !window.confirm("¿Eliminar esta foto del taller?")) return;
    setBusy(true);
    const { error } = await supabase.storage.from(BUCKET).remove([photo.path]);
    setBusy(false);
    if (error) { toast.error("No se pudo eliminar la foto: " + error.message); return; }
    setSelected(null);
    await refresh(owner);
    toast.success("Foto eliminada");
  };

  return <div className="mt-4 rounded-xl border border-[#d5deeb] bg-[#f1f5fa] p-4">
    <h4 className="font-semibold text-[#0b234a]">Registro fotográfico del taller</h4>
    <p className="mt-1 text-xs text-[#60738f]">Guardá imágenes reales de la actividad. Podés seleccionar varias fotos a la vez.</p>
    {!supabase || !owner ? <p className="mt-3 text-sm text-[#60738f]">Iniciá sesión para guardar fotos en la nube.</p> : <>
      <label className="mt-4 block text-xs font-semibold text-[#0b234a]">Subir fotos (JPG, PNG o WEBP; hasta 10 MB cada una)</label>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void upload(event.target.files)} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b234a] file:px-4 file:py-2 file:font-semibold file:text-white" />
      {busy && <p className="mt-2 text-sm text-[#60738f]">Guardando fotos...</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map(photo => <div key={photo.path} className="overflow-hidden rounded-lg border border-[#d5deeb] bg-white">
        <button type="button" onClick={() => setSelected(photo)} className="block w-full" aria-label="Ampliar foto del taller"><img src={photo.url} alt="Registro fotográfico del taller de cocina" loading="lazy" className="aspect-square w-full object-cover" /></button>
        <button type="button" disabled={busy} onClick={() => void remove(photo)} className="w-full border-t border-[#d5deeb] px-2 py-2 text-xs font-semibold text-[#c8102e]">Eliminar foto</button>
      </div>)}</div>
      {photos.length === 0 && <p className="mt-3 text-sm text-[#60738f]">Todavía no hay fotos cargadas.</p>}
      {selected && <div role="dialog" aria-modal="true" aria-label="Foto ampliada del taller" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-5"><button type="button" onClick={() => setSelected(null)} className="self-end rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0b234a]">Cerrar</button><img src={selected.url} alt="Foto ampliada del taller de cocina" className="max-h-[80vh] max-w-full object-contain" /></div>}
    </>}
  </div>;
}
