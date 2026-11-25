// Local-only PDF export: no player data is sent to an external service.
export async function buildIndividualPdf(name:string, root:HTMLElement):Promise<File> {
  if(!root) throw new Error("Missing report");
  const W=1240,H=1754,M=65, CW=W-2*M;
  const pages:HTMLCanvasElement[]=[];
  let canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D,y=0;
  function page(){canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);pages.push(canvas);y=M;}
  function ensure(h:number){if(y+h>H-M)page();}
  function lines(t:string,size:number,width=CW-44){ctx.font=size+"px Arial";const out:string[]=[];for(const para of t.split("\n")){let line="";for(const word of para.split(/\s+/)){if(line&&ctx.measureText(line+" "+word).width>width){out.push(line);line=word;}else line+=(line?" ":"")+word;}out.push(line);}return out;}
  function heading(t:string){ensure(90);const g=ctx.createLinearGradient(M,y,W-M,y);g.addColorStop(0,"#0B234A");g.addColorStop(1,"#8D1731");ctx.fillStyle=g;ctx.fillRect(M,y,CW,65);ctx.fillStyle="white";ctx.font="bold 29px Arial";ctx.fillText(t,M+20,y+42,CW-40);y+=82;}
  function paragraph(t:string,size=25){for(const l of lines(t,size)){ensure(size+12);ctx.fillStyle="#203858";ctx.font=size+"px Arial";ctx.fillText(l,M+20,y+size);y+=size+12;}y+=12;}
  page();heading("Informe nutricional individual 2026");paragraph("Club Atlético San Lorenzo de Almagro · Fútbol Femenino",23);paragraph(name,30);
  for(const section of Array.from(root.querySelectorAll<HTMLElement>(":scope > section, :scope > div.hidden > section"))){
    if(section.classList.contains("no-print"))continue;
    const title=section.querySelector("h3")?.textContent||"";
    const copy=section.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".no-print").forEach(n=>n.remove());
    const svg=copy.querySelector("svg");
    const grid=copy.querySelector(".print-three")||copy.querySelector(".grid");
    const cards=grid?Array.from(grid.children).map(n=>Array.from(n.querySelectorAll("p,h4,strong,span")).filter(e=>!e.querySelector("p,h4,strong,span")).map(e=>e.textContent||"").join(" · ")): [];
    ensure(svg?650:180);heading(title);
    if(cards.length){for(const item of cards)paragraph(item,25);grid?.remove();}
    if(svg){
      svg.setAttribute("xmlns","http://www.w3.org/2000/svg");
      const vb=svg.viewBox.baseVal;const sw=vb.width||855,sh=vb.height||420;
      svg.setAttribute("width",String(sw));svg.setAttribute("height",String(sh));
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"}));
      try{const img=new Image();img.src=url;await img.decode();const h=Math.min(650,CW*sh/sw);ensure(h+20);ctx.drawImage(img,M,y,CW,h);y+=h+20;}finally{URL.revokeObjectURL(url);}
      svg.parentElement?.parentElement?.remove();
    }
    copy.querySelector("h3")?.remove();
    copy.querySelectorAll("table").forEach(t=>{for(const row of Array.from(t.rows))paragraph(Array.from(row.cells).map(c=>c.textContent||"").join("  |  "),21);t.remove();});
    const rest=copy.textContent?.trim(); 
    if(title.includes("Balance")){paragraph(copy.querySelector("p")?.textContent||"");}
    else if(title.includes("hidratación")){const percentages=Array.from(copy.querySelectorAll("span")).map(n=>n.textContent||"").filter(t=>t.includes("%"));if(percentages.length)paragraph(percentages.join(" · "));}
    else if(title.includes("indicadores")){const dates=copy.querySelector("p")?.textContent;if(dates)paragraph(dates,21);}
    else if(!cards.length&&rest)paragraph(rest);
    y+=15;
  }
  const enc=new TextEncoder();const chunks:Uint8Array[]=[];let offset=0;const offsets:number[]=[0];
  function add(v:string|Uint8Array){const b=typeof v==="string"?enc.encode(v):v;chunks.push(b);offset+=b.length;}
  function obj(id:number,body:string){offsets[id]=offset;add(id+" 0 obj\n"+body+"\nendobj\n");}
  add("%PDF-1.4\n");obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Count "+pages.length+" /Kids ["+pages.map((_,i)=>(3+i*3)+" 0 R").join(" ")+"] >>");
  for(let i=0;i<pages.length;i++){const id=3+i*3;const jpeg=Uint8Array.from(atob(pages[i].toDataURL("image/jpeg",0.92).split(",")[1]),c=>c.charCodeAt(0));obj(id,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 "+(id+1)+" 0 R >> >> /Contents "+(id+2)+" 0 R >>");offsets[id+1]=offset;add((id+1)+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+W+" /Height "+H+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.length+" >>\nstream\n");add(jpeg);add("\nendstream\nendobj\n");const cmd="q 595 0 0 842 0 0 cm /Im0 Do Q";obj(id+2,"<< /Length "+cmd.length+" >>\nstream\n"+cmd+"\nendstream");}
  const xref=offset;add("xref\n0 "+offsets.length+"\n0000000000 65535 f \n");for(let i=1;i<offsets.length;i++)add(String(offsets[i]).padStart(10,"0")+" 00000 n \n");add("trailer\n<< /Size "+offsets.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF");
  const bytes=new Uint8Array(offset);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
  return new File([bytes], "Informe-2026-"+name.replace(/[^\p{L}\p{N}]+/gu,"-")+".pdf",{type:"application/pdf"});
}
