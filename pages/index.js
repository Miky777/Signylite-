import { useState, useMemo } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function Home() {
  const [file, setFile] = useState(null);
  const [sig, setSig] = useState("John");
  const [pageNum, setPageNum] = useState(1);
  const [size, setSize] = useState(18);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [hex, setHex] = useState("#1d4ed8"); // bleu
  const [fontName, setFontName] = useState("Helvetica");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const canSign = useMemo(() => !!file && sig.trim().length > 0, [file, sig]);

  function hexToRgb(h) {
    const clean = h.replace("#", "");
    const num = parseInt(clean.length === 3
      ? clean.split("").map(c => c + c).join("")
      : clean, 16);
    return {
      r: ((num >> 16) & 255) / 255,
      g: ((num >> 8) & 255) / 255,
      b: (num & 255) / 255,
    };
  }

  async function handleSign() {
    try {
      setBusy(true);
      setMsg("Génération du PDF…");

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const targetIndex = Math.max(0, Math.min(pdfDoc.getPageCount() - 1, pageNum - 1));
      const page = pdfDoc.getPage(targetIndex);

      // Polices standard
      const fontMap = {
        Helvetica: StandardFonts.Helvetica,
        Times: StandardFonts.TimesRoman,
        Courier: StandardFonts.Courier,
      };
      const selected = fontMap[fontName] || StandardFonts.Helvetica;
      const font = await pdfDoc.embedFont(selected);

      // Couleur
      const { r, g, b } = hexToRgb(hex);

      // IMPORTANT : PDF = origine en bas-gauche
      // Ici posX/posY sont depuis le coin inférieur gauche (cohérent avec pdf-lib)
      page.drawText(sig, {
        x: Number(posX),
        y: Number(posY),
        size: Number(size),
        font,
        color: rgb(r, g, b),
      });

      const out = await pdfDoc.save();
      const blob = new Blob([out], { type: "application/pdf" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "document-signe.pdf";
      a.click();
      URL.revokeObjectURL(a.href);

      setMsg("✅ PDF signé téléchargé.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Erreur : impossible de signer ce PDF.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  function presetCorner(where) {
    // Petits presets rapides
    if (where === "bl") { setPosX(50); setPosY(50); }
    if (where === "br") { setPosX(400); setPosY(50); }
    if (where === "tl") { setPosX(50); setPosY(700); }
    if (where === "tr") { setPosX(400); setPosY(700); }
  }

  return (
    <main className="app">
      <section className="card">
        <header className="head">
          <div className="logo-dot" aria-hidden />
          <h1>Signylite — Signature PDF</h1>
          <p className="sub">
            Choisis un PDF, tape ta signature (texte), place-la, puis télécharge le PDF signé.
            Tout se fait dans ton navigateur.
          </p>
        </header>

        <div className="grid">
          <div className="group">
            <label className="label">Fichier PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file"
            />
            {!file && <p className="hint">Aucun fichier sélectionné.</p>}
          </div>

          <div className="group">
            <label className="label">Signature (texte)</label>
            <input
              type="text"
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              placeholder="Ex : Jean Dupont"
              className="input"
            />
          </div>

          <div className="row">
            <div className="group small">
              <label className="label">Page</label>
              <input
                type="number"
                min="1"
                value={pageNum}
                onChange={(e) => setPageNum(Number(e.target.value))}
                className="input"
              />
            </div>

            <div className="group grow">
              <label className="label">Taille (px) — {size}px</label>
              <input
                type="range"
                min="10"
                max="64"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="range"
              />
            </div>
          </div>

          <div className="row">
            <div className="group grow">
              <label className="label">Position X — {posX}px</label>
              <input
                type="range"
                min="0"
                max="500"
                value={posX}
                onChange={(e) => setPosX(Number(e.target.value))}
                className="range"
              />
            </div>

            <div className="group grow">
              <label className="label">Position Y — {posY}px</label>
              <input
                type="range"
                min="0"
                max="800"
                value={posY}
                onChange={(e) => setPosY(Number(e.target.value))}
                className="range"
              />
            </div>
          </div>

          <div className="row">
            <div className="group">
              <label className="label">Couleur</label>
              <div className="row">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  aria-label="Couleur"
                  className="color"
                />
                <div className="chips">
                  {["#1d4ed8", "#111827", "#dc2626", "#059669"].map((c) => (
                    <button
                      key={c}
                      className="chip"
                      style={{ background: c }}
                      onClick={() => setHex(c)}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="group">
              <label className="label">Police</label>
              <div className="segmented">
                {["Helvetica", "Times", "Courier"].map((f) => (
                  <button
                    key={f}
                    className={`seg ${fontName === f ? "active" : ""}`}
                    onClick={() => setFontName(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="group">
            <label className="label">Presets rapides</label>
            <div className="row wrap">
              <button className="btn ghost" onClick={() => presetCorner("bl")}>Bas gauche</button>
              <button className="btn ghost" onClick={() => presetCorner("br")}>Bas droite</button>
              <button className="btn ghost" onClick={() => presetCorner("tl")}>Haut gauche</button>
              <button className="btn ghost" onClick={() => presetCorner("tr")}>Haut droite</button>
            </div>
            <p className="hint">
              Astuce : dans un PDF, l’origine (0,0) est en <b>bas-gauche</b>. Augmente Y pour monter.
            </p>
          </div>
        </div>

        <div className="actions">
          <button
            className="btn primary"
            onClick={handleSign}
            disabled={!canSign || busy}
          >
            {busy ? "Signature…" : "Signer et télécharger"}
          </button>
          {msg && <div className="toast">{msg}</div>}
        </div>
      </section>

      {/* Styles minimalistes (aucune dépendance) */}
      <style jsx global>{`
        :root {
          --bg: #0b0d12;
          --card: #0f1522;
          --muted: #8b93a7;
          --text: #e7ecf5;
          --border: #1f2a44;
          --accent: #2563eb;
          --accent-2: #1d4ed8;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: var(--bg); color: var(--text); }
        .app { min-height: 100vh; display: grid; place-items: start center; padding: 40px 16px; }
        .card { width: 100%; max-width: 880px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,.35); }
        .head { display: grid; gap: 8px; margin-bottom: 18px; }
        .logo-dot { width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, #6ee7f9, #7c3aed); }
        h1 { font-size: 28px; letter-spacing: .2px; margin: 0; }
        .sub { margin: 0; color: var(--muted); }

        .grid { display: grid; gap: 16px; }
        .row { display: flex; gap: 12px; align-items: center; }
        .row.wrap { flex-wrap: wrap; }
        .group { display: grid; gap: 8px; }
        .group.small { width: 120px; }
        .group.grow { flex: 1; }
        .label { color: #aab2c5; font-size: 13px; }
        .hint { color: var(--muted); font-size: 12px; margin-top: 6px; }

        .file, .input, .range {
          width: 100%; padding: 12px 12px; background: #0b1120; border: 1px solid var(--border);
          border-radius: 10px; color: var(--text); outline: none;
        }
        .input::placeholder { color: #5f6b85; }

        .color { width: 44px; height: 44px; border: 1px solid var(--border); border-radius: 10px; background: #0b1120; padding: 0; }
        .chips { display: flex; gap: 8px; margin-left: 12px; }
        .chip { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); cursor: pointer; }

        .segmented { display: inline-flex; background: #0b1120; border: 1px solid var(--border); border-radius: 10px; padding: 4px; gap: 4px; }
        .seg { padding: 8px 12px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text); cursor: pointer; }
        .seg.active { background: #111a2e; border-color: var(--border); }

        .btn { padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: #0b1120; color: var(--text); cursor: pointer; }
        .btn:hover { background: #0e1528; }
        .btn.ghost { background: #0b1120; }
        .btn.primary { background: var(--accent); border-color: var(--accent); font-weight: 600; }
        .btn.primary:disabled { opacity: .6; cursor: not-allowed; }

        .actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
        .toast { font-size: 14px; color: #cde3ff; }

        @media (max-width: 640px) {
          .card { padding: 16px; }
          h1 { font-size: 22px; }
        }
      `}</style>
    </main>
  );
}
