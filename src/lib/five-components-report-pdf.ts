export type FiveComponentsPdfMeasure = {
  label: string;
  unit: string;
  current: number | null;
  previous: number | null;
  difference: number | null;
};

export type FiveComponentsPdfMass = {
  label: string;
  kg: number | null;
  percent: number | null;
  scoreZ: number | null;
  previousKg: number | null;
  differenceKg: number | null;
};

export type FiveComponentsPdfExtra = {
  label: string;
  value: string;
};

type FiveComponentsPdfInput = {
  playerName: string;
  date: string;
  source: string;

  weight: number | null;
  stature: number | null;
  sum6: number | null;
  muscleBoneIndex: number | null;

  measurements: FiveComponentsPdfMeasure[];
  masses: FiveComponentsPdfMass[];
  extras: FiveComponentsPdfExtra[];
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
      text.charCodeAt(index) <=
      255
        ? text.charCodeAt(index)
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
    "0.80 0.84 0.89 RG",
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

function numberText(
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

function signedText(
  value:
    | number
    | null
    | undefined,
  decimals = 1,
) {
  if (value == null) {
    return "—";
  }

  const prefix =
    value > 0
      ? "+"
      : "";

  return `${prefix}${numberText(
    value,
    decimals,
  )}`;
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

function header({
  playerName,
  date,
  source,
  title,
}: {
  playerName: string;
  date: string;
  source: string;
  title: string;
}) {
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
      text: title,
      x: LEFT + 60,
      y: 768,
      size: 17,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        playerName,
      x: LEFT,
      y: 727,
      size: 11,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text: `Fecha: ${date}`,
      x: LEFT,
      y: 710,
      size: 8,
    }),
  );

  commands.push(
    rightText({
      text: `Origen: ${source}`,
      right:
        PAGE_WIDTH -
        RIGHT,
      y: 710,
      size: 8,
      color:
        "0.39 0.45 0.54",
    }),
  );

  commands.push(
    lineCommand(
      LEFT,
      696,
      PAGE_WIDTH -
        RIGHT,
      696,
    ),
  );

  return commands;
}

function buildSummaryPage(
  input: FiveComponentsPdfInput,
) {
  const commands =
    header({
      playerName:
        input.playerName,
      date: input.date,
      source: input.source,
      title:
        "EVALUACIÓN DE 5 COMPONENTES",
    });

  commands.push(
    textCommand({
      text:
        "Resumen de la evaluación",
      x: LEFT,
      y: 672,
      size: 12,
      bold: true,
    }),
  );

  const cards = [
    {
      label: "Peso",
      value:
        input.weight != null
          ? `${numberText(
              input.weight,
              1,
            )} kg`
          : "—",
    },
    {
      label: "Talla",
      value:
        input.stature != null
          ? `${numberText(
              input.stature,
              1,
            )} cm`
          : "—",
    },
    {
      label: "Sum6",
      value:
        input.sum6 != null
          ? `${numberText(
              input.sum6,
              1,
            )} mm`
          : "—",
    },
    {
      label: "IMO",
      value:
        numberText(
          input.muscleBoneIndex,
          2,
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
          610,
          cardWidth,
          47,
          "0.97 0.98 0.99",
        ),
      );

      commands.push(
        strokeRect(
          x,
          610,
          cardWidth,
          47,
        ),
      );

      commands.push(
        textCommand({
          text:
            card.label,
          x: x + 8,
          y: 640,
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
          x: x + 8,
          y: 621,
          size: 11,
          bold: true,
        }),
      );
    },
  );

  commands.push(
    textCommand({
      text:
        "Fraccionamiento corporal",
      x: LEFT,
      y: 580,
      size: 12,
      bold: true,
    }),
  );

  const tableX =
    LEFT;

  const tableTop =
    558;

  const widths = [
    140,
    75,
    75,
    70,
    78,
    78,
  ];

  const headers = [
    "Componente",
    "kg",
    "%",
    "Score Z",
    "Anterior",
    "Diferencia",
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
      tableTop - 22,
      totalWidth,
      22,
      "0.04 0.14 0.29",
    ),
  );

  let cursorX =
    tableX;

  headers.forEach(
    (
      value,
      index,
    ) => {
      commands.push(
        textCommand({
          text: value,
          x:
            cursorX +
            5,
          y:
            tableTop -
            14,
          size: 6.8,
          bold: true,
          color: "1 1 1",
        }),
      );

      cursorX +=
        widths[index];
    },
  );

  input.masses.forEach(
    (
      mass,
      index,
    ) => {
      const rowTop =
        tableTop -
        22 -
        index * 25;

      const rowBottom =
        rowTop - 25;

      if (
        index % 2 === 1
      ) {
        commands.push(
          rectCommand(
            tableX,
            rowBottom,
            totalWidth,
            25,
            "0.98 0.985 0.99",
          ),
        );
      }

      const values = [
        mass.label,
        numberText(
          mass.kg,
          2,
        ),
        numberText(
          mass.percent,
          2,
        ),
        numberText(
          mass.scoreZ,
          2,
        ),
        numberText(
          mass.previousKg,
          2,
        ),
        signedText(
          mass.differenceKg,
          2,
        ),
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
                  ] - 10,
                  7,
                ),
              x: x + 5,
              y:
                rowBottom +
                8,
              size: 7,
              bold:
                valueIndex ===
                0,
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

  const extrasTop =
    365;

  commands.push(
    textCommand({
      text:
        "Indicadores adicionales",
      x: LEFT,
      y: extrasTop,
      size: 12,
      bold: true,
    }),
  );

  input.extras
    .slice(0, 12)
    .forEach(
      (
        extra,
        index,
      ) => {
        const column =
          index % 2;

        const row =
          Math.floor(
            index / 2,
          );

        const x =
          LEFT +
          column * 260;

        const y =
          extrasTop -
          27 -
          row * 29;

        commands.push(
          rectCommand(
            x,
            y - 5,
            245,
            23,
            "0.97 0.98 0.99",
          ),
        );

        commands.push(
          textCommand({
            text:
              fitText(
                extra.label,
                155,
                7,
              ),
            x: x + 7,
            y: y + 3,
            size: 7,
            color:
              "0.39 0.45 0.54",
          }),
        );

        commands.push(
          rightText({
            text:
              extra.value,
            right:
              x + 237,
            y: y + 3,
            size: 7.5,
            bold: true,
          }),
        );
      },
    );

  return commands.join(
    "\n",
  );
}

