import { fmt, fmtDiff } from "./calc";

export type EvolutionPdfPoint = {
  date: string;
  label: string;
  value: number;
};

type EvolutionPdfInput = {
  playerName: string;
  metricLabel: string;
  unit: string;
  decimals: number;
  data: EvolutionPdfPoint[];
  reference?: {
    value: number;
    label: string;
  } | null;
};

type PdfResult = {
  blob: Blob;
  fileName: string;
};

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

const LEFT = 42;
const RIGHT = 42;

function toWinAnsi(
  value: string,
) {
  let result = "";

  for (const char of value) {
    const code =
      char.charCodeAt(0);

    result +=
      code <= 255
        ? char
        : "?";
  }

  return result;
}

function escapePdf(
  value: string,
) {
  return toWinAnsi(value)
    .replace(
      /\\/g,
      "\\\\",
    )
    .replace(
      /\(/g,
      "\\(",
    )
    .replace(
      /\)/g,
      "\\)",
    );
}

function encodePdf(
  value: string,
) {
  const text =
    toWinAnsi(value);

  const bytes =
    new Uint8Array(
      text.length,
    );

  for (
    let i = 0;
    i < text.length;
    i += 1
  ) {
    bytes[i] =
      text.charCodeAt(i) <=
      255
        ? text.charCodeAt(i)
        : 63;
  }

  return bytes;
}

function byteLength(
  value: string,
) {
  return encodePdf(
    value,
  ).length;
}

function textWidth(
  text: string,
  size: number,
) {
  return (
    text.length *
    size *
    0.49
  );
}

function textCommand({
  text,
  x,
  y,
  size,
  bold = false,
  color = "0.06 0.09 0.16",
}: {
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
  color?: string;
}) {
  return [
    "BT",
    `/${bold ? "F2" : "F1"} ${size} Tf`,
    `${color} rg`,
    `${x.toFixed(
      2,
    )} ${y.toFixed(
      2,
    )} Td`,
    `(${escapePdf(
      text,
    )}) Tj`,
    "ET",
  ].join("\n");
}

function rightText({
  text,
  right,
  y,
  size,
  bold = false,
  color,
}: {
  text: string;
  right: number;
  y: number;
  size: number;
  bold?: boolean;
  color?: string;
}) {
  return textCommand({
    text,
    x:
      right -
      textWidth(
        text,
        size,
      ),
    y,
    size,
    bold,
    color,
  });
}

function rectCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
) {
  return [
    "q",
    `${fill} rg`,
    `${x.toFixed(
      2,
    )} ${y.toFixed(
      2,
    )} ${width.toFixed(
      2,
    )} ${height.toFixed(
      2,
    )} re`,
    "f",
    "Q",
  ].join("\n");
}

function strokeRectCommand(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return [
    "q",
    "0.82 0.85 0.89 RG",
    "0.6 w",
    `${x.toFixed(
      2,
    )} ${y.toFixed(
      2,
    )} ${width.toFixed(
      2,
    )} ${height.toFixed(
      2,
    )} re`,
    "S",
    "Q",
  ].join("\n");
}

function lineCommand(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color =
    "0.10 0.18 0.30",
  width = 1,
) {
  return [
    `${color} RG`,
    `${width} w`,
    `${x1.toFixed(
      2,
    )} ${y1.toFixed(
      2,
    )} m`,
    `${x2.toFixed(
      2,
    )} ${y2.toFixed(
      2,
    )} l`,
    "S",
  ].join("\n");
}

function dashedLineCommand(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  return [
    "q",
    "0.78 0.06 0.18 RG",
    "2 w",
    "[6 4] 0 d",
    `${x1.toFixed(
      2,
    )} ${y1.toFixed(
      2,
    )} m`,
    `${x2.toFixed(
      2,
    )} ${y2.toFixed(
      2,
    )} l`,
    "S",
    "Q",
  ].join("\n");
}

