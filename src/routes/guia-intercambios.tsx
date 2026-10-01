import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Edit3,
  ImagePlus,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/guia-intercambios")({
  component: ExchangeGuidePage,
});

type GuideItem = {
  id: string;
  label: string;
  image?: string;
};

type GuideSection = {
  id: string;
  title: string;
  subtitle?: string;
  equivalence: string;
  intro?: string;
  items: GuideItem[];
  note?: string;
};

type GuideData = {
  updatedAt: string;
  intro: {
    title: string;
    description: string;
  };
  sections: GuideSection[];
};

const GUIDE_ROW_ID = "default";
const MEDIA = "/guia-intercambios-media";

const DEFAULT_GUIDE: GuideData = {
  updatedAt: new Date().toISOString(),
  intro: {
    title: "¿Cómo usar la guía?",
    description:
      "Buscá en tu plan cuántos intercambios tenés asignados de cada grupo. Elegí la cantidad de alimentos equivalente a esos intercambios y podés reemplazar alimentos dentro del mismo grupo.",
  },
  sections: [
    {
      id: "lacteos",
      title: "Lácteos descremados",
      equivalence: "1 IC =",
      items: [
        { id: "leche", image: `${MEDIA}/leche.png`, label: "1 vaso de leche descremada (200 cc)" },
        { id: "yogur-pote", image: `${MEDIA}/yogur-pote.png`, label: "1 pote de yogur (200 cc)" },
        { id: "yogur-bebible", image: `${MEDIA}/yogur-bebible.png`, label: "1 vaso de yogur bebible (200 cc)" },
      ],
    },
    {
      id: "almidones-almuerzo",
      title: "Almidones",
      subtitle: "Almuerzo y cena",
      equivalence: "1 IC = 100 g cocidos · 3 cucharadas soperas · 1 puño",
      items: [
        { id: "arroz-blanco", image: `${MEDIA}/arroz-blanco.png`, label: "Arroz blanco" },
        { id: "arroz-integral", image: `${MEDIA}/arroz-integral.png`, label: "Arroz integral" },
        { id: "arroz-yamani", image: `${MEDIA}/arroz-yamani.png`, label: "Arroz yamaní" },
        { id: "quinoa", image: `${MEDIA}/quinoa.png`, label: "Quinoa" },
        { id: "fideos", image: `${MEDIA}/fideos.png`, label: "Fideos" },
        { id: "noquis", image: `${MEDIA}/noquis.png`, label: "Ñoquis" },
        { id: "polenta", image: `${MEDIA}/polenta.png`, label: "Polenta" },
        { id: "cuscus", image: `${MEDIA}/cuscus.png`, label: "Cuscús" },
        { id: "tuberculos", image: `${MEDIA}/tuberculos.png`, label: "100 g de papa, batata o choclo" },
      ],
    },
    {
      id: "almidones-desayuno",
      title: "Almidones",
      subtitle: "Desayuno y merienda",
      equivalence: "1 IC =",
      items: [
        { id: "pan", image: `${MEDIA}/pan.png`, label: "1 rebanada de pan" },
        { id: "galletas-arroz", image: `${MEDIA}/galletas-arroz.png`, label: "3 galletas de arroz" },
        { id: "vainillas", image: `${MEDIA}/vainillas.png`, label: "2 vainillas" },
        { id: "turron", image: `${MEDIA}/turron.png`, label: "1 turrón" },
        { id: "granola", image: `${MEDIA}/granola.png`, label: "30 g de granola" },
        { id: "avena", image: `${MEDIA}/avena.png`, label: "30 g de avena" },
        { id: "copos", image: `${MEDIA}/copos.png`, label: "30 g de copos de maíz" },
        { id: "tutucas", image: `${MEDIA}/tutucas.png`, label: "30 g de tutucas" },
        { id: "crackers", image: `${MEDIA}/crackers.png`, label: "10 crackers de arroz" },
      ],
      note: "Las opciones marcadas como prácticas o de resolución no necesariamente son para intercambios diarios.",
    },
    {
      id: "frutas",
      title: "Frutas",
      equivalence: "1 IC = 100 g de fruta o una porción equivalente",
      items: [
        { id: "manzana", image: `${MEDIA}/manzana.png`, label: "1 manzana chica" },
        { id: "banana", image: `${MEDIA}/banana.png`, label: "½ banana grande o 1 banana chica" },
        { id: "kiwi", image: `${MEDIA}/kiwi.png`, label: "1 kiwi" },
        { id: "frutillas", image: `${MEDIA}/frutillas.png`, label: "¼ taza de frutillas" },
        { id: "uvas", image: `${MEDIA}/uvas.png`, label: "10 uvas" },
        { id: "durazno", image: `${MEDIA}/durazno.png`, label: "1 durazno" },
        { id: "jugo", image: `${MEDIA}/jugo.png`, label: "½ vaso de jugo de naranja" },
        { id: "citricos", image: `${MEDIA}/citricos.png`, label: "1 mandarina o 1 naranja chica" },
        { id: "ciruelas", image: `${MEDIA}/ciruelas.png`, label: "3 ciruelas chicas o 1 grande" },
      ],
    },
    {
      id: "vegetales",
      title: "Vegetales",
      equivalence: "1 IC =",
      items: [
        { id: "ensalada", image: `${MEDIA}/ensalada.png`, label: "100 g de ensalada" },
        { id: "hojas-crudas", image: `${MEDIA}/hojas-crudas.png`, label: "1 taza de hojas crudas" },
        { id: "pure", image: `${MEDIA}/pure.png`, label: "1 taza de puré de vegetales" },
        { id: "hojas-cocidas", image: `${MEDIA}/hojas-cocidas.png`, label: "½ taza de hojas cocidas" },
      ],
      note:
        "Las opciones son a modo de ejemplo. Podés utilizar cualquier vegetal respetando las equivalencias de porción indicadas. Algunas opciones: tomate, lechuga, zanahoria, morrón, acelga, apio, berenjena, brócoli, brotes de soja, chauchas, coliflor, espárrago, espinaca, kale, puerro, rabanito, remolacha, radicheta, rúcula, verdeo y zapallo. Preparaciones: crudos, ensalada, cocidos, enteros, cortados, puré sin manteca y con leche descremada, sopas, horno, microondas, vapor, parrilla, rellenos, tortillas o revueltos.",
    },
    {
      id: "proteinas-desgrasadas",
      title: "Proteínas desgrasadas",
      equivalence: "1 IC =",
      items: [
        { id: "claras", image: `${MEDIA}/claras.png`, label: "2 claras de huevo" },
        { id: "proteina", image: `${MEDIA}/proteina.png`, label: "⅓ scoop de proteína" },
        { id: "atun", image: `${MEDIA}/atun.png`, label: "⅓ lata de atún" },
        { id: "jamon", image: `${MEDIA}/jamon.png`, label: "2 fetas de jamón cocido natural" },
      ],
    },
    {
      id: "proteinas-bajas",
      title: "Proteínas bajas en grasa",
      equivalence: "1 IC =",
      items: [
        { id: "pescado-blanco", image: `${MEDIA}/pescado-blanco.png`, label: "30 g de pescados blancos" },
        { id: "carne-magra", image: `${MEDIA}/carne-magra.png`, label: "30 g de peceto, colita de cuadril, nalga, lomo o paleta" },
        { id: "pollo", image: `${MEDIA}/pollo.png`, label: "30 g de pollo sin piel (pechuga, pata o muslo)" },
        { id: "ricotta", image: `${MEDIA}/ricotta.png`, label: "40 g de ricotta magra" },
      ],
      note: "3 IC equivalen aproximadamente a 90 g de carne, pollo o pescado. 4 IC equivalen aproximadamente a 120 g.",
    },
    {
      id: "proteinas-moderadas",
      title: "Proteínas moderadas en grasa",
      equivalence: "1 IC =",
      items: [
        { id: "huevo", image: `${MEDIA}/huevo.png`, label: "1 huevo" },
        { id: "vacio", image: `${MEDIA}/vacio.png`, label: "30 g de vacío desgrasado, entraña u ojo de bife" },
        { id: "queso-untable", image: `${MEDIA}/queso-untable.png`, label: "60 g de queso untable descremado" },
        { id: "port-salut-light", image: `${MEDIA}/port-salut-light.png`, label: "30 g de queso port salut light" },
      ],
    },
    {
      id: "proteinas-altas",
      title: "Proteínas altas en grasa",
      equivalence: "1 IC =",
      items: [
        { id: "salmon", image: `${MEDIA}/salmon.png`, label: "30 g de salmón" },
        { id: "bondiola", image: `${MEDIA}/bondiola.png`, label: "30 g de bondiola o tira de asado" },
        { id: "quesos", image: `${MEDIA}/quesos.png`, label: "30 g de queso port salut, cuartirolo o muzzarella" },
      ],
    },
    {
      id: "azucares",
      title: "Azúcares",
      equivalence: "1 IC =",
      items: [
        { id: "dulce", image: `${MEDIA}/dulce.png`, label: "2 cubos de 2×2 cm de batata o membrillo" },
        { id: "gomitas", image: `${MEDIA}/gomitas.png`, label: "8 gomitas" },
        { id: "pasas", image: `${MEDIA}/pasas.png`, label: "¼ taza de pasas de uva" },
        { id: "azucar", image: `${MEDIA}/azucar.png`, label: "1 cucharada sopera de azúcar" },
        { id: "miel", image: `${MEDIA}/miel.png`, label: "1 cucharada sopera de miel" },
        { id: "mermelada", image: `${MEDIA}/mermelada.png`, label: "1 cucharada sopera de mermelada" },
      ],
    },
    {
      id: "grasas",
      title: "Grasas",
      equivalence: "1 IC =",
      items: [
        { id: "aceite", image: `${MEDIA}/aceite.png`, label: "1 cucharadita tipo té de aceite" },
        { id: "almendras", image: `${MEDIA}/almendras.png`, label: "5–6 almendras (8 g)" },
        { id: "nueces", image: `${MEDIA}/nueces.png`, label: "6 nueces mariposa" },
        { id: "aceitunas", image: `${MEDIA}/aceitunas.png`, label: "8–10 aceitunas" },
        { id: "coco", image: `${MEDIA}/coco.png`, label: "1 cucharada sopera de coco rallado" },
        { id: "semillas", image: `${MEDIA}/semillas.png`, label: "1 cucharadita tipo té de mix de semillas" },
        { id: "palta", image: `${MEDIA}/palta.png`, label: "¼ de palta chica o ⅛ de palta grande" },
        { id: "castanas", image: `${MEDIA}/castanas.png`, label: "5 castañas" },
        { id: "mani", image: `${MEDIA}/mani.png`, label: "18 maníes" },
      ],
    },
  ],
};

