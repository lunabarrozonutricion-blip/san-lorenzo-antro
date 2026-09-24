import {
  fmt,
  fmtDate,
  metricValue,
} from "./calc";

import {
  METRICS,
  type Control,
  type MetricKey,
} from "./types";

type ReportPdfInput = {
  playerName: string;
  controls: Control[];
  selectedMetrics: MetricKey[];
};

type PdfResult = {
  blob: Blob;
  fileName: string;
};

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

const MARGIN_X = 36;
const TABLE_WIDTH =
  PAGE_WIDTH -
  MARGIN_X * 2;

const DATE_COLUMN_WIDTH = 82;

const TABLE_HEADER_TOP = 468;
const TABLE_HEADER_HEIGHT = 30;

const ROW_HEIGHT = 18;
const ROWS_PER_PAGE = 20;

function safeFileName(
  value: string,
) {
  const clean =
    value
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

  return clean || "jugadora";
}

function toWinAnsi(
  value: string,
) {
  const replacements:
    Record<string, number> = {
      "\u20AC": 128,
      "\u201A": 130,
      "\u0192": 131,
      "\u201E": 132,
      "\u2026": 133,
      "\u2020": 134,
      "\u2021": 135,
      "\u02C6": 136,
      "\u2030": 137,
      "\u0160": 138,
      "\u2039": 139,
      "\u0152": 140,
      "\u017D": 142,
      "\u2018": 145,
      "\u2019": 146,
      "\u201C": 147,
      "\u201D": 148,
      "\u2022": 149,
      "\u2013": 150,
      "\u2014": 151,
      "\u02DC": 152,
      "\u2122": 153,
      "\u0161": 154,
      "\u203A": 155,
      "\u0153": 156,
      "\u017E": 158,
      "\u0178": 159,
    };

  let result = "";

  for (
    const char of value
  ) {
    const code =
      char.charCodeAt(0);

    if (
      replacements[char] !=
      null
    ) {
      result +=
        String.fromCharCode(
          replacements[char],
        );

      continue;
    }

    if (code <= 255) {
      result += char;
    } else {
      result += "?";
    }
  }

  return result;
}

