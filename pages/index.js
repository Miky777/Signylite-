import { useEffect, useRef, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function Home() {
  // PDF
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [pageCount, setPageCount] = useState(1);

  // Options de placement
  const [pageNumber, setPageNumber] = useState(1);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [size, setSize] = useState(18);
  const [color, setColor] = useState("#0a66ff");

  // Mode de signature
  const [mode, setMode] = useState("typed"); // 'typed' | 'draw' | 'image'
  const [typed, setTyped] = useState("Jean Dupont");
  const [signatureDataURL, setSignatureDataURL] = useState(null); // image (canvas) ou upload
  const drawCanvasRef = useRef(null);
  const drawing = useRef(false);

  // Audit
  const [originalHash, setOriginalHash] = useState(null);

  // ==== Helpers ====
  const hexToRgb = (hex) => {
    const v = hex.replace("#", "");
    const bigint = parseInt(v, 16);
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
    };
  };

  const fileToArrayBuffer = (file) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsArrayBuffer(file);
    });

  const sha256 = async (arrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // Quand on charge un PDF, on calcule son empreinte et on récupère le nb de pages
  const onPdfChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPdfFile(f);
    setPdfName(f.name);
    const ab = await fileToArrayBuffer(f);
    setOriginalHash(await sha256(ab));

    // On lit vite fait le nb de pages via pdf-lib (sans modifier)
    const pdfDoc = await PDFDocument.load(ab);
    const count = pdfDoc.getPageCount();
    setPageCount(count);
    setPageNumber(1);
  };

  // ==== Dessin manuscrit (canvas) ====
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    // Retina friendly
    const dpr = window.devicePixelRatio || 1;
    const w = 320, h = 140;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#111";

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches && e.touches[0]) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e) => {
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const end = () => {
      drawing.current = false;
      // Sauvegarde DataURL
      setSignatureDataURL(canvas.toDataURL("image/png"));
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);

    canvas.addEventListener("touchstart", start, { passive: true });
    canvas.addEventListener("touchmove", move, { passive: true });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);

      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, [mode]);

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataURL(null);
  };

  const onImageUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setSignatureDataURL(reader.result);
    reader.readAsDataURL(f);
  };

  // ==== POS rapides ====
  const quickPos = (where) => {
    switch (where) {
      case "tl":
        setPosX(50);
        setPosY(750);
        break;
      case "tr":
        setPosX(450);
        setPosY(750);
        break;
      case "bl":
        setPosX(50);
        setPosY(50);
        break;
      case "br":
        setPosX(450);
        setPosY(50);
        break;
      default:
        break;
    }
  };

  // ==== SIGNER & TÉLÉCHARGER ====
  const signAndDownload = async () => {
    if (!pdfFile) {
      alert("Choisis d'abord un PDF.");
      return;
    }
    const ab = await fileToArrayBuffer(pdfFile);
    const pdfDoc = await PDFDocument.load(ab);

    // Clamp page
    const targetIndex = Math.min(
      Math.max(pageNumber - 1, 0),
      pdfDoc.getPageCount() - 1
    );
    const page = pdfDoc.getPage(targetIndex);

    const { r, g, b } = hexToRgb(color);

    if (mode === "typed") {
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      page.drawText(typed || "Signature", {
        x: posX,
        y: posY,
        size,
        color: rgb(r, g, b),
        font,
      });
    } else if (mode === "draw" || mode === "image") {
      if (!signatureDataURL) {
        alert("Aucune signature image. Dessine ou importe une image.");
        return;
      }
      const pngImage = await pdfDoc.embedPng(signatureDataURL);
      const scale = size / 36; // échelle approx basée sur 'size'
      const pngDims = pngImage.scale(scale <= 0 ? 0.5 : scale);
      page.drawImage(pngImage, {
        x: posX,
        y: posY,
        width: pngDims.width,
        height: pngDims.height,
      });
    }

    // === Feuillet d'audit (ajouté en dernière page) ===
    const auditPage = pdfDoc.addPage([595, 842]); // A4 portrait
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const now = new Date();
    const lines = [
      "Feuillet d'audit — Signylite",
      "----------------------------------------",
      `Fichier d'origine : ${pdfName || "PDF"}`,
      `Empreinte (SHA-256) : ${originalHash || "N/A"}`,
      `Signé le : ${now.toLocaleString()}`,
      `Navigateur : ${navigator.userAgent}`,
      "",
      "Remarque : traitement 100% local (aucun envoi serveur).",
    ];
    let yy = 780;
    lines.forEach((t) => {
      auditPage.drawText(t, { x: 50, y: yy, size: 12, font, color: rgb(0, 0, 0) });
      yy -= 20;
    });

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = pdfName?.replace(/\.pdf$/i, "") + "_signe.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==== UI ====
  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Signylite — Signature PDF</h1>
        <p style={{ margin: "6px 0 0 0", opacity: 0.8 }}>
          Choisis un PDF, tape ou dessine ta signature, place‑la, puis
          télécharge le PDF signé. Tout se fait dans ton navigateur.
        </p>
      </header>

      <section style={styles.card}>
        <label style={styles.label}>Fichier PDF</label>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="file" accept="application/pdf" onChange={onPdfChange} />
          {pdfName ? <span style={styles.muted}>{pdfName} • {pageCount} page(s)</span> : null}
        </div>

        <div style={styles.sep} />

        <label style={styles.label}>Mode de signature</label>
        <div style={styles.row}>
          <button
            aria-pressed={mode === "typed"}
            onClick={() => setMode("typed")}
            style={{ ...styles.tab, ...(mode === "typed" ? styles.tabActive : {}) }}
          >
            Texte
          </button>
          <button
            aria-pressed={mode === "draw"}
            onClick={() => setMode("draw")}
            style={{ ...styles.tab, ...(mode === "draw" ? styles.tabActive : {}) }}
          >
            Manuscrite
          </button>
          <button
            aria-pressed={mode === "image"}
            onClick={() => setMode("image")}
            style={{ ...styles.tab, ...(mode === "image" ? styles.tabActive : {}) }}
          >
            Image
          </button>
        </div>

        {mode === "typed" && (
          <div style={{ marginTop: 12 }}>
            <input
              style={styles.input}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Jean Dupont"
            />
          </div>
        )}

        {mode === "draw" && (
          <div style={{ marginTop: 12 }}>
            <canvas ref={drawCanvasRef} style={styles.canvas} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={styles.btnGhost} onClick={clearDrawing}>Effacer</button>
            </div>
          </div>
        )}

        {mode === "image" && (
          <div style={{ marginTop: 12 }}>
            <input type="file" accept="image/*" onChange={onImageUpload} />
            {signatureDataURL ? (
              <div style={{ marginTop: 8 }}>
                <img src={signatureDataURL} alt="aperçu signature" style={{ maxWidth: 240, borderRadius: 6 }} />
              </div>
            ) : null}
          </div>
        )}

        <div style={styles.sep} />

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Page</label>
            <input
              type="number"
              min={1}
              max={pageCount}
              value={pageNumber}
              onChange={(e) => setPageNumber(parseInt(e.target.value || "1", 10))}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Taille</label>
            <input
              type="range"
              min={10}
              max={72}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
            />
            <div style={styles.muted}>{size}px</div>
          </div>
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Position X</label>
            <input
              type="range"
              min={0}
              max={500}
              value={posX}
              onChange={(e) => setPosX(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
            />
            <div style={styles.muted}>{posX}px</div>
          </div>
          <div>
            <label style={styles.label}>Position Y</label>
            <input
              type="range"
              min={0}
              max={800}
              value={posY}
              onChange={(e) => setPosY(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
            />
            <div style={styles.muted}>{posY}px</div>
          </div>
        </div>

        <label style={styles.label}>Couleur</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...styles.colorDot, background: color }} />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={styles.btnGhost} onClick={() => quickPos("bl")}>Bas gauche</button>
          <button style={styles.btnGhost} onClick={() => quickPos("br")}>Bas droite</button>
          <button style={styles.btnGhost} onClick={() => quickPos("tl")}>Haut gauche</button>
          <button style={styles.btnGhost} onClick={() => quickPos("tr")}>Haut droite</button>
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={styles.btnPrimary} onClick={signAndDownload}>
            Signer et télécharger
          </button>
          <div style={{ ...styles.muted, marginTop: 8 }}>
            Traitement local • Feuillet d’audit ajouté automatiquement
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} Signylite — Prototype avancé (client‑side)
      </footer>
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 920,
    margin: "40px auto",
    padding: "0 16px",
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,"Helvetica Neue",Arial,sans-serif',
  },
  header: { marginBottom: 16 },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  label: { display: "block", fontWeight: 600, marginBottom: 6 },
  input: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
  },
  row: { display: "flex", gap: 8 },
  tab: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 12px",
    background: "#fff",
    cursor: "pointer",
  },
  tabActive: {
    borderColor: "#0a66ff",
    color: "#0a66ff",
    fontWeight: 700,
  },
  sep: { height: 1, background: "#f1f5f9", margin: "16px 0" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  colorDot: { width: 24, height: 24, borderRadius: 999, border: "1px solid #e5e7eb" },
  canvas: {
    display: "block",
    background: "#fbfbfb",
    border: "1px dashed #e5e7eb",
    borderRadius: 8,
  },
  btnPrimary: {
    background: "#0a66ff",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#0f172a",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },
  muted: { fontSize: 12, color: "#64748b" },
  footer: { textAlign: "center", opacity: 0.6, marginTop: 16 },
};