function cloneGuide<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeGuide(raw: unknown): GuideData {
  const fallback = cloneGuide(DEFAULT_GUIDE);
  if (!raw || typeof raw !== "object") return fallback;

  const incoming = raw as Partial<GuideData>;
  if (!Array.isArray(incoming.sections) || incoming.sections.length === 0) return fallback;

  const defaultSections = new Map(DEFAULT_GUIDE.sections.map((section) => [section.id, section]));

  const sections = incoming.sections.map((section) => {
    const defaultSection = defaultSections.get(section.id);
    const defaultItems = new Map(defaultSection?.items.map((item) => [item.id, item]) ?? []);

    return {
      ...defaultSection,
      ...section,
      items: Array.isArray(section.items)
        ? section.items.map((item) => ({
            ...defaultItems.get(item.id),
            ...item,
            image: item.image || defaultItems.get(item.id)?.image || "",
          }))
        : defaultSection?.items ?? [],
    } as GuideSection;
  });

  return {
    ...fallback,
    ...incoming,
    intro: {
      ...fallback.intro,
      ...(incoming.intro ?? {}),
    },
    sections,
  };
}

async function imageFileToDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = raw;
  });

  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function ExchangeGuidePage() {
  const [guide, setGuide] = useState<GuideData>(DEFAULT_GUIDE);
  const [draft, setDraft] = useState<GuideData>(DEFAULT_GUIDE);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGuide() {
      try {
        if (!supabase) {
          if (!cancelled) {
            setGuide(DEFAULT_GUIDE);
            setDraft(DEFAULT_GUIDE);
          }
          return;
        }

        const [{ data: sessionData }, { data, error }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("exchange_guide")
            .select("content")
            .eq("id", GUIDE_ROW_ID)
            .maybeSingle(),
        ]);

        if (error) {
          console.warn("No se pudo cargar la guía desde Supabase", error);
        }

        const next = normalizeGuide(data?.content);

        if (!cancelled) {
          setGuide(next);
          setDraft(next);
          setCanEdit(Boolean(sessionData.session?.user));
        }
      } finally {
        if (!cancelled) setLoadingGuide(false);
      }
    }

    void loadGuide();

    return () => {
      cancelled = true;
    };
  }, []);

  const sectionLinks = useMemo(
    () => guide.sections.map((section) => ({ id: section.id, title: section.title })),
    [guide.sections],
  );

  function shareWhatsApp() {
    const url = window.location.href;
    const text = `Guía de intercambios de alimentos\n${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copiá este enlace:", window.location.href);
    }
  }

  function beginEdit() {
    setDraft(cloneGuide(guide));
    setEditing(true);
    setSaved(false);
    setSaveError(null);
  }

  function cancelEdit() {
    setDraft(cloneGuide(guide));
    setEditing(false);
    setSaved(false);
    setSaveError(null);
  }

  async function commitGuide() {
    setSaveError(null);

    if (!supabase) {
      setSaveError("Supabase no está configurado.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setSaveError("Para editar la guía tenés que ingresar al panel.");
      return;
    }

    const next = { ...draft, updatedAt: new Date().toISOString() };

    const { error } = await supabase.from("exchange_guide").upsert(
      {
        id: GUIDE_ROW_ID,
        owner_id: user.id,
        content: next,
        updated_at: next.updatedAt,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error(error);
      setSaveError("No se pudieron guardar los cambios. Revisá la tabla exchange_guide en Supabase.");
      return;
    }

    setGuide(next);
    setDraft(next);
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  function resetGuide() {
    const ok = window.confirm(
      "¿Restaurar el contenido original de la guía? Después tenés que tocar Guardar cambios para confirmarlo.",
    );
    if (!ok) return;
    const clean = cloneGuide(DEFAULT_GUIDE);
    clean.updatedAt = new Date().toISOString();
    setDraft(clean);
  }

  function updateSection(sectionIndex: number, patch: Partial<GuideSection>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex ? { ...section, ...patch } : section,
      ),
    }));
  }

  function updateItem(sectionIndex: number, itemIndex: number, patch: Partial<GuideItem>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, sIndex) =>
        sIndex !== sectionIndex
          ? section
          : {
              ...section,
              items: section.items.map((item, iIndex) =>
                iIndex === itemIndex ? { ...item, ...patch } : item,
              ),
            },
      ),
    }));
  }

  async function replaceItemImage(sectionIndex: number, itemIndex: number, file?: File) {
    if (!file) return;
    try {
      const image = await imageFileToDataUrl(file);
      updateItem(sectionIndex, itemIndex, { image });
    } catch (error) {
      console.error(error);
      setSaveError("No se pudo procesar esa imagen. Probá con JPG, PNG o WEBP.");
    }
  }

  function addItem(sectionIndex: number) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index !== sectionIndex
          ? section
          : {
              ...section,
              items: [
                ...section.items,
                {
                  id: `nuevo-${Date.now()}`,
                  image: "",
                  label: "Nueva opción",
                },
              ],
            },
      ),
    }));
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index !== sectionIndex
          ? section
          : {
              ...section,
              items: section.items.filter((_, i) => i !== itemIndex),
            },
      ),
    }));
  }

  const visibleGuide = editing ? draft : guide;

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#dfe5d8] bg-[#f7f7f2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d7dfcf] bg-white px-3 text-sm font-semibold text-[#18365f] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </a>

          <div className="min-w-0 text-center">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a8b64]">
              Área Nutricional
            </p>
            <p className="truncate text-sm font-bold text-[#18365f]">Guía de intercambios</p>
          </div>

          <button
            type="button"
            onClick={shareWhatsApp}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#78885f] px-3 text-sm font-semibold text-white shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        <div className="overflow-hidden rounded-[30px] border border-[#dfe5d8] bg-white shadow-sm">
          <div className="grid lg:grid-cols-[1.12fr_.88fr]">
            <div className="bg-gradient-to-br from-[#e8eddf] via-[#fbfaf6] to-[#eef2f6] p-7 sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#78885f] shadow-sm">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#78885f]">Guía práctica</p>
              <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight text-[#18365f] sm:text-5xl">
                Intercambios de alimentos
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Equivalencias visuales para consultar por grupo de alimentos y variar las opciones respetando el plan indicado.
              </p>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-sm font-semibold text-[#18365f]">Guía visual y editable.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Las fotos se muestran como referencia de porción. Desde el modo edición podés cambiar textos, agregar opciones, eliminar alimentos o reemplazar una foto.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {!editing && canEdit && (
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#18365f] px-4 text-sm font-semibold text-white"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar guía
                  </button>
                )}
                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={() => void commitGuide()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#78885f] px-4 text-sm font-semibold text-white"
                    >
                      <Save className="h-4 w-4" />
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d7dfcf] bg-white px-4 text-sm font-semibold text-[#18365f]"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Enlace copiado" : "Copiar enlace"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetGuide}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar original
                  </button>
                )}
              </div>
              {saved && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Check className="h-4 w-4" /> Cambios guardados
                </div>
              )}
              {loadingGuide && <p className="mt-4 text-xs text-slate-500">Cargando guía…</p>}
              {saveError && <p className="mt-4 text-xs font-semibold text-rose-700">{saveError}</p>}
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-[#dfe5d8] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eddf] font-bold text-[#65744f]">1</div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  value={draft.intro.title}
                  onChange={(e) => setDraft((current) => ({ ...current, intro: { ...current.intro, title: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold text-[#18365f] outline-none focus:border-[#78885f]"
                />
              ) : (
                <h2 className="text-lg font-bold text-[#18365f]">{guide.intro.title}</h2>
              )}
            </div>
          </div>

          {editing ? (
            <textarea
              value={draft.intro.description}
              onChange={(e) => setDraft((current) => ({ ...current, intro: { ...current.intro, description: e.target.value } }))}
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-[#78885f]"
            />
          ) : (
            <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">{guide.intro.description}</p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Buscá en tu plan", "Cuántos intercambios tenés asignados de cada grupo."],
              ["2", "Elegí la cantidad", "Seleccioná alimentos equivalentes a esos intercambios."],
              ["3", "Reemplazá", "Podés cambiar alimentos dentro del mismo grupo."],
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-2xl bg-[#f7f8f3] p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#78885f] text-sm font-bold text-white">{number}</div>
                <p className="mt-3 text-sm font-bold text-[#18365f]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#eadfd4] bg-[#fffaf5] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9b6c48]">Ejemplo</p>
            <p className="mt-2 text-sm text-slate-700">
              Si tu plan indica <strong>2 intercambios de almidones</strong>, podés elegir <strong>2 rebanadas de pan</strong>, <strong>6 galletas de arroz</strong> o <strong>4 vainillas</strong>.
            </p>
          </div>
        </section>

        {!editing && (
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {sectionLinks.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 rounded-full border border-[#d7dfcf] bg-white px-3 py-2 text-xs font-semibold text-[#5c6d48] shadow-sm"
              >
                {section.title}
              </a>
            ))}
          </nav>
        )}

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {visibleGuide.sections.map((section, sectionIndex) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#dfe5d8] bg-white shadow-sm"
            >
              <div className="border-b border-[#e7ece2] bg-gradient-to-r from-[#eef2e8] to-white p-5 sm:p-6">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xl font-bold text-[#18365f] outline-none focus:border-[#78885f]"
                    />
                    <input
                      value={section.subtitle ?? ""}
                      placeholder="Subtítulo opcional"
                      onChange={(e) => updateSection(sectionIndex, { subtitle: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#78885f]"
                    />
                    <input
                      value={section.equivalence}
                      onChange={(e) => updateSection(sectionIndex, { equivalence: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#65744f] outline-none focus:border-[#78885f]"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-[#18365f]">{section.title}</h2>
                        {section.subtitle && (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#7d8d69]">{section.subtitle}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-[#dfe5d8] bg-white px-3 py-1.5 text-xs font-bold text-[#65744f]">IC</span>
                    </div>
                    <div className="mt-4 inline-flex rounded-xl bg-[#78885f] px-4 py-2 text-sm font-bold text-white">{section.equivalence}</div>
                  </>
                )}
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      className="relative overflow-hidden rounded-2xl border border-[#e4e9df] bg-[#fcfcf9] shadow-[0_1px_0_rgba(15,23,42,0.02)]"
                    >
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeItem(sectionIndex, itemIndex)}
                          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow"
                          aria-label="Eliminar opción"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      <div className="flex aspect-[4/3] items-center justify-center bg-white p-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.label}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-[#f1f3ed] px-3 text-center text-[#7a856f]">
                            <ImagePlus className="h-7 w-7" />
                            <span className="mt-2 text-[11px] font-semibold">Sin foto</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-[#edf0e9] p-3">
                        {editing ? (
                          <>
                            <textarea
                              value={item.label}
                              onChange={(e) => updateItem(sectionIndex, itemIndex, { label: e.target.value })}
                              rows={3}
                              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs font-semibold leading-4 outline-none focus:border-[#78885f]"
                            />
                            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#d7dfcf] bg-white px-2 py-2 text-[11px] font-semibold text-[#5c6d48]">
                              <ImagePlus className="h-3.5 w-3.5" />
                              Cambiar foto
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => void replaceItemImage(sectionIndex, itemIndex, e.target.files?.[0])}
                              />
                            </label>
                            {item.image && (
                              <button
                                type="button"
                                onClick={() => updateItem(sectionIndex, itemIndex, { image: "" })}
                                className="mt-1 w-full rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                              >
                                Quitar foto
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="min-h-[40px] text-center text-xs font-semibold leading-5 text-slate-700">{item.label}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {editing && (
                    <button
                      type="button"
                      onClick={() => addItem(sectionIndex)}
                      className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#aebca1] bg-[#f8faf6] p-3 text-sm font-semibold text-[#65744f]"
                    >
                      <Plus className="mb-2 h-5 w-5" />
                      Agregar opción
                    </button>
                  )}
                </div>

                {editing ? (
                  <textarea
                    value={section.note ?? ""}
                    placeholder="Nota opcional para este grupo"
                    onChange={(e) => updateSection(sectionIndex, { note: e.target.value })}
                    rows={4}
                    className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs leading-5 outline-none focus:border-[#78885f]"
                  />
                ) : (
                  section.note && (
                    <div className="mt-4 rounded-xl bg-[#f7f4ee] p-3 text-xs leading-5 text-slate-600">
                      <strong className="text-slate-700">Nota: </strong>
                      {section.note}
                    </div>
                  )
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-[#dfe5d8] bg-white p-5 text-center text-xs leading-5 text-slate-500">
          Esta guía sirve como referencia de equivalencias. Las cantidades asignadas a cada comida son las indicadas en el plan individual.
        </div>

        {editing && (
          <div className="sticky bottom-4 z-20 mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 rounded-2xl border border-[#dfe5d8] bg-white/95 p-3 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={() => void commitGuide()}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#78885f] px-4 text-sm font-bold text-white"
            >
              <Save className="h-4 w-4" /> Guardar cambios
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>
        )}

        <footer className="py-8 text-center text-xs text-slate-500">Barrozo Luna · Nutrición</footer>
      </section>
    </main>
  );
}