function pdfEscape(
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
    const code =
      text.charCodeAt(i);

    bytes[i] =
      code <= 255
        ? code
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

function estimateTextWidth(
  text: string,
  fontSize: number,
) {
  return (
    text.length *
    fontSize *
    0.49
  );
}

function fitText(
  text: string,
  maxWidth: number,
  fontSize: number,
) {
  if (
    estimateTextWidth(
      text,
      fontSize,
    ) <= maxWidth
  ) {
    return text;
  }

  let value = text;

  while (
    value.length > 1 &&
    estimateTextWidth(
      `${value}...`,
      fontSize,
    ) > maxWidth
  ) {
    value =
      value.slice(
        0,
        -1,
      );
  }

  return `${value}...`;
}

function textCommand({
  text,
  x,
  y,
  size,
  bold = false,
  color = "0.08 0.15 0.27",
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
    `(${pdfEscape(
      text,
    )}) Tj`,
    "ET",
  ].join("\n");
}

function rightAlignedTextCommand({
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
  const x =
    right -
    estimateTextWidth(
      text,
      size,
    );

  return textCommand({
    text,
    x,
    y,
    size,
    bold,
    color,
  });
}

function lineCommand(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  return [
    "0.82 0.85 0.89 RG",
    "0.5 w",
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

function fillRectCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  return [
    "q",
    `${color} rg`,
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

function buildPageContent({
  playerName,
  controls,
  selectedMetrics,
  pageNumber,
  totalPages,
}: {
  playerName: string;
  controls: Control[];
  selectedMetrics: MetricKey[];
  pageNumber: number;
  totalPages: number;
}) {
  const commands:
    string[] = [];

  commands.push(
    fillRectCommand(
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
        "SAN LORENZO DE ALMAGRO",
      x: MARGIN_X,
      y: 552,
      size: 8,
      bold: true,
      color:
        "0.36 0.42 0.51",
    }),
  );

  commands.push(
    textCommand({
      text:
        "Informe antropométrico",
      x: MARGIN_X,
      y: 530,
      size: 18,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        playerName,
      x: MARGIN_X,
      y: 509,
      size: 13,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        "Primera División - Fútbol Femenino",
      x: MARGIN_X,
      y: 493,
      size: 9,
      color:
        "0.36 0.42 0.51",
    }),
  );

  const metricDefinitions =
    selectedMetrics
      .map((key) =>
        METRICS.find(
          (metric) =>
            metric.key ===
            key,
        ),
      )
      .filter(
        (
          metric,
        ): metric is NonNullable<
          typeof metric
        > =>
          metric != null,
      );

  const metricsWidth =
    TABLE_WIDTH -
    DATE_COLUMN_WIDTH;

  const metricColumnWidth =
    metricDefinitions.length >
    0
      ? metricsWidth /
        metricDefinitions.length
      : metricsWidth;

  const headerBottom =
    TABLE_HEADER_TOP -
    TABLE_HEADER_HEIGHT;

  commands.push(
    fillRectCommand(
      MARGIN_X,
      headerBottom,
      TABLE_WIDTH,
      TABLE_HEADER_HEIGHT,
      "0.94 0.95 0.97",
    ),
  );

  commands.push(
    textCommand({
      text: "Fecha",
      x:
        MARGIN_X +
        7,
      y:
        headerBottom +
        10,
      size: 8,
      bold: true,
    }),
  );

  metricDefinitions.forEach(
    (metric, index) => {
      const x =
        MARGIN_X +
        DATE_COLUMN_WIDTH +
        metricColumnWidth *
          index;

      const labelFont =
        metricColumnWidth <
        60
          ? 5.7
          : 6.4;

      const label =
        fitText(
          metric.label,
          metricColumnWidth -
            8,
          labelFont,
        );

      commands.push(
        textCommand({
          text: label,
          x: x + 4,
          y:
            headerBottom +
            15,
          size: labelFont,
          bold: true,
        }),
      );

      commands.push(
        textCommand({
          text: `(${metric.unit})`,
          x: x + 4,
          y:
            headerBottom +
            6,
          size: 5.4,
          color:
            "0.36 0.42 0.51",
        }),
      );
    },
  );

  commands.push(
    lineCommand(
      MARGIN_X,
      headerBottom,
      MARGIN_X +
        TABLE_WIDTH,
      headerBottom,
    ),
  );

  commands.push(
    lineCommand(
      MARGIN_X +
        DATE_COLUMN_WIDTH,
      headerBottom,
      MARGIN_X +
        DATE_COLUMN_WIDTH,
      TABLE_HEADER_TOP,
    ),
  );

  metricDefinitions.forEach(
    (_, index) => {
      if (
        index === 0
      ) {
        return;
      }

      const x =
        MARGIN_X +
        DATE_COLUMN_WIDTH +
        metricColumnWidth *
          index;

      commands.push(
        lineCommand(
          x,
          headerBottom,
          x,
          TABLE_HEADER_TOP,
        ),
      );
    },
  );

  controls.forEach(
    (
      control,
      rowIndex,
    ) => {
      const rowTop =
        headerBottom -
        ROW_HEIGHT *
          rowIndex;

      const rowBottom =
        rowTop -
        ROW_HEIGHT;

      if (
        rowIndex % 2 ===
        1
      ) {
        commands.push(
          fillRectCommand(
            MARGIN_X,
            rowBottom,
            TABLE_WIDTH,
            ROW_HEIGHT,
            "0.985 0.987 0.99",
          ),
        );
      }

      commands.push(
        textCommand({
          text:
            fmtDate(
              control.date,
            ),
          x:
            MARGIN_X +
            7,
          y:
            rowBottom +
            6,
          size: 7.2,
        }),
      );

      metricDefinitions.forEach(
        (
          metric,
          metricIndex,
        ) => {
          const value =
            fmt(
              metricValue(
                control,
                metric.key,
              ),
              metric.decimals,
            );

          const columnRight =
            MARGIN_X +
            DATE_COLUMN_WIDTH +
            metricColumnWidth *
              (metricIndex +
                1) -
            5;

          commands.push(
            rightAlignedTextCommand(
              {
                text: value,
                right:
                  columnRight,
                y:
                  rowBottom +
                  6,
                size:
                  metricColumnWidth <
                  55
                    ? 6.3
                    : 7,
              },
            ),
          );
        },
      );

      commands.push(
        lineCommand(
          MARGIN_X,
          rowBottom,
          MARGIN_X +
            TABLE_WIDTH,
          rowBottom,
        ),
      );
    },
  );

  const tableBottom =
    headerBottom -
    ROW_HEIGHT *
      controls.length;

  commands.push(
    lineCommand(
      MARGIN_X,
      TABLE_HEADER_TOP,
      MARGIN_X +
        TABLE_WIDTH,
      TABLE_HEADER_TOP,
    ),
  );

  commands.push(
    lineCommand(
      MARGIN_X,
      tableBottom,
      MARGIN_X,
      TABLE_HEADER_TOP,
    ),
  );

  commands.push(
    lineCommand(
      MARGIN_X +
        TABLE_WIDTH,
      tableBottom,
      MARGIN_X +
        TABLE_WIDTH,
      TABLE_HEADER_TOP,
    ),
  );

  commands.push(
    rightAlignedTextCommand({
      text: `Página ${pageNumber} de ${totalPages}`,
      right:
        PAGE_WIDTH -
        MARGIN_X,
      y: 25,
      size: 7,
      color:
        "0.42 0.47 0.55",
    }),
  );

  return commands.join(
    "\n",
  );
}

function buildPdf(
  pageContents: string[],
) {
  const pageCount =
    pageContents.length;

  const pageObjectNumbers =
    Array.from(
      {
        length:
          pageCount,
      },
      (_, index) =>
        5 +
        index * 2,
    );

  const contentObjectNumbers =
    pageObjectNumbers.map(
      (value) =>
        value + 1,
    );

  const objectCount =
    4 +
    pageCount * 2;

  const objects =
    new Array<string>(
      objectCount +
        1,
    );

  objects[1] =
    "<< /Type /Catalog /Pages 2 0 R >>";

  objects[2] = [
    "<<",
    "/Type /Pages",
    `/Count ${pageCount}`,
    `/Kids [${pageObjectNumbers
      .map(
        (number) =>
          `${number} 0 R`,
      )
      .join(" ")}]`,
    ">>",
  ].join("\n");

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

  pageContents.forEach(
    (
      content,
      index,
    ) => {
      const pageNumber =
        pageObjectNumbers[
          index
        ];

      const contentNumber =
        contentObjectNumbers[
          index
        ];

      objects[
        pageNumber
      ] = [
        "<<",
        "/Type /Page",
        "/Parent 2 0 R",
        `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
        "/Resources <<",
        "/Font <<",
        "/F1 3 0 R",
        "/F2 4 0 R",
        ">>",
        ">>",
        `/Contents ${contentNumber} 0 R`,
        ">>",
      ].join("\n");

      objects[
        contentNumber
      ] = [
        `<< /Length ${byteLength(
          content,
        )} >>`,
        "stream",
        content,
        "endstream",
      ].join("\n");
    },
  );

  const chunks:
    string[] = [];

  const offsets =
    new Array<number>(
      objectCount +
        1,
    ).fill(0);

  const header =
    "%PDF-1.4\n";

  chunks.push(header);

  let currentOffset =
    byteLength(
      header,
    );

  for (
    let number = 1;
    number <=
    objectCount;
    number += 1
  ) {
    offsets[number] =
      currentOffset;

    const chunk = [
      `${number} 0 obj`,
      objects[number],
      "endobj",
      "",
    ].join("\n");

    chunks.push(
      chunk,
    );

    currentOffset +=
      byteLength(
        chunk,
      );
  }

  const xrefOffset =
    currentOffset;

  let xref =
    `xref\n0 ${
      objectCount + 1
    }\n`;

  xref +=
    "0000000000 65535 f \n";

  for (
    let number = 1;
    number <=
    objectCount;
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
    "<<",
    `/Size ${
      objectCount + 1
    }`,
    "/Root 1 0 R",
    ">>",
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

export function createAnthroReportPdf({
  playerName,
  controls,
  selectedMetrics,
}: ReportPdfInput): PdfResult {
  const chunks:
    Control[][] = [];

  for (
    let index = 0;
    index <
    controls.length;
    index +=
      ROWS_PER_PAGE
  ) {
    chunks.push(
      controls.slice(
        index,
        index +
          ROWS_PER_PAGE,
      ),
    );
  }

  if (
    chunks.length === 0
  ) {
    chunks.push([]);
  }

  const totalPages =
    chunks.length;

  const pages =
    chunks.map(
      (
        pageControls,
        index,
      ) =>
        buildPageContent(
          {
            playerName,
            controls:
              pageControls,
            selectedMetrics,
            pageNumber:
              index + 1,
            totalPages,
          },
        ),
    );

  const pdfBytes =
    buildPdf(pages);

  const blob =
    new Blob(
      [pdfBytes],
      {
        type:
          "application/pdf",
      },
    );

  return {
    blob,
    fileName: `informe-${safeFileName(
      playerName,
    )}.pdf`,
  };
}
