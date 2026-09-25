export type ObjectivePdfRow = {
  playerName: string;
  current: number | null;
  target: number | null;
  delta: number | null;
};

type ObjectivesPdfInput = {
  periodLabel: string;
  periodKey: string;
  rows: ObjectivePdfRow[];
};

type PdfResult = {
  blob: Blob;
  fileName: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const LEFT = 36;
const RIGHT = 36;

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

  for (const char of value) {
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
    let index = 0;
    index < text.length;
    index += 1
  ) {
    bytes[index] =
      text.charCodeAt(
        index,
      ) <= 255
        ? text.charCodeAt(
            index,
          )
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

function fitText(
  text: string,
  width: number,
  size: number,
) {
  if (
    textWidth(
      text,
      size,
    ) <= width
  ) {
    return text;
  }

  let value = text;

  while (
    value.length > 1 &&
    textWidth(
      `${value}...`,
      size,
    ) > width
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

function strokeRect(
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

function formatNumber(
  value:
    | number
    | null
    | undefined,
  decimals = 1,
) {
  if (value == null) {
    return "—";
  }

  return value
    .toFixed(decimals)
    .replace(".", ",");
}

function formatDelta(
  value:
    | number
    | null
    | undefined,
) {
  if (value == null) {
    return "—";
  }

  const prefix =
    value > 0
      ? "+"
      : "";

  return `${prefix}${formatNumber(
    value,
    1,
  )} mm`;
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

function pageHeader(
  input: ObjectivesPdfInput,
) {
  const commands:
    string[] = [];

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
    rectCommand(
      LEFT,
      753,
      48,
      48,
      "0.04 0.14 0.29",
    ),
  );

  commands.push(
    textCommand({
      text: "CASLA",
      x: LEFT + 8,
      y: 773,
      size: 10,
      bold: true,
      color: "1 1 1",
    }),
  );

  commands.push(
    textCommand({
      text:
        "SAN LORENZO · FÚTBOL FEMENINO",
      x: LEFT + 60,
      y: 791,
      size: 7,
      bold: true,
      color:
        "0.39 0.45 0.54",
    }),
  );

  commands.push(
    textCommand({
      text:
        "OBJETIVOS SUM6",
      x: LEFT + 60,
      y: 768,
      size: 18,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        input.periodLabel,
      x: LEFT,
      y: 727,
      size: 12,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        "Seguimiento de objetivos antropométricos del plantel",
      x: LEFT,
      y: 709,
      size: 8,
      color:
        "0.39 0.45 0.54",
    }),
  );

  commands.push(
    lineCommand(
      LEFT,
      694,
      PAGE_WIDTH -
        RIGHT,
      694,
    ),
  );

  return commands;
}

function buildPage({
  input,
  rows,
  pageNumber,
  totalPages,
  includeSummary,
}: {
  input: ObjectivesPdfInput;
  rows: ObjectivePdfRow[];
  pageNumber: number;
  totalPages: number;
  includeSummary: boolean;
}) {
  const commands =
    pageHeader(input);

  let tableTop =
    665;

  if (includeSummary) {
    const withTarget =
      input.rows.filter(
        (row) =>
          row.target != null,
      ).length;

    const withCurrent =
      input.rows.filter(
        (row) =>
          row.current != null,
      ).length;

    const atOrBelowTarget =
      input.rows.filter(
        (row) =>
          row.target != null &&
          row.current != null &&
          row.delta != null &&
          row.delta <= 0,
      ).length;

    const cards = [
      {
        label:
          "Jugadoras",
        value:
          String(
            input.rows.length,
          ),
      },
      {
        label:
          "Con objetivo",
        value:
          String(
            withTarget,
          ),
      },
      {
        label:
          "Con Sum6 actual",
        value:
          String(
            withCurrent,
          ),
      },
      {
        label:
          "En objetivo",
        value:
          String(
            atOrBelowTarget,
          ),
      },
    ];

    const cardWidth =
      122;

    cards.forEach(
      (
        card,
        index,
      ) => {
        const x =
          LEFT +
          index *
            (cardWidth +
              10);

        commands.push(
          rectCommand(
            x,
            620,
            cardWidth,
            48,
            "0.97 0.98 0.99",
          ),
        );

        commands.push(
          strokeRect(
            x,
            620,
            cardWidth,
            48,
          ),
        );

        commands.push(
          textCommand({
            text:
              card.label,
            x: x + 8,
            y: 649,
            size: 6.5,
            bold: true,
            color:
              "0.39 0.45 0.54",
          }),
        );

        commands.push(
          textCommand({
            text:
              card.value,
            x: x + 8,
            y: 631,
            size: 12,
            bold: true,
          }),
        );
      },
    );

    tableTop = 592;
  }

  const tableX =
    LEFT;

  const widths = [
    223,
    100,
    100,
    100,
  ];

  const headers = [
    "Jugadora",
    "Último Sum6",
    "Objetivo",
    "Δ vs objetivo",
  ];

  const totalWidth =
    widths.reduce(
      (sum, value) =>
        sum + value,
      0,
    );

  commands.push(
    rectCommand(
      tableX,
      tableTop - 24,
      totalWidth,
      24,
      "0.04 0.14 0.29",
    ),
  );

  let headerX =
    tableX;

  headers.forEach(
    (
      header,
      index,
    ) => {
      commands.push(
        textCommand({
          text:
            header,
          x:
            headerX +
            6,
          y:
            tableTop -
            16,
          size: 6.8,
          bold: true,
          color: "1 1 1",
        }),
      );

      headerX +=
        widths[index];
    },
  );

  rows.forEach(
    (
      row,
      index,
    ) => {
      const rowTop =
        tableTop -
        24 -
        index * 27;

      const rowBottom =
        rowTop - 27;

      if (
        index % 2 === 1
      ) {
        commands.push(
          rectCommand(
            tableX,
            rowBottom,
            totalWidth,
            27,
            "0.98 0.985 0.99",
          ),
        );
      }

      const values = [
        row.playerName,

        row.current != null
          ? `${formatNumber(
              row.current,
              1,
            )} mm`
          : "—",

        row.target != null
          ? `${formatNumber(
              row.target,
              1,
            )} mm`
          : "—",

        formatDelta(
          row.delta,
        ),
      ];

      let x =
        tableX;

      values.forEach(
        (
          value,
          valueIndex,
        ) => {
          let color:
            | string
            | undefined;

          if (
            valueIndex === 3 &&
            row.delta != null
          ) {
            color =
              row.delta <= 0
                ? "0.05 0.45 0.25"
                : "0.72 0.10 0.18";
          }

          commands.push(
            textCommand({
              text:
                fitText(
                  value,
                  widths[
                    valueIndex
                  ] - 12,
                  7,
                ),
              x: x + 6,
              y:
                rowBottom +
                9,
              size: 7,
              bold:
                valueIndex ===
                  0 ||
                valueIndex ===
                  3,
              color,
            }),
          );

          x +=
            widths[
              valueIndex
            ];
        },
      );

      commands.push(
        lineCommand(
          tableX,
          rowBottom,
          tableX +
            totalWidth,
          rowBottom,
        ),
      );
    },
  );

  commands.push(
    textCommand({
      text:
        "Δ = último Sum6 - objetivo",
      x: LEFT,
      y: 24,
      size: 6.5,
      color:
        "0.42 0.47 0.55",
    }),
  );

  commands.push(
    rightText({
      text:
        `Página ${pageNumber} de ${totalPages}`,
      right:
        PAGE_WIDTH -
        RIGHT,
      y: 24,
      size: 6.5,
      color:
        "0.42 0.47 0.55",
    }),
  );

  return commands.join(
    "\n",
  );
}

function buildPdf(
  pages: string[],
) {
  const pageCount =
    pages.length;

  const pageObjects =
    Array.from(
      {
        length:
          pageCount,
      },
      (_, index) =>
        5 +
        index * 2,
    );

  const contentObjects =
    pageObjects.map(
      (number) =>
        number + 1,
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
    `/Kids [${pageObjects
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

  pages.forEach(
    (
      content,
      index,
    ) => {
      const pageObject =
        pageObjects[
          index
        ];

      const contentObject =
        contentObjects[
          index
        ];

      objects[
        pageObject
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
        `/Contents ${contentObject} 0 R`,
        ">>",
      ].join("\n");

      objects[
        contentObject
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

  chunks.push(
    header,
  );

  let offset =
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

export function createObjectivesReportPdf(
  input: ObjectivesPdfInput,
): PdfResult {
  const firstPageRows =
    14;

  const nextPageRows =
    20;

  const chunks:
    ObjectivePdfRow[][] =
    [];

  chunks.push(
    input.rows.slice(
      0,
      firstPageRows,
    ),
  );

  for (
    let index =
      firstPageRows;
    index <
    input.rows.length;
    index +=
      nextPageRows
  ) {
    chunks.push(
      input.rows.slice(
        index,
        index +
          nextPageRows,
      ),
    );
  }

  if (
    chunks.length === 0
  ) {
    chunks.push([]);
  }

  const pages =
    chunks.map(
      (
        rows,
        index,
      ) =>
        buildPage({
          input,
          rows,
          pageNumber:
            index + 1,
          totalPages:
            chunks.length,
          includeSummary:
            index === 0,
        }),
    );

  const bytes =
    buildPdf(pages);

  return {
    blob: new Blob(
      [bytes],
      {
        type:
          "application/pdf",
      },
    ),

    fileName:
      `objetivos-sum6-${safeName(
        input.periodLabel,
      )}-${input.periodKey}.pdf`,
  };
}
