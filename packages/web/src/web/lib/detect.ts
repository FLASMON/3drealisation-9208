import { makeWall, type Wall } from "./project";
export type PlanImage = {
  url: string;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};
export async function readImage(file: File): Promise<PlanImage> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choisissez un plan PNG, JPG ou WebP.");
  if (file.size > 12 * 1024 * 1024)
    throw new Error("Image trop lourde : maximum 12 Mo.");
  const bitmap = await createImageBitmap(file);
  const factor = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * factor);
  c.height = Math.round(bitmap.height * factor);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return {
    url: c.toDataURL("image/jpeg", 0.88),
    width: c.width,
    height: c.height,
    pixels: ctx.getImageData(0, 0, c.width, c.height).data,
  };
}
// Local orthogonal line detector. Long dense strokes survive; text and furniture generally do not.
export function detectWalls(
  image: PlanImage,
  realWidth: number,
  threshold: number,
  minLength: number,
): Wall[] {
  const { width: w, height: h, pixels } = image,
    mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++)
    mask[i] =
      0.2126 * pixels[i * 4]! +
        0.7152 * pixels[i * 4 + 1]! +
        0.0722 * pixels[i * 4 + 2]! <
      threshold
        ? 1
        : 0;
  type Segment = {
    axis: "h" | "v";
    fixed: number;
    start: number;
    end: number;
    weight: number;
  };
  const raw: Segment[] = [];
  for (const axis of ["h", "v"] as const) {
    const rows = axis === "h" ? h : w,
      cols = axis === "h" ? w : h;
    for (let r = 0; r < rows; r++) {
      let start = -1,
        last = -1,
        count = 0;
      const flush = () => {
        if (
          start >= 0 &&
          last - start >= Math.max(18, (minLength * w) / realWidth) &&
          count / (last - start + 1) > 0.88
        )
          raw.push({ axis, fixed: r, start, end: last, weight: 1 });
        start = -1;
        count = 0;
      };
      for (let c = 0; c < cols; c++) {
        const dark = mask[axis === "h" ? r * w + c : c * w + r];
        if (dark) {
          if (start < 0) start = c;
          last = c;
          count++;
        } else if (start >= 0 && c - last > 2) flush();
      }
      flush();
    }
  }
  const groups: Segment[] = [];
  for (const s of raw) {
    const match = groups.find(
      (g) =>
        g.axis === s.axis &&
        Math.abs(g.fixed - s.fixed) < 12 &&
        Math.min(g.end, s.end) - Math.max(g.start, s.start) >
          0.7 * Math.min(g.end - g.start, s.end - s.start),
    );
    if (match) {
      match.fixed = (match.fixed * match.weight + s.fixed) / (match.weight + 1);
      match.weight++;
      match.start = Math.min(match.start, s.start);
      match.end = Math.max(match.end, s.end);
    } else groups.push({ ...s });
  }
  const scale = realWidth / w;
  const filtered = groups
    .sort((a, b) => (b.end - b.start) * b.weight - (a.end - a.start) * a.weight)
    .slice(0, 100);
  const walls = filtered.map((s, i) => {
    const a =
      s.axis === "h"
        ? { x: s.start * scale, z: s.fixed * scale }
        : { x: s.fixed * scale, z: s.start * scale };
    const b =
      s.axis === "h"
        ? { x: s.end * scale, z: s.fixed * scale }
        : { x: s.fixed * scale, z: s.end * scale };
    const wall = makeWall(a, b, i);
    wall.thickness = Math.max(0.1, Math.min(0.35, s.weight * scale));
    return wall;
  });
  // Snap close endpoints to intersections, allowing tiny stroke discontinuities.
  for (const wall of walls)
    for (const p of [wall.a, wall.b])
      for (const other of walls) {
        if (other === wall) continue;
        const horizontal = Math.abs(other.a.z - other.b.z) < 0.001;
        const d = horizontal
          ? Math.abs(p.z - other.a.z)
          : Math.abs(p.x - other.a.x);
        const inRange = horizontal
          ? p.x >= other.a.x - 0.25 && p.x <= other.b.x + 0.25
          : p.z >= other.a.z - 0.25 && p.z <= other.b.z + 0.25;
        if (d < 0.22 && inRange) {
          if (horizontal) p.z = other.a.z;
          else p.x = other.a.x;
        }
      }
  return walls;
}
