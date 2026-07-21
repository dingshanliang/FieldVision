import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ExtrudeGeometry, MeshPhysicalMaterial, Path, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, Texture, Vector2 } from "three";
import type { FieldParcel as FieldParcelType } from "../types/farm";
import { useFarmStore } from "../state/useFarmStore";
import { CropInstances } from "./CropInstances";

interface FieldParcelProps { field: FieldParcelType }

type PbrSet = [Texture, Texture, Texture];

function useConfiguredMaps(asset: "Ground037" | "Ground026", repeat: number): PbrSet {
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

function shapeFromPolygon(polygon: Array<[number, number]>) {
  const shape = new Shape();
  polygon.forEach(([x, z], index) => (index === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  shape.closePath();
  return shape;
}

function pathFromPolygon(polygon: Array<[number, number]>) {
  const path = new Path();
  polygon.forEach(([x, z], index) => (index === 0 ? path.moveTo(x, -z) : path.lineTo(x, -z)));
  path.closePath();
  return path;
}

/** Push every vertex outward from the centroid — good enough for the convex-ish parcels. */
function expandPolygon(polygon: Array<[number, number]>, distance: number) {
  const cx = polygon.reduce((sum, [x]) => sum + x, 0) / polygon.length;
  const cz = polygon.reduce((sum, [, z]) => sum + z, 0) / polygon.length;
  return polygon.map(([x, z]): [number, number] => {
    const dx = x - cx;
    const dz = z - cz;
    const length = Math.hypot(dx, dz) || 1;
    return [x + (dx / length) * distance, z + (dz / length) * distance];
  });
}

export function FieldParcel({ field }: FieldParcelProps) {
  const [soilColor, soilNormal, soilRoughness] = useConfiguredMaps("Ground037", 0.06);
  const [rimColor, rimNormal, rimRoughness] = useConfiguredMaps("Ground037", 0.18);
  const [dryColor, dryNormal, dryRoughness] = useConfiguredMaps("Ground026", 0.08);
  const selectedFieldId = useFarmStore((state) => state.selectedFieldId);
  const hoveredFieldId = useFarmStore((state) => state.hoveredFieldId);
  const layerMode = useFarmStore((state) => state.layerMode);
  const viewMode = useFarmStore((state) => state.viewMode);
  const irrigationProgress = useFarmStore((state) => state.irrigationProgress);
  const selectField = useFarmStore((state) => state.selectField);
  const setHoveredField = useFarmStore((state) => state.setHoveredField);
  const setViewMode = useFarmStore((state) => state.setViewMode);
  const waterMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const selected = selectedFieldId === field.id;
  const hovered = hoveredFieldId === field.id;
  const isRice = field.cropType === "rice";
  const isHero = field.id === "A02";

  // Flat-topped slab with dark soil sides — no more glowing turf bevel.
  const slabGeometry = useMemo(() => {
    const result = new ExtrudeGeometry(shapeFromPolygon(field.polygon), { depth: 0.42, bevelEnabled: false });
    result.rotateX(-Math.PI / 2);
    result.computeVertexNormals();
    return result;
  }, [field.polygon]);

  // Raised earthen rim (田埂) around the parcel.
  const rimGeometry = useMemo(() => {
    const outer = shapeFromPolygon(expandPolygon(field.polygon, 1.35));
    outer.holes.push(pathFromPolygon(field.polygon));
    const result = new ExtrudeGeometry(outer, { depth: 0.34, bevelEnabled: false });
    result.rotateX(-Math.PI / 2);
    result.computeVertexNormals();
    return result;
  }, [field.polygon]);

  const waterGeometry = useMemo(() => {
    if (!isRice) return null;
    const result = new ShapeGeometry(shapeFromPolygon(expandPolygon(field.polygon, -0.4)), 24);
    result.rotateX(-Math.PI / 2);
    return result;
  }, [field.polygon, isRice]);

  const waterNormalScale = useMemo(() => new Vector2(0.55, 0.55), []);

  const center = useMemo(() => {
    const sum = field.polygon.reduce(([x, z], point) => [x + point[0], z + point[1]], [0, 0]);
    return [sum[0] / field.polygon.length, sum[1] / field.polygon.length] as const;
  }, [field.polygon]);

  const soilTint = useMemo(() => {
    if (layerMode === "growth") return field.status === "risk" ? "#8a5a30" : field.status === "attention" ? "#7d7040" : "#4a5c34";
    if (layerMode === "moisture") return field.moisture < 21 ? "#7d543a" : field.moisture < 25 ? "#5d5c3c" : "#39584c";
    if (layerMode === "facility") return "#43413a";
    return isRice ? "#7d6c4d" : "#71624a";
  }, [field, isRice, layerMode]);

  // A02 starts parched: low, dull water that rises and clears with irrigation.
  const waterLevel = isHero ? 0.435 + irrigationProgress * 0.055 : 0.46;
  const waterOpacity = isHero ? 0.42 + irrigationProgress * 0.46 : 0.86;

  useFrame((_, delta) => {
    const normal = waterMaterialRef.current?.normalMap;
    if (normal) {
      normal.offset.x += delta * 0.008;
      normal.offset.y += delta * 0.005;
    }
  });

  return (
    <group>
      <mesh
        geometry={slabGeometry}
        position-y={field.elevation}
        receiveShadow
        onPointerOver={(event) => { event.stopPropagation(); setHoveredField(field.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHoveredField(null); document.body.style.cursor = "default"; }}
        onClick={(event) => { event.stopPropagation(); selectField(field.id); setViewMode("field-aerial"); }}
      >
        <meshStandardMaterial
          attach="material-0"
          color={soilTint}
          map={soilColor}
          normalMap={soilNormal}
          roughnessMap={soilRoughness}
          roughness={1}
          metalness={0}
          envMapIntensity={0.22}
        />
        <meshStandardMaterial attach="material-1" color="#3d332a" roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={rimGeometry} position-y={field.elevation + 0.4} receiveShadow castShadow>
        <meshStandardMaterial
          color={selected || hovered ? "#8a6b3e" : "#5f5038"}
          map={rimColor}
          normalMap={rimNormal}
          roughnessMap={rimRoughness}
          roughness={0.96}
          metalness={0}
          emissive={selected || hovered ? "#c98f3d" : "#000000"}
          emissiveIntensity={selected ? 0.1 : hovered ? 0.05 : 0}
          envMapIntensity={0.35}
        />
      </mesh>
      {isRice && waterGeometry && (
        <mesh geometry={waterGeometry} position-y={field.elevation + waterLevel} receiveShadow>
          <meshPhysicalMaterial
            ref={waterMaterialRef}
            color={isHero && irrigationProgress < 0.5 ? "#56543e" : "#3d5248"}
            roughness={0.07}
            metalness={0}
            clearcoat={0.6}
            clearcoatRoughness={0.22}
            transparent
            opacity={waterOpacity}
            normalMap={soilNormal}
            normalScale={waterNormalScale}
            envMapIntensity={1.35}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
      {isHero && field.riskZones?.[0] && irrigationProgress < 0.98 && (
        <mesh
          position={[field.riskZones[0].center[0], field.elevation + 0.43, field.riskZones[0].center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[field.riskZones[0].radius * 0.92, 40]} />
          <meshStandardMaterial
            color="#8a6b47"
            map={dryColor}
            normalMap={dryNormal}
            roughnessMap={dryRoughness}
            roughness={1}
            transparent
            opacity={0.9 * (1 - irrigationProgress)}
            envMapIntensity={0.25}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}
      <CropInstances field={field} selected={selected} />
      {(hovered || selected) && viewMode !== "field-ground" && viewMode !== "irrigation" && (
        <Html position={[center[0], field.elevation + 7.5, center[1]]} center distanceFactor={80} zIndexRange={[20, 0]}>
          <div className={`field-label ${selected ? "field-label--selected" : ""}`}>
            <span>{field.id}</span>
            <strong>{field.name}</strong>
            <small>{field.cropLabel} · {field.areaMu} 亩</small>
          </div>
        </Html>
      )}
    </group>
  );
}
