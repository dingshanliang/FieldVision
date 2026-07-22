import { Html, RoundedBox, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ExtrudeGeometry, Group, RepeatWrapping, Shape, SRGBColorSpace, Texture } from "three";
import { useFarmStore } from "../state/useFarmStore";
import { deriveIrrigationEvent } from "../state/irrigationEvent";

type PbrSet = [Texture, Texture, Texture];

function useMaterialMaps(asset: "Concrete032" | "Metal025", repeat = 1): PbrSet {
  const [sourceColor, sourceNormal, sourceRoughness] = useTexture([
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Color.jpg`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_NormalGL.jpg`,
    `/assets/textures/source/${asset}/${asset}_1K-JPG_Roughness.jpg`,
  ]) as PbrSet;
  return useMemo(() => {
    const maps = [sourceColor.clone(), sourceNormal.clone(), sourceRoughness.clone()] as PbrSet;
    maps.forEach((texture) => { texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping; texture.repeat.set(repeat, repeat); });
    maps[0].colorSpace = SRGBColorSpace;
    return maps;
  }, [repeat, sourceColor, sourceNormal, sourceRoughness]);
}

function GableRoof({ width, height, depth, y, color }: { width: number; height: number; depth: number; y: number; color: string }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const result = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    result.translate(0, 0, -depth / 2);
    result.computeVertexNormals();
    return result;
  }, [width, height, depth]);
  return (
    <mesh geometry={geometry} position-y={y} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.3} envMapIntensity={0.5} />
    </mesh>
  );
}

function PumpStation() {
  const [colorMap, normalMap, roughnessMap] = useMaterialMaps("Concrete032", 1.4);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const event = deriveIrrigationEvent(progress);
  const active = event.pumpProgress > 0;
  return (
    <group position={[82, 1.6, 108]} rotation={[0, -0.16, 0]}>
      {/* concrete apron */}
      <mesh position-y={0.14} receiveShadow>
        <boxGeometry args={[21, 0.3, 16]} />
        <meshStandardMaterial color="#7d7a6e" map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} roughness={0.9} />
      </mesh>
      {/* main hall */}
      <RoundedBox args={[13, 6, 8.6]} radius={0.35} smoothness={3} position-y={3.3} castShadow receiveShadow>
        <meshStandardMaterial color="#9a9c90" map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} roughness={0.85} envMapIntensity={0.4} />
      </RoundedBox>
      <GableRoof width={14.4} height={2.4} depth={10.2} y={6.3} color="#3c434a" />
      {/* door + louvres on the south face */}
      <mesh position={[3.6, 2.5, 4.42]} castShadow>
        <boxGeometry args={[2.2, 4.2, 0.25]} />
        <meshStandardMaterial color="#2c3532" roughness={0.55} metalness={0.3} />
      </mesh>
      {[-3.2, -0.6].map((x) => (
        <group key={x} position={[x, 4.6, 4.42]}>
          <mesh>
            <boxGeometry args={[1.9, 1.3, 0.22]} />
            <meshStandardMaterial color="#38423e" roughness={0.7} metalness={0.2} />
          </mesh>
          {[-0.42, -0.14, 0.14, 0.42].map((y) => (
            <mesh key={y} position={[0, y, 0.14]}>
              <boxGeometry args={[1.72, 0.07, 0.08]} />
              <meshStandardMaterial color="#788078" metalness={0.35} roughness={0.52} />
            </mesh>
          ))}
        </group>
      ))}
      {/* status strip */}
      <mesh position={[0, 6.05, 4.45]}>
        <boxGeometry args={[6.4, 0.28, 0.1]} />
        <meshStandardMaterial color={active ? "#7ff0a5" : "#5c665f"} emissive={active ? "#3fdf7c" : "#000000"} emissiveIntensity={active ? 3.2 : 0} />
      </mesh>
      {/* outlet pipe running north into the canal */}
      <mesh position={[-5.2, 1.5, -7.2]} rotation={[Math.PI / 2.18, 0, 0]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 11.5, 20]} />
        <meshStandardMaterial color="#3d4c46" roughness={0.42} metalness={0.55} envMapIntensity={0.7} />
      </mesh>
      <mesh position={[-5.2, 3.2, -2.2]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 3.4, 20]} />
        <meshStandardMaterial color="#43524c" roughness={0.42} metalness={0.55} envMapIntensity={0.7} />
      </mesh>
      {/* pipe flanges, roof vents and safety rail make the plant read as real infrastructure */}
      <mesh position={[-5.2, 0.72, -11.9]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.16, 0.16, 10, 28]} />
        <meshStandardMaterial color="#33433e" metalness={0.65} roughness={0.38} />
      </mesh>
      {[-3.1, 3.1].map((x) => (
        <group key={x} position={[x, 8.15, -0.8]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.38, 0.48, 1.7, 16]} />
            <meshStandardMaterial color="#59625d" metalness={0.48} roughness={0.46} />
          </mesh>
          <mesh position-y={0.9} castShadow>
            <cylinderGeometry args={[0.62, 0.38, 0.18, 16]} />
            <meshStandardMaterial color="#3d4743" metalness={0.52} roughness={0.42} />
          </mesh>
        </group>
      ))}
      {[-8.4, -4.2, 0, 4.2, 8.4].map((x) => (
        <mesh key={x} position={[x, 1.2, 7.35]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 2.1, 8]} />
          <meshStandardMaterial color="#b7a55c" metalness={0.55} roughness={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 2.12, 7.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, 17, 8]} />
        <meshStandardMaterial color="#b7a55c" metalness={0.55} roughness={0.48} />
      </mesh>
      <mesh position={[-1.6, 3.5, 4.56]}>
        <boxGeometry args={[2.5, 0.7, 0.09]} />
        <meshStandardMaterial color="#273a35" roughness={0.7} />
      </mesh>
      <Html position={[0, 9.6, 0]} center distanceFactor={90}><div className="facility-tag">一号智慧泵站 <i className={active ? "is-online" : ""} /></div></Html>
    </group>
  );
}

