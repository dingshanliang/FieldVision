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

function FarmUtilityVehicle() {
  return (
    <group position={[121, 0.58, 100]} rotation={[0, -1.42, 0]}>
      <mesh position-y={0.78} castShadow receiveShadow>
        <boxGeometry args={[2.15, 0.65, 4.7]} />
        <meshStandardMaterial color="#566349" roughness={0.78} metalness={0.16} envMapIntensity={0.38} />
      </mesh>
      <mesh position={[0, 1.55, -0.7]} castShadow>
        <boxGeometry args={[1.95, 1.28, 1.65]} />
        <meshStandardMaterial color="#6d7557" roughness={0.66} metalness={0.14} envMapIntensity={0.42} />
      </mesh>
      <mesh position={[0, 1.66, -1.56]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.7, 0.72, 0.07]} />
        <meshPhysicalMaterial color="#6f8884" roughness={0.2} metalness={0.08} transmission={0.08} transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, 1.0, 1.08]} receiveShadow>
        <boxGeometry args={[1.82, 0.22, 1.85]} />
        <meshStandardMaterial color="#4a523d" roughness={0.86} />
      </mesh>
      {[-1.08, 1.08].flatMap((x) => [-1.42, 1.38].map((z) => (
        <group key={`${x}-${z}`} position={[x, 0.55, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.48, 0.48, 0.32, 18]} />
            <meshStandardMaterial color="#20231f" roughness={0.98} />
          </mesh>
          <mesh position-y={x > 0 ? 0.18 : -0.18}>
            <cylinderGeometry args={[0.19, 0.19, 0.04, 14]} />
            <meshStandardMaterial color="#74776f" roughness={0.55} metalness={0.58} />
          </mesh>
        </group>
      )))}
      <mesh position={[0, 2.32, -0.72]} castShadow>
        <boxGeometry args={[1.45, 0.11, 1.22]} />
        <meshStandardMaterial color="#4b5141" roughness={0.78} />
      </mesh>
    </group>
  );
}

function FieldWorker() {
  return (
    <group position={[61, 0.48, -27]} rotation={[0, -0.65, 0]}>
      <mesh position-y={1.12} castShadow>
        <capsuleGeometry args={[0.2, 0.68, 6, 10]} />
        <meshStandardMaterial color="#405c50" roughness={0.92} />
      </mesh>
      <mesh position-y={1.72} castShadow>
        <sphereGeometry args={[0.18, 14, 10]} />
        <meshStandardMaterial color="#9a765b" roughness={0.88} />
      </mesh>
      <mesh position-y={1.89} castShadow>
        <cylinderGeometry args={[0.32, 0.22, 0.08, 18]} />
        <meshStandardMaterial color="#7b7044" roughness={0.94} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.43, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.62, 4, 8]} />
          <meshStandardMaterial color="#313933" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

function HeroIrrigationInlet() {
  return (
    <group position={[57, 0.58, -34]} rotation={[0, -0.48, 0]}>
      {/* concrete headwall and culvert mouth */}
      {[-1.62, 1.62].map((x) => (
        <mesh key={x} position={[x, 1.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.52, 2.25, 2.2]} />
          <meshStandardMaterial color="#777970" roughness={0.94} metalness={0} envMapIntensity={0.22} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.82, 0.18, 12, 28]} />
        <meshStandardMaterial color="#4c514d" roughness={0.76} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.84, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 28]} />
        <meshPhysicalMaterial color="#263d39" roughness={0.28} clearcoat={0.32} clearcoatRoughness={0.35} />
      </mesh>
      {/* tide marks and accumulated silt make the connection read as used infrastructure */}
      <mesh position={[0, 0.33, 0.78]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#4b4432" roughness={1} transparent opacity={0.52} polygonOffset polygonOffsetFactor={-3} />
      </mesh>
      <mesh position={[1.91, 0.84, 0.01]}>
        <boxGeometry args={[0.04, 1.12, 1.65]} />
        <meshStandardMaterial color="#4f5f52" roughness={0.88} transparent opacity={0.44} />
      </mesh>
      {/* water gauge with alternating decimetre marks */}
      <group position={[2.05, 1.18, -0.82]}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 2.15, 0.08]} />
          <meshStandardMaterial color="#d4d2bb" roughness={0.72} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh key={index} position={[index % 2 ? 0.04 : -0.04, -0.78 + index * 0.22, -0.055]}>
            <boxGeometry args={[index % 2 ? 0.13 : 0.2, 0.035, 0.025]} />
            <meshBasicMaterial color={index % 2 ? "#be5a43" : "#303d38"} />
          </mesh>
        ))}
      </group>
      <group position={[-2.15, 1.68, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 2.5, 0.12]} />
          <meshStandardMaterial color="#4e554e" metalness={0.26} roughness={0.64} />
        </mesh>
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[1.45, 0.55, 0.12]} />
          <meshStandardMaterial color="#456051" roughness={0.72} metalness={0.18} />
        </mesh>
      </group>
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
      <FarmUtilityVehicle />
      {tier !== "low" && <FieldWorker />}
      <HeroIrrigationInlet />
    </group>
  );
}