function circleCommand(
  x: number,
  y: number,
  radius: number,
) {
  const k =
    radius *
    0.5522847498;

  return [
    "q",
    "0.10 0.18 0.30 rg",
    `${(x + radius).toFixed(
      2,
    )} ${y.toFixed(
      2,
    )} m`,
    `${(x + radius).toFixed(
      2,
    )} ${(y + k).toFixed(
      2,
    )} ${(x + k).toFixed(
      2,
    )} ${(y + radius).toFixed(
      2,
    )} ${x.toFixed(
      2,
    )} ${(y + radius).toFixed(
      2,
    )} c`,
    `${(x - k).toFixed(
      2,
    )} ${(y + radius).toFixed(
      2,
    )} ${(x - radius).toFixed(
      2,
    )} ${(y + k).toFixed(
      2,
    )} ${(x - radius).toFixed(
      2,
    )} ${y.toFixed(
      2,
    )} c`,
    `${(x - radius).toFixed(
      2,
    )} ${(y - k).toFixed(
      2,
    )} ${(x - k).toFixed(
      2,
    )} ${(y - radius).toFixed(
      2,
    )} ${x.toFixed(
      2,
    )} ${(y - radius).toFixed(
      2,
    )} c`,
    `${(x + k).toFixed(
      2,
    )} ${(y - radius).toFixed(
      2,
    )} ${(x + radius).toFixed(
      2,
    )} ${(y - k).toFixed(
      2,
    )} ${(x + radius).toFixed(
      2,
    )} ${y.toFixed(
      2,
    )} c`,
    "f",
    "Q",
  ].join("\n");
}

function safeName(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .toLowerCase();
}

