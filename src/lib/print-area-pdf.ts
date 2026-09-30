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

/**
 * Espera dos ciclos de renderizado.
 *
 * Esto permite que el navegador termine de calcular:
 * - estilos
 * - fuentes
 * - dimensiones
 * - layout
 */
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

/**
 * Copia todos los estilos computados desde el elemento
 * original hacia el clon.
 *
 * Esto es importante porque el SVG/foreignObject no
 * necesariamente tiene acceso a todos los estilos CSS
 * externos de la página.
 */
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

/**
 * Prepara el clon de una sección para ser convertido
 * en una imagen.
 */
function prepareSectionClone(
  root: HTMLElement,
) {
  root.style.display =
    "block";

  root.style.width =
    `${CAPTURE_WIDTH}px`;

  root.style.maxWidth =
    "none";

  root.style.margin =
    "0";

  root.style.boxSizing =
    "border-box";

  root.style.background =
    "#ffffff";

  root.style.overflow =
    "visible";

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
      ".overflow-x-auto",
    )
    .forEach(
      (element) => {
        element.style.overflow =
          "visible";

        element.style.maxWidth =
          "none";

        element.style.width =
          "100%";
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

        table.style.borderCollapse =
          "collapse";
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

        cell.style.overflowWrap =
          "anywhere";
      },
    );
}

/**
 * Convierte una sección HTML en Canvas.
 *
 * Flujo:
 *
 * HTML
 *   ↓
 * clone
 *   ↓
 * estilos inline
 *   ↓
 * SVG + foreignObject
 *   ↓
 * Image
 *   ↓
 * Canvas
 */
