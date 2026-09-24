import { fmtDate } from "./calc";

export type HydrationPdfMode =
  | "values"
  | "both"
  | "chart";

export type HydrationPdfEntry = {
  playerName: string;
  value: number | null;
  observation: string | null;
};

type HydrationPdfInput = {
  date: string;
  rival: string | null;
  round: number | null;
  dayType: string;
  context: string;
  entries: HydrationPdfEntry[];
  mode: HydrationPdfMode;
};

type PdfResult = {
  blob: Blob;
  fileName: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const LEFT = 38;
const RIGHT = 38;

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

function strokeRectCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke = "0.80 0.84 0.89",
) {
  return [
    "q",
    `${stroke} RG`,
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

function hydrationStatus(
  value: number | null,
) {
  if (value == null) {
    return "Sin dato";
  }

  return value <= 1020
    ? "Bien hidratada"
    : "Deshidratada";
}

function summaryFor(
  entries: HydrationPdfEntry[],
) {
  let hydrated = 0;
  let dehydrated = 0;
  let noData = 0;

  for (
    const entry of entries
  ) {
    if (
      entry.value == null
    ) {
      noData += 1;
    } else if (
      entry.value <= 1020
    ) {
      hydrated += 1;
    } else {
      dehydrated += 1;
    }
  }

  const measured =
    hydrated +
    dehydrated;

  return {
    hydrated,
    dehydrated,
    noData,
    measured,

    hydratedPercent:
      measured > 0
        ? (hydrated /
            measured) *
          100
        : 0,

    dehydratedPercent:
      measured > 0
        ? (dehydrated /
            measured) *
          100
        : 0,
  };
}

function headerCommands({
  date,
  rival,
  round,
  dayType,
  context,
}: Omit<
  HydrationPdfInput,
  "entries" | "mode"
>) {
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
      738,
      48,
      48,
      "0.04 0.14 0.29",
    ),
  );

  commands.push(
    textCommand({
      text: "CASLA",
      x: LEFT + 8,
      y: 758,
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
      y: 775,
      size: 7.5,
      bold: true,
      color:
        "0.39 0.45 0.54",
    }),
  );

  commands.push(
    textCommand({
      text:
        "TEST DE HIDRATACIÓN",
      x: LEFT + 60,
      y: 753,
      size: 18,
      bold: true,
    }),
  );

  const metaY = 714;

  commands.push(
    textCommand({
      text: `Fecha: ${fmtDate(
        date,
      )}`,
      x: LEFT,
      y: metaY,
      size: 8,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text: `Rival: ${
        rival?.trim() ||
        "—"
      }`,
      x: 205,
      y: metaY,
      size: 8,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text: `N.º fecha: ${
        round ?? "—"
      }`,
      x: 405,
      y: metaY,
      size: 8,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text: `Tipo de día: ${dayType}`,
      x: LEFT,
      y: 697,
      size: 8,
    }),
  );

  commands.push(
    textCommand({
      text: `Contexto: ${context}`,
      x: 290,
      y: 697,
      size: 8,
    }),
  );

  commands.push(
    lineCommand(
      LEFT,
      683,
      PAGE_WIDTH -
        RIGHT,
      683,
    ),
  );

  return commands;
}

