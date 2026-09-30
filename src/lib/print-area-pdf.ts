export type PrintableSectionKey =
  | "groupSummary"
  | "playerSummary"
  | "anthropometricReport"
  | "charts";


export type PrintableSectionSelection =
  Record<
    PrintableSectionKey,
    boolean
  >;


type PdfResult = {
  blob: Blob;
  fileName: string;
};


const CAPTURE_WIDTH = 760;


const PDF_CANVAS_WIDTH = 1240;
const PDF_CANVAS_HEIGHT = 1754;
const PDF_MARGIN = 52;


const PDF_WIDTH = 595;
const PDF_HEIGHT = 842;


function nextPaint() {
  return new Promise<void>(
    (resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(
          () => resolve(),
        );
      });
    },
  );
}


function inlineComputedStyles(
  source: Element,
  target: Element,
) {
  const computed =
    window.getComputedStyle(
      source,
    );


  const styled =
    target as
      | HTMLElement
      | SVGElement;


  for (
    const property of
    Array.from(computed)
  ) {
    styled.style.setProperty(
      property,
      computed.getPropertyValue(
        property,
      ),
      computed.getPropertyPriority(
        property,
      ),
    );
  }


  const sourceChildren =
    Array.from(
      source.children,
    );


  const targetChildren =
    Array.from(
      target.children,
    );


  for (
    let index = 0;
    index <
    sourceChildren.length;
    index += 1
  ) {
    const sourceChild =
      sourceChildren[index];


    const targetChild =
      targetChildren[index];


    if (
      sourceChild &&
      targetChild
    ) {
      inlineComputedStyles(
        sourceChild,
        targetChild,
      );
    }
  }
}


function prepareClone(
  root: HTMLElement,
  selectedSections:
    PrintableSectionSelection,
) {
  root.style.width =
    `${CAPTURE_WIDTH}px`;


  root.style.maxWidth =
    "none";


  root.style.margin =
    "0";


  root.style.padding =
    "0";


  root.style.background =
    "#ffffff";


  root
    .querySelectorAll<HTMLElement>(
      ".no-print",
    )
    .forEach(
      (element) => {
        element.style.display =
          "none";
      },
    );


  root
    .querySelectorAll<HTMLElement>(
      "[data-print-section]",
    )
    .forEach(
      (element) => {
        const key =
          element.dataset
            .printSection as
            | PrintableSectionKey
            | undefined;


        if (!key) {
          return;
        }


        element.style.display =
          selectedSections[key]
            ? "block"
            : "none";
      },
    );


  root
    .querySelectorAll<HTMLElement>(
      ".overflow-x-auto",
    )
    .forEach(
      (element) => {
        element.style.overflow =
          "visible";
      },
    );


  root
    .querySelectorAll<HTMLTableElement>(
      "table",
    )
    .forEach(
      (table) => {
        table.style.width =
          "100%";


        table.style.minWidth =
          "0";


        table.style.maxWidth =
          "100%";


        table.style.tableLayout =
          "fixed";


        table.style.fontSize =
          "9px";
      },
    );


  root
    .querySelectorAll<HTMLElement>(
      "th, td",
    )
    .forEach(
      (cell) => {
        cell.style.padding =
          "5px 6px";


        cell.style.whiteSpace =
          "normal";


        cell.style.wordBreak =
          "break-word";
      },
    );
}


