import { useEffect, useState } from "react";
import {
  ChevronDown,
  DoorOpen,
  Layers,
  Paintbrush,
  Sun,
  Trash2,
  BrickWall,
  RectangleHorizontal,
} from "lucide-react";
import { length, type Project, type Wall, type Opening } from "../lib/project";
function NumberField({
  label,
  value,
  onChange,
  unit = "m",
  min = 0,
  max = 500,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(3))));
  useEffect(() => setDraft(String(Number(value.toFixed(3)))), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          value={draft}
          step={step}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = Number(draft);
            if (v === value) return;
            if (draft !== "" && Number.isFinite(v) && v >= min && v <= max) {
              onChange(v);
              setDraft(String(value));
            } else setDraft(String(value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <small>{unit}</small>
      </div>
    </label>
  );
}
type Props = {
  project: Project;
  wall: Wall | undefined;
  update: (w: Wall) => void;
  updateProject: (p: Project) => void;
  remove: () => void;
  add: (kind: "door" | "window") => void;
};
export default function Inspector({
  project: p,
  wall: w,
  update,
  updateProject,
  remove,
  add,
}: Props) {
  const patch = (v: Partial<Wall>) => w && update({ ...w, ...v });
  const opening = (o: Opening, v: Partial<Opening>) =>
    w &&
    patch({
      openings: w.openings.map((x) => (x.id === o.id ? { ...x, ...v } : x)),
    });
  return (
    <aside className="inspector">
      <div className="panel-heading">
        Propriétés{" "}
        <span>
          <Layers size={15} />
        </span>
      </div>
      <div className="inspector-scroll">
        <section>
          <div className="section-title">
            <BrickWall size={15} /> {w ? "Mur sélectionné" : "Votre espace"}
            <ChevronDown size={13} />
          </div>
          {w ? (
            <>
              <div className="object-title">
                <span className="object-icon">
                  <BrickWall size={22} />
                </span>
                <div>
                  <strong>{w.name}</strong>
                  <small>Élément paramétrique</small>
                </div>
                <button
                  className="icon-button danger"
                  onClick={remove}
                  title="Supprimer le mur"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label className="field">
                <span>Nom</span>
                <input
                  aria-label="Nom du mur"
                  key={w.id + w.name}
                  defaultValue={w.name}
                  maxLength={60}
                  onBlur={(e) => patch({ name: e.target.value || w.name })}
                />
              </label>
              <div className="field-grid">
                <NumberField
                  label="Longueur"
                  value={length(w)}
                  min={0.2}
                  max={200}
                  onChange={(v) => {
                    const l = length(w);
                    patch({
                      b: {
                        x: w.a.x + ((w.b.x - w.a.x) * v) / l,
                        z: w.a.z + ((w.b.z - w.a.z) * v) / l,
                      },
                    });
                  }}
                />
                <NumberField
                  label="Hauteur"
                  value={w.height}
                  min={0.3}
                  max={20}
                  onChange={(height) => patch({ height })}
                />
                <NumberField
                  label="Épaisseur"
                  value={w.thickness}
                  min={0.05}
                  max={2}
                  step={0.01}
                  onChange={(thickness) => patch({ thickness })}
                />
                <label className="field">
                  <span>Surface nette</span>
                  <div className="readonly">
                    {(
                      length(w) * w.height -
                      w.openings.reduce((n, o) => n + o.width * o.height, 0)
                    ).toFixed(1)}
                    <small>m²</small>
                  </div>
                </label>
              </div>
              <details>
                <summary>Position & extrémités</summary>
                <div className="field-grid">
                  {(["a", "b"] as const).flatMap((k) =>
                    (["x", "z"] as const).map((axis) => (
                      <NumberField
                        key={k + axis}
                        label={`${k === "a" ? "Début" : "Fin"} ${axis.toUpperCase()}`}
                        value={w[k][axis]}
                        min={-500}
                        onChange={(v) => patch({ [k]: { ...w[k], [axis]: v } })}
                      />
                    )),
                  )}
                </div>
              </details>
            </>
          ) : (
            <>
              <h3>Donnez forme à vos idées.</h3>
              <p className="muted">
                Sélectionnez un mur dans la scène ou dans la liste pour modifier
                ses dimensions et ses ouvertures.
              </p>
              <div className="project-measures">
                <strong>
                  {p.walls.length}
                  <small>murs</small>
                </strong>
                <strong>
                  {p.walls.reduce((n, w) => n + w.openings.length, 0)}
                  <small>ouvertures</small>
                </strong>
              </div>
            </>
          )}
        </section>
        {w && (
          <section>
            <div className="section-title">
              <DoorOpen size={15} /> Ouvertures{" "}
              <span className="count">{w.openings.length}</span>
            </div>
            <div className="button-pair">
              <button onClick={() => add("door")}>
                <DoorOpen size={14} /> Porte
              </button>
              <button onClick={() => add("window")}>
                <RectangleHorizontal size={14} /> Fenêtre
              </button>
            </div>
            {w.openings.length === 0 && (
              <p className="muted small">Ajoutez une ouverture à ce mur.</p>
            )}
            {w.openings.map((o, i) => (
              <details key={o.id} className="opening" open>
                <summary>
                  {o.kind === "door" ? "Porte" : "Fenêtre"} {i + 1}
                  <button
                    title="Supprimer cette ouverture"
                    className="icon-button danger"
                    onClick={(e) => {
                      e.preventDefault();
                      patch({
                        openings: w.openings.filter((x) => x.id !== o.id),
                      });
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </summary>
                <div className="field-grid">
                  <NumberField
                    label="Largeur"
                    value={o.width}
                    min={0.2}
                    onChange={(width) => opening(o, { width })}
                  />
                  <NumberField
                    label="Hauteur"
                    value={o.height}
                    min={0.2}
                    onChange={(height) => opening(o, { height })}
                  />
                  <NumberField
                    label="Position"
                    value={o.offset}
                    onChange={(offset) => opening(o, { offset })}
                  />
                  <NumberField
                    label="Allège"
                    value={o.sill}
                    onChange={(sill) => opening(o, { sill })}
                  />
                </div>
              </details>
            ))}
          </section>
        )}
        <section>
          <div className="section-title">
            <Paintbrush size={15} /> Matériaux
            <ChevronDown size={13} />
          </div>
          {w && (
            <>
              <div className="sub-label">Finition du mur</div>
              <div className="swatches">
                {[
                  "#ece9e1",
                  "#d6c5b1",
                  "#93a391",
                  "#b8bdc0",
                  "#b07e68",
                  "#535e58",
                ].map((c) => (
                  <button
                    aria-label={`Couleur ${c}`}
                    key={c}
                    className={w.color === c ? "selected" : ""}
                    style={{ background: c }}
                    onClick={() => patch({ color: c })}
                    title={`Couleur ${c}`}
                  />
                ))}
                <label className="color-custom" title="Couleur personnalisée" aria-label="Couleur personnalisée">
                  <input
                    aria-label="Couleur personnalisée"
                    type="color"
                    value={w.color}
                    onChange={(e) => patch({ color: e.target.value })}
                  />
                </label>
              </div>
            </>
          )}
          <div className="sub-label">Revêtement du sol</div>
          <div className="materials">
            {[
              { id: "wood", name: "Chêne naturel" },
              { id: "concrete", name: "Béton ciré" },
              { id: "tile", name: "Pierre claire" },
            ].map((m) => (
              <button
                className={p.floor === m.id ? "active" : ""}
                key={m.id}
                onClick={() => updateProject({ ...p, floor: m.id })}
              >
                <span className={`material-sample ${m.id}`} />
                <small>{m.name}</small>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className="section-title">
            <Sun size={16} /> Ambiance
            <ChevronDown size={13} />
          </div>
          <div className="segmented ambient">
            {(
              [
                { id: "day", name: "Jour" },
                { id: "evening", name: "Soir" },
                { id: "night", name: "Nuit" },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                className={p.light === l.id ? "active" : ""}
                onClick={() => updateProject({ ...p, light: l.id })}
              >
                {l.name}
              </button>
            ))}
          </div>
          <label className="toggle-row">
            <span>Mobilier de démonstration</span>
            <input
              aria-label="Mobilier de démonstration"
              type="checkbox"
              checked={p.furniture}
              onChange={(e) =>
                updateProject({ ...p, furniture: e.target.checked })
              }
            />
          </label>
          <p className="muted small">
            Éclairage temps réel. Pas de rendu photoréaliste.
          </p>
        </section>
        <div className="tip-card">
          <span className="tip-label">LE BON GESTE</span>
          <p>
            Passez en plan 2D pour tracer vos murs et ajuster leurs extrémités.
          </p>
          <span>Chaque détail compte.</span>
        </div>
      </div>
    </aside>
  );
}
