import { useMemo } from "react";
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector3,
} from "three";
import { fields } from "../data/fields";
import { createCropClumpGeometry, pointInPolygon, seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

interface DetailSpec {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  tone: number;
}

function occupiedByField(x: number, z: number) {
  return fields.some((field) => pointInPolygon([x, z], field.polygon));
}

function FieldMarginVegetation({ count }: { count: number }) {
  const geometry = useMemo(
    () => createCropClumpGeometry({ blades: 9, height: 0.82, width: 0.024, lean: 0.28, spread: 0.24, seed: 8127 }),
    [],
  );
  const specs = useMemo(() => {
    const random = seededRandom(41819);
    const result: DetailSpec[] = [];
    let attempts = 0;
    while (result.length < count && attempts < count * 14) {
      attempts += 1;
      const x = -188 + random() * 376;
      const z = -132 + random() * 282;
      const canalClearance = z > -76 && z < 124 && Math.abs(x - 70) < 12;
      if (occupiedByField(x, z) || canalClearance) continue;
      result.push({ x, z, scale: 0.62 + random() * 1.4, rotation: random() * Math.PI * 2, tone: random() });
    }
    return result;
  }, [count]);

  const setInstances = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const color = new Color();
    const dry = new Color("#8a8052");
    const green = new Color("#526744");
    specs.forEach((spec, index) => {
      quaternion.setFromAxisAngle(up, spec.rotation);
      matrix.compose(new Vector3(spec.x, 0.18, spec.z), quaternion, new Vector3(spec.scale, spec.scale, spec.scale));
      mesh.setMatrixAt(index, matrix);
      color.copy(dry).lerp(green, spec.tone * 0.8);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return (
    <instancedMesh args={[geometry, undefined, specs.length]} ref={setInstances} receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.96} metalness={0} envMapIntensity={0.18} />
    </instancedMesh>
  );
}

function Stones({ count }: { count: number }) {
  const geometry = useMemo(() => new DodecahedronGeometry(0.42, 0), []);
  const specs = useMemo(() => {
    const random = seededRandom(9331);
    const result: DetailSpec[] = [];
    while (result.length < count) {
      const x = -192 + random() * 384;
      const z = -136 + random() * 292;
      if (occupiedByField(x, z)) continue;
      result.push({ x, z, scale: 0.18 + random() * 1.1, rotation: random() * Math.PI * 2, tone: random() });
    }
    return result;
  }, [count]);
  const setInstances = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const color = new Color();
    const dark = new Color("#59594d");
    const light = new Color("#898476");
    specs.forEach((spec, index) => {
      quaternion.setFromAxisAngle(up, spec.rotation);
      matrix.compose(
        new Vector3(spec.x, 0.2 + spec.scale * 0.08, spec.z),
        quaternion,
        new Vector3(spec.scale * 1.35, spec.scale * 0.58, spec.scale),
      );
      mesh.setMatrixAt(index, matrix);
      color.copy(dark).lerp(light, spec.tone);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  return (
    <instancedMesh args={[geometry, undefined, specs.length]} ref={setInstances} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.98} metalness={0} />
    </instancedMesh>
  );
}

const polePositions = [-88, -56, -24, 8, 40, 72, 104];

function UtilityLine() {
  const poleGeometry = useMemo(() => new CylinderGeometry(0.16, 0.24, 8.8, 10), []);
  const wires = useMemo(() => {
    const result: TubeGeometry[] = [];
    for (let index = 0; index < polePositions.length - 1; index += 1) {
      const z0 = polePositions[index]!;
      const z1 = polePositions[index + 1]!;
      for (const xOffset of [-0.8, 0.8]) {
        const curve = new CatmullRomCurve3([
          new Vector3(-157 + xOffset, 8.6, z0),
          new Vector3(-157 + xOffset, 7.9, (z0 + z1) / 2),
          new Vector3(-157 + xOffset, 8.6, z1),
        ]);
        result.push(new TubeGeometry(curve, 18, 0.026, 5, false));
      }
    }
    return result;
  }, []);
  return (
    <group>
      {polePositions.map((z) => (
        <group key={z} position={[-157, 0, z]}>
          <mesh geometry={poleGeometry} position-y={4.5} castShadow>
            <meshStandardMaterial color="#625d4f" roughness={0.94} />
          </mesh>
          <mesh position-y={8.55} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 2.3, 8]} />
            <meshStandardMaterial color="#454b48" metalness={0.45} roughness={0.58} />
          </mesh>
          {[-0.8, 0.8].map((x) => (
            <mesh key={x} position={[x, 8.72, 0]}>
              <cylinderGeometry args={[0.085, 0.11, 0.36, 10]} />
              <meshStandardMaterial color="#b8b9ac" roughness={0.48} />
            </mesh>
          ))}
        </group>
      ))}
      {wires.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial color="#2d3230" roughness={0.7} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function GroundDetails() {
  const tier = usePerformanceTier();
  return (
    <group>
      <FieldMarginVegetation count={tier === "high" ? 1400 : tier === "medium" ? 720 : 280} />
      <Stones count={tier === "high" ? 96 : tier === "medium" ? 52 : 24} />
      {tier !== "low" && <UtilityLine />}
    </group>
  );
}