function buildPage(
  input: EvolutionPdfInput,
) {
  const commands:
    string[] = [];

  const first =
    input.data[0];

  const last =
    input.data[
      input.data.length - 1
    ];

  const change =
    first && last
      ? last.value -
        first.value
      : null;

  commands.push(
    rectCommand(
      0,
      PAGE_HEIGHT - 8,
      PAGE_WIDTH,
      8,
      "0.04 0.14 0.29",
    ),
  );

  commands.push(
    textCommand({
      text:
        "SAN LORENZO · FÚTBOL FEMENINO",
      x: LEFT,
      y: 555,
      size: 8,
      bold: true,
      color:
        "0.39 0.45 0.54",
    }),
  );

  commands.push(
    textCommand({
      text:
        "EVOLUCIÓN ANTROPOMÉTRICA",
      x: LEFT,
      y: 530,
      size: 19,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        input.playerName,
      x: LEFT,
      y: 508,
      size: 12,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text: `${input.metricLabel} · ${input.unit}`,
      x: LEFT,
      y: 491,
      size: 9,
      color:
        "0.39 0.45 0.54",
    }),
  );

  const cardY = 425;
  const cardWidth = 225;
  const cardHeight = 52;
  const gap = 18;

  const cards = [
    {
      label:
        "Primer registro",
      value: first
        ? `${fmt(
            first.value,
            input.decimals,
          )} ${input.unit}`
        : "—",
      sub:
        first?.label ?? "",
    },
    {
      label:
        "Último registro",
      value: last
        ? `${fmt(
            last.value,
            input.decimals,
          )} ${input.unit}`
        : "—",
      sub:
        last?.label ?? "",
    },
    {
      label:
        "Cambio total",
      value:
        change != null
          ? `${fmtDiff(
              change,
              input.decimals,
            )} ${input.unit}`
          : "—",
      sub: `${input.data.length} controles con dato`,
    },
  ];

  cards.forEach(
    (
      card,
      index,
    ) => {
      const x =
        LEFT +
        index *
          (cardWidth +
            gap);

      commands.push(
        rectCommand(
          x,
          cardY,
          cardWidth,
          cardHeight,
          "0.97 0.975 0.985",
        ),
      );

      commands.push(
        strokeRectCommand(
          x,
          cardY,
          cardWidth,
          cardHeight,
        ),
      );

      commands.push(
        textCommand({
          text:
            card.label,
          x: x + 10,
          y:
            cardY +
            35,
          size: 7,
          bold: true,
          color:
            "0.39 0.45 0.54",
        }),
      );

      commands.push(
        textCommand({
          text:
            card.value,
          x: x + 10,
          y:
            cardY +
            18,
          size: 11,
          bold: true,
        }),
      );

      if (card.sub) {
        commands.push(
          rightText({
            text:
              card.sub,
            right:
              x +
              cardWidth -
              10,
            y:
              cardY +
              18,
            size: 6.5,
            color:
              "0.39 0.45 0.54",
          }),
        );
      }
    },
  );

  if (
    input.reference
  ) {
    commands.push(
      textCommand({
        text: `Referencia 2025: ${fmt(
          input.reference.value,
          input.decimals,
        )} ${input.unit} · ${input.reference.label}`,
        x: LEFT,
        y: 405,
        size: 7.5,
        bold: true,
        color:
          "0.70 0.06 0.13",
      }),
    );
  }

  const chartX = LEFT + 45;
  const chartY = 120;
  const chartWidth =
    PAGE_WIDTH -
    LEFT -
    RIGHT -
    70;
  const chartHeight = 255;

  commands.push(
    textCommand({
      text:
        "Evolución temporal",
      x: LEFT,
      y: 386,
      size: 12,
      bold: true,
    }),
  );

  commands.push(
    strokeRectCommand(
      chartX,
      chartY,
      chartWidth,
      chartHeight,
    ),
  );

  if (
    input.data.length >= 2
  ) {
    const values =
      input.data.map(
        (point) =>
          point.value,
      );

    if (
      input.reference
    ) {
      values.push(
        input.reference.value,
      );
    }

    const min =
      Math.min(...values);

    const max =
      Math.max(...values);

    const span =
      max - min || 1;

    const padding =
      Math.max(
        span * 0.12,
        input.unit === "kg"
          ? 0.5
          : 1,
      );

    const domainMin =
      min - padding;

    const domainMax =
      max + padding;

    for (
      let i = 0;
      i <= 4;
      i += 1
    ) {
      const y =
        chartY +
        (chartHeight /
          4) *
          i;

      commands.push(
        lineCommand(
          chartX,
          y,
          chartX +
            chartWidth,
          y,
          "0.88 0.90 0.93",
          0.5,
        ),
      );

      const value =
        domainMin +
        ((domainMax -
          domainMin) /
          4) *
          i;

      commands.push(
        rightText({
          text: fmt(
            value,
            input.decimals,
          ),
          right:
            chartX - 8,
          y: y - 2,
          size: 6.5,
          color:
            "0.39 0.45 0.54",
        }),
      );
    }

    const points =
      input.data.map(
        (
          point,
          index,
        ) => {
          const x =
            chartX +
            (input.data
              .length ===
            1
              ? chartWidth /
                2
              : (chartWidth *
                  index) /
                (input.data
                  .length -
                  1));

          const y =
            chartY +
            ((point.value -
              domainMin) /
              (domainMax -
                domainMin)) *
              chartHeight;

          return {
            ...point,
            x,
            y,
          };
        },
      );

    if (
      input.reference
    ) {
      const refY =
        chartY +
        ((input.reference
          .value -
          domainMin) /
          (domainMax -
            domainMin)) *
          chartHeight;

      commands.push(
        dashedLineCommand(
          chartX,
          refY,
          chartX +
            chartWidth,
          refY,
        ),
      );
    }

    for (
      let i = 0;
      i <
      points.length -
        1;
      i += 1
    ) {
      commands.push(
        lineCommand(
          points[i].x,
          points[i].y,
          points[i + 1].x,
          points[i + 1].y,
          "0.10 0.18 0.30",
          2,
        ),
      );
    }

    points.forEach(
      (
        point,
        index,
      ) => {
        commands.push(
          circleCommand(
            point.x,
            point.y,
            3,
          ),
        );

        if (
          index === 0 ||
          index ===
            points.length -
              1 ||
          points.length <=
            6
        ) {
          commands.push(
            textCommand({
              text:
                point.label,
              x:
                point.x -
                18,
              y:
                chartY -
                15,
              size: 5.7,
              color:
                "0.39 0.45 0.54",
            }),
          );
        }
      },
    );
  } else {
    commands.push(
      textCommand({
        text:
          "Se necesitan al menos dos registros para mostrar el gráfico.",
        x:
          chartX +
          80,
        y:
          chartY +
          chartHeight /
            2,
        size: 9,
        color:
          "0.39 0.45 0.54",
      }),
    );
  }

  commands.push(
    rightText({
      text:
        "Seguimiento antropométrico",
      right:
        PAGE_WIDTH -
        RIGHT,
      y: 30,
      size: 7,
      color:
        "0.45 0.50 0.58",
    }),
  );

  return commands.join(
    "\n",
  );
}

