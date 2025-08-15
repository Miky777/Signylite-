import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default function Home() {
  const [file, setFile] = useState(null);
  const [signName, setSignName] = useState("");
  const [signSize, setSignSize] = useState(18);
  const [status, setStatus] = useState("");

  async function signPdf() {
    try {
      if (!file) return setStatus("Choisis un PDF.");
      if (!signName.trim()) return setStatus("Tape ta signature (nom).");
      setStatus("Traitement…");
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helv = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];

      // marges
      const margin = 50;
      const { width } = lastPage.getSize();

      // Texte signature
      const text = signName.trim();
      const size = Number(signSize) || 18;
      const textWidth = helv.widthOfTextAtSize(text, size);

      // position: bas gauche (date à droite)
      const y = margin + 15;
      const xSign = margin;
      const xDate = width - margin - helv.widthOfTextAtSize("Date: " + new Date().toLocaleDateString(), size);

      lastPage.drawText(text, { x: xSign, y, size, font: helv, color: rgb(0.1, 0.1, 0.1) });
      lastPage.drawText("Date: " + new Date().toLocaleDateString(), { x: xDate, y, size, font: helv, color: rgb(0.2, 0.2, 0.2) });

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed_${file.name.replace(/\s+/g, "_")}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("PDF signé téléchargé ✅");
    } catch (e) {
      console.error(e);
      setStatus("Erreur: " + (e?.message || "inconnue"));
    }
  }

  const ui = { wrap:{maxWidth:820,margin:"24px auto",padding:"0 16px",fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"},
    h1:{fontSize:28,margin:"16px 0 8px"}, card:{border:"1px solid #e5e7eb",borderRadius:12,padding:14,marginTop:10} };

  return (
    <main style={ui.wrap}>
      <h1 style={ui.h1}>SignyLite — Signature PDF rapide</h1>
      <p>Importe un PDF, tape ta signature, récupère un PDF signé. 100% local (rien n’est envoyé).</p>

      <div style={ui.card}>
        <label>Fichier PDF :</label>
        <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} style={{display:"block",margin:"8px 0"}} />
        <label>Signature (nom / paraphe) :</label>
        <input value={signName} onChange={e=>setSignName(e.target.value)} placeholder="Ex: A. Dupont"
               style={{display:"block",width:"100%",padding:10,border:"1px solid #e5e7eb",borderRadius:8,margin:"6px 0 8px"}}/>
        <label>Taille :</label>
        <input type="number" value={signSize} onChange={e=>setSignSize(e.target.value)} min={12} max={48}
               style={{width:100,padding:8,border:"1px solid #e5e7eb",borderRadius:8,marginLeft:8}}/>
        <button onClick={signPdf} style={{display:"block",marginTop:12,padding:"12px 16px",border:"none",borderRadius:10,background:"#1E6ACB",color:"#fff",fontWeight:700}}>
          Signer & Télécharger
        </button>
        <div style={{marginTop:8,opacity:0.8}}>{status}</div>
      </div>

      <p style={{marginTop:16,fontSize:12,opacity:0.7}}>
        *MVP démo — pas de valeur légale sans certificat. Pro version: certificat de signature + horodatage + traçabilité.
      </p>
    </main>
  );
}
