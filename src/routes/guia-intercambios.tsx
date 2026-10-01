import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Copy,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/guia-intercambios")({
  component: ExchangeGuidePage,
});

const GUIDE_PAGES = [
  { id: "como-usar", title: "Cómo usar la guía", src: "/guia-intercambios/page-04.webp" },
  { id: "lacteos", title: "Lácteos descremados", src: "/guia-intercambios/page-05.webp" },
  { id: "almidones-almuerzo", title: "Almidones · almuerzos", src: "/guia-intercambios/page-06.webp" },
  { id: "almidones-desayuno", title: "Almidones · desayunos", src: "/guia-intercambios/page-07.webp" },
  { id: "frutas", title: "Frutas", src: "/guia-intercambios/page-08.webp" },
  { id: "vegetales", title: "Vegetales", src: "/guia-intercambios/page-09.webp" },
  { id: "proteinas", title: "Proteínas", src: "/guia-intercambios/page-10.webp" },
  { id: "azucares", title: "Azúcares", src: "/guia-intercambios/page-11.webp" },
  { id: "grasas", title: "Grasas", src: "/guia-intercambios/page-12.webp" },
] as const;

function ExchangeGuidePage() {
  const [copied, setCopied] = useState(false);

  function shareWhatsApp() {
    const url = window.location.href;
    const text = `Guía visual de intercambios de alimentos\n${url}`;

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

  return (
    <main className="min-h-screen bg-[#F5F7F1] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-[#DCE4D2] bg-[#F5F7F1]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D3DDC7] bg-white px-3 text-sm font-semibold text-[#17345F] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver</span>
          </a>

          <div className="min-w-0 text-center">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#71815A]">
              Área Nutricional
            </p>
            <p className="truncate text-sm font-bold text-[#17345F]">
              Guía de intercambios
            </p>
          </div>

          <button
            type="button"
            onClick={shareWhatsApp}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#71815A] px-3 text-sm font-semibold text-white shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-8 pt-7 sm:px-6 sm:pt-10">
        <div className="overflow-hidden rounded-[28px] border border-[#DCE4D2] bg-white shadow-sm">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-gradient-to-br from-[#E7EDDC] via-[#F9F7EF] to-[#E9F0F7] p-7 sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#71815A] shadow-sm">
                <BookOpen className="h-7 w-7" />
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#71815A]">
                Guía visual
              </p>
              <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight text-[#17345F] sm:text-5xl">
                Intercambios de alimentos
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                La misma guía visual que usás actualmente, adaptada para que las jugadoras puedan verla cómodamente desde el celular.
              </p>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="text-sm font-semibold text-[#17345F]">
                Compartir con las jugadoras
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Esta página no muestra datos personales. Podés mandar el enlace directamente por WhatsApp y cada jugadora abre la guía desde su teléfono.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#71815A] px-4 text-sm font-semibold text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Compartir por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D3DDC7] bg-white px-4 text-sm font-semibold text-[#17345F]"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Enlace copiado" : "Copiar enlace"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {GUIDE_PAGES.map((page) => (
            <a
              key={page.id}
              href={`#${page.id}`}
              className="shrink-0 rounded-full border border-[#D3DDC7] bg-white px-3 py-2 text-xs font-semibold text-[#566746] shadow-sm"
            >
              {page.title}
            </a>
          ))}
        </nav>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {GUIDE_PAGES.map((page) => (
            <article
              key={page.id}
              id={page.id}
              className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#DCE4D2] bg-white p-2 shadow-sm"
            >
              <img
                src={page.src}
                alt={page.title}
                loading="lazy"
                className="h-auto w-full rounded-[20px]"
              />
            </article>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-[#DCE4D2] bg-white p-5 text-center text-xs leading-5 text-slate-500">
          Esta guía es material de referencia general. Las cantidades asignadas a cada comida son las indicadas en el plan individual.
        </div>

        <footer className="py-8 text-center text-xs text-slate-500">
          Barrozo Luna · Nutrición
        </footer>
      </section>
    </main>
  );
}
