export type FineImageRow = {
  name: string; september: string; target: string; october: string;
  difference: string; amount: string; status: string; note: string;
};
export async function createFinesImage(rows: FineImageRow[], total: string): Promise<Blob> {
  const width = 1500, rowHeight = 49;
  const height = Math.max(900, 340 + rows.length * rowHeight + 150);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,width,height);
  ctx.textBaseline = "middle";
  try {
    const img = await new Promise<HTMLImageElement>((resolve,reject) => {
      const image = new Image(); image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Escudo no disponible"));
      image.src = "/logo-san-lorenzo.png";
    });
    const scale = Math.min(85/img.width,105/img.height);
    ctx.drawImage(img, (width-img.width*scale)/2, 20, img.width*scale,img.height*scale);
  } catch { /* El informe sigue siendo utilizable si falla el escudo. */ }
  ctx.textAlign="center"; ctx.fillStyle="#0b234a"; ctx.font="bold 34px Arial";
  ctx.fillText("SAN LORENZO DE ALMAGRO",width/2,150);
  ctx.fillStyle="#c8102e";ctx.font="bold 22px Arial";
  ctx.fillText("MULTAS POR ANTROPOMETRÍA · OCTUBRE 2026",width/2,194);
  ctx.fillStyle="#64748b";ctx.font="17px Arial";
  ctx.fillText("Sumatoria de seis pliegues · Seguimiento individual",width/2,227);
  const xs=[35,250,400,555,710,850,1045,1160];
  const headers=["Jugadora","Sum6 sept.","Objetivo oct.","Sum6 oct.","Δ (mm)","Multa","Estado","Observación"];
  ctx.fillStyle="#0b234a";ctx.fillRect(25,265,1450,54);
  ctx.textAlign="left";ctx.font="bold 17px Arial";ctx.fillStyle="#fff";
  headers.forEach((h,i)=>ctx.fillText(h,xs[i],292));
  const cut=(value:string,max:number)=>value.length>max?value.slice(0,max-1)+"…":value;
  rows.forEach((row,i)=>{
    const y=319+i*rowHeight;
    ctx.fillStyle=i%2===0?"#f0f4f8":"#fff";ctx.fillRect(25,y,1450,rowHeight);
    ctx.fillStyle="#0b234a";ctx.font="16px Arial";
    const values=[row.name,row.september,row.target,row.october,row.difference,row.amount,row.status,row.note];
    values.forEach((v,j)=>{
      ctx.fillStyle=j===5?"#c8102e":"#0b234a";
      ctx.font=j===0||j===5?"bold 16px Arial":"16px Arial";
      ctx.fillText(cut(v,j===7?33:j===0?21:16),xs[j],y+rowHeight/2);
    });
  });
  const totalY=345+rows.length*rowHeight;
  ctx.fillStyle="#c8102e";ctx.fillRect(1000,totalY,475,65);
  ctx.fillStyle="#fff";ctx.font="bold 27px Arial";ctx.fillText("TOTAL A COBRAR: "+total,1020,totalY+34,440);
  ctx.fillStyle="#64748b";ctx.font="17px Arial";
  ctx.fillText("Primer mm sin cargo · Cada mm adicional: $50.000 · Importes ajustables manualmente",35,totalY+100);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Error al generar PNG")),"image/png"));
}
