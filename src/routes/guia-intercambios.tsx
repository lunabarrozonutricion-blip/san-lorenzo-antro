import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Edit3,
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
  emoji: string;
  label: string;
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

const DEFAULT_GUIDE: GuideData = {
  updatedAt: new Date().toISOString(),
  intro: {
    title: "¿Cómo usar la guía?",
    description:
      "Buscá en tu plan cuántos intercambios tenés asignados de cada grupo. Elegí alimentos equivalentes a esa cantidad y, cuando necesites variar, reemplazá alimentos dentro del mismo grupo.",
  },
  sections: [
    {
      id: "lacteos",
      title: "Lácteos descremados",
      equivalence: "1 IC =",
      items: [
        { id: "leche", emoji: "🥛", label: "1 vaso de leche descremada (200 cc)" },
        { id: "yogur-pote", emoji: "🥣", label: "1 pote de yogur (200 cc)" },
        { id: "yogur-bebible", emoji: "🥛", label: "1 vaso de yogur bebible (200 cc)" },
      ],
    },
    {
      id: "almidones-almuerzo",
      title: "Almidones",
      subtitle: "Almuerzo y cena",
      equivalence: "1 IC = 100 g cocidos · 3 cucharadas soperas · 1 puño",
      items: [
        { id: "arroz-blanco", emoji: "🍚", label: "Arroz blanco" },
        { id: "arroz-integral", emoji: "🍚", label: "Arroz integral" },
        { id: "arroz-yamani", emoji: "🍚", label: "Arroz yamaní" },
        { id: "quinoa", emoji: "🥣", label: "Quinoa" },
        { id: "fideos", emoji: "🍝", label: "Fideos" },
        { id: "noquis", emoji: "🍝", label: "Ñoquis" },
        { id: "polenta", emoji: "🥣", label: "Polenta" },
        { id: "cuscus", emoji: "🥣", label: "Cuscús" },
        { id: "tuberculos", emoji: "🥔", label: "100 g de papa, batata o choclo" },
      ],
    },
    {
      id: "almidones-desayuno",
      title: "Almidones",
      subtitle: "Desayuno y merienda",
      equivalence: "1 IC =",
      items: [
        { id: "pan", emoji: "🍞", label: "1 rebanada de pan" },
        { id: "galletas-arroz", emoji: "🍘", label: "3 galletas de arroz" },
        { id: "vainillas", emoji: "🍪", label: "2 vainillas" },
        { id: "turron", emoji: "🍫", label: "1 turrón" },
        { id: "granola", emoji: "🥣", label: "30 g de granola" },
        { id: "avena", emoji: "🥣", label: "30 g de avena" },
        { id: "copos", emoji: "🥣", label: "30 g de copos de maíz" },
        { id: "tutucas", emoji: "🌽", label: "30 g de tutucas" },
        { id: "crackers", emoji: "🍘", label: "10 crackers de arroz" },
      ],
      note: "Las opciones marcadas como prácticas o de resolución no necesariamente son para intercambios diarios.",
    },
    {
      id: "frutas",
      title: "Frutas",
      equivalence: "1 IC = 100 g de fruta o una porción equivalente",
      items: [
        { id: "manzana", emoji: "🍎", label: "1 manzana chica" },
        { id: "banana", emoji: "🍌", label: "½ banana grande o 1 banana chica" },
        { id: "kiwi", emoji: "🥝", label: "1 kiwi" },
        { id: "frutillas", emoji: "🍓", label: "¼ taza de frutillas" },
        { id: "uvas", emoji: "🍇", label: "10 uvas" },
        { id: "durazno", emoji: "🍑", label: "1 durazno" },
        { id: "jugo", emoji: "🍊", label: "½ vaso de jugo de naranja" },
        { id: "citricos", emoji: "🍊", label: "1 mandarina o 1 naranja chica" },
        { id: "ciruelas", emoji: "🟣", label: "3 ciruelas chicas o 1 grande" },
      ],
    },
    {
      id: "vegetales",
      title: "Vegetales",
      equivalence: "1 IC =",
      items: [
        { id: "ensalada", emoji: "🥗", label: "100 g de ensalada" },
        { id: "hojas-crudas", emoji: "🥬", label: "1 taza de hojas crudas" },
        { id: "pure", emoji: "🥣", label: "1 taza de puré de vegetales" },
        { id: "hojas-cocidas", emoji: "🥬", label: "½ taza de hojas cocidas" },
      ],
      note:
        "Podés utilizar cualquier vegetal respetando la equivalencia de porción. Algunas opciones: tomate, lechuga, zanahoria, morrón, acelga, apio, berenjena, brócoli, chauchas, coliflor, espárrago, espinaca, kale, puerro, rabanito, remolacha, rúcula, verdeo y zapallo. Preparaciones: crudos, ensalada, cocidos, puré sin manteca, sopas, horno, vapor, parrilla, tortillas o revueltos.",
    },
    {
      id: "proteinas-desgrasadas",
      title: "Proteínas desgrasadas",
      equivalence: "1 IC =",
      items: [
        { id: "claras", emoji: "🥚", label: "2 claras de huevo" },
        { id: "proteina", emoji: "🥤", label: "⅓ scoop de proteína" },
        { id: "atun", emoji: "🐟", label: "⅓ lata de atún" },
        { id: "jamon", emoji: "🍖", label: "2 fetas de jamón cocido natural" },
      ],
    },
    {
      id: "proteinas-bajas",
      title: "Proteínas bajas en grasa",
      equivalence: "1 IC =",
      items: [
        { id: "pescado-blanco", emoji: "🐟", label: "30 g de pescado blanco" },
        { id: "carne-magra", emoji: "🥩", label: "30 g de peceto, colita de cuadril, nalga, lomo o paleta" },
        { id: "pollo", emoji: "🍗", label: "30 g de pollo sin piel" },
        { id: "ricotta", emoji: "🧀", label: "40 g de ricotta magra" },
      ],
      note: "3 IC equivalen aproximadamente a 90 g de carne, pollo o pescado. 4 IC equivalen aproximadamente a 120 g.",
    },
    {
      id: "proteinas-moderadas",
      title: "Proteínas moderadas en grasa",
      equivalence: "1 IC =",
      items: [
        { id: "huevo", emoji: "🥚", label: "1 huevo" },
        { id: "vacio", emoji: "🥩", label: "30 g de vacío desgrasado, entraña u ojo de bife" },
        { id: "queso-untable", emoji: "🧀", label: "60 g de queso untable descremado" },
        { id: "port-salut-light", emoji: "🧀", label: "30 g de queso port salut light" },
      ],
    },
    {
      id: "proteinas-altas",
      title: "Proteínas altas en grasa",
      equivalence: "1 IC =",
      items: [
        { id: "salmon", emoji: "🐟", label: "30 g de salmón" },
        { id: "bondiola", emoji: "🥩", label: "30 g de bondiola o tira de asado" },
        { id: "quesos", emoji: "🧀", label: "30 g de port salut, cuartirolo o muzzarella" },
      ],
    },
    {
      id: "azucares",
      title: "Azúcares",
      equivalence: "1 IC =",
      items: [
        { id: "dulce", emoji: "🍬", label: "2 cubos de 2×2 cm de batata o membrillo" },
        { id: "gomitas", emoji: "🍬", label: "8 gomitas" },
        { id: "pasas", emoji: "🍇", label: "¼ taza de pasas de uva" },
        { id: "azucar", emoji: "🥄", label: "1 cucharada sopera de azúcar" },
        { id: "miel", emoji: "🍯", label: "1 cucharada sopera de miel" },
        { id: "mermelada", emoji: "🍓", label: "1 cucharada sopera de mermelada" },
      ],
    },
    {
      id: "grasas",
      title: "Grasas",
      equivalence: "1 IC =",
      items: [
        { id: "aceite", emoji: "🫒", label: "1 cucharadita tipo té de aceite" },
        { id: "almendras", emoji: "🌰", label: "5–6 almendras (8 g)" },
        { id: "nueces", emoji: "🌰", label: "6 nueces mariposa" },
        { id: "aceitunas", emoji: "🫒", label: "8–10 aceitunas" },
        { id: "coco", emoji: "🥥", label: "1 cucharada sopera de coco rallado" },
        { id: "semillas", emoji: "🌱", label: "1 cucharadita tipo té de mix de semillas" },
        { id: "palta", emoji: "🥑", label: "¼ de palta chica o ⅛ de palta grande" },
        { id: "castanas", emoji: "🌰", label: "5 castañas" },
        { id: "mani", emoji: "🥜", label: "18 maníes" },
      ],
    },
  ],
};

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

        const cloudGuide = data?.content as GuideData | undefined;
        const next = cloudGuide?.sections?.length ? cloudGuide : DEFAULT_GUIDE;

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
    setDraft(JSON.parse(JSON.stringify(guide)) as GuideData);
    setEditing(true);
    setSaved(false);
  }

  function cancelEdit() {
    setDraft(JSON.parse(JSON.stringify(guide)) as GuideData);
    setEditing(false);
    setSaved(false);
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
    const clean = JSON.parse(JSON.stringify(DEFAULT_GUIDE)) as GuideData;
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
                  emoji: "🍽️",
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
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#dfe7d8] bg-[#f6f8f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d7e0d0] bg-white px-3 text-sm font-semibold text-[#17345f] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </a>

          <div className="min-w-0 text-center">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#73855f]">
              Área Nutricional
            </p>
            <p className="truncate text-sm font-bold text-[#17345f]">Guía de intercambios</p>
          </div>

          <button
            type="button"
            onClick={shareWhatsApp}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#71815a] px-3 text-sm font-semibold text-white shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        <div className="overflow-hidden rounded-[30px] border border-[#dfe7d8] bg-white shadow-sm">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="bg-gradient-to-br from-[#e7eddd] via-[#fbfaf5] to-[#e9f0f7] p-7 sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#71815a] shadow-sm">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#71815a]">Guía práctica</p>
              <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight text-[#17345f] sm:text-5xl">
                Intercambios de alimentos
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Equivalencias simples para poder variar los alimentos sin perder la estructura indicada en el plan.
              </p>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-sm font-semibold text-[#17345f]">Una guía hecha para consultar, no para hacer zoom.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El contenido está armado directamente en la página: texto nítido, tarjetas ordenadas y lectura cómoda desde el celular.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {!editing && canEdit && (
                  <button
                    type="button"
                    onClick={beginEdit}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17345f] px-4 text-sm font-semibold text-white"
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
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#71815a] px-4 text-sm font-semibold text-white"
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
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d7e0d0] bg-white px-4 text-sm font-semibold text-[#17345f]"
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
                    Restaurar
                  </button>
                )}
              </div>
              {saved && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Check className="h-4 w-4" /> Cambios guardados
                </div>
              )}
              {loadingGuide && (
                <p className="mt-4 text-xs text-slate-500">Cargando guía…</p>
              )}
              {saveError && (
                <p className="mt-4 text-xs font-semibold text-rose-700">{saveError}</p>
              )}
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-[#dfe7d8] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7eddd] font-bold text-[#60724e]">?</div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  value={draft.intro.title}
                  onChange={(e) => setDraft((current) => ({ ...current, intro: { ...current.intro, title: e.target.value } }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold text-[#17345f] outline-none focus:border-[#71815a]"
                />
              ) : (
                <h2 className="text-lg font-bold text-[#17345f]">{guide.intro.title}</h2>
              )}
            </div>
          </div>

          {editing ? (
            <textarea
              value={draft.intro.description}
              onChange={(e) => setDraft((current) => ({ ...current, intro: { ...current.intro, description: e.target.value } }))}
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-[#71815a]"
            />
          ) : (
            <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">{guide.intro.description}</p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Mirá tu plan", "Identificá cuántos IC tenés asignados de cada grupo."],
              ["2", "Elegí una opción", "Usá las equivalencias de esta guía para armar la porción."],
              ["3", "Intercambiá", "Podés variar alimentos dentro del mismo grupo."],
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-2xl bg-[#f7f9f4] p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#71815a] text-sm font-bold text-white">{number}</div>
                <p className="mt-3 text-sm font-bold text-[#17345f]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#eadfd4] bg-[#fffaf4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a36f46]">Ejemplo</p>
            <p className="mt-2 text-sm text-slate-700">
              Si tu plan indica <strong>2 IC de almidones</strong>, podés elegir por ejemplo <strong>2 rebanadas de pan</strong>, <strong>6 galletas de arroz</strong> o <strong>4 vainillas</strong>.
            </p>
          </div>
        </section>

        {!editing && (
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {sectionLinks.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 rounded-full border border-[#d7e0d0] bg-white px-3 py-2 text-xs font-semibold text-[#566746] shadow-sm"
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
              className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#dfe7d8] bg-white shadow-sm"
            >
              <div className="border-b border-[#e7ece2] bg-gradient-to-r from-[#eef3e8] to-white p-5 sm:p-6">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xl font-bold text-[#17345f] outline-none focus:border-[#71815a]"
                    />
                    <input
                      value={section.subtitle ?? ""}
                      placeholder="Subtítulo opcional"
                      onChange={(e) => updateSection(sectionIndex, { subtitle: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#71815a]"
                    />
                    <input
                      value={section.equivalence}
                      onChange={(e) => updateSection(sectionIndex, { equivalence: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#60724e] outline-none focus:border-[#71815a]"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-[#17345f]">{section.title}</h2>
                        {section.subtitle && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#7d8d69]">{section.subtitle}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#60724e] shadow-sm">IC</span>
                    </div>
                    <div className="mt-4 inline-flex rounded-xl bg-[#71815a] px-4 py-2 text-sm font-bold text-white">{section.equivalence}</div>
                  </>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {section.items.map((item, itemIndex) => (
                    <div key={item.id} className="relative rounded-2xl border border-[#e5eadf] bg-[#fbfcf9] p-3 text-center">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => removeItem(sectionIndex, itemIndex)}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600"
                            aria-label="Eliminar opción"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <input
                            value={item.emoji}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, { emoji: e.target.value })}
                            className="mx-auto block w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-3xl outline-none focus:border-[#71815a]"
                          />
                          <textarea
                            value={item.label}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, { label: e.target.value })}
                            rows={3}
                            className="mt-3 w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-xs leading-4 outline-none focus:border-[#71815a]"
                          />
                        </>
                      ) : (
                        <>
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf2e7] text-4xl">{item.emoji}</div>
                          <p className="mt-3 text-xs font-semibold leading-4 text-slate-700">{item.label}</p>
                        </>
                      )}
                    </div>
                  ))}

                  {editing && (
                    <button
                      type="button"
                      onClick={() => addItem(sectionIndex)}
                      className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#aebca1] bg-[#f8faf6] p-3 text-sm font-semibold text-[#60724e]"
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
                    rows={3}
                    className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs leading-5 outline-none focus:border-[#71815a]"
                  />
                ) : (
                  section.note && (
                    <div className="mt-4 rounded-xl bg-[#f7f4ee] p-3 text-xs leading-5 text-slate-600">
                      <strong className="text-slate-700">Nota: </strong>{section.note}
                    </div>
                  )
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-[#dfe7d8] bg-white p-5 text-center text-xs leading-5 text-slate-500">
          Esta guía sirve como referencia de equivalencias. Las cantidades asignadas a cada comida son las indicadas en el plan individual.
        </div>

        {editing && (
          <div className="sticky bottom-4 z-20 mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 rounded-2xl border border-[#dfe7d8] bg-white/95 p-3 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={() => void commitGuide()}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#71815a] px-4 text-sm font-bold text-white"
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