function Gate() {
  const [colorMap, normalMap, roughnessMap] = useMaterialMaps("Metal025", 1.1);
  const [concreteColor, concreteNormal, concreteRoughness] = useMaterialMaps("Concrete032", 1.2);
  const progress = useFarmStore((state) => state.irrigationProgress);
  const event = deriveIrrigationEvent(progress);
  const opening = event.gateProgress;
  return (
    <group position={[69, 0.38, -18]} rotation={[0, 0.18, 0]}>
      <RoundedBox args={[8.4, 0.55, 5.2]} radius={0.14} smoothness={2} position-y={0.04} receiveShadow>
        <meshStandardMaterial color="#74776f" map={concreteColor} normalMap={concreteNormal} roughnessMap={concreteRoughness} roughness={0.94} />
      </RoundedBox>
      {[-2.9, 2.9].map((x) => (
        <RoundedBox key={x} args={[1.3, 4.8, 2.1]} radius={0.12} smoothness={2} position={[x, 2.55, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#858980" map={concreteColor} normalMap={concreteNormal} roughnessMap={concreteRoughness} roughness={0.9} envMapIntensity={0.28} />
        </RoundedBox>
      ))}
      {/* guide rails */}
      {[-2.32, 2.32].map((x) => (
        <mesh key={x} position={[x, 2.4, 0]}>
          <boxGeometry args={[0.18, 4.6, 0.5]} />
          <meshStandardMaterial color="#4a524e" metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 5.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[7.5, 0.42, 2.65]} />
        <meshStandardMaterial color="#5c625e" metalness={0.22} roughness={0.62} envMapIntensity={0.4} />
      </mesh>
      {/* rising gate leaf */}
      <mesh position={[0, 2.1 + opening * 2.7, 0]} castShadow>
        <boxGeometry args={[4.6, 3.6, 0.32]} />
        <meshStandardMaterial color="#96907f" map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} metalness={0.6} roughness={0.5} envMapIntensity={0.6} />
      </mesh>
      {/* hoist */}
      <RoundedBox args={[2.1, 1.2, 1.55]} radius={0.16} smoothness={2} position={[0, 5.95, 0]} castShadow>
        <meshStandardMaterial color="#31443f" metalness={0.4} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 5.95, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.09, 10, 24]} />
        <meshStandardMaterial color="#b8934a" metalness={0.75} roughness={0.32} envMapIntensity={0.8} />
      </mesh>
      {[-1.72, -0.86, 0, 0.86, 1.72].map((x) => (
        <mesh key={x} position={[x, 2.1 + opening * 2.7, 0.21]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshStandardMaterial color="#363b39" metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      {/* bridge handrails */}
      {[-1.12, 1.12].flatMap((z) => [-3.45, -1.72, 0, 1.72, 3.45].map((x) => (
        <mesh key={`${z}-${x}`} position={[x, 6.02, z]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 1.65, 8]} />
          <meshStandardMaterial color="#b8ad62" metalness={0.56} roughness={0.44} />
        </mesh>
      )))}
      {[-1.12, 1.12].map((z) => (
        <group key={z}>
          {[5.55, 6.65].map((y) => (
            <mesh key={y} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.055, 0.055, 7.1, 8]} />
              <meshStandardMaterial color="#b8ad62" metalness={0.56} roughness={0.44} />
            </mesh>
          ))}
        </group>
      ))}
      <RoundedBox args={[1.15, 1.7, 0.85]} radius={0.1} smoothness={2} position={[2.2, 6.05, -0.2]} castShadow>
        <meshStandardMaterial color="#54635d" metalness={0.38} roughness={0.52} />
      </RoundedBox>
      <mesh position={[2.2, 6.15, 0.25]}>
        <boxGeometry args={[0.58, 0.42, 0.04]} />
        <meshStandardMaterial color={event.gateProgress > 0 ? "#72d69b" : "#303936"} emissive={event.gateProgress > 0 ? "#3fbd75" : "#000000"} emissiveIntensity={event.gateProgress > 0 ? 1.6 : 0} />
      </mesh>
    </group>
  );
}

function WeatherStation() {
  const rotor = useRef<Group>(null);
  useFrame((_, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * 2.4;
  });
  return (
    <group position={[-12, 0.9, 132]}>
      <mesh position-y={4.5} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 9, 10]} />
        <meshStandardMaterial color="#b9c0ba" metalness={0.7} roughness={0.35} envMapIntensity={0.6} />
      </mesh>
      {/* solar panel */}
      <mesh position={[1.05, 3.1, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[1.6, 0.08, 1.1]} />
        <meshStandardMaterial color="#20344d" metalness={0.55} roughness={0.3} envMapIntensity={0.9} />
      </mesh>
      {/* radiation shield */}
      <mesh position={[-0.85, 4.4, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.8, 12]} />
        <meshStandardMaterial color="#dde3de" roughness={0.5} />
      </mesh>
      {/* crossarm + anemometer */}
      <mesh position={[0, 8.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
        <meshStandardMaterial color="#aeb6b0" metalness={0.7} roughness={0.4} />
      </mesh>
      <group ref={rotor} position={[0, 9.1, 0]}>
        {[0, 1, 2].map((index) => (
          <group key={index} rotation={[0, (index * Math.PI * 2) / 3, 0]}>
            <mesh position={[0.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.84, 6]} />
              <meshStandardMaterial color="#c8cec8" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0.84, 0, 0]}>
              <sphereGeometry args={[0.16, 10, 8]} />
              <meshStandardMaterial color="#333d3a" roughness={0.45} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh position={[0, 9.5, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#e8ede8" roughness={0.35} />
      </mesh>
    </group>
  );
}

function Warehouse() {
  return (
    <group position={[-122, 1.4, 112]} rotation={[0, -0.35, 0]}>
      <mesh position-y={0.12} receiveShadow>
        <boxGeometry args={[26, 0.25, 17]} />
        <meshStandardMaterial color="#6f6a5c" roughness={0.95} envMapIntensity={0.25} />
      </mesh>
      <RoundedBox args={[22, 6.4, 13]} radius={0.4} smoothness={3} position-y={3.4} castShadow receiveShadow>
        <meshStandardMaterial color="#84796a" roughness={0.85} envMapIntensity={0.35} />
      </RoundedBox>
      <GableRoof width={23.4} height={3} depth={14.4} y={6.6} color="#414a44" />
      {/* sliding door + windows on the front face */}
      <mesh position={[0, 2.9, 6.62]} castShadow>
        <boxGeometry args={[7, 5, 0.3]} />
        <meshStandardMaterial color="#3c4c44" roughness={0.5} metalness={0.35} />
      </mesh>
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((x) => (
        <mesh key={x} position={[x, 2.9, 6.81]}>
          <boxGeometry args={[0.05, 4.7, 0.04]} />
          <meshStandardMaterial color="#68736c" metalness={0.34} roughness={0.58} />
        </mesh>
      ))}
      {[-7.5, 7.5].map((x) => (
        <mesh key={x} position={[x, 4.3, 6.62]}>
          <boxGeometry args={[2.4, 1.4, 0.2]} />
          <meshStandardMaterial color="#2d3a36" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function Facilities() {
  return (
    <group>
      <PumpStation />
      <Gate />
      <WeatherStation />
      <Warehouse />
    </group>
  );
}
