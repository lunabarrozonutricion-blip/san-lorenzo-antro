export type HistoryPdfRow = {
  date: string;
  weight: number | null;
  sum6: number | null;
  notes: string | null;
};

type HistoryPdfInput = {
  playerName: string;
  from?: string | null;
  to?: string | null;
  rows: HistoryPdfRow[];
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

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  const parts =
    value.split("-");

  if (
    parts.length !== 3
  ) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

function pageHeader(
  input: HistoryPdfInput,
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
        "HISTORIAL ANTROPOMÉTRICO",
      x: LEFT + 60,
      y: 768,
      size: 17,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        input.playerName,
      x: LEFT,
      y: 727,
      size: 11,
      bold: true,
    }),
  );

  let rangeText =
    "Todos los controles";

  if (
    input.from ||
    input.to
  ) {
    rangeText =
      `Período: ${
        input.from
          ? formatDate(
              input.from,
            )
          : "inicio"
      } a ${
        input.to
          ? formatDate(
              input.to,
            )
          : "actualidad"
      }`;
  }

  commands.push(
    textCommand({
      text: rangeText,
      x: LEFT,
      y: 708,
      size: 8,
      color:
        "0.39 0.45 0.54",
    }),
  );

  commands.push(
    rightText({
      text: `${input.rows.length} controles`,
      right:
        PAGE_WIDTH -
        RIGHT,
      y: 708,
      size: 8,
      bold: true,
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
}: {
  input: HistoryPdfInput;
  rows: HistoryPdfRow[];
  pageNumber: number;
  totalPages: number;
}) {
  const commands =
    pageHeader(input);

  const tableX =
    LEFT;

  const tableTop =
    665;

  const widths = [
    92,
    82,
    88,
    261,
  ];

  const headers = [
    "Fecha",
    "Peso",
    "Sum6",
    "Observaciones",
  ];

  const totalWidth =
    widths.reduce(
      (sum, width) =>
        sum + width,
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
          text: header,
          x:
            headerX +
            6,
          y:
            tableTop -
            16,
          size: 7,
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
        index * 30;

      const rowBottom =
        rowTop - 30;

      if (
        index % 2 === 1
      ) {
        commands.push(
          rectCommand(
            tableX,
            rowBottom,
            totalWidth,
            30,
            "0.98 0.985 0.99",
          ),
        );
      }

      const values = [
        formatDate(
          row.date,
        ),
        row.weight != null
          ? `${formatNumber(
              row.weight,
              1,
            )} kg`
          : "—",
        row.sum6 != null
          ? `${formatNumber(
              row.sum6,
              1,
            )} mm`
          : "—",
        row.notes?.trim() ||
          "—",
      ];

      let x =
        tableX;

      values.forEach(
        (
          value,
          valueIndex,
        ) => {
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
                11,
              size: 7,
              bold:
                valueIndex ===
                0,
              color:
                valueIndex ===
                3
                  ? "0.32 0.37 0.45"
                  : undefined,
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
    rightText({
      text:
        `Página ${pageNumber} de ${totalPages}`,
      right:
        PAGE_WIDTH -
        RIGHT,
      y: 24,
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

export function createHistoryReportPdf(
  input: HistoryPdfInput,
): PdfResult {
  const rowsPerPage =
    19;

  const chunks:
    HistoryPdfRow[][] =
    [];

  for (
    let index = 0;
    index <
    input.rows.length;
    index += rowsPerPage
  ) {
    chunks.push(
      input.rows.slice(
        index,
        index +
          rowsPerPage,
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
      `historial-${safeName(
        input.playerName,
      )}.pdf`,
  };
}
