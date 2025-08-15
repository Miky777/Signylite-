// pages/index.js
import { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default function Home() {
  const fileRef = useRef(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [signature, setSignature] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [fontSize, setFontSize] = useState(18);
  const [x, setX] = useState(50);   // position X en points
  const [y, setY] = useState(50);   // position Y en points
  const [hexColor, setHexColor] = useState("#1f6feb");
  const [status, setStatus] = useState("Choisis un PDF, écris ta signature puis clique sur Signer.");

  function hexToRgb01(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return rgb(0, 0, 0);
    return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
  }

  async function handleSign() {
    try {
      if (!pdfFile) return setStatus("⚠️ Sélectionne un fichier PDF.");
      if (!signature.trim()) return setStatus("⚠️ Écris ta signature (texte).");

      setStatus("Chargement du PDF…");

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const pageIdx = Math.min(Math.max(1, Number(pageNumber) || 1), pdfDoc.getPageCount()) - 1;
      const page = pdfDoc.getPage(pageIdx);

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const color = hexToRgb01(hexColor);

      // Dessine le texte (signature) à la position choisie
      page.drawText(signature, {
        x: Number(x),
        y: Number(y),
        size: Number(fontSize),
        font,
        color,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Téléchargement
      const a = document.createElement("a");
      a.href = url;
      a.download = "document-signe.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus("✅ PDF signé téléchargé !");
    } catch (e) {
      console.error(e);
      setStatus("❌ Erreur lors de la signature du PDF.");
    }
  }

  // Quelques positions rapides (utile mobile)
  async function quickPlace(pos) {
    if (!pdfFile) return setStatus("Choisis d'abord un PDF.");
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const page = pdfDoc.getPage(Math.min(Math.max(1, Number(pageNumber) || 1), pdfDoc.getPageCount()) - 1);
    const { width, height } = page.getSize();

    const margin = 36; // 0.5 inch
    if (pos === "bottom-left") { setX(margin); setY(margin); }
    if (pos === "bottom-right") { setX(width - 200); setY(margin); } // 200 ≈ largeur estimée
    if (pos === "top-left") { setX(margin); setY(height - 50); }
    if (pos === "top-right") { setX(width - 200); setY(height - 50); }
    setStatus("Position rapide appliquée.");
  }

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Signylite — Signature PDF</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Choisis un PDF, tape ta signature (texte), place-la, puis télécharge le PDF signé. Tout se fait dans ton navigateur.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "block" }}>
          <strong>Fichier PDF</strong>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            style={{ display: "block", marginTop: 6 }}
          />
        </label>

        <label style={{ display: "block" }}>
          <strong>Signature (texte)</strong>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Ex: Jean Dupont"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />
        </label>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <strong>Page</strong>
            <input
              type="number"
              min={1}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
            />
          </label>

          <label>
            <strong>Taille (px)</strong>
            <input
              type="range"
              min={10}
              max={48}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>{fontSize}px</div>
          </label>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            <strong>Position X</strong>
            <input
              type="range"
              min={0}
              max={600}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>{x}px</div>
          </label>

          <label>
            <strong>Position Y</strong>
            <input
              type="range"
              min={0}
              max={800}
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>{y}px</div>
          </label>
        </div>

        <label style={{ display: "block" }}>
          <strong>Couleur</strong>
          <input
            type="color"
            value={hexColor}
            onChange={(e) => setHexColor(e.target.value)}
            style={{ width: 60, height: 36, padding: 0, border: "none", background: "transparent" }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => quickPlace("bottom-left")} style={btnStyle}>Bas gauche</button>
          <button onClick={() => quickPlace("bottom-right")} style={btnStyle}>Bas droite</button>
          <button onClick={() => quickPlace("top-left")} style={btnStyle}>Haut gauche</button>
          <button onClick={() => quickPlace("top-right")} style={btnStyle}>Haut droite</button>
        </div>

        <button onClick={handleSign} style={{ ...btnStyle, background: "#0ea5e9" }}>
          Signer et télécharger
        </button>

        <div style={{ padding: 12, background: "#f6f8fa", borderRadius: 8, color: "#333" }}>
          {status}
        </div>

        <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 20 }}>
          © {new Date().getFullYear()} Signylite — Prototype
        </p>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#111827",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
