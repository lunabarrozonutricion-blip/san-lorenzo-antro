import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Printer,
} from "lucide-react";
import { useMemo } from "react";

import { AppLayout } from "@/components/app-layout";
import { ClientOnly } from "@/components/client-only";
import { PlayerNav } from "@/components/player-nav";
import { Button } from "@/components/ui/button";

import {
  fmt,
  fmtDate,
} from "@/lib/calc";

import {
  calculateAntropogimsPresentation,
} from "@/lib/antropogims-presentation";

import {
  previousFullAnthropometry,
  useFullAnthropometries,
  useFullAnthropometry,
  usePlayer,
} from "@/lib/hooks";

import {
  FULL_ANTHROPOMETRY_GROUP_LABELS,
  FULL_ANTHROPOMETRY_MEASURES,
} from "@/lib/types";

import type {
  FiveComponentMasses,
  FullAnthropometry,
  FullAnthropometryGroup,
  FullAnthropometryMeasureKey,
} from "@/lib/types";

export const Route = createFileRoute(
  "/componentes-presentacion",
)({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    player?: number;
    id?: number;
  } => ({
    player:
      s.player != null &&
      s.player !== ""
        ? Number(s.player)
        : undefined,

    id:
      s.id != null &&
      s.id !== ""
        ? Number(s.id)
        : undefined,
  }),

  component: () => (
    <ClientOnly>
      <PresentacionAntropogims />
    </ClientOnly>
  ),
});

/* ============================================================
   CONFIGURACIÓN
============================================================ */

const GROUP_ORDER:
  FullAnthropometryGroup[] = [
    "basicos",
    "diametros",
    "perimetros",
    "pliegues",
  ];

const MASS_ROWS: Array<{
  key: keyof FiveComponentMasses;
  label: string;
}> = [
  {
    key: "adipose",
    label: "Masa Adiposa",
  },
  {
    key: "muscle",
    label: "Masa Muscular",
  },
  {
    key: "residual",
    label: "Masa Residual",
  },
  {
    key: "bone",
    label: "Masa Ósea",
  },
  {
    key: "skin",
    label: "Masa de la Piel",
  },
];

const MASS_COLORS: Record<
  keyof FiveComponentMasses,
  string
> = {
  adipose: "#c94f48",
  muscle: "#8bae48",
  residual: "#7655a0",
  bone: "#4aa1ba",
  skin: "#e88a3c",
};

const BASIC_KEYS:
  FullAnthropometryMeasureKey[] = [
    "weight",
    "sittingHeight",
  ];

const DIAMETER_KEYS:
  FullAnthropometryMeasureKey[] = [
    "biacromial",
    "thoraxTransverse",
    "thoraxAP",
    "biiliocristal",
    "humeral",
    "femoral",
  ];

const PERIMETER_KEYS:
  FullAnthropometryMeasureKey[] = [
    "head",
    "armRelaxed",
    "armFlexed",
    "forearmMax",
    "thoraxMesosternal",
    "waistMin",
    "hipMax",
    "thighMax",
    "thighMedial",
    "calfMax",
  ];

const SKINFOLD_KEYS:
  FullAnthropometryMeasureKey[] = [
    "triceps",
    "subscapular",
    "supraespinal",
    "abdominal",
    "thighSkinfold",
    "calfSkinfold",
  ];

/* ============================================================
   HELPERS
============================================================ */

function measureLabel(
  key:
    FullAnthropometryMeasureKey,
) {
  return (
    FULL_ANTHROPOMETRY_MEASURES.find(
      (item) =>
        item.key === key,
    )?.label ?? key
  );
}

function currentMeasureValue(
  anthropometry:
    FullAnthropometry,
  key:
    FullAnthropometryMeasureKey,
) {
  return (
    anthropometry.measures[
      key
    ]?.median ?? null
  );
}

function formatNumber(
  value:
    | number
    | null
    | undefined,
  decimals = 2,
) {
  if (value == null) {
    return "—";
  }

  return fmt(
    value,
    decimals,
  );
}

function signed(
  value:
    | number
    | null
    | undefined,
  decimals = 2,
  unit = "",
) {
  if (value == null) {
    return "—";
  }

  const sign =
    value > 0
      ? "+"
      : "";

  return `${sign}${fmt(
    value,
    decimals,
  )}${unit}`;
}

function sumMasses(
  masses:
    FiveComponentMasses,
) {
  const values = [
    masses.adipose,
    masses.muscle,
    masses.residual,
    masses.bone,
    masses.skin,
  ];

  if (
    values.some(
      (value) =>
        value == null,
    )
  ) {
    return null;
  }

  return values.reduce(
    (total, value) =>
      total +
      (value as number),
    0,
  );
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    Math.max(
      value,
      min,
    ),
    max,
  );
}

/* ============================================================
   PANTALLA
============================================================ */

