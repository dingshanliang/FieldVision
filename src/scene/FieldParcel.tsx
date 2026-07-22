import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, ExtrudeGeometry, MeshPhysicalMaterial, Path, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, Texture, Vector2 } from "three";
import type { WebGLProgramParametersWithUniforms } from "three";
import type { FieldParcel as FieldParcelType } from "../types/farm";
import { useFarmStore } from "../state/useFarmStore";
import { heroIrrigationInlet } from "../data/fields";
import { seededRandom } from "../utils/geometry";
import { CropInstances } from "./CropInstances";
import { deriveEvidenceState } from "../state/evidenceModel";

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

function makeCanopyTexture(cropType: FieldParcelType["cropType"]) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#b9baa8";
    context.fillRect(0, 0, 128, 128);
    const rowGap = cropType === "corn" ? 18 : cropType === "vegetable" ? 10 : 13;
    const rowWidth = cropType === "corn" ? 5 : cropType === "vegetable" ? 6 : 4;
    for (let x = -16; x < 144; x += rowGap) {
      const gradient = context.createLinearGradient(x, 0, x + rowWidth, 0);
      gradient.addColorStop(0, "rgba(50, 56, 38, 0.16)");
      gradient.addColorStop(0.45, "rgba(31, 38, 23, 0.48)");
      gradient.addColorStop(1, "rgba(50, 56, 38, 0.12)");
      context.fillStyle = gradient;
      context.fillRect(x, 0, rowWidth, 128);
    }
    const random = seededRandom(cropType.charCodeAt(0) * 631);
    for (let index = 0; index < 420; index += 1) {
      const shade = random() > 0.5 ? 255 : 42;
      context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.025 + random() * 0.07})`;
      context.fillRect(random() * 128, random() * 128, 0.7 + random() * 1.6, 0.7 + random() * 1.6);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(cropType === "corn" ? 7 : 10, cropType === "corn" ? 7 : 10);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
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
  const demoStep = useFarmStore((state) => state.demoStep);
  const irrigationProgress = useFarmStore((state) => state.irrigationProgress);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const status = useFarmStore((state) => state.fieldStatuses[field.id] ?? field.status);
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
    const result = new ExtrudeGeometry(outer, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.16,
      bevelThickness: 0.12,
    });
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

  // A dense aerial LOD sits below the individual plants. It prevents thousands
  // of thin blades collapsing into high-contrast pixels in overview shots, but
  // disappears for ground-level views where the real row spacing must remain.
  const cropCanopyGeometry = useMemo(() => {
    const result = new ShapeGeometry(shapeFromPolygon(expandPolygon(field.polygon, -0.85)), 24);
    result.rotateX(-Math.PI / 2);
    return result;
  }, [field.polygon]);
  const cropCanopyMap = useMemo(() => makeCanopyTexture(field.cropType), [field.cropType]);

  const waterNormalScale = useMemo(() => new Vector2(0.16, 0.16), []);

  const center = useMemo(() => {
    const sum = field.polygon.reduce(([x, z], point) => [x + point[0], z + point[1]], [0, 0]);
    return [sum[0] / field.polygon.length, sum[1] / field.polygon.length] as const;
  }, [field.polygon]);

  const soilTint = useMemo(() => {
    if (layerMode === "growth") return status === "risk" ? "#8a5a30" : status === "attention" ? "#7d7040" : "#4a5c34";
    if (layerMode === "moisture") return field.moisture < 21 ? "#7d543a" : field.moisture < 25 ? "#5d5c3c" : "#39584c";
    if (layerMode === "facility") return "#43413a";
    return isRice ? "#a18f70" : "#96866b";
  }, [field, isRice, layerMode, status]);

  const canopyColor = useMemo(() => {
    if (layerMode === "growth") return status === "risk" ? "#827047" : "#526745";
    if (layerMode === "moisture") return field.moisture < 21 ? "#766247" : "#4b6256";
    if (layerMode === "facility") return "#54564e";
    if (field.cropType === "corn") return "#6f8352";
    if (field.cropType === "vegetable") return "#68916a";
    if (field.cropType === "rapeseed") return "#89945a";
    return "#778b58";
  }, [field, layerMode, status]);

  const evidence = deriveEvidenceState(scanProgress, irrigationProgress);

  // A02 starts parched: low, dull water that rises and clears with irrigation.
  const waterLevel = isHero ? 0.435 + evidence.wettingProgress * 0.055 : 0.46;
  const waterOpacity = 0.72;

  // Hero field: the wetting front advances from the canal inlet — dull stagnant
  // water ahead of the front, clear reflective water behind it, plus a bright
  // ripple band right at the front edge. Driven by uFront = irrigationProgress.
  const waterShader = useRef<WebGLProgramParametersWithUniforms | null>(null);
  const patchWaterShader = useMemo(() => {
    if (!isHero) return undefined;
    return (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uFront = { value: 0 };
      shader.uniforms.uInlet = { value: new Vector2(heroIrrigationInlet.x, heroIrrigationInlet.z) };
      shader.uniforms.uFrontMax = { value: heroIrrigationInlet.frontMax };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vFvWorld;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vFvWorld;
          uniform float uFront;
          uniform vec2 uInlet;
          uniform float uFrontMax;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          {
            float fvDist = distance(vFvWorld.xz, uInlet);
            float fvFront = uFront * uFrontMax;
            float fvInside = 1.0 - smoothstep(fvFront - 2.0, fvFront + 0.5, fvDist);
            diffuseColor.rgb = mix(vec3(0.337, 0.329, 0.243), vec3(0.148, 0.224, 0.196), fvInside);
            float fvBand = smoothstep(fvFront - 9.0, fvFront - 3.0, fvDist)
              * (1.0 - smoothstep(fvFront - 3.0, fvFront - 0.2, fvDist))
              * step(0.01, uFront) * step(uFront, 0.995);
            diffuseColor.rgb += fvBand * vec3(1.0, 0.84, 0.58) * 0.65;
            diffuseColor.a = mix(0.42, 0.82, fvInside);
          }`);
      waterShader.current = shader;
    };
  }, [isHero]);

  useFrame((_, delta) => {
    const normal = waterMaterialRef.current?.normalMap;
    if (normal) {
      normal.offset.x += delta * 0.008;
      normal.offset.y += delta * 0.005;
    }
    const shader = waterShader.current;
    if (shader) shader.uniforms.uFront!.value = evidence.wettingProgress;
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
            color={isHero ? "#51665a" : "#50645b"}
            roughness={isHero ? 0.42 : 0.38}
            metalness={0}
            clearcoat={isHero ? 0.2 : 0.28}
            clearcoatRoughness={0.38}
            transparent
            opacity={isHero ? 1 : waterOpacity}
            onBeforeCompile={patchWaterShader}
            normalMap={soilNormal}
            normalScale={waterNormalScale}
            envMapIntensity={isHero ? 0.48 : 0.55}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}
      {(!selected || (viewMode !== "field-ground" && viewMode !== "irrigation")) && (
        <mesh
          geometry={cropCanopyGeometry}
          position-y={field.elevation + (isRice ? waterLevel + 0.025 : 0.475)}
          receiveShadow
        >
          <meshStandardMaterial
            color={canopyColor}
            map={cropCanopyMap}
            normalMap={soilNormal}
            roughnessMap={soilRoughness}
            roughness={0.96}
            metalness={0}
            envMapIntensity={0.2}
            polygonOffset
            polygonOffsetFactor={-3}
          />
        </mesh>
      )}
      {isHero && field.riskZones?.[0] && evidence.cropRecoveryProgress < 0.98 && (
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
            opacity={0.9 * evidence.riskEvidenceStrength}
            envMapIntensity={0.25}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}
      <CropInstances field={field} selected={selected} />
      {(hovered || selected) && viewMode !== "field-ground" && viewMode !== "irrigation" && !["inspect-risk", "drone-scan", "recovered"].includes(demoStep) && (
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
