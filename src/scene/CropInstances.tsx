import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import type { FieldParcel } from "../types/farm";
import { createCropClumpGeometry, cropClumpPresets, pointInPolygon, seededRandom } from "../utils/geometry";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import { useFarmStore } from "../state/useFarmStore";
import { heroIrrigationInlet } from "../data/fields";
import { visualConfig } from "../config/visual";
import { deriveEvidenceState } from "../state/evidenceModel";

interface CropInstancesProps { field: FieldParcel; selected: boolean }

const baseColors: Record<FieldParcel["cropType"], string> = {
  rice: "#5f7938",
  corn: "#537a34",
  vegetable: "#4b8444",
  rapeseed: "#839649",
};
const strawColor = "#b3944a";

export function CropInstances({ field, selected }: CropInstancesProps) {
  const tier = usePerformanceTier();
  const irrigationProgress = useFarmStore((state) => state.irrigationProgress);
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const recoveryPhase = useFarmStore((state) => state.recoveryPhase);
  const meshRef = useRef<InstancedMesh>(null);
  const preset = cropClumpPresets[field.cropType];

  const geometry = useMemo(
    () => createCropClumpGeometry({ ...preset, seed: field.id.charCodeAt(0) * 131 + field.id.charCodeAt(2) * 17 }),
    [preset, field.id],
  );
  const material = useMemo(() => {
    const result = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.88, metalness: 0, side: DoubleSide, envMapIntensity: 0.35 });
    result.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWind = { value: visualConfig.windStrength };
      shader.uniforms.uHeight = { value: preset.height };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float uTime;
          uniform float uWind;
          uniform float uHeight;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec2 clumpOffset = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          #else
            vec2 clumpOffset = vec2(0.0);
          #endif
          float heightRatio = clamp(position.y / uHeight, 0.0, 1.0);
          float phase = clumpOffset.x * 0.35 + clumpOffset.y * 0.61;
          float sway = sin(uTime * 1.7 + phase) + 0.55 * sin(uTime * 3.3 + phase * 1.7);
          float bendAmount = heightRatio * heightRatio * sway * uWind * 0.14;
          transformed.x += bendAmount;
          transformed.z += bendAmount * 0.55;`);
      result.userData.shader = shader;
    };
    return result;
  }, [preset.height]);

  /** Plants placed in real rows aligned with the polygon's longest edge. */
  const placements = useMemo(() => {
    const random = seededRandom(field.id.charCodeAt(0) * 97 + field.id.charCodeAt(1) * 37 + field.id.charCodeAt(2));
    const polygon = field.polygon;
    let longest: [[number, number], [number, number]] = [polygon[0]!, polygon[1]!];
    for (let index = 0; index < polygon.length; index += 1) {
      const a = polygon[index]!;
      const b = polygon[(index + 1) % polygon.length]!;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > Math.hypot(longest[1][0] - longest[0][0], longest[1][1] - longest[0][1])) {
        longest = [a, b];
      }
    }
    const angle = Math.atan2(longest[1][1] - longest[0][1], longest[1][0] - longest[0][0]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const uv = polygon.map(([x, z]): [number, number] => [x * cos + z * sin, -x * sin + z * cos]);
    const us = uv.map(([u]) => u);
    const vs = uv.map(([, v]) => v);
    const minU = Math.min(...us) + 1.2;
    const maxU = Math.max(...us) - 1.2;
    const minV = Math.min(...vs) + 1.2;
    const maxV = Math.max(...vs) - 1.2;

    const candidates: Array<{ x: number; z: number }> = [];
    let rowIndex = 0;
    for (let v = minV; v <= maxV; v += preset.rowSpacing) {
      const stagger = (rowIndex % 2) * preset.plantSpacing * 0.5;
      let u = minU + stagger + random() * 0.2;
      while (u <= maxU) {
        const x = u * cos - v * sin;
        const z = u * sin + v * cos;
        if (pointInPolygon([x, z], polygon)) candidates.push({ x, z });
        u += preset.plantSpacing * (0.88 + random() * 0.28);
      }
      rowIndex += 1;
    }

    const density = (selected ? 1 : 0.85) * (tier === "high" ? 1 : tier === "medium" ? 0.5 : 0.24);
    const cap = tier === "high" ? (selected ? 14000 : 9500) : tier === "medium" ? 5200 : 2600;
    const target = Math.max(60, Math.min(cap, Math.floor(candidates.length * density)));
    const stride = candidates.length / target;
    const output: Array<{ matrix: Matrix4; x: number; z: number }> = [];
    for (let index = 0; index < target; index += 1) {
      const candidate = candidates[Math.floor(index * stride)];
      if (!candidate) continue;
      const scale = 0.78 + random() * 0.42;
      const matrix = new Matrix4();
      matrix.compose(
        new Vector3(candidate.x + (random() - 0.5) * 0.14, field.elevation + 0.52, candidate.z + (random() - 0.5) * 0.14),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), random() * Math.PI * 2),
        new Vector3(scale, scale * (0.9 + random() * 0.2), scale),
      );
      output.push({ matrix, x: candidate.x, z: candidate.z });
    }
    return output;
  }, [field, preset, selected, tier]);

  useEffect(() => {
    if (!meshRef.current) return;
    placements.forEach(({ matrix }, index) => meshRef.current?.setMatrixAt(index, matrix));
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [placements]);

  // Colour: healthy green jitter + straw-yellow dryness inside the risk zone.
  // Recovery follows the wetting front: plants green up shortly after the
  // irrigation water reaches them, so the sweep is visible from the air.
  useEffect(() => {
    if (!meshRef.current) return;
    const random = seededRandom(field.id.charCodeAt(0) * 113);
    const base = new Color(baseColors[field.cropType]);
    const straw = new Color(strawColor);
    const riskZone = field.riskZones?.[0];
    const color = new Color();
    const evidence = deriveEvidenceState(scanProgress, irrigationProgress, recoveryPhase);
    const front = evidence.cropRecoveryProgress * (heroIrrigationInlet.frontMax + 18);
    placements.forEach(({ x, z }, index) => {
      color.copy(base).offsetHSL((random() - 0.5) * 0.03, (random() - 0.5) * 0.1, (random() - 0.5) * 0.09);
      if (riskZone) {
        const distance = Math.hypot(x - riskZone.center[0], z - riskZone.center[2]);
        const fromInlet = Math.hypot(x - heroIrrigationInlet.x, z - heroIrrigationInlet.z);
        const recovery = Math.min(1, Math.max(0, (front - fromInlet) / 16));
        const dryness = Math.min(1, Math.max(0, 1.15 - distance / riskZone.radius)) * (1 - recovery);
        color.lerp(straw, Math.min(0.9, dryness * 1.05));
      }
      meshRef.current?.setColorAt(index, color);
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [field, irrigationProgress, placements, recoveryPhase, scanProgress]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const meshMaterial = mesh.material as MeshStandardMaterial;
    const shader = meshMaterial.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
    if (shader) shader.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, placements.length]}
      castShadow={selected || tier === "high"}
      receiveShadow
      frustumCulled
    >
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}
