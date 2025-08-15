import { useRef, useState, useEffect } from "react";

export default function Home(){
  const [img, setImg] = useState(null);
  const [wmText, setWmText] = useState("DropShield • Demo");
  const [opacity, setOpacity] = useState(0.12);
  const [size, setSize] = useState(48);
  const canvasRef = useRef(null);
  const imgObjRef = useRef(null);

  useEffect(() => { if(imgObjRef.current) draw(); }, [wmText, opacity, size]);

  function onPick(e){
    const file = e.target.files?.[0];
    if(!file) return;
    const r = new FileReader();
    r.onload = () => {
      const i = new Image();
      i.onload = () => { imgObjRef.current = i; setImg(r.result); draw(); };
      i.src = r.result;
    };
    r.readAsDataURL(file);
  }

  function draw(){
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const im = imgObjRef.current;
    if(!im) return;
    c.width = im.width; c.height = im.height;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.drawImage(im,0,0);

    // Watermark pattern diagonal
    const step = Math.max(c.width, c.height) / 6;
    ctx.save();
    ctx.translate(c.width/2, c.height/2);
    ctx.rotate(-Math.atan(c.height/c.width)); // légère diagonale
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "#000";
    ctx.font = `bold ${size}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for(let y=-c.height; y<=c.height; y+=step){
      for(let x=-c.width; x<=c.width; x+=step){
        ctx.fillText(wmText, x, y);
      }
    }
    ctx.restore();
  }

  function download(){
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = "watermarked.png"; a.click();
  }

  const ui = {wrap:{maxWidth:980,margin:"24px auto",padding:"0 16px",fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"},
    card:{border:"1px solid #e5e7eb",borderRadius:12,padding:14,marginTop:10}};

  return (
    <main style={ui.wrap}>
      <h1 style={{fontSize:28,margin:"16px 0 8px"}}>DropShield — Filigrane & partage</h1>
      <p>Ajoute un filigrane à tes images en 1 clic. Tout se fait dans ton navigateur.</p>

      <div style={ui.card}>
        <label>Image (JPG/PNG) :</label>
        <input type="file" accept="image/*" onChange={onPick} style={{display:"block",margin:"8px 0"}} />
        <label>Texte du filigrane :</label>
        <input value={wmText} onChange={e=>setWmText(e.target.value)}
               style={{display:"block",width:"100%",padding:10,border:"1px solid #e5e7eb",borderRadius:8,margin:"6px 0 8px"}}/>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <label>Opacité: {opacity}</label>
          <input type="range" min="0.05" max="0.4" step="0.01" value={opacity} onChange={e=>setOpacity(parseFloat(e.target.value))}/>
          <label>Taille: {size}px</label>
          <input type="range" min="24" max="96" step="2" value={size} onChange={e=>setSize(parseInt(e.target.value))}/>
        </div>
        <button onClick={download} disabled={!img}
                style={{display:"block",marginTop:12,padding:"12px 16px",border:"none",borderRadius:10,background:"#1E6ACB",color:"#fff",fontWeight:700,opacity:img?1:0.6}}>
          Télécharger l'image filigranée
        </button>
      </div>

      <div style={{marginTop:16}}>
        <canvas ref={canvasRef} style={{width:"100%",maxHeight:560,border:"1px solid #f1f5f9",borderRadius:8}} />
      </div>

      <p style={{marginTop:16,fontSize:12,opacity:0.7}}>
        *Roadmap Pro : stockage cloud (Supabase/Cloudinary), liens temporaires, filigrane invisible, PDF multi‑pages.
      </p>
    </main>
  );
}