async function renderElementToCanvas(
  element: HTMLElement,
  selectedSections:
    PrintableSectionSelection,
) {
  const host =
    document.createElement(
      "div",
    );


  host.style.position =
    "fixed";


  host.style.left =
    "-100000px";


  host.style.top =
    "0";


  host.style.width =
    `${CAPTURE_WIDTH}px`;


  host.style.background =
    "#ffffff";


  host.style.pointerEvents =
    "none";


  host.style.zIndex =
    "-1";


  const workingClone =
    element.cloneNode(
      true,
    ) as HTMLElement;


  prepareClone(
    workingClone,
    selectedSections,
  );


  host.appendChild(
    workingClone,
  );


  document.body.appendChild(
    host,
  );


  try {
    await document.fonts.ready;


    await nextPaint();


    const width =
      CAPTURE_WIDTH;


    const height =
      Math.max(
        1,
        Math.ceil(
          workingClone.scrollHeight,
        ),
        Math.ceil(
          workingClone.getBoundingClientRect()
            .height,
        ),
      );


    const snapshot =
      workingClone.cloneNode(
        true,
      ) as HTMLElement;


    inlineComputedStyles(
      workingClone,
      snapshot,
    );


    snapshot.setAttribute(
      "xmlns",
      "http://www.w3.org/1999/xhtml",
    );


    const serialized =
      new XMLSerializer().serializeToString(
        snapshot,
      );


    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject></svg>`;


    const svgBlob =
      new Blob(
        [svg],
        {
          type:
            "image/svg+xml;charset=utf-8",
        },
      );


    const url =
      URL.createObjectURL(
        svgBlob,
      );


    try {
      const image =
        new Image();


      await new Promise<void>(
        (
          resolve,
          reject,
        ) => {
          image.onload =
            () => resolve();


          image.onerror =
            () =>
              reject(
                new Error(
                  "No se pudo preparar la vista del informe.",
                ),
              );


          image.src =
            url;
        },
      );


      const canvas =
        document.createElement(
          "canvas",
        );


      canvas.width =
        width;


      canvas.height =
        height;


      const context =
        canvas.getContext(
          "2d",
          {
            alpha: false,
          },
        );


      if (!context) {
        throw new Error(
          "No se pudo preparar el PDF.",
        );
      }


      context.fillStyle =
        "#ffffff";


      context.fillRect(
        0,
        0,
        width,
        height,
      );


      context.drawImage(
        image,
        0,
        0,
        width,
        height,
      );


      return canvas;
    } finally {
      URL.revokeObjectURL(
        url,
      );
    }
  } finally {
    host.remove();
  }
}


function rowWhiteScore(
  data: Uint8ClampedArray,
  width: number,
  row: number,
) {
  let white = 0;
  let total = 0;


  for (
    let x = 0;
    x < width;
    x += 14
  ) {
    const index =
      (
        row *
          width +
        x
      ) *
      4;


    const r =
      data[index] ??
      0;


    const g =
      data[index + 1] ??
      0;


    const b =
      data[index + 2] ??
      0;


    if (
      r > 244 &&
      g > 244 &&
      b > 244
    ) {
      white += 1;
    }


    total += 1;
  }


  return total > 0
    ? white / total
    : 0;
}


function choosePageBreak(
  source:
    HTMLCanvasElement,
  startY: number,
  idealEndY: number,
) {
  if (
    idealEndY >=
    source.height
  ) {
    return source.height;
  }


  const searchRadius =
    Math.min(
      130,
      Math.round(
        (
          idealEndY -
          startY
        ) *
          0.16,
      ),
    );


  const from =
    Math.max(
      startY + 120,
      idealEndY -
        searchRadius,
    );


  const to =
    Math.min(
      source.height - 1,
      idealEndY + 32,
    );


  if (to <= from) {
    return idealEndY;
  }


  const context =
    source.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      },
    );


  if (!context) {
    return idealEndY;
  }


  const band =
    context.getImageData(
      0,
      from,
      source.width,
      to - from + 1,
    );


  let bestY =
    idealEndY;


  let bestScore =
    -Infinity;


  for (
    let localY = 0;
    localY <
    band.height;
    localY += 3
  ) {
    const absoluteY =
      from + localY;


    const white =
      rowWhiteScore(
        band.data,
        band.width,
        localY,
      );


    const distance =
      Math.abs(
        absoluteY -
          idealEndY,
      ) /
      Math.max(
        searchRadius,
        1,
      );


    const score =
      white * 2 -
      distance * 0.35;


    if (
      score >
      bestScore
    ) {
      bestScore =
        score;


      bestY =
        absoluteY;
    }
  }


  return Math.max(
    startY + 80,
    bestY,
  );
}


function base64ToBytes(
  value: string,
) {
  const binary =
    atob(value);


  const bytes =
    new Uint8Array(
      binary.length,
    );


  for (
    let index = 0;
    index <
    binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }


  return bytes;
}


function canvasToJpeg(
  canvas:
    HTMLCanvasElement,
) {
  const dataUrl =
    canvas.toDataURL(
      "image/jpeg",
      0.9,
    );


  return base64ToBytes(
    dataUrl.split(
      ",",
    )[1],
  );
}


function splitToJpegs(
  source:
    HTMLCanvasElement,
) {
  const images:
    Uint8Array[] = [];


  const innerWidth =
    PDF_CANVAS_WIDTH -
    PDF_MARGIN * 2;


  const innerHeight =
    PDF_CANVAS_HEIGHT -
    PDF_MARGIN * 2;


  const renderScale =
    innerWidth /
    source.width;


  const sourceHeightPerPage =
    innerHeight /
    renderScale;


  let startY = 0;


  while (
    startY <
    source.height
  ) {
    const idealEnd =
      Math.min(
        source.height,
        startY +
          sourceHeightPerPage,
      );


    const endY =
      choosePageBreak(
        source,
        startY,
        idealEnd,
      );


    const sliceHeight =
      Math.max(
        1,
        endY -
          startY,
      );


    const page =
      document.createElement(
        "canvas",
      );


    page.width =
      PDF_CANVAS_WIDTH;


    page.height =
      PDF_CANVAS_HEIGHT;


    const context =
      page.getContext(
        "2d",
        {
          alpha: false,
        },
      );


    if (!context) {
      throw new Error(
        "No se pudo crear una página del PDF.",
      );
    }


    context.fillStyle =
      "#ffffff";


    context.fillRect(
      0,
      0,
      page.width,
      page.height,
    );


    context.imageSmoothingEnabled =
      true;


    context.imageSmoothingQuality =
      "high";


    context.drawImage(
      source,
      0,
      startY,
      source.width,
      sliceHeight,
      PDF_MARGIN,
      PDF_MARGIN,
      innerWidth,
      sliceHeight *
        renderScale,
    );


    images.push(
      canvasToJpeg(
        page,
      ),
    );


    startY =
      endY;
  }


  return images;
}


function asciiBytes(
  value: string,
) {
  const bytes =
    new Uint8Array(
      value.length,
    );


  for (
    let index = 0;
    index <
    value.length;
    index += 1
  ) {
    bytes[index] =
      value.charCodeAt(
        index,
      ) & 255;
  }


  return bytes;
}


function concatBytes(
  parts:
    Uint8Array[],
) {
  const length =
    parts.reduce(
      (
        total,
        part,
      ) =>
        total +
        part.length,
      0,
    );


  const result =
    new Uint8Array(
      length,
    );


  let offset = 0;


  for (
    const part of
    parts
  ) {
    result.set(
      part,
      offset,
    );


    offset +=
      part.length;
  }


  return result;
}


function buildImagePdf(
  images:
    Uint8Array[],
) {
  const pageObjectNumbers =
    images.map(
      (
        _,
        index,
      ) =>
        3 +
        index * 3,
    );


  const imageObjectNumbers =
    pageObjectNumbers.map(
      (value) =>
        value + 1,
    );


  const contentObjectNumbers =
    pageObjectNumbers.map(
      (value) =>
        value + 2,
    );


  const objectCount =
    2 +
    images.length * 3;


  const objectParts =
    new Map<
      number,
      Uint8Array
    >();


  objectParts.set(
    1,
    asciiBytes(
      "<< /Type /Catalog /Pages 2 0 R >>",
    ),
  );


  objectParts.set(
    2,
    asciiBytes(
      `<< /Type /Pages /Count ${images.length} /Kids [${pageObjectNumbers
        .map(
          (value) =>
            `${value} 0 R`,
        )
        .join(" ")}] >>`,
    ),
  );


  images.forEach(
    (
      imageBytes,
      index,
    ) => {
      const pageObject =
        pageObjectNumbers[
          index
        ];


      const imageObject =
        imageObjectNumbers[
          index
        ];


      const contentObject =
        contentObjectNumbers[
          index
        ];


      objectParts.set(
        pageObject,
        asciiBytes(
          [
            "<<",
            "/Type /Page",
            "/Parent 2 0 R",
            `/MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}]`,
            `/Resources << /XObject << /Im${index + 1} ${imageObject} 0 R >> >>`,
            `/Contents ${contentObject} 0 R`,
            ">>",
          ].join(
            "\n",
          ),
        ),
      );


      objectParts.set(
        imageObject,
        concatBytes([
          asciiBytes(
            [
              "<<",
              "/Type /XObject",
              "/Subtype /Image",
              `/Width ${PDF_CANVAS_WIDTH}`,
              `/Height ${PDF_CANVAS_HEIGHT}`,
              "/ColorSpace /DeviceRGB",
              "/BitsPerComponent 8",
              "/Filter /DCTDecode",
              `/Length ${imageBytes.length}`,
              ">>",
              "stream",
              "",
            ].join(
              "\n",
            ),
          ),
          imageBytes,
          asciiBytes(
            "\nendstream",
          ),
        ]),
      );


      const content =
        `q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/Im${index + 1} Do\nQ\n`;


      const contentBytes =
        asciiBytes(
          content,
        );


      objectParts.set(
        contentObject,
        concatBytes([
          asciiBytes(
            `<< /Length ${contentBytes.length} >>\nstream\n`,
          ),
          contentBytes,
          asciiBytes(
            "endstream",
          ),
        ]),
      );
    },
  );


  const chunks:
    Uint8Array[] = [];


  const offsets =
    new Array<number>(
      objectCount + 1,
    ).fill(0);


  const header =
    asciiBytes(
      "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",
    );


  chunks.push(
    header,
  );


  let offset =
    header.length;


  for (
    let objectNumber = 1;
    objectNumber <=
    objectCount;
    objectNumber += 1
  ) {
    offsets[
      objectNumber
    ] =
      offset;


    const prefix =
      asciiBytes(
        `${objectNumber} 0 obj\n`,
      );


    const body =
      objectParts.get(
        objectNumber,
      ) ??
      asciiBytes(
        "<<>>",
      );


    const suffix =
      asciiBytes(
        "\nendobj\n",
      );


    chunks.push(
      prefix,
      body,
      suffix,
    );


    offset +=
      prefix.length +
      body.length +
      suffix.length;
  }


  const xrefOffset =
    offset;


  let xref =
    `xref\n0 ${objectCount + 1}\n`;


  xref +=
    "0000000000 65535 f \n";


  for (
    let objectNumber = 1;
    objectNumber <=
    objectCount;
    objectNumber += 1
  ) {
    xref += `${String(
      offsets[
        objectNumber
      ],
    ).padStart(
      10,
      "0",
    )} 00000 n \n`;
  }


  const trailer =
    [
      "trailer",
      `<< /Size ${objectCount + 1} /Root 1 0 R >>`,
      "startxref",
      String(
        xrefOffset,
      ),
      "%%EOF",
      "",
    ].join(
      "\n",
    );


  chunks.push(
    asciiBytes(
      xref,
    ),
    asciiBytes(
      trailer,
    ),
  );


  return concatBytes(
    chunks,
  );
}


export async function createPrintAreaPdf({
  element,
  selectedSections,
  fileName,
}: {
  element: HTMLElement;
  selectedSections:
    PrintableSectionSelection;
  fileName: string;
}): Promise<PdfResult> {
  if (
    !Object.values(
      selectedSections,
    ).some(Boolean)
  ) {
    throw new Error(
      "Elegí al menos una sección para compartir.",
    );
  }


  const canvas =
    await renderElementToCanvas(
      element,
      selectedSections,
    );


  const bytes =
    buildImagePdf(
      splitToJpegs(
        canvas,
      ),
    );


  return {
    blob: new Blob(
      [bytes],
      {
        type:
          "application/pdf",
      },
    ),
    fileName,
  };
}