function buildValuesPage({
  input,
  entries,
  pageNumber,
  totalPages,
}: {
  input: HydrationPdfInput;
  entries: HydrationPdfEntry[];
  pageNumber: number;
  totalPages: number;
}) {
  const commands =
    headerCommands({
      date: input.date,
      rival: input.rival,
      round: input.round,
      dayType:
        input.dayType,
      context:
        input.context,
    });

  const summary =
    summaryFor(
      input.entries,
    );

  commands.push(
    textCommand({
      text: "Valores",
      x: LEFT,
      y: 662,
      size: 12,
      bold: true,
    }),
  );

  commands.push(
    rightText({
      text: `${summary.measured} mediciones · ${summary.noData} sin valor`,
      right:
        PAGE_WIDTH -
        RIGHT,
      y: 662,
      size: 7.5,
      color:
        "0.39 0.45 0.54",
    }),
  );

  const tableX =
    LEFT;

  const tableTop =
    644;

  const rowHeight =
    18;

  const nameWidth =
    128;

  const valueWidth =
    62;

  const statusWidth =
    92;

  const observationWidth =
    118;

  const tableWidth =
    nameWidth +
    valueWidth +
    statusWidth +
    observationWidth;

  const headerHeight =
    23;

  commands.push(
    rectCommand(
      tableX,
      tableTop -
        headerHeight,
      tableWidth,
      headerHeight,
      "0.04 0.14 0.29",
    ),
  );

  const headers = [
    {
      text: "Jugadora",
      x: tableX,
      width:
        nameWidth,
    },
    {
      text: "Valor",
      x:
        tableX +
        nameWidth,
      width:
        valueWidth,
    },
    {
      text: "Estado",
      x:
        tableX +
        nameWidth +
        valueWidth,
      width:
        statusWidth,
    },
    {
      text:
        "Observación",
      x:
        tableX +
        nameWidth +
        valueWidth +
        statusWidth,
      width:
        observationWidth,
    },
  ];

  for (
    const header of
    headers
  ) {
    commands.push(
      textCommand({
        text:
          header.text,
        x:
          header.x +
          5,
        y:
          tableTop -
          15,
        size: 7,
        bold: true,
        color: "1 1 1",
      }),
    );
  }

  entries.forEach(
    (
      entry,
      index,
    ) => {
      const rowTop =
        tableTop -
        headerHeight -
        rowHeight *
          index;

      const rowBottom =
        rowTop -
        rowHeight;

      if (
        index % 2 === 1
      ) {
        commands.push(
          rectCommand(
            tableX,
            rowBottom,
            tableWidth,
            rowHeight,
            "0.98 0.985 0.99",
          ),
        );
      }

      const status =
        hydrationStatus(
          entry.value,
        );

      if (
        entry.value != null
      ) {
        commands.push(
          rectCommand(
            tableX +
              nameWidth +
              valueWidth +
              2,
            rowBottom +
              2,
            statusWidth -
              4,
            rowHeight -
              4,
            entry.value <=
            1020
              ? "0.86 0.97 0.91"
              : "1 0.90 0.90",
          ),
        );
      }

      commands.push(
        textCommand({
          text: fitText(
            entry.playerName,
            nameWidth -
              10,
            7,
          ),
          x:
            tableX +
            5,
          y:
            rowBottom +
            6,
          size: 7,
          bold: true,
        }),
      );

      commands.push(
        textCommand({
          text:
            entry.value !=
            null
              ? String(
                  entry.value,
                )
              : "—",
          x:
            tableX +
            nameWidth +
            8,
          y:
            rowBottom +
            6,
          size: 7,
        }),
      );

      commands.push(
        textCommand({
          text: fitText(
            status,
            statusWidth -
              10,
            6.4,
          ),
          x:
            tableX +
            nameWidth +
            valueWidth +
            5,
          y:
            rowBottom +
            6,
          size: 6.4,
          bold: true,
          color:
            entry.value ==
            null
              ? "0.35 0.40 0.47"
              : entry.value <=
                  1020
                ? "0.08 0.39 0.22"
                : "0.65 0.09 0.09",
        }),
      );

      commands.push(
        textCommand({
          text: fitText(
            entry.observation ??
              "—",
            observationWidth -
              10,
            6.5,
          ),
          x:
            tableX +
            nameWidth +
            valueWidth +
            statusWidth +
            5,
          y:
            rowBottom +
            6,
          size: 6.5,
        }),
      );

      commands.push(
        lineCommand(
          tableX,
          rowBottom,
          tableX +
            tableWidth,
          rowBottom,
        ),
      );
    },
  );

  const bottom =
    tableTop -
    headerHeight -
    rowHeight *
      entries.length;

  commands.push(
    strokeRectCommand(
      tableX,
      bottom,
      tableWidth,
      tableTop -
        bottom,
    ),
  );

  commands.push(
    rightText({
      text: `Página ${pageNumber} de ${totalPages}`,
      right:
        PAGE_WIDTH -
        RIGHT,
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

function buildChartPage({
  input,
  pageNumber,
  totalPages,
}: {
  input: HydrationPdfInput;
  pageNumber: number;
  totalPages: number;
}) {
  const commands =
    headerCommands({
      date: input.date,
      rival: input.rival,
      round: input.round,
      dayType:
        input.dayType,
      context:
        input.context,
    });

  const summary =
    summaryFor(
      input.entries,
    );

  commands.push(
    textCommand({
      text:
        "Estado de hidratación",
      x: LEFT,
      y: 655,
      size: 16,
      bold: true,
    }),
  );

  commands.push(
    textCommand({
      text:
        "Porcentajes calculados sobre las jugadoras con medición.",
      x: LEFT,
      y: 636,
      size: 8,
      color:
        "0.39 0.45 0.54",
    }),
  );

  const cardY =
    555;

  const cardWidth =
    155;

  const cardHeight =
    58;

  const gap = 17;

  const cards = [
    {
      label:
        "Bien hidratadas",
      value:
        summary.hydrated,
    },
    {
      label:
        "Deshidratadas",
      value:
        summary.dehydrated,
    },
    {
      label:
        "Sin medición",
      value:
        summary.noData,
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
            String(
              card.value,
            ),
          x: x + 12,
          y:
            cardY +
            30,
          size: 18,
          bold: true,
        }),
      );

      commands.push(
        textCommand({
          text:
            card.label,
          x: x + 12,
          y:
            cardY +
            13,
          size: 7.5,
          color:
            "0.39 0.45 0.54",
        }),
      );
    },
  );

  const chartX =
    LEFT;

  const chartWidth =
    PAGE_WIDTH -
    LEFT -
    RIGHT;

  const barHeight =
    34;

  const hydratedY =
    445;

  const dehydratedY =
    350;

  commands.push(
    textCommand({
      text:
        "Bien hidratadas",
      x: chartX,
      y:
        hydratedY +
        50,
      size: 10,
      bold: true,
    }),
  );

  commands.push(
    rightText({
      text: `${summary.hydratedPercent.toFixed(
        1,
      )}%`,
      right:
        chartX +
        chartWidth,
      y:
        hydratedY +
        50,
      size: 11,
      bold: true,
      color:
        "0.08 0.39 0.22",
    }),
  );

  commands.push(
    rectCommand(
      chartX,
      hydratedY,
      chartWidth,
      barHeight,
      "0.92 0.94 0.96",
    ),
  );

  commands.push(
    rectCommand(
      chartX,
      hydratedY,
      chartWidth *
        (summary.hydratedPercent /
          100),
      barHeight,
      "0.45 0.82 0.62",
    ),
  );

  commands.push(
    textCommand({
      text:
        "Deshidratadas",
      x: chartX,
      y:
        dehydratedY +
        50,
      size: 10,
      bold: true,
    }),
  );

  commands.push(
    rightText({
      text: `${summary.dehydratedPercent.toFixed(
        1,
      )}%`,
      right:
        chartX +
        chartWidth,
      y:
        dehydratedY +
        50,
      size: 11,
      bold: true,
      color:
        "0.65 0.09 0.09",
    }),
  );

  commands.push(
    rectCommand(
      chartX,
      dehydratedY,
      chartWidth,
      barHeight,
      "0.92 0.94 0.96",
    ),
  );

  commands.push(
    rectCommand(
      chartX,
      dehydratedY,
      chartWidth *
        (summary.dehydratedPercent /
          100),
      barHeight,
      "0.93 0.45 0.45",
    ),
  );

  if (
    summary.measured === 0
  ) {
    commands.push(
      textCommand({
        text:
          "No hay valores cargados para calcular porcentajes.",
        x: LEFT,
        y: 285,
        size: 9,
        color:
          "0.39 0.45 0.54",
      }),
    );
  }

  commands.push(
    rightText({
      text: `Página ${pageNumber} de ${totalPages}`,
      right:
        PAGE_WIDTH -
        RIGHT,
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

function safeDate(
  date: string,
) {
  return (
    date
      .replace(
        /[^0-9-]/g,
        "",
      ) ||
    "sin-fecha"
  );
}

export function createHydrationReportPdf(
  input: HydrationPdfInput,
): PdfResult {
  const pages:
    string[] = [];

  const rowsPerPage =
    29;

  const valueChunks:
    HydrationPdfEntry[][] =
    [];

  if (
    input.mode ===
      "values" ||
    input.mode ===
      "both"
  ) {
    for (
      let index = 0;
      index <
      input.entries.length;
      index +=
        rowsPerPage
    ) {
      valueChunks.push(
        input.entries.slice(
          index,
          index +
            rowsPerPage,
        ),
      );
    }

    if (
      valueChunks.length ===
      0
    ) {
      valueChunks.push([]);
    }
  }

  const chartPages =
    input.mode ===
      "chart" ||
    input.mode ===
      "both"
      ? 1
      : 0;

  const totalPages =
    valueChunks.length +
    chartPages;

  valueChunks.forEach(
    (
      entries,
      index,
    ) => {
      pages.push(
        buildValuesPage({
          input,
          entries,
          pageNumber:
            index + 1,
          totalPages,
        }),
      );
    },
  );

  if (
    chartPages === 1
  ) {
    pages.push(
      buildChartPage({
        input,
        pageNumber:
          pages.length +
          1,
        totalPages,
      }),
    );
  }

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

    fileName: `test-hidratacion-${safeDate(
      input.date,
    )}.pdf`,
  };
}
