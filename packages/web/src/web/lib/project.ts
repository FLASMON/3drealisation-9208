export type Point = { x: number; z: number };
export type Opening = {
  id: string;
  kind: "door" | "window";
  offset: number;
  width: number;
  height: number;
  sill: number;
};
export type Wall = {
  id: string;
  name: string;
  a: Point;
  b: Point;
  height: number;
  thickness: number;
  color: string;
  openings: Opening[];
};
export type Project = {
  version: 1;
  name: string;
  walls: Wall[];
  floor: string;
  light: "day" | "evening" | "night";
  furniture: boolean;
  reference?: { url: string; width: number; depth: number };
};
export const uid = () => crypto.randomUUID();
export const length = (w: Wall) => Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z);
export const snap = (n: number) => Math.round(n * 10) / 10;
export function makeWall(a: Point, b: Point, index: number): Wall {
  return {
    id: uid(),
    name: `Mur ${String(index + 1).padStart(2, "0")}`,
    a,
    b,
    height: 2.8,
    thickness: 0.18,
    color: "#ece9e1",
    openings: [],
  };
}
export function demo(): Project {
  const walls = [
    makeWall({ x: 0, z: 0 }, { x: 12, z: 0 }, 0),
    makeWall({ x: 12, z: 0 }, { x: 12, z: 9 }, 1),
    makeWall({ x: 12, z: 9 }, { x: 0, z: 9 }, 2),
    makeWall({ x: 0, z: 9 }, { x: 0, z: 0 }, 3),
    makeWall({ x: 7.4, z: 0 }, { x: 7.4, z: 9 }, 4),
    makeWall({ x: 7.4, z: 4.6 }, { x: 12, z: 4.6 }, 5),
    makeWall({ x: 0, z: 3.2 }, { x: 4, z: 3.2 }, 6),
  ];
  walls[0]!.openings = [
    {
      id: uid(),
      kind: "window",
      offset: 2,
      width: 2.5,
      height: 1.5,
      sill: 0.85,
    },
    {
      id: uid(),
      kind: "window",
      offset: 8.4,
      width: 2.2,
      height: 1.5,
      sill: 0.85,
    },
  ];
  walls[1]!.openings = [
    {
      id: uid(),
      kind: "window",
      offset: 5.6,
      width: 2,
      height: 1.5,
      sill: 0.85,
    },
  ];
  walls[4]!.openings = [
    { id: uid(), kind: "door", offset: 2.2, width: 0.95, height: 2.1, sill: 0 },
    { id: uid(), kind: "door", offset: 6.1, width: 0.95, height: 2.1, sill: 0 },
  ];
  walls[5]!.openings = [
    { id: uid(), kind: "door", offset: 1.5, width: 0.9, height: 2.1, sill: 0 },
  ];
  return {
    version: 1,
    name: "Appartement — Les Terrasses",
    walls,
    floor: "wood",
    light: "day",
    furniture: true,
  };
}
export function bounds(p: Project) {
  const points = p.walls.flatMap((w) => [w.a, w.b]);
  const minX = Math.min(0, ...points.map((v) => v.x)),
    minZ = Math.min(0, ...points.map((v) => v.z));
  const maxX = Math.max(p.reference?.width || 1, ...points.map((v) => v.x)),
    maxZ = Math.max(p.reference?.depth || 1, ...points.map((v) => v.z));
  return { minX, minZ, maxX, maxZ, width: maxX - minX, depth: maxZ - minZ };
}
export function nearest(w: Wall, p: Point) {
  const l = length(w);
  return Math.max(
    0,
    Math.min(
      l,
      ((p.x - w.a.x) * (w.b.x - w.a.x) + (p.z - w.a.z) * (w.b.z - w.a.z)) / l,
    ),
  );
}
export function addOpening(
  w: Wall,
  kind: "door" | "window",
  at?: number,
): Wall {
  const width = kind === "door" ? 0.9 : 1.5,
    height = kind === "door" ? 2.1 : 1.25,
    sill = kind === "door" ? 0 : 0.9;
  if (length(w) < width + 0.2 || height + sill > w.height)
    throw new Error("Mur trop court ou trop bas pour cette ouverture.");
  let offset = Math.max(
    0.1,
    Math.min(length(w) - width - 0.1, (at ?? length(w) / 2) - width / 2),
  );
  const overlaps = (n: number) =>
    w.openings.some(
      (o) => n < o.offset + o.width + 0.1 && n + width + 0.1 > o.offset,
    );
  if (overlaps(offset)) {
    let found = false;
    for (let n = 0.1; n + width <= length(w) - 0.1; n += 0.1)
      if (!overlaps(n)) {
        offset = snap(n);
        found = true;
        break;
      }
    if (!found) throw new Error("Pas de place disponible sur ce mur.");
  }
  return {
    ...w,
    openings: [
      ...w.openings,
      { id: uid(), kind, offset, width, height, sill },
    ].sort((a, b) => a.offset - b.offset),
  };
}
export function validWall(w: Wall): boolean {
  const nums = [w.a.x, w.a.z, w.b.x, w.b.z, w.height, w.thickness];
  if (
    !nums.every(Number.isFinite) ||
    length(w) < 0.2 ||
    length(w) > 200 ||
    w.height < 0.3 ||
    w.height > 20 ||
    w.thickness < 0.05 ||
    w.thickness > 2 ||
    nums.some((v) => Math.abs(v) > 500)
  )
    return false;
  const list = [...w.openings].sort((a, b) => a.offset - b.offset);
  return list.every(
    (o, i) =>
      [o.width, o.height, o.offset, o.sill].every(Number.isFinite) &&
      o.width >= 0.2 &&
      o.height >= 0.2 &&
      o.sill >= 0 &&
      o.offset >= 0 &&
      o.offset + o.width <= length(w) + 0.001 &&
      o.sill + o.height <= w.height + 0.001 &&
      (i === 0 || o.offset >= list[i - 1]!.offset + list[i - 1]!.width + 0.05),
  );
}
export function parseProject(text: string): Project {
  const p = JSON.parse(text);
  if (
    p.version !== 1 ||
    typeof p.name !== "string" ||
    !Array.isArray(p.walls) ||
    p.walls.length > 300 ||
    !["wood", "concrete", "tile"].includes(p.floor) ||
    !["day", "evening", "night"].includes(p.light)
  )
    throw new Error("Ce fichier n’est pas un projet Atelier Plan valide.");
  const ids = new Set();
  for (const w of p.walls) {
    if (
      typeof w.id !== "string" ||
      ids.has(w.id) ||
      typeof w.name !== "string" ||
      !w.a ||
      !w.b ||
      typeof w.color !== "string" ||
      !/^#[a-fA-F0-9]{6}$/.test(w.color) ||
      !Array.isArray(w.openings) ||
      w.openings.some(
        (o: Opening) =>
          !["door", "window"].includes(o.kind) || typeof o.id !== "string",
      ) ||
      !validWall(w)
    )
      throw new Error("Dimensions ou ouvertures non valides dans le projet.");
    ids.add(w.id);
  }
  if (
    p.reference &&
    (typeof p.reference.url !== "string" ||
      !p.reference.url.startsWith("data:image/") ||
      !Number.isFinite(p.reference.width) ||
      !Number.isFinite(p.reference.depth) ||
      p.reference.width <= 0 ||
      p.reference.depth <= 0 ||
      p.reference.width > 200 ||
      p.reference.depth > 200)
  )
    throw new Error("Plan de référence invalide.");
  return { ...p, furniture: !!p.furniture };
}
export function download(
  content: string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