function PresentacionAntropogims() {
  const search =
    Route.useSearch();

  const playerId =
    search.player ?? null;

  const evaluationId =
    search.id ?? null;

  const player =
    usePlayer(
      playerId,
    );

  const anthropometry =
    useFullAnthropometry(
      evaluationId,
    );

  const allAnthropometries =
    useFullAnthropometries(
      playerId,
    );

  const previous =
    previousFullAnthropometry(
      allAnthropometries,
      anthropometry,
    );

  const presentation =
    useMemo(
      () =>
        anthropometry
          ? calculateAntropogimsPresentation(
              anthropometry,
              previous,
            )
          : null,
      [
        anthropometry,
        previous,
      ],
    );

  const previousPresentation =
    useMemo(
      () =>
        previous
          ? calculateAntropogimsPresentation(
              previous,
            )
          : null,
      [previous],
    );

  if (
    playerId == null ||
    evaluationId == null
  ) {
    return (
      <AppLayout title="Presentación">
        <p className="text-sm text-muted-foreground">
          No se seleccionó una
          evaluación.
        </p>
      </AppLayout>
    );
  }

  if (
    !player ||
    !anthropometry ||
    !presentation
  ) {
    return (
      <AppLayout title="Presentación">
        <p className="text-sm text-muted-foreground">
          Cargando presentación…
        </p>
      </AppLayout>
    );
  }

  const massTotal =
    sumMasses(
      presentation.massesKg,
    );

  const fiveMassScoreItems:
    ScoreItem[] = [
      {
        label: "Peso (kg)",
        value:
          presentation
            .totalMassScoreZ,
        color: "#4d83bd",
      },
      {
        label: "Masa Adiposa",
        value:
          presentation
            .massScoreZ
            .adipose,
        color:
          MASS_COLORS.adipose,
      },
      {
        label: "Masa Muscular",
        value:
          presentation
            .massScoreZ
            .muscle,
        color:
          MASS_COLORS.muscle,
      },
      {
        label: "Masa Residual",
        value:
          presentation
            .massScoreZ
            .residual,
        color:
          MASS_COLORS.residual,
      },
      {
        label: "Masa Ósea",
        value:
          presentation
            .massScoreZ
            .bone,
        color:
          MASS_COLORS.bone,
      },
    ];

  return (
    <AppLayout
      title={`Presentación · ${player.name}`}
      subtitle="Informe de composición corporal · Antropogims / Kerr"
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        .antro-sheet {
          background: #ffffff;
          color: #111827;
          border: 1px solid #475569;
          border-radius: 0;
          overflow: hidden;
        }

        .antro-title-grid {
          display: grid;
          grid-template-columns: 1fr 235px;
          border-bottom: 1px solid #475569;
        }

        .antro-title {
          min-height: 112px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px;
          text-align: center;
          font-size: 29px;
          line-height: 1.1;
          font-weight: 700;
        }

        .antro-brand {
          border-left: 1px solid #475569;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding: 12px;
          font-size: 12px;
          line-height: 1.35;
        }

        .antro-brand strong {
          font-size: 15px;
        }

        .antro-info {
          padding: 18px 110px 16px;
          border-bottom: 1px solid #475569;
        }

        .antro-info-line {
          display: grid;
          grid-template-columns: 1fr 165px;
          border: 1px solid #475569;
          min-height: 31px;
        }

        .antro-info-line + .antro-info-line {
          margin-top: 12px;
        }

        .antro-info-cell {
          padding: 5px 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
        }

        .antro-info-cell + .antro-info-cell {
          border-left: 1px solid #475569;
        }

        .antro-info-cell strong {
          font-weight: 700;
        }

        .section-title {
          font-size: 26px;
          font-weight: 700;
          text-align: center;
          padding: 23px 15px;
          border-bottom: 1px solid #475569;
        }

        .technical-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }

        .technical-table th,
        .technical-table td {
          border-bottom: 1px solid #cbd5e1;
          padding: 5px 7px;
          vertical-align: middle;
        }

        .technical-table thead th {
          border-bottom: 1px solid #475569;
          font-weight: 600;
          text-align: center;
          background: #ffffff;
        }

        .technical-table .measure-name {
          text-align: left;
        }

        .technical-table .numeric {
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .group-cell {
          width: 84px;
          text-align: center;
          font-weight: 700;
          border-right: 1px solid #475569;
          line-height: 1.15;
        }

        .group-basicos {
          color: #304c9c;
        }

        .group-diametros {
          color: #b03333;
        }

        .group-perimetros {
          color: #303c96;
        }

        .group-pliegues {
          color: #b03333;
        }

        .five-mass-layout {
          display: grid;
          grid-template-columns: 84px 1fr 105px;
          min-height: 340px;
          border-bottom: 1px solid #475569;
        }

        .side-label {
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 8px;
          font-size: 11px;
          line-height: 1.15;
          font-weight: 700;
        }

        .side-label-left {
          color: #9c3697;
          border-right: 1px solid #475569;
        }

        .side-label-right {
          color: #5650a6;
          border-left: 1px solid #475569;
        }

        .five-chart {
          padding: 18px 26px;
        }

        .five-table {
          width: calc(100% - 84px);
          margin-left: 84px;
          border-collapse: collapse;
          font-size: 12px;
        }

        .five-table th,
        .five-table td {
          padding: 6px 9px;
          border-bottom: 1px solid #cbd5e1;
        }

        .five-table th {
          color: #31893c;
          text-align: center;
          font-weight: 700;
        }

        .five-table td:first-child {
          color: #31893c;
        }

        .five-table td:not(:first-child) {
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .five-table-total td {
          font-weight: 700;
          border-top: 1px solid #475569;
        }

        .structured-row {
          margin-left: 84px;
          border-top: 1px solid #475569;
          border-bottom: 1px solid #475569;
          padding: 7px 9px;
          color: #31893c;
          font-size: 12px;
          font-weight: 700;
        }

        .five-explanation {
          margin-left: 84px;
          padding: 10px 12px 16px;
          font-size: 11px;
          line-height: 1.4;
        }

        .mass-reference {
          display: grid;
          grid-template-columns: 100px 1fr;
          max-width: 520px;
          margin-top: 8px;
          font-size: 10px;
        }

        .mass-reference > div {
          padding: 2px 4px;
        }

        .phantom-description {
          border-bottom: 1px solid #475569;
          padding: 14px 20px;
          font-size: 11px;
          line-height: 1.45;
        }

        .phantom-description h3 {
          text-align: center;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
        }

        .phantom-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 28px 34px;
          padding: 22px;
        }

        .score-plot {
          min-width: 0;
        }

        .score-title {
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .score-row {
          display: grid;
          grid-template-columns: 135px minmax(0, 1fr) 44px;
          gap: 8px;
          align-items: center;
          margin-bottom: 9px;
        }

        .score-label {
          font-size: 10px;
          line-height: 1.1;
        }

        .score-value {
          font-size: 10px;
          font-weight: 600;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .score-track {
          position: relative;
          height: 24px;
          border-left: 1px solid #6b7280;
          border-right: 1px solid #6b7280;
          background-image:
            linear-gradient(
              to bottom,
              transparent calc(50% - .5px),
              #9ca3af calc(50% - .5px),
              #9ca3af calc(50% + .5px),
              transparent calc(50% + .5px)
            ),
            repeating-linear-gradient(
              to right,
              transparent 0,
              transparent calc(12.5% - 1px),
              #cbd5e1 calc(12.5% - 1px),
              #cbd5e1 12.5%
            );
        }

        .score-zero {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #374151;
        }

        .score-dot {
          position: absolute;
          top: 50%;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(255,255,255,.9);
        }

        .score-axis {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          margin-left: 143px;
          margin-right: 52px;
          font-size: 9px;
          color: #374151;
          text-align: center;
        }

        .additional-layout {
          display: grid;
          grid-template-columns: 95px 1fr;
        }

        .additional-side {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-right: 1px solid #475569;
          font-size: 10px;
          font-weight: 700;
          color: #4c4c91;
        }

        .additional-content {
          padding: 16px 22px 20px;
        }

        .additional-values {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 14px;
        }

        .additional-values td {
          border-top: 1px solid #94a3b8;
          border-bottom: 1px solid #94a3b8;
          padding: 11px 12px;
        }

        .additional-values td:nth-child(odd) {
          width: 30%;
          font-weight: 500;
        }

        .additional-values td:nth-child(even) {
          width: 20%;
          font-weight: 700;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .risk-intro {
          margin: 2px 0 10px;
          font-size: 11px;
          line-height: 1.45;
        }

        .risk-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .risk-table th,
        .risk-table td {
          border: 1px solid #475569;
          padding: 4px 6px;
          text-align: center;
        }

        .risk-table th {
          font-weight: 700;
        }

        .somato-values {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0;
          font-size: 12px;
        }

        .somato-values th,
        .somato-values td {
          border-bottom: 1px solid #94a3b8;
          padding: 7px 10px;
          text-align: center;
        }

        .somato-values th:nth-child(1),
        .somato-values td:nth-child(1) {
          color: #ef7d22;
        }

        .somato-values th:nth-child(2),
        .somato-values td:nth-child(2) {
          color: #315be4;
        }

        .somato-values th:nth-child(3),
        .somato-values td:nth-child(3) {
          color: #299443;
        }

        .somatochart {
          display: grid;
          grid-template-columns: 95px 1fr;
          min-height: 440px;
          border-top: 1px solid #475569;
          border-bottom: 1px solid #475569;
        }

        .somato-side {
          border-right: 1px solid #475569;
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }

        .somato-graph {
          position: relative;
          margin: 0;
          height: 440px;
          overflow: hidden;
          background:
            repeating-linear-gradient(
              to right,
              transparent 0,
              transparent calc(10% - 1px),
              #e5e7eb calc(10% - 1px),
              #e5e7eb 10%
            ),
            repeating-linear-gradient(
              to bottom,
              transparent 0,
              transparent calc(10% - 1px),
              #e5e7eb calc(10% - 1px),
              #e5e7eb 10%
            );
        }

        .somato-x {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #6b7280;
        }

        .somato-y {
          position: absolute;
          left: 0;
          right: 0;
          top: 61.5%;
          height: 1px;
          background: #6b7280;
        }

        .somato-meso {
          position: absolute;
          left: 50%;
          top: 14px;
          transform: translateX(-50%);
          color: #315be4;
          font-weight: 700;
          font-size: 13px;
        }

        .somato-endo {
          position: absolute;
          left: 18px;
          bottom: 22px;
          color: #ef7d22;
          font-weight: 700;
          font-size: 13px;
        }

        .somato-ecto {
          position: absolute;
          right: 18px;
          bottom: 22px;
          color: #299443;
          font-weight: 700;
          font-size: 13px;
        }

        .somato-dot {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid white;
        }

        .somato-footer {
          margin-left: 95px;
          padding: 10px 12px;
          font-size: 11px;
        }

        .somato-footer-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          border: 1px solid #94a3b8;
          margin-top: 10px;
        }

        .somato-footer-item {
          padding: 8px;
          text-align: center;
        }

        .somato-footer-item + .somato-footer-item {
          border-left: 1px solid #94a3b8;
        }

        .somato-footer-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
        }

        .somato-footer-value {
          margin-top: 3px;
          font-size: 13px;
          font-weight: 700;
        }

        .comparison-note {
          margin-top: 10px;
          border-top: 1px solid #94a3b8;
          padding-top: 8px;
          font-size: 10px;
        }

        @media (max-width: 800px) {
          .antro-title-grid {
            grid-template-columns: 1fr;
          }

          .antro-brand {
            border-left: 0;
            border-top: 1px solid #475569;
          }

          .antro-info {
            padding: 14px;
          }

          .five-mass-layout {
            grid-template-columns: 1fr;
          }

          .side-label {
            display: none;
          }

          .five-table,
          .structured-row,
          .five-explanation {
            width: 100%;
            margin-left: 0;
          }

          .phantom-grid {
            grid-template-columns: 1fr;
          }

          .additional-layout,
          .somatochart {
            grid-template-columns: 1fr;
          }

          .additional-side,
          .somato-side {
            display: none;
          }

          .somato-footer {
            margin-left: 0;
          }
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print-page {
            break-before: page;
            page-break-before: always;
          }

          .antro-sheet {
            box-shadow: none !important;
          }

          .antro-title {
            min-height: 70px;
            font-size: 20px;
          }

          .antro-brand {
            font-size: 8px;
          }

          .antro-brand strong {
            font-size: 10px;
          }

          .antro-info {
            padding: 9px 95px;
          }

          .antro-info-line {
            min-height: 22px;
          }

          .antro-info-line + .antro-info-line {
            margin-top: 6px;
          }

          .antro-info-cell {
            padding: 3px 7px;
            font-size: 8px;
          }

          .section-title {
            padding: 10px;
            font-size: 16px;
          }

          .technical-table {
            font-size: 7.5px;
          }

          .technical-table th,
          .technical-table td {
            padding: 2px 4px;
          }

          .group-cell {
            width: 62px;
            font-size: 7px;
          }

          .five-mass-layout {
            grid-template-columns: 62px 1fr 80px;
            min-height: 255px;
          }

          .side-label {
            font-size: 7px;
          }

          .five-chart {
            padding: 10px 18px;
          }

          .five-table {
            width: calc(100% - 62px);
            margin-left: 62px;
            font-size: 7.5px;
          }

          .five-table th,
          .five-table td {
            padding: 3px 6px;
          }

          .structured-row,
          .five-explanation {
            margin-left: 62px;
          }

          .structured-row {
            padding: 4px 6px;
            font-size: 7.5px;
          }

          .five-explanation {
            padding: 6px 8px 8px;
            font-size: 7px;
          }

          .mass-reference {
            font-size: 6.5px;
            margin-top: 4px;
          }

          .phantom-description {
            padding: 8px 12px;
            font-size: 7px;
          }

          .phantom-description h3 {
            font-size: 8px;
            margin-bottom: 4px;
          }

          .phantom-grid {
            gap: 14px 18px;
            padding: 12px;
          }

          .score-title {
            font-size: 9px;
            margin-bottom: 6px;
          }

          .score-row {
            grid-template-columns: 92px 1fr 30px;
            gap: 4px;
            margin-bottom: 4px;
          }

          .score-label,
          .score-value {
            font-size: 6.5px;
          }

          .score-track {
            height: 15px;
          }

          .score-dot {
            width: 9px;
            height: 9px;
          }

          .score-axis {
            margin-left: 96px;
            margin-right: 34px;
            font-size: 5.5px;
          }

          .additional-layout {
            grid-template-columns: 62px 1fr;
          }

          .additional-side {
            font-size: 7px;
          }

          .additional-content {
            padding: 8px 12px;
          }

          .risk-intro {
            font-size: 7px;
            margin-bottom: 5px;
          }

          .risk-table {
            font-size: 6.5px;
          }

          .risk-table th,
          .risk-table td {
            padding: 2px 4px;
          }

          .additional-values {
            font-size: 7px;
            margin-top: 7px;
          }

          .additional-values td {
            padding: 5px 7px;
          }

          .somato-values {
            font-size: 7.5px;
          }

          .somato-values th,
          .somato-values td {
            padding: 4px 6px;
          }

          .somatochart {
            grid-template-columns: 62px 1fr;
            min-height: 300px;
          }

          .somato-side {
            font-size: 7px;
            padding-top: 12px;
          }

          .somato-graph {
            height: 300px;
          }

          .somato-meso,
          .somato-endo,
          .somato-ecto {
            font-size: 8px;
          }

          .somato-dot {
            width: 11px;
            height: 11px;
          }

          .somato-footer {
            margin-left: 62px;
            padding: 6px 8px;
          }

          .somato-footer-item {
            padding: 5px;
          }

          .somato-footer-label {
            font-size: 6px;
          }

          .somato-footer-value {
            font-size: 8px;
          }

          .comparison-note {
            font-size: 6.5px;
            margin-top: 5px;
            padding-top: 5px;
          }
        }
      `}</style>

      <PlayerNav
        playerId={playerId}
        playerName={
          player.name
        }
        current="componentes"
      />

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="outline"
        >
          <Link
            to="/componentes"
            search={{
              player:
                playerId,
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <Button
          onClick={() =>
            window.print()
          }
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      {/* ==================================================
          PÁGINA 1
      ================================================== */}

      <section className="antro-sheet">
        <SheetHeader
          title="Informe de Composición Corporal"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <MeasurementTable
          anthropometry={
            anthropometry
          }
          presentation={
            presentation
          }
        />
      </section>

      {/* ==================================================
          PÁGINA 2
      ================================================== */}

      <section className="antro-sheet print-page mt-4">
        <SheetHeader
          title="Informe de Composición Corporal"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <div className="five-mass-layout">
          <div className="side-label side-label-left">
            FRACCIONAMIENTO
            <br />
            5 MASAS
          </div>

          <div className="five-chart">
            <ScoreZPlot
              title="Fraccionamiento 5 masas"
              items={
                fiveMassScoreItems
              }
            />
          </div>

          <div className="side-label side-label-right">
            MASAS
            <br />
            CORPORALES
          </div>
        </div>

        <table className="five-table">
          <thead>
            <tr>
              <th className="text-left">
                &nbsp;
              </th>

              <th>
                Porcentaje
              </th>

              <th>
                Kg
              </th>

              <th>
                Score-Z
              </th>

              <th>
                Dif.
              </th>
            </tr>
          </thead>

          <tbody>
            {MASS_ROWS.map(
              (
                row,
              ) => (
                <tr
                  key={
                    row.key
                  }
                >
                  <td>
                    {
                      row.label
                    }
                  </td>

                  <td>
                    {presentation
                      .massPercentages[
                      row.key
                    ] != null
                      ? `${fmt(
                          presentation
                            .massPercentages[
                            row.key
                          ]!,
                          2,
                        )}%`
                      : "—"}
                  </td>

                  <td>
                    {presentation
                      .massesKg[
                      row.key
                    ] != null
                      ? fmt(
                          presentation
                            .massesKg[
                            row.key
                          ]!,
                          3,
                        )
                      : "—"}
                  </td>

                  <td>
                    {presentation
                      .massScoreZ[
                      row.key
                    ] != null
                      ? fmt(
                          presentation
                            .massScoreZ[
                            row.key
                          ]!,
                          2,
                        )
                      : "—"}
                  </td>

                  <td>
                    {presentation
                      .massDifferencesKg
                      ? signed(
                          presentation
                            .massDifferencesKg[
                            row.key
                          ],
                          3,
                        )
                      : "—"}
                  </td>
                </tr>
              ),
            )}

            <tr className="five-table-total">
              <td>
                Masa Total
              </td>

              <td>
                100,00%
              </td>

              <td>
                {massTotal !=
                null
                  ? fmt(
                      massTotal,
                      3,
                    )
                  : "—"}
              </td>

              <td>
                {presentation
                  .totalMassScoreZ !=
                null
                  ? fmt(
                      presentation
                        .totalMassScoreZ,
                      2,
                    )
                  : "—"}
              </td>

              <td>
                —
              </td>
            </tr>
          </tbody>
        </table>

        <div className="structured-row">
          Porcentaje de diferencia
          Peso Estructurado - Peso
          Bruto:{" "}
          <span className="text-foreground">
            {presentation
              .structuredDifferencePercent !=
            null
              ? signed(
                  presentation
                    .structuredDifferencePercent,
                  2,
                  "%",
                )
              : "—"}
          </span>

          {anthropometry
            .boneReferenceKg !=
            null && (
            <>
              {" "}
              · Masa ósea de
              referencia:{" "}
              <span className="text-foreground">
                {fmt(
                  anthropometry
                    .boneReferenceKg,
                  3,
                )}{" "}
                kg
              </span>
            </>
          )}
        </div>

        <div className="five-explanation">
          <p>
            El{" "}
            <strong>
              fraccionamiento corporal
              en 5 componentes
            </strong>{" "}
            (D. Kerr, 1988) divide la
            masa corporal en cinco
            fracciones anatómicas.
          </p>

          <div className="mass-reference">
            <div>
              1 - Adiposa
            </div>
            <div>
              grasa subcutánea
            </div>

            <div>
              2 - Muscular
            </div>
            <div>
              músculo
            </div>

            <div>
              3 - Residual
            </div>
            <div>
              vísceras, órganos y
              pulmones
            </div>

            <div>
              4 - Ósea
            </div>
            <div>
              huesos
            </div>

            <div>
              5 - Cutánea
            </div>
            <div>
              piel
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          PÁGINA 3
      ================================================== */}

      <section className="antro-sheet print-page mt-4">
        <SheetHeader
          title="Phantom Score-Z"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <div className="phantom-description">
          <h3>
            MODELO DE
            PROPORCIONALIDAD PHANTOM
          </h3>

          <p>
            El modelo PHANTOM utiliza
            una referencia humana
            unisex de 170,18 cm. Cada
            variable se ajusta a esa
            talla y se expresa como
            Score-Z.
          </p>

          <p className="mt-2">
            El valor 0 representa la
            referencia. Los valores
            positivos se ubican por
            encima y los negativos por
            debajo de ella.
          </p>
        </div>

        <div className="phantom-grid">
          <ScoreZPlot
            title="Score-Z Básicos"
            items={makeScoreItems(
              BASIC_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />

          <ScoreZPlot
            title="Score-Z Diámetros"
            items={makeScoreItems(
              DIAMETER_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />

          <ScoreZPlot
            title="Score-Z Perímetros"
            items={makeScoreItems(
              PERIMETER_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />

          <ScoreZPlot
            title="Score-Z Pliegues"
            items={makeScoreItems(
              SKINFOLD_KEYS,
              presentation
                .phantomScoreZ,
            )}
          />
        </div>
      </section>

      {/* ==================================================
          PÁGINA 4
      ================================================== */}

      <section className="antro-sheet print-page mt-4">
        <SheetHeader
          title="Datos Adicionales"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <div className="additional-layout">
          <div className="additional-side">
            DATOS
            <br />
            ADICIONALES
          </div>

          <div className="additional-content">
            <p className="risk-intro">
              El índice cintura/cadera
              es una relación
              antropométrica utilizada
              como referencia para la
              distribución corporal.
            </p>

            <WaistHipReferenceTable />

            <table className="additional-values">
              <tbody>
                <tr>
                  <td>
                    Índice cintura /
                    cadera
                  </td>

                  <td>
                    {formatNumber(
                      presentation
                        .additional
                        .waistHipRatio,
                      3,
                    )}
                  </td>

                  <td>
                    Suma de 6 pliegues
                  </td>

                  <td>
                    {presentation
                      .additional
                      .sum6 != null
                      ? `${fmt(
                          presentation
                            .additional
                            .sum6,
                          1,
                        )} mm`
                      : "—"}
                  </td>
                </tr>

                <tr>
                  <td>
                    Índice músculo /
                    óseo
                  </td>

                  <td>
                    {formatNumber(
                      presentation
                        .additional
                        .muscleBoneIndex,
                      2,
                    )}
                  </td>

                  <td>
                    Índice adiposo /
                    muscular
                  </td>

                  <td>
                    {formatNumber(
                      presentation
                        .additional
                        .adiposeMuscleIndex,
                      3,
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    Índice de masa
                    corporal
                  </td>

                  <td>
                    {presentation
                      .additional.bmi !=
                    null
                      ? `${fmt(
                          presentation
                            .additional.bmi,
                          2,
                        )} kg/m²`
                      : "—"}
                  </td>

                  <td>
                    Talla sentado /
                    talla
                  </td>

                  <td>
                    {formatNumber(
                      presentation
                        .additional
                        .sittingHeightStatureRatio,
                      3,
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    BSA
                  </td>

                  <td>
                    {presentation
                      .additional
                      .bodySurfaceArea !=
                    null
                      ? `${fmt(
                          presentation
                            .additional
                            .bodySurfaceArea,
                          3,
                        )} m²`
                      : "—"}
                  </td>

                  <td>
                    BSA / BM
                  </td>

                  <td>
                    {presentation
                      .additional
                      .bodySurfaceAreaBodyMass !=
                    null
                      ? `${fmt(
                          presentation
                            .additional
                            .bodySurfaceAreaBodyMass,
                          2,
                        )} cm²/kg`
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================================================
          PÁGINA 5
      ================================================== */}

      <section className="antro-sheet print-page mt-4">
        <SheetHeader
          title="Somatotipo de Heath & Carter (1990)"
          playerName={
            player.name
          }
          anthropometry={
            anthropometry
          }
        />

        <table className="somato-values">
          <thead>
            <tr>
              <th>
                ENDO
              </th>

              <th>
                MESO
              </th>

              <th>
                ECTO
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                {formatNumber(
                  presentation
                    .somatotype
                    .endomorph,
                  2,
                )}
              </td>

              <td>
                {formatNumber(
                  presentation
                    .somatotype
                    .mesomorph,
                  2,
                )}
              </td>

              <td>
                {formatNumber(
                  presentation
                    .somatotype
                    .ectomorph,
                  2,
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <Somatochart
          x={
            presentation
              .somatotype.x
          }
          y={
            presentation
              .somatotype.y
          }
          previousX={
            previousPresentation
              ?.somatotype.x
          }
          previousY={
            previousPresentation
              ?.somatotype.y
          }
        />

        <div className="somato-footer">
          <div className="somato-footer-grid">
            <SomatoDetail
              label="Σ pliegues somatotipo"
              value={
                presentation
                  .somatotype
                  .skinfoldSum !=
                null
                  ? `${fmt(
                      presentation
                        .somatotype
                        .skinfoldSum,
                      2,
                    )} mm`
                  : "—"
              }
            />

            <SomatoDetail
              label="Brazo flexionado corregido"
              value={
                presentation
                  .somatotype
                  .correctedFlexedArm !=
                null
                  ? `${fmt(
                      presentation
                        .somatotype
                        .correctedFlexedArm,
                      2,
                    )} cm`
                  : "—"
              }
            />

            <SomatoDetail
              label="Pantorrilla corregida"
              value={
                presentation
                  .somatotype
                  .correctedCalf !=
                null
                  ? `${fmt(
                      presentation
                        .somatotype
                        .correctedCalf,
                      2,
                    )} cm`
                  : "—"
              }
            />

            <SomatoDetail
              label="Índice talla / peso"
              value={
                formatNumber(
                  presentation
                    .somatotype
                    .heightWeightRatio,
                  2,
                )
              }
            />
          </div>

          <div className="comparison-note">
            {previous ? (
              <>
                Posicionamiento actual
                comparado con la
                medición anterior del{" "}
                <strong>
                  {fmtDate(
                    previous.date,
                  )}
                </strong>
                .
              </>
            ) : (
              <>
                Primera evaluación
                completa disponible
                para la jugadora. No
                existe una medición
                anterior para comparar.
              </>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

/* ============================================================
   ENCABEZADO TIPO ANTROPOGIMS
============================================================ */

function SheetHeader({
  title,
  playerName,
  anthropometry,
}: {
  title: string;
  playerName: string;
  anthropometry:
    FullAnthropometry;
}) {
  return (
    <>
      <div className="antro-title-grid">
        <div className="antro-title">
          {title}
        </div>

        <div className="antro-brand">
          <strong>
            SAN LORENZO
          </strong>

          <span>
            Nutrición Deportiva
          </span>

          <span>
            Antropometría
          </span>
        </div>
      </div>

      <div className="antro-info">
        <div className="antro-info-line">
          <div className="antro-info-cell">
            <strong>
              Nombre:
            </strong>

            <span>
              {playerName}
            </span>
          </div>

          <div className="antro-info-cell">
            <strong>
              Edad:
            </strong>

            <span>
              {anthropometry
                .ageYears != null
                ? fmt(
                    anthropometry
                      .ageYears,
                    1,
                  )
                : "—"}
            </span>
          </div>
        </div>

        <div className="antro-info-line">
          <div className="antro-info-cell">
            <strong>
              Número de medición:
            </strong>

            <span>
              {anthropometry
                .measurementNumber !=
              null
                ? anthropometry
                    .measurementNumber
                : "—"}
            </span>
          </div>

          <div className="antro-info-cell">
            <strong>
              Fecha de medición:
            </strong>

            <span>
              {fmtDate(
                anthropometry.date,
              )}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   MEDICIONES
============================================================ */

function MeasurementTable({
  anthropometry,
  presentation,
}: {
  anthropometry:
    FullAnthropometry;

  presentation:
    ReturnType<
      typeof calculateAntropogimsPresentation
    >;
}) {
  return (
    <table className="technical-table">
      <colgroup>
        <col
          style={{
            width: "84px",
          }}
        />

        <col
          style={{
            width: "34%",
          }}
        />

        <col
          style={{
            width: "18%",
          }}
        />

        <col
          style={{
            width: "16%",
          }}
        />

        <col
          style={{
            width: "16%",
          }}
        />

        <col />
      </colgroup>

      <thead>
        <tr>
          <th />

          <th />

          <th>
            Resultados
          </th>

          <th colSpan={2}>
            Diferencias con anterior
          </th>

          <th>
            Score-Z
          </th>
        </tr>

        <tr>
          <th />

          <th className="text-left">
            Medición
          </th>

          <th>
            Actual
          </th>

          <th>
            Anterior
          </th>

          <th>
            Dif.
          </th>

          <th>
            Z
          </th>
        </tr>
      </thead>

      <tbody>
        {GROUP_ORDER.map(
          (
            group,
          ) => (
            <MeasurementGroup
              key={group}
              group={
                group
              }
              anthropometry={
                anthropometry
              }
              presentation={
                presentation
              }
            />
          ),
        )}
      </tbody>
    </table>
  );
}

function MeasurementGroup({
  group,
  anthropometry,
  presentation,
}: {
  group:
    FullAnthropometryGroup;

  anthropometry:
    FullAnthropometry;

  presentation:
    ReturnType<
      typeof calculateAntropogimsPresentation
    >;
}) {
  const definitions =
    FULL_ANTHROPOMETRY_MEASURES.filter(
      (item) =>
        item.group ===
        group,
    );

  const groupClass =
    group === "basicos"
      ? "group-basicos"
      : group === "diametros"
        ? "group-diametros"
        : group === "perimetros"
          ? "group-perimetros"
          : "group-pliegues";

  return (
    <>
      {definitions.map(
        (
          definition,
          index,
        ) => {
          const currentValue =
            currentMeasureValue(
              anthropometry,
              definition.key,
            );

          const previousValue =
            presentation
              .previousValues[
              definition.key
            ];

          const difference =
            presentation
              .measurementDifferences[
              definition.key
            ];

          const scoreZ =
            presentation
              .phantomScoreZ[
              definition.key
            ];

          return (
            <tr
              key={
                definition.key
              }
            >
              {index ===
                0 && (
                <td
                  rowSpan={
                    definitions.length
                  }
                  className={`group-cell ${groupClass}`}
                >
                  {
                    FULL_ANTHROPOMETRY_GROUP_LABELS[
                      group
                    ]
                  }
                </td>
              )}

              <td className="measure-name">
                {
                  definition.label
                }{" "}
                <span className="text-[10px] text-muted-foreground">
                  (
                  {
                    definition.unit
                  }
                  )
                </span>
              </td>

              <td className="numeric">
                {formatNumber(
                  currentValue,
                  2,
                )}
              </td>

              <td className="numeric">
                {formatNumber(
                  previousValue,
                  2,
                )}
              </td>

              <td className="numeric">
                {signed(
                  difference,
                  2,
                )}
              </td>

              <td className="numeric">
                {formatNumber(
                  scoreZ,
                  2,
                )}
              </td>
            </tr>
          );
        },
      )}

      <tr>
        <td
          colSpan={6}
          className="h-3 !border-b !border-slate-600 !p-0"
        />
      </tr>
    </>
  );
}

/* ============================================================
   SCORE-Z
============================================================ */

type ScoreItem = {
  label: string;

  value:
    | number
    | null
    | undefined;

  color: string;
};

function makeScoreItems(
  keys:
    FullAnthropometryMeasureKey[],

  values:
    Partial<
      Record<
        FullAnthropometryMeasureKey,
        number | null
      >
    >,
): ScoreItem[] {
  const colors = [
    "#4d83bd",
    "#c94f48",
    "#96b749",
    "#7655a0",
    "#4aa1ba",
    "#ed8b39",
    "#4d83bd",
    "#c94f48",
    "#96b749",
    "#7655a0",
  ];

  return keys.map(
    (
      key,
      index,
    ) => ({
      label:
        measureLabel(
          key,
        ),

      value:
        values[
          key
        ],

      color:
        colors[
          index %
            colors.length
        ],
    }),
  );
}

function ScoreZPlot({
  title,
  items,
}: {
  title: string;
  items: ScoreItem[];
}) {
  return (
    <div className="score-plot">
      <h3 className="score-title">
        {title}
      </h3>

      {items.map(
        (
          item,
        ) => {
          const bounded =
            item.value !=
            null
              ? clamp(
                  item.value,
                  -4,
                  4,
                )
              : null;

          const left =
            bounded !=
            null
              ? (
                  (
                    bounded +
                    4
                  ) /
                  8
                ) *
                100
              : null;

          return (
            <div
              key={
                item.label
              }
              className="score-row"
            >
              <div className="score-label">
                {
                  item.label
                }
              </div>

              <div className="score-track">
                <div className="score-zero" />

                {left !=
                  null && (
                  <span
                    className="score-dot"
                    style={{
                      left: `${left}%`,
                      backgroundColor:
                        item.color,
                    }}
                  />
                )}
              </div>

              <div className="score-value">
                {formatNumber(
                  item.value,
                  2,
                )}
              </div>
            </div>
          );
        },
      )}

      <div className="score-axis">
        {[
          -4,
          -3,
          -2,
          -1,
          0,
          1,
          2,
          3,
          4,
        ].map(
          (
            number,
          ) => (
            <span
              key={
                number
              }
            >
              {
                number
              }
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CINTURA / CADERA
============================================================ */

function WaistHipReferenceTable() {
  return (
    <table className="risk-table">
      <thead>
        <tr>
          <th rowSpan={2}>
            Sexo
          </th>

          <th rowSpan={2}>
            Edad
          </th>

          <th colSpan={4}>
            Riesgo
          </th>
        </tr>

        <tr>
          <th>
            Bajo
          </th>

          <th>
            Moderado
          </th>

          <th>
            Alto
          </th>

          <th>
            Muy alto
          </th>
        </tr>
      </thead>

      <tbody>
        <RiskRow
          sex="Hombres"
          age="20-29"
          low="<0,83"
          moderate="0,83-0,88"
          high="0,89-0,94"
          veryHigh=">0,94"
        />

        <RiskRow
          sex="Hombres"
          age="30-39"
          low="<0,84"
          moderate="0,84-0,91"
          high="0,92-0,96"
          veryHigh=">0,96"
        />

        <RiskRow
          sex="Hombres"
          age="40-49"
          low="<0,88"
          moderate="0,88-0,95"
          high="0,96-1,00"
          veryHigh=">1,00"
        />

        <RiskRow
          sex="Hombres"
          age="50-59"
          low="<0,90"
          moderate="0,90-0,96"
          high="0,97-1,02"
          veryHigh=">1,02"
        />

        <RiskRow
          sex="Hombres"
          age="60-69"
          low="<0,91"
          moderate="0,91-0,98"
          high="0,99-1,03"
          veryHigh=">1,03"
        />

        <RiskRow
          sex="Mujeres"
          age="20-29"
          low="<0,71"
          moderate="0,71-0,77"
          high="0,78-0,82"
          veryHigh=">0,82"
        />

        <RiskRow
          sex="Mujeres"
          age="30-39"
          low="<0,72"
          moderate="0,72-0,78"
          high="0,79-0,84"
          veryHigh=">0,84"
        />

        <RiskRow
          sex="Mujeres"
          age="40-49"
          low="<0,73"
          moderate="0,73-0,79"
          high="0,80-0,87"
          veryHigh=">0,87"
        />

        <RiskRow
          sex="Mujeres"
          age="50-59"
          low="<0,74"
          moderate="0,74-0,81"
          high="0,82-0,88"
          veryHigh=">0,88"
        />

        <RiskRow
          sex="Mujeres"
          age="60-69"
          low="<0,76"
          moderate="0,76-0,83"
          high="0,84-0,90"
          veryHigh=">0,90"
        />
      </tbody>
    </table>
  );
}

function RiskRow({
  sex,
  age,
  low,
  moderate,
  high,
  veryHigh,
}: {
  sex: string;
  age: string;
  low: string;
  moderate: string;
  high: string;
  veryHigh: string;
}) {
  return (
    <tr>
      <td>
        {sex}
      </td>

      <td>
        {age}
      </td>

      <td>
        {low}
      </td>

      <td>
        {moderate}
      </td>

      <td>
        {high}
      </td>

      <td>
        {veryHigh}
      </td>
    </tr>
  );
}

/* ============================================================
   SOMATOCARTA
============================================================ */

function Somatochart({
  x,
  y,
  previousX,
  previousY,
}: {
  x:
    | number
    | null;

  y:
    | number
    | null;

  previousX?:
    | number
    | null;

  previousY?:
    | number
    | null;
}) {
  const minX = -8;
  const maxX = 8;

  const minY = -10;
  const maxY = 16;

  const getPosition = (
    pointX:
      | number
      | null
      | undefined,

    pointY:
      | number
      | null
      | undefined,
  ) => {
    if (
      pointX == null ||
      pointY == null
    ) {
      return null;
    }

    const safeX =
      clamp(
        pointX,
        minX,
        maxX,
      );

    const safeY =
      clamp(
        pointY,
        minY,
        maxY,
      );

    return {
      left:
        (
          (
            safeX -
            minX
          ) /
          (
            maxX -
            minX
          )
        ) *
        100,

      top:
        (
          1 -
          (
            safeY -
            minY
          ) /
          (
            maxY -
            minY
          )
        ) *
        100,
    };
  };

  const current =
    getPosition(
      x,
      y,
    );

  const previous =
    getPosition(
      previousX,
      previousY,
    );

  return (
    <div className="somatochart">
      <div className="somato-side">
        SOMATOCARTA
      </div>

      <div className="somato-graph">
        <div className="somato-x" />

        <div className="somato-y" />

        <div className="somato-meso">
          MESOMORFO
        </div>

        <div className="somato-endo">
          ENDOMORFO
        </div>

        <div className="somato-ecto">
          ECTOMORFO
        </div>

        {previous && (
          <span
            className="somato-dot"
            style={{
              left: `${previous.left}%`,
              top: `${previous.top}%`,
              backgroundColor:
                "#20d94a",
            }}
          />
        )}

        {current && (
          <span
            className="somato-dot"
            style={{
              left: `${current.left}%`,
              top: `${current.top}%`,
              backgroundColor:
                "#2455f4",
            }}
          />
        )}
      </div>
    </div>
  );
}

function SomatoDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="somato-footer-item">
      <p className="somato-footer-label">
        {label}
      </p>

      <p className="somato-footer-value">
        {value}
      </p>
    </div>
  );
}
