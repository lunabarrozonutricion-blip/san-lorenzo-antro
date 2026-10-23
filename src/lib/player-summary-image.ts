type SummaryCard = {
  name: string;
  date: string;
  previousDate: string;
  current: string;
  previous: string;
  difference: string;
  objectiveLabel: string;
  objective: string;
  objectiveDifference: string;
  fine?: string;
  additionalGoalLabel?: string;
  additionalGoal?: string;
};

export async function createPlayerSummaryImage(data: SummaryCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = data.additionalGoal ? 1580 : 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear la imagen");
  const navy = "#0b234a";
  const red = "#c8102e";
  const gray = "#64748b";
  ctx.fillStyle = "#f3f5f9";
  ctx.fillRect(0, 0, 1080, canvas.height);
  ctx.fillStyle = "#fff";
  rounded(ctx, 46, 42, 988, canvas.height - 94, 28);
  ctx.fill();
  ctx.fillStyle = navy;
  rounded(ctx, 46, 42, 988, 236, 28);
  ctx.fill();
  ctx.fillStyle = red;
  ctx.fillRect(46, 255, 988, 23);
  try {
    const logo = await loadImage("/logo-san-lorenzo.png");
    const scale = Math.min(125 / logo.width, 160 / logo.height);
    ctx.drawImage(logo, 100, 75, logo.width * scale, logo.height * scale);
  } catch {
    // El título institucional permanece visible si el logo no carga.
  }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 39px Arial";
  ctx.fillText("SAN LORENZO DE ALMAGRO", 270, 145);
  ctx.font = "24px Arial";
  ctx.fillText("ÁREA NUTRICIONAL  ·  FÚTBOL FEMENINO", 270, 190);
  ctx.fillStyle = red;
  ctx.font = "bold 22px Arial";
  ctx.fillText("RESUMEN ANTROPOMÉTRICO", 100, 345);
  ctx.fillStyle = navy;
  ctx.font = "bold 57px Arial";
  ctx.fillText(data.name, 100, 412, 870);
  ctx.fillStyle = gray;
  ctx.font = "26px Arial";
  ctx.fillText("Evaluación: " + data.date, 100, 462);

  tile(ctx, 100, 520, 420, 170, "SUMATORIA ACTUAL", data.current, navy, "#f0f4fa");
  tile(ctx, 560, 520, 420, 170, "EVALUACIÓN ANTERIOR", data.previous, navy, "#f0f4fa");
  ctx.fillStyle = gray;
  ctx.font = "23px Arial";
  ctx.fillText("Fecha anterior: " + data.previousDate, 565, 725);
  tile(ctx, 100, 765, 880, 150, "DIFERENCIA VS. ANTERIOR", data.difference, navy, "#f5f6f8");

  ctx.fillStyle = red;
  ctx.font = "bold 25px Arial";
  ctx.fillText("OBJETIVO SELECCIONADO", 100, 983);
  ctx.fillStyle = navy;
  ctx.font = "bold 31px Arial";
  ctx.fillText(data.objectiveLabel, 100, 1025);
  tile(ctx, 100, 1050, 420, 140, "OBJETIVO SUM6", data.objective, navy, "#f0f4fa");
  tile(ctx, 560, 1050, 420, 140, "DIFERENCIA VS. OBJETIVO", data.objectiveDifference, red, "#fff0f2");
  // La multa corresponde al objetivo seleccionado; el próximo objetivo va aparte.
  if (data.fine) {
    ctx.fillStyle = "#fff0f2";
    rounded(ctx, 100, 1202, 880, 80, 16);
    ctx.fill();
    ctx.fillStyle = red;
    ctx.font = "bold 22px Arial";
    ctx.fillText("MULTA ANTROPOMÉTRICA", 126, 1235);
    ctx.font = "bold 35px Arial";
    ctx.fillText(data.fine, 560, 1243, 395);
  }
  if (data.additionalGoal) {
    const headingY = data.fine ? 1350 : 1250;
    const labelY = data.fine ? 1387 : 1287;
    const tileY = data.fine ? 1400 : 1300;
    ctx.fillStyle = red;
    ctx.font = "bold 25px Arial";
    ctx.fillText("PRÓXIMO OBJETIVO", 100, headingY);
    ctx.fillStyle = navy;
    ctx.font = "bold 31px Arial";
    ctx.fillText(data.additionalGoalLabel ?? "", 100, labelY);
    tile(ctx, 100, tileY, 880, 120, "SUMATORIA OBJETIVO", data.additionalGoal, navy, "#eaf0f6");
  }
  ctx.fillStyle = gray;
  ctx.font = "19px Arial";

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo exportar la imagen")), "image/png"));
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function tile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, value: string, color: string, background: string) {
  ctx.fillStyle = background;
  rounded(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 20px Arial";
  ctx.fillText(label, x + 26, y + 43, w - 50);
  ctx.fillStyle = color;
  ctx.font = "bold 47px Arial";
  ctx.fillText(value, x + 26, y + 110, w - 50);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el logo"));
    img.src = url;
  });
}
