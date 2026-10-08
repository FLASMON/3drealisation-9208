import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  MousePointer2,
  BrickWall,
  DoorOpen,
  RectangleHorizontal,
  Undo2,
  Redo2,
  Upload,
  Download,
  Save,
  FolderOpen,
  Plus,
  Layers,
  Eye,
  EyeOff,
  Maximize,
  Camera,
  HelpCircle,
  X,
  Check,
  Move3D,
  Grid2X2,
  Cuboid,
  PanelLeftClose,
  Image,
  Trash2,
} from "lucide-react";
import Scene from "../components/scene";
import Plan from "../components/plan";
import Inspector from "../components/inspector";
import ImportDialog from "../components/import-dialog";
import {
  addOpening,
  bounds,
  demo,
  download,
  makeWall,
  parseProject,
  validWall,
  type Project,
  type Wall,
  type Point,
} from "../lib/project";
const storageKey = "atelier-plan-projects-v1";
type Saved = { id: string; date: string; project: Project };
function readSaved(): Saved[] {
  try {
    const items = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
function initial() {
  try {
    const data = localStorage.getItem("atelier-plan-current");
    return data ? parseProject(data) : demo();
  } catch {
    return demo();
  }
}
export default function Editor() {
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [history, setHistory] = useState<Project[]>(() => [initial()]),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [view, setView] = useState<"3d" | "2d">("3d"),
    [tool, setTool] = useState("select"),
    [cutaway, setCutaway] = useState(true),
    [reset, setReset] = useState(0),
    [modal, setModal] = useState<"import" | "projects" | "help" | "new" | null>(
      null,
    ),
    [saved, setSaved] = useState<Saved[]>(readSaved),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false),
    [left, setLeft] = useState(true),
    [showReference, setShowReference] = useState(true),
    [tab, setTab] = useState<"objects" | "project">("objects");
  const p = history[index]!,
    w = p.walls.find((x) => x.id === selected),
    b = bounds(p),
    fileRef = useRef<HTMLInputElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    center = useRef<HTMLDivElement>(null);
  const notify = useCallback((message: string) => {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 4800);
  }, []);
  const commit = (next: Project) => {
    setHistory((h) => [...h.slice(0, index + 1).slice(-50), next]);
    setIndex(Math.min(index + 1, 50));
    setDirty(true);
  };
  const updateWall = (next: Wall) => {
    if (JSON.stringify(p.walls.find(w=>w.id===next.id)) === JSON.stringify(next)) return;
    if (!validWall(next)) {
      notify(
        "Dimensions non valides : vérifiez les ouvertures, leur espacement et les limites du mur.",
      );
      return;
    }
    commit({ ...p, walls: p.walls.map((w) => (w.id === next.id ? next : w)) });
  };
  const undo = () => {
    if (index > 0) {
      setIndex(index - 1);
      setDirty(true);
    }
  };
  const redo = () => {
    if (index < history.length - 1) {
      setIndex(index + 1);
      setDirty(true);
    }
  };
  const remove = () => {
    if (w) {
      commit({ ...p, walls: p.walls.filter((v) => v.id !== w.id) });
      setSelected(null);
    }
  };
  const add = (kind: "door" | "window", wall = w, at?: number) => {
    if (!wall) {
      notify("Sélectionnez un mur pour ajouter une ouverture.");
      return;
    }
    try {
      updateWall(addOpening(wall, kind, at));
      notify(
        kind === "door" ? "Porte ajoutée au mur." : "Fenêtre ajoutée au mur.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const select = (id: string, at?: number) => {
    setSelected(id);
    if (tool === "door" || tool === "window")
      add(
        tool,
        p.walls.find((w) => w.id === id),
        at,
      );
  };
  const draw = (a: Point, b: Point) => {
    if (p.walls.length >= 300) {
      notify("Limite de 300 murs atteinte.");
      return;
    }
    const wall = makeWall(a, b, p.walls.length);
    if (!validWall(wall)) {
      notify("Tracez un mur entre 0,20 et 200 m.");
      return;
    }
    commit({ ...p, walls: [...p.walls, wall] });
    setSelected(wall.id);
  };
  const chooseTool = (t: string) => {
    setTool(t);
    if (t === "wall") setView("2d");
  };
  const save = () => {
    try {
      const entries = readSaved();
      const id = p.name;
      const record = { id, date: new Date().toISOString(), project: p };
      const next = [record, ...entries.filter((v) => v.id !== id)].slice(0, 12);
      localStorage.setItem(storageKey, JSON.stringify(next));
      localStorage.setItem("atelier-plan-current", JSON.stringify(p));
      setSaved(next);
      setDirty(false);
      notify("Projet enregistré dans ce navigateur.");
    } catch {
      notify(
        "Stockage local plein ou indisponible. Exportez votre projet JSON.",
      );
    }
  };
  const exportProject = () => {
    download(
      JSON.stringify(p, null, 2),
      `${p.name.replace(/[^\p{L}\p{N} _-]/gu, "")}.atelier.json`,
    );
    notify("Projet exporté au format JSON.");
  };
  const load = (next: Project) => {
    commit(next);
    setSelected(null);
    setReset((v) => v + 1);
    setTool("select");
    setModal(null);
  };
  const file = async (f: File) => {
    try {
      if (f.size > 20 * 1024 * 1024)
        throw new Error("Fichier trop lourd (20 Mo maximum).");
      load(parseProject(await f.text()));
      notify("Projet JSON ouvert.");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const screenshot = () => {
    if (view === "3d") {
      const canvas = center.current?.querySelector("canvas");
      if (!canvas) {
        notify("La scène n’est pas encore prête.");
        return;
      }
      const a = document.createElement("a");
      a.download = "atelier-plan-vue-3d.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    } else {
      const svg = center.current?.querySelector("svg");
      if (svg)
        download(
          new XMLSerializer().serializeToString(svg),
          "atelier-plan-plan.svg",
          "image/svg+xml",
        );
    }
    notify(
      view === "3d" ? "Vue 3D exportée en PNG." : "Plan 2D exporté en SVG.",
    );
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (modal) {
        if (e.key === "Escape") setModal(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key === "Escape") {
        setTool("select");
        setSelected(null);
      } else if (e.key.toLowerCase() === "m") chooseTool("wall");
      else if (e.key.toLowerCase() === "v") chooseTool("select");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const openings = p.walls.flatMap((w) => w.openings);
  return (
    <div className={`editor-shell ${propertiesOpen ? 'properties-open' : ''}`}>
      <header className="topbar">
        <a className="brand" href="/" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">
            <Box size={25} strokeWidth={1.6} />
          </span>
          <span>
            atelier<span className="brand-light">plan</span>
            <small>STUDIO 3D</small>
          </span>
        </a>
        <span className="header-divider" />
        <div className="project-title">
          <input
            aria-label="Nom du projet"
            value={p.name}
            onChange={(e) =>
              commit({ ...p, name: e.target.value.slice(0, 80) })
            }
          />
          <span className={`save-state ${dirty ? "unsaved" : ""}`}>
            <span />
            {dirty ? "Modifications non enregistrées" : "Projet local"}
          </span>
        </div>
        <div className="top-actions">
          <button
            className="text-button projects-btn"
            onClick={() => {
              setSaved(readSaved());
              setModal("projects");
            }}
          >
            <FolderOpen size={16} /> Mes projets
          </button>
          <button className="secondary" onClick={exportProject}>
            <Download size={16} />
            <span>Exporter</span>
          </button>
          <button className="primary" onClick={save}>
            <Save size={16} />
            <span>Enregistrer</span>
          </button>
          <button
            className="avatar"
            title="Aide et raccourcis"
            onClick={() => setModal("help")}
          >
            AP
          </button>
        </div>
      </header>
      <div className="commandbar">
        <div className="breadcrumb">
          <span>Espace de travail</span>
          <ChevronRight size={12} />
          <strong>Modélisation</strong>
        </div>
        <div className="history-buttons">
          <button
            title="Annuler (Ctrl+Z)"
            className="icon-button"
            disabled={index === 0}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Rétablir (Ctrl+Y)"
            className="icon-button"
            disabled={index === history.length - 1}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
          <span className="vertical-rule" />
          <button className="text-button" onClick={() => setModal("new")}>
            <Plus size={15} /> Nouveau
          </button>
          <button className="text-button" onClick={() => setModal("import")}>
            <Upload size={15} /> Importer un plan{" "}
            <span className="mini-badge">AUTO</span>
          </button>
        </div>
        <button
          className="text-button help-command"
          onClick={() => setModal("help")}
        >
          <HelpCircle size={15} /> Guide rapide
        </button>
      </div>
      <main className="workspace">
        <nav className="tool-rail" aria-label="Outils de modélisation">
          {[
            { id: "select", icon: MousePointer2, name: "Sélection (V)" },
            { id: "wall", icon: BrickWall, name: "Tracer un mur (M)" },
            { id: "door", icon: DoorOpen, name: "Placer une porte sur un mur" },
            {
              id: "window",
              icon: RectangleHorizontal,
              name: "Placer une fenêtre sur un mur",
            },
          ].map((t) => (
            <button
              key={t.id}
              title={t.name}
              aria-label={t.name}
              className={tool === t.id ? "active" : ""}
              onClick={() => chooseTool(t.id)}
            >
              <t.icon size={20} />
            </button>
          ))}
          <span className="rail-divider" />
          <button
            title="Déplacer les extrémités en 2D"
            onClick={() => {
              setView("2d");
              setTool("select");
              notify(
                "Sélectionnez un mur puis glissez une poignée ronde pour déplacer son extrémité.",
              );
            }}
          >
            <Move3D size={20} />
          </button>
          <button
            title="Importer un plan image"
            onClick={() => setModal("import")}
          >
            <Image size={20} />
          </button>
          <button title="Supprimer la sélection" onClick={remove} disabled={!w}>
            <Trash2 size={19} />
          </button>
          <div className="rail-bottom">
            <button className="mobile-properties" title="Afficher / masquer les propriétés" onClick={()=>setPropertiesOpen(!propertiesOpen)}><Layers size={19}/></button>
            <button
              title="Afficher / masquer le panneau"
              onClick={() => setLeft(!left)}
            >
              <PanelLeftClose size={19} />
            </button>
            <button title="Aide" onClick={() => setModal("help")}>
              <HelpCircle size={19} />
            </button>
          </div>
        </nav>
        {left && (
          <aside className="project-panel">
            <div className="panel-tabs">
              <button
                className={tab === "objects" ? "active" : ""}
                onClick={() => setTab("objects")}
              >
                Structure
              </button>
              <button
                className={tab === "project" ? "active" : ""}
                onClick={() => setTab("project")}
              >
                Projet
              </button>
            </div>
            {tab === "objects" ? (
              <>
                <div className="tree-heading">
                  <Layers size={15} />
                  <strong>Objets du modèle</strong>
                  <span>{p.walls.length}</span>
                </div>
                <button className="tree-root" onClick={() => setSelected(null)}>
                  <ChevronDown size={13} />
                  <Cuboid size={15} />
                  <span>{p.reference ? "Plan importé" : "Appartement"}</span>
                </button>
                <div className="object-tree">
                  <div className="tree-group">
                    <ChevronDown size={12} />
                    <BrickWall size={14} />
                    <strong>Murs</strong>
                    <span>{p.walls.length}</span>
                  </div>
                  <div className="wall-list">
                    {p.walls.map((w) => (
                      <button
                        key={w.id}
                        className={selected === w.id ? "active" : ""}
                        onClick={() => {
                          setTool("select");
                          setSelected(w.id);
                        }}
                      >
                        <BrickWall size={14} />
                        <span>{w.name}</span>
                        {w.openings.length > 0 && (
                          <small>{w.openings.length}</small>
                        )}
                      </button>
                    ))}
                    {!p.walls.length && (
                      <p className="muted small">
                        Aucun mur. Tracez votre premier mur en 2D.
                      </p>
                    )}
                  </div>
                  <div className="tree-group">
                    <DoorOpen size={14} />
                    <strong>Portes</strong>
                    <span>
                      {openings.filter((o) => o.kind === "door").length}
                    </span>
                  </div>
                  <div className="tree-group">
                    <RectangleHorizontal size={14} />
                    <strong>Fenêtres</strong>
                    <span>
                      {openings.filter((o) => o.kind === "window").length}
                    </span>
                  </div>
                  <button
                    className="tree-group tree-toggle"
                    onClick={() => commit({ ...p, furniture: !p.furniture })}
                  >
                    <Box size={14} />
                    <strong>Mobilier</strong>
                    {p.furniture ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  {p.reference && (
                    <button
                      className="tree-group tree-toggle"
                      onClick={() => setShowReference(!showReference)}
                    >
                      <Image size={14} />
                      <strong>Plan de référence</strong>
                      {showReference ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="project-info">
                <span className="eyebrow">VOTRE PROJET</span>
                <h3>{p.name}</h3>
                <p>
                  {b.width.toFixed(1)} × {b.depth.toFixed(1)} m
                </p>
                <p>
                  {p.walls.length} murs · {openings.length} ouvertures
                </p>
                <p className="muted small">
                  Enregistrement local dans ce navigateur. Exportez le fichier
                  JSON pour conserver une copie ou transférer votre projet.
                </p>
                <button
                  className="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <FolderOpen size={15} /> Ouvrir un JSON
                </button>
              </div>
            )}
            <div className="import-card">
              <div className="import-card-icon">
                <Upload size={18} />
              </div>
              <strong>Un plan, un nouveau départ.</strong>
              <p>Importez votre image et générez vos murs en quelques clics.</p>
              <button onClick={() => setModal("import")}>
                Importer un plan <span>↗</span>
              </button>
              <small>Détection automatique · Modifiable</small>
            </div>
            <div className="left-footer">
              <span className="local-dot" /> Traitement local & privé
            </div>
          </aside>
        )}
        <div className="viewport" ref={center}>
          <div className="viewport-toolbar">
            <div className="segmented views">
              <button
                className={view === "2d" ? "active" : ""}
                onClick={() => {
                  setView("2d");
                  setTool("select");
                }}
              >
                <Grid2X2 size={14} /> Plan 2D
              </button>
              <button
                className={view === "3d" ? "active" : ""}
                onClick={() => {
                  setView("3d");
                  setTool("select");
                }}
              >
                <Box size={15} /> Vue 3D
              </button>
            </div>
            <span className="viewport-label">
              {view === "3d" ? "PERSPECTIVE" : "VUE DE DESSUS"}
            </span>
            <div className="viewport-actions">
              {view === "3d" && (
                <button
                  className={`cutaway ${cutaway ? "active" : ""}`}
                  title="Masquer les murs avant pour voir l’intérieur"
                  onClick={() => setCutaway(!cutaway)}
                >
                  <Layers size={14} />
                  <span>Coupe ouverte</span>
                </button>
              )}
              <button
                className="icon-button"
                title="Recentrer la vue"
                onClick={() => setReset((r) => r + 1)}
              >
                <Maximize size={16} />
              </button>
              <button
                className="icon-button"
                title={
                  view === "3d"
                    ? "Exporter une image PNG"
                    : "Exporter le plan SVG"
                }
                onClick={screenshot}
              >
                <Camera size={16} />
              </button>
            </div>
          </div>
          {view === "3d" ? (
            <Scene
              project={p}
              selected={selected}
              onSelect={select}
              cutaway={cutaway}
              reset={reset}
              tool={tool}
            />
          ) : (
            <Plan
              key={`plan-${reset}`}
              project={p}
              selected={selected}
              tool={tool}
              onSelect={select}
              onDraw={draw}
              onMove={updateWall}
              showReference={showReference}
            />
          )}
          <div className="scene-caption">
            <span className="live-dot" />
            <span>
              {p.reference ? "MODÈLE IMPORTÉ" : "APPARTEMENT DE DÉMONSTRATION"}
            </span>
          </div>
          <div className="axis-widget">
            <span className="axis-y">Y</span>
            <span className="axis-x">X</span>
            <span className="axis-z">Z</span>
            <div />
          </div>
          <div className="viewport-bottom">
            <div className="navigation-hint">
              <MousePointer2 size={14} />
              <span>
                {tool === "wall"
                  ? "Cliquez le début puis la fin du mur · Échap pour quitter"
                  : tool === "door" || tool === "window"
                    ? "Cliquez sur un mur pour placer une ouverture"
                    : view === "3d"
                      ? "Glisser pour orbiter · Clic droit pour déplacer · Molette pour zoomer"
                      : "Sélectionnez un mur · Glissez les poignées · Molette pour zoomer"}
              </span>
            </div>
            <div className="scale-mark">
              <span />
              {view === "2d" ? "Grille 0,5 m" : "Unités : mètres"}
            </div>
          </div>
        </div>
        <Inspector
          project={p}
          wall={w}
          update={updateWall}
          updateProject={commit}
          remove={remove}
          add={add}
        />
      </main>
      <footer className="statusbar">
        <span>
          <span className="local-dot" />{" "}
          {tool === "wall"
            ? "Outil Mur"
            : tool === "door"
              ? "Outil Porte"
              : tool === "window"
                ? "Outil Fenêtre"
                : "Prêt à créer"}
        </span>
        <span>
          {p.walls.length} murs <i /> {openings.length} ouvertures <i />{" "}
          {b.width.toFixed(1)} × {b.depth.toFixed(1)} m
        </span>
        <span className="status-right">
          {w ? w.name : "Aucune sélection"}
          <i /> <strong>Métrique</strong>
          <ChevronDown size={11} />
        </span>
      </footer>
      <input
        aria-label="Ouvrir un projet JSON"
        ref={fileRef}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void file(f);
          e.target.value = "";
        }}
      />
      {notice && (
        <output className="toast">
          <InfoIcon />
          <span>{notice}</span>
          <button
            className="icon-button"
            title="Fermer la notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </output>
      )}
      {modal === "import" && (
        <ImportDialog
          close={() => setModal(null)}
          onImport={(next) => {
            load(next);
            setView("2d");
            notify(
              `${next.walls.length} murs créés. Vérifiez les dimensions et ajoutez les portes et fenêtres.`,
            );
          }}
        />
      )}
      {modal === "projects" && (
        <div className="modal-backdrop">
          <dialog open
            className="small-modal"
            aria-modal="true"
            aria-label="Mes projets"
          >
            <div className="modal-head">
              <h2>Mes projets</h2>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                title="Fermer"
              >
                <X size={19} />
              </button>
            </div>
            <p className="muted">Enregistrés uniquement dans ce navigateur.</p>
            <div className="saved-list">
              {saved.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    try {
                      load(parseProject(JSON.stringify(s.project)));
                      notify("Projet chargé.");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  <span className="object-icon">
                    <Box size={20} />
                  </span>
                  <span>
                    <strong>{s.project.name}</strong>
                    <small>
                      {new Date(s.date).toLocaleString("fr-FR")} ·{" "}
                      {s.project.walls.length} murs
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
              {!saved.length && (
                <p className="empty-state">
                  Aucun projet enregistré pour le moment.
                </p>
              )}
            </div>
            <button
              className="secondary"
              onClick={() => fileRef.current?.click()}
            >
              <FolderOpen size={16} /> Ouvrir un fichier JSON
            </button>
          </dialog>
        </div>
      )}
      {modal === "new" && (
        <div className="modal-backdrop">
          <dialog open
            className="small-modal"
            aria-modal="true"
            aria-label="Nouveau projet"
          >
            <div className="modal-head">
              <h2>Nouveau projet</h2>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="muted">
              Le projet actuel restera accessible avec Annuler. Enregistrez-le
              si vous souhaitez le conserver après fermeture.
            </p>
            <div className="new-options">
              <button
                onClick={() => {
                  load({
                    version: 1,
                    name: "Mon nouveau projet",
                    walls: [],
                    floor: "wood",
                    light: "day",
                    furniture: false,
                  });
                  setView("2d");
                }}
              >
                <Plus size={25} />
                <strong>Plan vierge</strong>
                <small>Créer librement</small>
              </button>
              <button
                onClick={() => {
                  load(demo());
                  setView("3d");
                }}
              >
                <Box size={25} />
                <strong>Appartement</strong>
                <small>Exemple modifiable</small>
              </button>
            </div>
            <button
              className="secondary full"
              onClick={() => setModal("import")}
            >
              <Upload size={16} /> Partir de mon plan image
            </button>
          </dialog>
        </div>
      )}
      {modal === "help" && (
        <div className="modal-backdrop">
          <dialog open
            className="small-modal help-modal"
            aria-modal="true"
            aria-label="Guide rapide"
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">BIENVENUE DANS ATELIER PLAN</span>
                <h2>De l’idée au volume.</h2>
              </div>
              <button
                className="icon-button"
                title="Fermer"
                onClick={() => setModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <ol>
              <li>
                <strong>Tracez votre espace</strong>
                <p>
                  En plan 2D, choisissez Mur (M), puis cliquez sur le début et
                  la fin. Les traits sont orthogonaux ; Maj autorise un tracé
                  diagonal. Échap revient à la sélection.
                </p>
              </li>
              <li>
                <strong>Ouvrez de nouvelles perspectives</strong>
                <p>
                  Sélectionnez un mur, puis ajoutez une porte ou une fenêtre.
                  Réglez les dimensions, l’allège et la position dans
                  Propriétés. Les ouvertures doivent rester dans le mur et ne
                  pas se chevaucher.
                </p>
              </li>
              <li>
                <strong>Affinez & explorez</strong>
                <p>
                  Glissez les poignées d’un mur en 2D ou saisissez ses
                  extrémités. En 3D, orbitez avec la souris et désactivez Coupe
                  ouverte pour afficher tous les murs.
                </p>
              </li>
              <li>
                <strong>Importez & conservez</strong>
                <p>
                  Un plan image peut générer des murs orthogonaux ; vérifiez
                  l’échelle et corrigez les erreurs. Les photos d’intérieur et
                  le format .skp ne sont pas pris en charge. Enregistrez
                  localement et exportez un JSON comme copie de sécurité.
                </p>
              </li>
            </ol>
            <div className="shortcuts">
              <span>
                <kbd>Ctrl S</kbd> Enregistrer
              </span>
              <span>
                <kbd>Ctrl Z</kbd> Annuler
              </span>
              <span>
                <kbd>Suppr</kbd> Supprimer
              </span>
            </div>
            <button className="primary full" onClick={() => setModal(null)}>
              Commencer à créer <ChevronRight size={16} />
            </button>
          </dialog>
        </div>
      )}
    </div>
  );
}
function InfoIcon() {
  return <Check size={17} />;
}
