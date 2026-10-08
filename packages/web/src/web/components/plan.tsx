import { useRef, useState } from "react";
import {
  bounds,
  length,
  snap,
  type Point,
  type Project,
  type Wall,
} from "../lib/project";
type Props = {
  project: Project;
  selected: string | null;
  tool: string;
  onSelect: (id: string, at?: number) => void;
  onDraw: (a: Point, b: Point) => void;
  onMove: (w: Wall) => void;
  showReference: boolean;
};
export default function Plan({
  project: p,
  selected,
  tool,
  onSelect,
  onDraw,
  onMove,
  showReference,
}: Props) {
  const svg = useRef<SVGSVGElement>(null),
    b = bounds(p);
  const [start, setStart] = useState<Point | null>(null),
    [cursor, setCursor] = useState<Point | null>(null),
    [drag, setDrag] = useState<{
      wall: Wall;
      end: "a" | "b";
      point: Point;
    } | null>(null),
    [zoom, setZoom] = useState(1);
  const vb = {
    x: b.minX - 2 - ((zoom - 1) * b.width) / 2,
    z: b.minZ - 2 - ((zoom - 1) * b.depth) / 2,
    w: (b.width + 4) * zoom,
    h: (b.depth + 4) * zoom,
  };
  const point = (e: React.PointerEvent): Point => {
    const pt = svg.current!.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const pos = pt.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return { x: snap(pos.x), z: snap(pos.y) };
  };
  const down = (e: React.PointerEvent) => {
    const pos = point(e);
    if (tool === "wall") {
      if (start) {
        let end = pos;
        if (!e.shiftKey) {
          if (Math.abs(end.x - start.x) > Math.abs(end.z - start.z))
            end = { x: end.x, z: start.z };
          else end = { x: start.x, z: end.z };
        }
        if (Math.hypot(end.x - start.x, end.z - start.z) >= 0.2)
          onDraw(start, end);
        setStart(null);
      } else setStart(pos);
    }
  };
  const move = (e: React.PointerEvent) => {
    const pos = point(e);
    setCursor(pos);
    if (drag) setDrag({ ...drag, point: pos });
  };
  const up = () => {
    if (drag) {
      onMove({ ...drag.wall, [drag.end]: drag.point });
      setDrag(null);
    }
  };
  const effective = (w: Wall) =>
    drag?.wall.id === w.id ? { ...w, [drag.end]: drag.point } : w;
  const end =
    start && cursor
      ? tool === "wall"
        ? Math.abs(cursor.x - start.x) > Math.abs(cursor.z - start.z)
          ? { x: cursor.x, z: start.z }
          : { x: start.x, z: cursor.z }
        : cursor
      : null;
  return (
    <div className={`plan-canvas tool-${tool}`}>
      <svg
        ref={svg}
        viewBox={`${vb.x} ${vb.z} ${vb.w} ${vb.h}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDrag(null)}
        onDoubleClick={() => setStart(null)}
        onWheel={(e) =>
          setZoom((z) =>
            Math.max(0.5, Math.min(3, z + (e.deltaY > 0 ? 0.1 : -0.1))),
          )
        }
      >
        <defs>
          <pattern
            id="smallgrid"
            width=".5"
            height=".5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M .5 0 L 0 0 0 .5"
              fill="none"
              stroke="#d8ddd5"
              strokeWidth=".012"
            />
          </pattern>
          <pattern
            id="biggrid"
            width="1"
            height="1"
            patternUnits="userSpaceOnUse"
          >
            <rect width="1" height="1" fill="url(#smallgrid)" />
            <path
              d="M 1 0 L 0 0 0 1"
              fill="none"
              stroke="#c5cec3"
              strokeWidth=".016"
            />
          </pattern>
        </defs>
        <rect
          x={vb.x}
          y={vb.z}
          width={vb.w}
          height={vb.h}
          fill="url(#biggrid)"
        />
        {p.reference && showReference && (
          <image
            href={p.reference.url}
            x={0}
            y={0}
            width={p.reference.width}
            height={p.reference.depth}
            opacity=".5"
          />
        )}
        {!p.reference && (
          <rect
            x={b.minX}
            y={b.minZ}
            width={b.width}
            height={b.depth}
            fill={
              p.floor === "wood"
                ? "#ded4bd"
                : p.floor === "tile"
                  ? "#e2e2dc"
                  : "#d3d6d0"
            }
            opacity=".65"
          />
        )}
        {p.furniture && (
          <g fill="#f5f2e8" stroke="#989e91" strokeWidth=".04">
            <rect x="1.5" y="4.8" width="1.2" height="3.1" rx=".1" />
            <rect x="3.4" y="5.8" width="1.8" height="1" rx=".08" />
            <rect x="8.4" y="5.2" width="3" height="3.5" rx=".1" />
            <rect x="8.6" y="5.45" width="1.2" height=".65" rx=".1" />
            <rect x="10" y="5.45" width="1.2" height=".65" rx=".1" />
            <rect x=".1" y=".1" width="3.8" height="1" />
            <rect x="1.7" y="1.8" width="3" height="1" />
            <rect x="8.6" y="1.75" width="2.4" height="1.1" />
          </g>
        )}
        {p.walls.map((original) => {
          const w = effective(original),
            l = length(w),
            angle = (Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x) * 180) / Math.PI;
          return (
            <g
              key={w.id}
              transform={`translate(${w.a.x},${w.a.z}) rotate(${angle})`}
              onPointerDown={(e) => {
                if (tool !== "wall") {
                  e.stopPropagation();
                  const pos = point(e);
                  const at =
                    ((pos.x - w.a.x) * (w.b.x - w.a.x) +
                      (pos.z - w.a.z) * (w.b.z - w.a.z)) /
                    l;
                  onSelect(w.id, at);
                }
              }}
            >
              <rect
                x="0"
                y={-w.thickness / 2}
                width={l}
                height={w.thickness}
                fill={selected === w.id ? "#4c8977" : "#626b60"}
                stroke={selected === w.id ? "#236455" : "#4f574d"}
                strokeWidth=".035"
              />
              <rect x="0" y="-.22" width={l} height=".44" fill="transparent" />
              {w.openings.map((o) => (
                <g key={o.id}>
                  <rect
                    x={o.offset}
                    y={-w.thickness / 2 - 0.02}
                    width={o.width}
                    height={w.thickness + 0.04}
                    fill="#f2f4ee"
                  />
                  {o.kind === "window" ? (
                    <>
                      <line
                        x1={o.offset}
                        y1="-.04"
                        x2={o.offset + o.width}
                        y2="-.04"
                        stroke="#669299"
                        strokeWidth=".045"
                      />
                      <line
                        x1={o.offset}
                        y1=".04"
                        x2={o.offset + o.width}
                        y2=".04"
                        stroke="#669299"
                        strokeWidth=".045"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d={`M ${o.offset} 0 L ${o.offset} ${o.width} A ${o.width} ${o.width} 0 0 0 ${o.offset + o.width} 0`}
                        stroke="#9b8b6e"
                        strokeWidth=".025"
                        fill="none"
                      />
                    </>
                  )}
                </g>
              ))}
              <text
                x={l / 2}
                y="-.28"
                textAnchor="middle"
                fontSize=".19"
                fill="#677466"
                transform={
                  Math.abs(angle) > 95 ? `rotate(180 ${l / 2} -.28)` : undefined
                }
              >
                {l.toFixed(2)} m
              </text>
            </g>
          );
        })}
        {!p.reference && (
          <g fontSize=".24" fill="#6c786c" textAnchor="middle">
            <text x="3.8" y="4.3">
              SÉJOUR / CUISINE
            </text>
            <text x="9.8" y="4">
              SALLE À MANGER
            </text>
            <text x="9.8" y="8.9">
              CHAMBRE
            </text>
          </g>
        )}
        {selected &&
          tool === "select" &&
          p.walls
            .filter((w) => w.id === selected)
            .map(effective)
            .flatMap((w) =>
              (["a", "b"] as const).map((key) => (
                <circle
                  key={key}
                  cx={w[key].x}
                  cy={w[key].z}
                  r=".13"
                  fill="#fff"
                  stroke="#236455"
                  strokeWidth=".04"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDrag({ wall: w, end: key, point: w[key] });
                  }}
                />
              )),
            )}
        {start && end && (
          <>
            <line
              x1={start.x}
              y1={start.z}
              x2={end.x}
              y2={end.z}
              stroke="#236455"
              strokeWidth=".16"
              opacity=".65"
            />
            <circle cx={start.x} cy={start.z} r=".1" fill="#236455" />
            <text
              x={(start.x + end.x) / 2}
              y={(start.z + end.z) / 2 - 0.3}
              fontSize=".24"
              fill="#236455"
            >
              {Math.hypot(end.x - start.x, end.z - start.z).toFixed(2)} m
            </text>
          </>
        )}
      </svg>
      <div className="plan-zoom">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          title="Zoom avant"
        >
          +
        </button>
        <button onClick={() => setZoom(1)}>Ajuster</button>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          title="Zoom arrière"
        >
          −
        </button>
      </div>
    </div>
  );
}