function buildMeasurementsPage({
  input,
  rows,
  pageNumber,
  totalPages,
}: {
  input: FiveComponentsPdfInput;
  rows: FiveComponentsPdfMeasure[];
  pageNumber: number;
  totalPages: number;
}) {
  const commands =
    header({
      playerName:
        input.playerName,
      date: input.date,
      source: input.source,
      title:
        "MEDICIONES ANTROPOMÉTRICAS",
    });

  const tableX =
    LEFT;

  const tableTop =
    665;

  const widths = [
    190,
    72,
    82,
    82,
    82,
  ];

  const headers = [
    "Medición",
    "Unidad",
    "Actual",
    "Anterior",
    "Diferencia",
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
      tableTop - 22,
      totalWidth,
      22,
      "0.04 0.14 0.29",
    ),
  );

  let cursorX =
    tableX;

  headers.forEach(
    (
      headerText,
      index,
    ) => {
      commands.push(
        textCommand({
          text:
            headerText,
          x:
            cursorX +
            5,
          y:
            tableTop -
            14,
          size: 6.8,
          bold: true,
          color: "1 1 1",
        }),
      );

      cursorX +=
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
        22 -
        index * 23;

      const rowBottom =
        rowTop - 23;

      if (
        index % 2 === 1
      ) {
        commands.push(
          rectCommand(
            tableX,
            rowBottom,
            totalWidth,
            23,
            "0.98 0.985 0.99",
          ),
        );
      }

      const values = [
        row.label,
        row.unit,
        numberText(
          row.current,
          1,
        ),
        numberText(
          row.previous,
          1,
        ),
        signedText(
          row.difference,
          1,
        ),
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
                  ] - 10,
                  7,
                ),
              x: x + 5,
              y:
                rowBottom +
                7,
              size: 7,
              bold:
                valueIndex ===
                0,
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
      text: `Página ${pageNumber} de ${totalPages}`,
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

  const headerText =
    "%PDF-1.4\n";

  chunks.push(
    headerText,
  );

  let currentOffset =
    byteLength(
      headerText,
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

export function createFiveComponentsReportPdf(
  input: FiveComponentsPdfInput,
): PdfResult {
  const measurementChunks:
    FiveComponentsPdfMeasure[][] =
    [];

  const rowsPerPage =
    24;

  for (
    let index = 0;
    index <
    input.measurements.length;
    index +=
      rowsPerPage
  ) {
    measurementChunks.push(
      input.measurements.slice(
        index,
        index +
          rowsPerPage,
      ),
    );
  }

  const totalPages =
    1 +
    measurementChunks.length;

  const pages = [
    buildSummaryPage(
      input,
    ),
  ];

  measurementChunks.forEach(
    (
      rows,
      index,
    ) => {
      pages.push(
        buildMeasurementsPage({
          input,
          rows,
          pageNumber:
            index + 2,
          totalPages,
        }),
      );
    },
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

    fileName: `5-componentes-${safeName(
      input.playerName,
    )}-${input.date}.pdf`,
  };
}