async function renderSectionToCanvas(
  section: HTMLElement,
) {
  const sectionKey =
    section.dataset
      .printSection ??
    "unknown";

  console.group(
    `[PDF] Generando sección: ${sectionKey}`,
  );

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
    section.cloneNode(
      true,
    ) as HTMLElement;

  prepareSectionClone(
    workingClone,
  );

  host.appendChild(
    workingClone,
  );

  document.body.appendChild(
    host,
  );

  try {
    console.log(
      "[PDF] Clon creado:",
      {
        sectionKey,
        tagName:
          workingClone.tagName,
        width:
          workingClone.offsetWidth,
        height:
          workingClone.offsetHeight,
      },
    );

    /**
     * Esperamos las fuentes.
     */
    if (
      "fonts" in
      document
    ) {
      try {
        await document.fonts.ready;

        console.log(
          "[PDF] Fuentes listas.",
        );
      } catch (fontError) {
        console.warn(
          "[PDF] No se pudieron esperar las fuentes:",
          fontError,
        );
      }
    }

    await nextPaint();

    const width =
      CAPTURE_WIDTH;

    const measuredHeight =
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

    const height =
      measuredHeight;

    console.log(
      "[PDF] Dimensiones calculadas:",
      {
        sectionKey,
        width,
        height,
        scrollHeight:
          workingClone.scrollHeight,
        clientHeight:
          workingClone.clientHeight,
        offsetHeight:
          workingClone.offsetHeight,
      },
    );

    if (
      !Number.isFinite(
        height,
      ) ||
      height <= 0
    ) {
      throw new Error(
        `La sección "${sectionKey}" tiene una altura inválida: ${height}.`,
      );
    }

    if (
      height > 30000
    ) {
      throw new Error(
        `La sección "${sectionKey}" es demasiado larga (${height}px) para generar el PDF de una sola vez.`,
      );
    }

    /**
     * Segundo clon.
     *
     * Este será el que serializamos.
     */
    const snapshot =
      workingClone.cloneNode(
        true,
      ) as HTMLElement;

    /**
     * Copiamos estilos computados.
     */
    inlineComputedStyles(
      workingClone,
      snapshot,
    );

    /**
     * Namespace XHTML.
     *
     * Esto es importante cuando el HTML se introduce
     * dentro de un SVG foreignObject.
     */
    snapshot.setAttribute(
      "xmlns",
      "http://www.w3.org/1999/xhtml",
    );

    /**
     * Serializamos el HTML.
     */
    const serialized =
      new XMLSerializer().serializeToString(
        snapshot,
      );

    console.log(
      "[PDF] HTML serializado:",
      {
        sectionKey,
        serializedLength:
          serialized.length,
        preview:
          serialized.slice(
            0,
            500,
          ),
      },
    );

    if (
      !serialized ||
      serialized.length <
        20
    ) {
      throw new Error(
        `La sección "${sectionKey}" produjo un HTML serializado vacío o inválido.`,
      );
    }

    /**
     * Construimos el SVG.
     */
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${serialized}</foreignObject></svg>`;

    console.log(
      "[PDF] SVG generado:",
      {
        sectionKey,
        width,
        height,
        svgLength:
          svg.length,
        startsWithSvg:
          svg.startsWith(
            "<svg",
          ),
        hasForeignObject:
          svg.includes(
            "<foreignObject",
          ),
      },
    );

    /**
     * Blob del SVG.
     */
    const svgBlob =
      new Blob(
        [svg],
        {
          type:
            "image/svg+xml;charset=utf-8",
        },
      );

    console.log(
      "[PDF] SVG Blob creado:",
      {
        sectionKey,
        size:
          svgBlob.size,
        type:
          svgBlob.type,
      },
    );

  const url = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result === "string") {
      resolve(reader.result);
    } else {
      reject(
        new Error("No se pudo convertir el SVG a Data URL."),
      );
    }
  };

  reader.onerror = () => {
    reject(
      reader.error ??
        new Error("No se pudo leer el SVG."),
    );
  };

  reader.readAsDataURL(svgBlob);
});

    console.log(
      "[PDF] Blob URL:",
      url,
    );

    try {
      const image =
        new Image();

      /**
       * Algunos navegadores pueden tardar en cargar
       * un SVG grande.
       *
       * Ponemos un timeout para no dejar el proceso
       * bloqueado indefinidamente.
       */
      const IMAGE_TIMEOUT =
        15000;

      await new Promise<void>(
        (
          resolve,
          reject,
        ) => {
          let finished =
            false;

          const timeout =
            window.setTimeout(
              () => {
                if (
                  finished
                ) {
                  return;
                }

                finished =
                  true;

                console.error(
                  "[PDF] Timeout cargando SVG:",
                  {
                    sectionKey,
                    width,
                    height,
                    svgSize:
                      svgBlob.size,
                  },
                );

                reject(
                  new Error(
                    `El navegador tardó demasiado en convertir la sección "${sectionKey}" a imagen.`,
                  ),
                );
              },
              IMAGE_TIMEOUT,
            );

          image.onload =
            () => {
              if (
                finished
              ) {
                return;
              }

              finished =
                true;

              window.clearTimeout(
                timeout,
              );

              console.log(
                "[PDF] SVG cargado correctamente:",
                {
                  sectionKey,
                  imageWidth:
                    image.naturalWidth,
                  imageHeight:
                    image.naturalHeight,
                },
              );

              resolve();
            };

          image.onerror =
            (
              event,
            ) => {
              if (
                finished
              ) {
                return;
              }

              finished =
                true;

              window.clearTimeout(
                timeout,
              );

              console.error(
                "[PDF] ERROR cargando SVG:",
                {
                  sectionKey,
                  event,
                  width,
                  height,
                  serializedLength:
                    serialized.length,
                  svgLength:
                    svg.length,
                  blobSize:
                    svgBlob.size,
                  blobType:
                    svgBlob.type,
                  url,
                },
              );

              reject(
                new Error(
                  `El navegador no pudo cargar el SVG de la sección "${sectionKey}".`,
                ),
              );
            };

          /**
           * Importante:
           *
           * No usamos crossOrigin aquí porque el SVG
           * se encuentra en un Blob URL generado
           * localmente.
           */
          image.src =
            url;
        },
      );

      /**
       * Creamos el Canvas final de la sección.
       */
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
          `No se pudo obtener el contexto Canvas para la sección "${sectionKey}".`,
        );
      }

      /**
       * Fondo blanco.
       */
      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      /**
       * Dibujamos la imagen.
       */
      context.drawImage(
        image,
        0,
        0,
        width,
        height,
      );

      console.log(
        "[PDF] Canvas generado correctamente:",
        {
          sectionKey,
          width:
            canvas.width,
          height:
            canvas.height,
        },
      );

      /**
       * Comprobamos que el canvas realmente tenga
       * contenido.
       */
      try {
        const testPixel =
          context.getImageData(
            0,
            0,
            1,
            1,
          );

        console.log(
          "[PDF] Canvas accesible:",
          {
            sectionKey,
            pixel: Array.from(
              testPixel.data,
            ),
          },
        );
      } catch (canvasError) {
        console.error(
          "[PDF] No se pudo leer el Canvas:",
          canvasError,
        );

        throw new Error(
          `El navegador generó el Canvas de "${sectionKey}", pero no permite leer su contenido.`,
        );
      }

      return canvas;
    } finally {
      URL.revokeObjectURL(
        url,
      );

      console.log(
        "[PDF] Blob URL liberado.",
      );
    }
  } catch (error) {
    console.error(
      `[PDF] ERROR GENERAL en sección "${sectionKey}":`,
      error,
    );

    throw error;
  } finally {
    host.remove();

    console.groupEnd();
  }
}

/**
 * Calcula qué porcentaje de una fila del canvas
 * es prácticamente blanca.
 */
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

/**
 * Busca un punto razonable para realizar un salto
 * de página.
 */
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

/**
 * Convierte Base64 en bytes.
 */
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

/**
 * Convierte Canvas a JPEG.
 */
function canvasToJpeg(
  canvas:
    HTMLCanvasElement,
) {
  const dataUrl =
    canvas.toDataURL(
      "image/jpeg",
      0.9,
    );

  const base64 =
    dataUrl.split(
      ",",
    )[1];

  if (!base64) {
    throw new Error(
      "No se pudo convertir una página del Canvas a JPEG.",
    );
  }

  return base64ToBytes(
    base64,
  );
}

/**
 * Divide una sección grande en páginas A4.
 */
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

/**
 * Convierte texto ASCII en bytes.
 */
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

/**
 * Une varios Uint8Array.
 */
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

/**
 * Construye un PDF directamente a partir de JPEGs.
 */
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

      if (
        pageObject ===
          undefined ||
        imageObject ===
          undefined ||
        contentObject ===
          undefined
      ) {
        throw new Error(
          "Error interno al construir los objetos del PDF.",
        );
      }

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

/**
 * Obtiene las secciones seleccionadas en el orden
 * establecido para el PDF.
 */
function selectedSectionElements({
  element,
  selectedSections,
}: {
  element: HTMLElement;
  selectedSections:
    PrintableSectionSelection;
}) {
  const order:
    PrintableSectionKey[] = [
      "groupSummary",
      "playerSummary",
      "anthropometricReport",
      "charts",
    ];

  const sections:
    HTMLElement[] = [];

  for (
    const key of
    order
  ) {
    if (
      !selectedSections[key]
    ) {
      continue;
    }

    const section =
      element.querySelector<HTMLElement>(
        `[data-print-section="${key}"]`,
      );

    if (section) {
      sections.push(
        section,
      );
    } else {
      console.warn(
        `[PDF] No se encontró la sección "${key}".`,
      );
    }
  }

  return sections;
}

/**
 * Genera el PDF.
 */
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
  console.group(
    "[PDF] Inicio generación PDF",
  );

  try {
    console.log(
      "[PDF] Secciones seleccionadas:",
      selectedSections,
    );

    if (
      !Object.values(
        selectedSections,
      ).some(Boolean)
    ) {
      throw new Error(
        "Elegí al menos una sección para compartir.",
      );
    }

    const sections =
      selectedSectionElements({
        element,
        selectedSections,
      });

    console.log(
      "[PDF] Secciones encontradas:",
      sections.map(
        (section) =>
          section.dataset
            .printSection ??
          "unknown",
      ),
    );

    if (
      sections.length ===
      0
    ) {
      throw new Error(
        "No se encontraron las secciones seleccionadas.",
      );
    }

    const images:
      Uint8Array[] = [];

    for (
      const section of
      sections
    ) {
      const sectionKey =
        section.dataset
          .printSection ??
        "unknown";

      console.group(
        `[PDF] Procesando "${sectionKey}"`,
      );

      try {
        const canvas =
          await renderSectionToCanvas(
            section,
          );

        console.log(
          "[PDF] Canvas listo:",
          {
            sectionKey,
            width:
              canvas.width,
            height:
              canvas.height,
          },
        );

        const sectionImages =
          splitToJpegs(
            canvas,
          );

        console.log(
          "[PDF] Páginas generadas:",
          {
            sectionKey,
            pages:
              sectionImages.length,
          },
        );

        images.push(
          ...sectionImages,
        );
      } catch (error) {
        console.error(
          `[PDF] Falló la sección "${sectionKey}":`,
          error,
        );

        if (
          error instanceof
          Error
        ) {
          throw new Error(
            `No se pudo generar la sección "${sectionKey}". ${error.message}`,
          );
        }

        throw new Error(
          `No se pudo generar la sección "${sectionKey}".`,
        );
      } finally {
        console.groupEnd();
      }
    }

    if (
      images.length ===
      0
    ) {
      throw new Error(
        "No se generaron páginas para el PDF.",
      );
    }

    console.log(
      "[PDF] Total de páginas:",
      images.length,
    );

    const bytes =
      buildImagePdf(
        images,
      );

    console.log(
      "[PDF] PDF construido:",
      {
        bytes:
          bytes.length,
        kb:
          Math.round(
            bytes.length /
              1024,
          ),
      },
    );

    const blob =
      new Blob(
        [bytes],
        {
          type:
            "application/pdf",
        },
      );

    console.log(
      "[PDF] Blob final:",
      {
        size:
          blob.size,
        type:
          blob.type,
      },
    );

    return {
      blob,
      fileName,
    };
  } catch (error) {
    console.error(
      "[PDF] ERROR FINAL:",
      error,
    );

    throw error;
  } finally {
    console.groupEnd();
  }
}
