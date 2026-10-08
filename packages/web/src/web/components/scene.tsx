import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { OrbitControls, Edges, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  bounds,
  length,
  nearest,
  type Project,
  type Wall,
} from "../lib/project";
type Props = {
  project: Project;
  selected: string | null;
  onSelect: (id: string, offset?: number) => void;
  cutaway: boolean;
  reset: number;
  tool: string;
};
function Box({
  p,
  s,
  color,
  edges = false,
  opacity = 1,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  edges?: boolean;
  opacity?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        transparent={opacity < 1}
        opacity={opacity}
      />
      {edges && <Edges color="#64675f" threshold={20} />}
    </mesh>
  );
}
function WallMesh({
  wall,
  selected,
  onSelect,
  hidden,
}: {
  wall: Wall;
  selected: boolean;
  onSelect: Props["onSelect"];
  hidden: boolean;
}) {
  const l = length(wall);
  const parts = useMemo(() => {
    const arr: { x: number; y: number; w: number; h: number }[] = [];
    let last = 0;
    for (const o of [...wall.openings].sort((a, b) => a.offset - b.offset)) {
      if (o.offset > last)
        arr.push({
          x: (last + o.offset) / 2,
          y: wall.height / 2,
          w: o.offset - last,
          h: wall.height,
        });
      if (o.sill > 0)
        arr.push({
          x: o.offset + o.width / 2,
          y: o.sill / 2,
          w: o.width,
          h: o.sill,
        });
      const top = wall.height - o.sill - o.height;
      if (top > 0)
        arr.push({
          x: o.offset + o.width / 2,
          y: o.sill + o.height + top / 2,
          w: o.width,
          h: top,
        });
      last = o.offset + o.width;
    }
    if (last < l)
      arr.push({
        x: (last + l) / 2,
        y: wall.height / 2,
        w: l - last,
        h: wall.height,
      });
    return arr;
  }, [wall, l]);
  if (hidden) return null;
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(wall.id, nearest(wall, { x: e.point.x, z: e.point.z }));
  };
  return (
    <group
      position={[wall.a.x, 0, wall.a.z]}
      rotation={[0, -Math.atan2(wall.b.z - wall.a.z, wall.b.x - wall.a.x), 0]}
      onClick={click}
    >
      {parts.map((p, i) => (
        <Box
          key={i}
          p={[p.x, p.y, 0]}
          s={[p.w, p.h, wall.thickness]}
          color={selected ? "#b5d1c3" : wall.color}
          edges
        />
      ))}
      {wall.openings.map((o) => (
        <group key={o.id} position={[o.offset + o.width / 2, o.sill, 0]}>
          {[-0.5, 0.5].map((k) => (
            <Box
              key={k}
              p={[k * (o.width - 0.055), o.height / 2, 0]}
              s={[0.055, o.height, wall.thickness + 0.04]}
              color="#788379"
            />
          ))}
          <Box
            p={[0, o.height - 0.03, 0]}
            s={[o.width, 0.06, wall.thickness + 0.04]}
            color="#788379"
          />
          {o.kind === "window" ? (
            <>
              <Box
                p={[0, 0.03, 0]}
                s={[o.width, 0.06, wall.thickness + 0.04]}
                color="#788379"
              />
              <Box
                p={[0, o.height / 2, 0]}
                s={[0.04, o.height, 0.04]}
                color="#788379"
              />
              <Box
                p={[0, o.height / 2, 0]}
                s={[o.width - 0.1, o.height - 0.1, 0.025]}
                color="#a5c9d0"
                opacity={0.32}
              />
            </>
          ) : (
            <group position={[-o.width / 2, 0.01, 0]} rotation={[0, -0.85, 0]}>
              <Box
                p={[o.width / 2, o.height / 2, 0]}
                s={[o.width - 0.08, o.height - 0.06, 0.045]}
                color="#c3a17e"
                edges
              />
              <Box
                p={[o.width - 0.15, o.height * 0.46, 0.05]}
                s={[0.09, 0.025, 0.08]}
                color="#515b55"
              />
            </group>
          )}
        </group>
      ))}
    </group>
  );
}
function Furniture() {
  return (
    <group>
      <Box p={[3.3, 0.04, 6.3]} s={[4.7, 0.04, 3.2]} color="#d9d7cb" />
      <Box p={[2.1, 0.32, 6.3]} s={[1.1, 0.5, 3.1]} color="#b4b7a9" edges />
      <Box p={[1.75, 0.85, 6.3]} s={[0.4, 0.8, 3.1]} color="#a1a696" />
      {[5.3, 6.3, 7.3].map((z) => (
        <Box
          key={z}
          p={[2.24, 0.62, z]}
          s={[0.88, 0.19, 0.91]}
          color="#c8cabd"
          edges
        />
      ))}
      <Box p={[4.3, 0.36, 6.3]} s={[1.8, 0.16, 1]} color="#ae8664" edges />
      <Box p={[4.3, 0.16, 6.3]} s={[1.4, 0.3, 0.7]} color="#333e36" />
      <Box p={[9.9, 0.34, 6.95]} s={[3.05, 0.52, 3.45]} color="#aa927d" edges />
      <Box p={[9.9, 0.65, 7]} s={[2.9, 0.24, 3.2]} color="#eeeae0" edges />
      <Box p={[9.9, 0.85, 5.45]} s={[3, 0.95, 0.16]} color="#b7ac99" />
      {[9.15, 10.65].map((x) => (
        <Box
          key={x}
          p={[x, 0.85, 5.85]}
          s={[1.15, 0.18, 0.65]}
          color="#fffdf3"
        />
      ))}
      <Box p={[2, 0.48, 0.6]} s={[3.7, 0.95, 0.95]} color="#a1aa9b" edges />
      <Box p={[2, 0.98, 0.6]} s={[3.8, 0.08, 1.05]} color="#edece4" />
      <Box p={[3.2, 0.49, 2.2]} s={[2.9, 0.95, 0.9]} color="#b7a38a" edges />
      <Box p={[3.2, 1, 2.2]} s={[3, 0.08, 1]} color="#eeece4" />
      <Box p={[9.8, 0.73, 2.3]} s={[2.4, 0.1, 1.1]} color="#a78865" edges />
      {[9, 10.6].flatMap((x) =>
        [1.25, 3.3].map((z) => (
          <group key={`${x}-${z}`}>
            <Box p={[x, 0.4, z]} s={[0.55, 0.08, 0.55]} color="#607365" />
            <Box p={[x, 0.22, z]} s={[0.4, 0.4, 0.4]} color="#a78e74" />
            <Box
              p={[x, 0.75, z + (z < 2 ? -0.24 : 0.24)]}
              s={[0.55, 0.6, 0.06]}
              color="#607365"
            />
          </group>
        )),
      )}
      <mesh position={[0.7, 0.4, 8.2]} castShadow>
        <cylinderGeometry args={[0.25, 0.18, 0.65, 16]} />
        <meshStandardMaterial color="#bfa78d" />
      </mesh>
      <mesh position={[0.7, 1.05, 8.2]} castShadow>
        <sphereGeometry args={[0.48, 16, 16]} />
        <meshStandardMaterial color="#607958" />
      </mesh>
    </group>
  );
}
function CameraFit({ project, reset }: { project: Project; reset: number }) {
  const { camera, controls } = useThree();
  const currentProject = useRef(project);
  currentProject.current = project;
  useEffect(() => {
    const b = bounds(currentProject.current),
      size = Math.max(b.width, b.depth, 5),
      cx = (b.minX + b.maxX) / 2,
      cz = (b.minZ + b.maxZ) / 2;
    camera.position.set(cx + size * 0.9, size * 0.95, cz + size * 1.05);
    camera.lookAt(cx, 0, cz);
    if (controls && "target" in controls) {
      (controls as any).target.set(cx, 0, cz);
      (controls as any).update();
    }
  }, [reset, camera, controls]);
  return null;
}
function World(props: Props) {
  const { project: p } = props;
  const b = bounds(p),
    evening = p.light === "evening",
    night = p.light === "night";
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle =
      p.floor === "wood"
        ? "#c5b292"
        : p.floor === "tile"
          ? "#d7d5cd"
          : "#bfbfb7";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = p.floor === "wood" ? "#b09b7d" : "#aaa99f";
    ctx.lineWidth = 1;
    if (p.floor === "wood") {
      for (let y = 0; y < 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((y % 64) * 3 + 50, y);
        ctx.lineTo((y % 64) * 3 + 50, y + 32);
        ctx.stroke();
      }
    } else if (p.floor === "tile") {
      ctx.strokeRect(0, 0, 128, 128);
      ctx.strokeRect(128, 128, 128, 128);
      ctx.strokeRect(0, 128, 128, 128);
      ctx.strokeRect(128, 0, 128, 128);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(b.width / 2, b.depth / 2);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [p.floor, b.width, b.depth]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      <color attach="background" args={[night ? "#333e43" : "#eff0eb"]} />
      <ambientLight intensity={night ? 0.35 : 1.3} />
      <directionalLight
        castShadow
        position={[3, 15, 5]}
        intensity={night ? 0.4 : evening ? 2.4 : 2}
        color={evening ? "#ffd7a1" : "#fff9ed"}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      {night && (
        <pointLight position={[5, 4, 4]} intensity={65} color="#ffe0ad" />
      )}
      <gridHelper
        args={[
          Math.max(40, b.width * 3, b.depth * 3),
          80,
          "#bcc6bc",
          "#d9ded5",
        ]}
        position={[b.width / 2, -0.17, b.depth / 2]}
      />
      <mesh
        receiveShadow
        position={[(b.minX + b.maxX) / 2, -0.07, (b.minZ + b.maxZ) / 2]}
      >
        <boxGeometry args={[b.width + 0.2, 0.14, b.depth + 0.2]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
        <Edges color="#8b9288" />
      </mesh>
      {p.walls.map((w) => (
        <WallMesh
          key={w.id}
          wall={w}
          selected={props.selected === w.id}
          onSelect={props.onSelect}
          hidden={
            props.cutaway &&
            ((w.a.z >= b.maxZ - 0.05 && w.b.z >= b.maxZ - 0.05) ||
              (w.a.x >= b.maxX - 0.05 && w.b.x >= b.maxX - 0.05))
          }
        />
      ))}
      {p.furniture && <Furniture />}
      <ContactShadows
        position={[b.width / 2, -0.16, b.depth / 2]}
        opacity={0.25}
        scale={Math.max(b.width, b.depth) * 2.5}
        blur={2.5}
        far={6}
        resolution={256}
      />
      <OrbitControls
        makeDefault
        minDistance={2}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2 - 0.025}
      />
      <CameraFit project={p} reset={props.reset} />
    </>
  );
}
export default function Scene(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="scene">
      <Canvas
        shadows
        camera={{ position: [18, 17, 19], fov: 42 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <World {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
