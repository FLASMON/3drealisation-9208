import { useRef, useState } from "react";
import {
  Upload,
  X,
  ScanLine,
  ArrowRight,
  Info,
  LoaderCircle,
} from "lucide-react";
import { detectWalls, readImage, type PlanImage } from "../lib/detect";
import type { Project, Wall } from "../lib/project";
export default function ImportDialog({
  close,
  onImport,
}: {
  close: () => void;
  onImport: (p: Project) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [image, setImage] = useState<PlanImage | null>(null),
    [width, setWidth] = useState(12),
    [threshold, setThreshold] = useState(105),
    [min, setMin] = useState(0.8),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [walls, setWalls] = useState<Wall[] | null>(null),
    [fileName, setFileName] = useState("");
  const file = async (f: File) => {
    setBusy(true);
    setError("");
    setWalls(null);
    try {
      setImage(await readImage(f));
      setFileName(f.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const analyze = () => {
    if (!image) return;
    if (!Number.isFinite(width) || width < 1 || width > 200) {
      setError("Largeur réelle : de 1 à 200 m.");
      return;
    }
    setBusy(true);
    setError("");
    requestAnimationFrame(() => {
      try {
        const result = detectWalls(image, width, threshold, min);
        setWalls(result);
        if (!result.length)
          setError(
            "Aucun mur détecté. Ajustez le seuil ou utilisez ce plan comme calque pour tracer les murs.",
          );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    });
  };
  const finish = (detect: boolean) => {
    if (!image) return;
    onImport({
      version: 1,
      name: fileName.replace(/\.[^.]+$/, "") || "Plan importé",
      walls: detect ? walls || [] : [],
      floor: "wood",
      light: "day",
      furniture: false,
      reference: {
        url: image.url,
        width,
        depth: (width * image.height) / image.width,
      },
    });
  };
  return (
    <div className="modal-backdrop">
      <dialog open
        className="import-modal"
        aria-modal="true"
        aria-label="Importer un plan"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">DU PLAN À L’ESPACE</span>
            <h2>Votre plan. Une nouvelle dimension.</h2>
          </div>
          <button className="icon-button" onClick={close} title="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="import-body">
          <div
            className={`drop-zone ${image ? "with-image" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void file(f);
            }}
          >
            {image ? (
              <>
                <img src={image.url} alt="Plan à analyser" />
                {walls && (
                  <svg
                    viewBox={`0 0 ${width} ${(width * image.height) / image.width}`}
                    preserveAspectRatio="none"
                  >
                    {walls.map((w) => (
                      <line
                        key={w.id}
                        x1={w.a.x}
                        y1={w.a.z}
                        x2={w.b.x}
                        y2={w.b.z}
                        stroke="#239b69"
                        strokeWidth={w.thickness}
                        opacity=".85"
                      />
                    ))}
                  </svg>
                )}
                <button
                  className="change-image"
                  onClick={() => input.current?.click()}
                >
                  Changer l’image
                </button>
              </>
            ) : (
              <>
                <div className="upload-circle">
                  <Upload size={27} />
                </div>
                <h3>Déposez votre plan ici</h3>
                <button className="secondary" onClick={()=>input.current?.click()}>Sélectionner une image</button>
                <small>PNG, JPG, WebP · jusqu’à 12 Mo</small>
              </>
            )}
          </div>
          <input
            aria-label="Image du plan"
            ref={input}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void file(f);
              e.target.value = "";
            }}
          />
          <div className="import-settings">
            <div className="step-tag">
              01 <span>Calibrer & détecter</span>
            </div>
            <label className="field">
              <span>Largeur totale de l’image</span>
              <div>
                <input
                  aria-label="Largeur totale de l’image"
                  type="number"
                  min={1}
                  max={200}
                  value={width}
                  onChange={(e) => {
                    setWidth(Number(e.target.value));
                    setWalls(null);
                  }}
                />
                <small>m</small>
              </div>
            </label>
            <p className="muted small">
              Indiquez la largeur physique de toute l’image, marges comprises.
              Les cotes ne sont pas lues automatiquement.
            </p>
            <label className="range-field">
              <span>
                Seuil des traits sombres <b>{threshold}</b>
              </span>
              <input
                aria-label="Seuil des traits sombres"
                type="range"
                min={30}
                max={220}
                value={threshold}
                onChange={(e) => {
                  setThreshold(Number(e.target.value));
                  setWalls(null);
                }}
              />
            </label>
            <label className="range-field">
              <span>
                Longueur minimale <b>{min.toFixed(1)} m</b>
              </span>
              <input
                aria-label="Longueur minimale"
                type="range"
                min={0.3}
                max={3}
                step={0.1}
                value={min}
                onChange={(e) => {
                  setMin(Number(e.target.value));
                  setWalls(null);
                }}
              />
            </label>
            <div className="import-notice">
              <Info size={16} />
              <p>
                Détection locale des murs horizontaux et verticaux. Textes,
                mobilier ou doubles traits peuvent produire des erreurs. Portes
                et fenêtres à ajouter manuellement.
              </p>
            </div>
            {walls && (
              <div className="detection-result">
                <strong>{walls.length} murs détectés</strong>
                <span>Contrôlez le tracé vert avant de créer le modèle.</span>
              </div>
            )}
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-footer">
          <span>Votre image reste dans ce navigateur.</span>
          <div>
            <button
              className="secondary"
              disabled={!image || busy || width < 1 || width > 200}
              onClick={() => finish(false)}
            >
              Calque seul
            </button>
            {walls && walls.length > 0 ? (
              <button className="primary" onClick={() => finish(true)}>
                Créer le modèle <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="primary"
                disabled={!image || busy}
                onClick={analyze}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <ScanLine size={16} />
                )}{" "}
                Détecter les murs
              </button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
