// Capture the actual report DOM, retaining its computed styles and selected sections.
export async function buildIndividualPdf(name:string, root:HTMLElement):Promise<File> {
  if(!root) throw new Error("Missing report");
  await document.fonts.ready;
  const W=1240,H=1754,M=59,CW=W-2*M;
  const width=718, scale=CW/width;
  const pages:HTMLCanvasElement[]=[];
  let canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D,y=0;
  function page(){canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);pages.push(canvas);y=M;}
  const host=document.createElement("div");
  host.style.cssText="position:fixed;left:-10000px;top:0;width:"+width+"px;background:white;pointer-events:none;";
  document.body.append(host);
  function cloneStyled(source:Element):Element {
    const clone=source.cloneNode(false) as HTMLElement;
    const style=getComputedStyle(source);
    for(const key of Array.from(style)) {
      try { clone.style.setProperty(key,style.getPropertyValue(key)); } catch { /* unsupported property */ }
    }
    if(source.classList.contains("no-print"))return clone;
    for(const child of Array.from(source.childNodes)){
      if(child instanceof Element){if(!child.classList.contains("no-print"))clone.append(cloneStyled(child));}
      else clone.append(child.cloneNode(true));
    }
    const set=(k:string,v:string)=>clone.style.setProperty(k,v,"important");
    // Reflow fixed desktop dimensions at printable width.
    if(source instanceof HTMLElement){
      for(const k of ["width","height","min-width","max-width","min-height","max-height","margin-top","margin-bottom","margin-left","margin-right"])clone.style.removeProperty(k);
      set("box-sizing","border-box");
      if(source.classList.contains("hidden"))set("display","block");
      if(source.classList.contains("print-three")){set("display","grid");set("grid-template-columns","repeat(3,minmax(0,1fr))");}
      if(source.classList.contains("print-chart-scroll")){set("overflow","visible");set("width","100%");}
      if(source.classList.contains("overflow-hidden")&&!source.classList.contains("rounded-full"))set("overflow","visible");
      if(source.style.width)set("width",source.style.width);
      if(source.classList.contains("h-3"))set("height","12px");
    }
    if(source.tagName.toLowerCase()==="svg"){
      set("width","100%");set("min-width","0");set("height","auto");set("max-height","435px");
    }
    return clone;
  }
  async function capture(source:HTMLElement){
    const block=cloneStyled(source) as HTMLElement;
    block.style.setProperty("width","100%","important");
    block.style.setProperty("padding","10px","important");
    block.style.setProperty("box-shadow","none","important");
    block.style.setProperty("margin","0","important");
    block.style.setProperty("overflow","visible","important");
    host.replaceChildren(block);
    const height=Math.ceil(block.getBoundingClientRect().height)+2;
    if(height<3)return;
    const wrapper=document.createElementNS("http://www.w3.org/1999/xhtml","div");
    wrapper.setAttribute("style","width:"+width+"px;background:white;");
    wrapper.append(block.cloneNode(true));
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><foreignObject width="100%" height="100%">'+new XMLSerializer().serializeToString(wrapper)+'</foreignObject></svg>';
    const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
    try {
      const img=new Image();img.src=url;await img.decode();
      const h=Math.ceil(height*scale);
      if(h<=H-2*M && y+h>H-M)page();
      let drawn=0;
      while(drawn<h){
        const available=H-M-y;
        if(available<30){page();continue;}
        const take=Math.min(available,h-drawn);
        ctx.drawImage(img,0,drawn/scale,width,take/scale,M,y,CW,take);
        drawn+=take;y+=take;
        if(drawn<h)page();
      }
      y+=12;
    } finally {URL.revokeObjectURL(url);}
  }
  page();
  try {
    for(const section of Array.from(root.querySelectorAll<HTMLElement>(":scope > header, :scope > section, :scope > div.hidden > section"))){
      if(!section.classList.contains("no-print"))await capture(section);
    }
  } finally {host.remove();}
  const enc=new TextEncoder();const chunks:Uint8Array[]=[];let offset=0;const offsets:number[]=[0];
  function add(v:string|Uint8Array){const b=typeof v==="string"?enc.encode(v):v;chunks.push(b);offset+=b.length;}
  function obj(id:number,body:string){offsets[id]=offset;add(id+" 0 obj\n"+body+"\nendobj\n");}
  add("%PDF-1.4\n");obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Count "+pages.length+" /Kids ["+pages.map((_,i)=>(3+i*3)+" 0 R").join(" ")+"] >>");
  for(let i=0;i<pages.length;i++){const id=3+i*3;const jpeg=Uint8Array.from(atob(pages[i].toDataURL("image/jpeg",0.92).split(",")[1]),c=>c.charCodeAt(0));obj(id,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 "+(id+1)+" 0 R >> >> /Contents "+(id+2)+" 0 R >>");offsets[id+1]=offset;add((id+1)+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+W+" /Height "+H+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.length+" >>\nstream\n");add(jpeg);add("\nendstream\nendobj\n");const cmd="q 595 0 0 842 0 0 cm /Im0 Do Q";obj(id+2,"<< /Length "+cmd.length+" >>\nstream\n"+cmd+"\nendstream");}
  const xref=offset;add("xref\n0 "+offsets.length+"\n0000000000 65535 f \n");for(let i=1;i<offsets.length;i++)add(String(offsets[i]).padStart(10,"0")+" 00000 n \n");add("trailer\n<< /Size "+offsets.length+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF");
  const bytes=new Uint8Array(offset);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
  return new File([bytes], "Informe-2026-"+name.replace(/[^\p{L}\p{N}]+/gu,"-")+".pdf",{type:"application/pdf"});
}