function buildPdf(
  content: string,
) {
  const objects:
    string[] = [];

  objects[1] =
    "<< /Type /Catalog /Pages 2 0 R >>";

  objects[2] =
    "<< /Type /Pages /Count 1 /Kids [5 0 R] >>";

  objects[3] = [
    "<<",
    "/Type /Font",
    "/Subtype /Type1",
    "/BaseFont /Helvetica",
    "/Encoding /WinAnsiEncoding",
    ">>",
  ].join("\n");

  objects[4] = [
    "<<",
    "/Type /Font",
    "/Subtype /Type1",
    "/BaseFont /Helvetica-Bold",
    "/Encoding /WinAnsiEncoding",
    ">>",
  ].join("\n");

  objects[5] = [
    "<<",
    "/Type /Page",
    "/Parent 2 0 R",
    `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
    "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>",
    "/Contents 6 0 R",
    ">>",
  ].join("\n");

  objects[6] = [
    `<< /Length ${byteLength(
      content,
    )} >>`,
    "stream",
    content,
    "endstream",
  ].join("\n");

  const chunks:
    string[] = [];

  const offsets =
    new Array<number>(
      7,
    ).fill(0);

  const header =
    "%PDF-1.4\n";

  chunks.push(
    header,
  );

  let offset =
    byteLength(
      header,
    );

  for (
    let number = 1;
    number <= 6;
    number += 1
  ) {
    offsets[number] =
      offset;

    const chunk = [
      `${number} 0 obj`,
      objects[number],
      "endobj",
      "",
    ].join("\n");

    chunks.push(
      chunk,
    );

    offset +=
      byteLength(
        chunk,
      );
  }

  const xrefOffset =
    offset;

  let xref =
    "xref\n0 7\n";

  xref +=
    "0000000000 65535 f \n";

  for (
    let number = 1;
    number <= 6;
    number += 1
  ) {
    xref += `${String(
      offsets[number],
    ).padStart(
      10,
      "0",
    )} 00000 n \n`;
  }

  const trailer = [
    "trailer",
    "<< /Size 7 /Root 1 0 R >>",
    "startxref",
    String(
      xrefOffset,
    ),
    "%%EOF",
    "",
  ].join("\n");

  chunks.push(
    xref,
    trailer,
  );

  return encodePdf(
    chunks.join(""),
  );
}

export function createEvolutionReportPdf(
  input: EvolutionPdfInput,
): PdfResult {
  const content =
    buildPage(input);

  const bytes =
    buildPdf(content);

  return {
    blob: new Blob(
      [bytes],
      {
        type:
          "application/pdf",
      },
    ),

    fileName: `evolucion-${safeName(
      input.playerName,
    )}-${safeName(
      input.metricLabel,
    )}.pdf`,
  };
}
