import { Html, Line, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { BoxGeometry, Color, CylinderGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import {
  corridorForChapter,
  selectSupportNetwork,
  spatialDetailLevel,
  type SupportNodeKind,
} from "../data/smartFarmInfrastructure";
import { useFarmStore } from "../state/useFarmStore";

const YARD_POSITION: [number, number, number] = [-122, 1.4, 112];
const NODE_COLOR: Record<SupportNodeKind, string> = {
  "crop-camera": "#7bc8e8",
  "soil-box": "#d2b46e",
  "pest-monitor": "#c99b73",
  "water-meter": "#63c7c2",
  rtk: "#efe0a2",
  "edge-cabinet": "#8fcf92",
};
const BODY_GEOMETRY = new BoxGeometry(0.72, 0.72, 0.58);
const POLE_GEOMETRY = new CylinderGeometry(0.055, 0.075, 2.8, 8);
const MATRIX = new Matrix4();
const POSITION = new Vector3();
const SCALE = new Vector3(1, 1, 1);
const ROTATION = new Quaternion();

function DroneDockLid() {
  const lid = useRef<Group>(null);
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const open = chapter === "coordinated-patrol" || chapter === "a02-alert" || chapter === "outcome-verification" || chapter === "return-overview";
  useFrame((_, delta) => {
    if (!lid.current) return;
    lid.current.rotation.z += ((open ? -0.92 : -0.08) - lid.current.rotation.z) * Math.min(1, delta * 3.5);
  });
  return (
    <group ref={lid} position={[-2.55, 0.55, 0]}>
      <mesh position={[2.55, 0, 0]} castShadow>
        <boxGeometry args={[5.3, 0.15, 4.1]} />
        <meshStandardMaterial color="#4b5753" metalness={0.48} roughness={0.42} />
      </mesh>
    </group>
  );
}

function SmartOperationsYard() {
  return (
    <group position={YARD_POSITION} rotation={[0, -0.35, 0]}>
      <mesh position={[12, 0.02, 1]} receiveShadow>
        <boxGeometry args={[24, 0.18, 20]} />
        <meshStandardMaterial color="#77766f" roughness={0.94} />
      </mesh>
      {/* 自动无人机机库，低矮盒体 + 可辨识舱盖。 */}
      <group position={[19, 0.45, 6]}>
        <RoundedBox args={[5.8, 0.9, 4.6]} radius={0.28} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial color="#c8ccc5" metalness={0.35} roughness={0.5} />
        </RoundedBox>
        <DroneDockLid />
        <mesh position={[2.4, 0.12, 1.7]}>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color="#72d69b" emissive="#3fbd75" emissiveIntensity={1.2} />
        </mesh>
      </group>
      {/* 补能位与例外检修位。 */}
      {[7, 13].map((x) => (
        <group key={x} position={[x, 0.18, -4.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[4.6, 6.5]} />
            <meshStandardMaterial color="#4f5a54" roughness={0.9} />
          </mesh>
          <mesh position={[-1.6, 0.75, -2.1]} castShadow>
            <boxGeometry args={[0.45, 1.5, 0.38]} />
            <meshStandardMaterial color="#415b50" metalness={0.35} roughness={0.52} />
          </mesh>
        </group>
      ))}
      <group position={[19, 0.3, -4.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[6.2, 0.22, 6.4]} />
          <meshStandardMaterial color="#6d655b" roughness={0.96} />
        </mesh>
        {([[-2.4, -2.5], [2.4, -2.5], [-2.4, 2.5], [2.4, 2.5]] as const).map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.8, z]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
            <meshStandardMaterial color="#d1b85f" metalness={0.45} roughness={0.48} />
          </mesh>
        ))}
      </group>
      <Html position={[8, 9.8, 0]} center distanceFactor={94} zIndexRange={[25, 4]}>
        <div className="facility-tag"><i className="is-online" />智慧作业场 · 设备归属与回库</div>
      </Html>
    </group>
  );
}

function SupportNetwork() {
  const tier = usePerformanceTier();
  const chapter = useFarmStore((state) => state.smartFarmChapter);
  const { nodes, labeledNodeIds } = useMemo(() => selectSupportNetwork(tier), [tier]);
  const corridor = corridorForChapter(chapter);
  const topologyVisible = chapter === "base-online" || chapter === "daily-plan" || chapter === "return-overview";
  const machineCloseup = chapter === "autonomous-operations" || chapter === "coordinated-patrol";

  const applyBodies = (mesh: import("three").InstancedMesh | null) => {
    if (!mesh) return;
    nodes.forEach((node, index) => {
      POSITION.set(node.position[0], node.position[1] + (node.kind === "rtk" ? 3.7 : node.kind === "crop-camera" ? 2.1 : 0.55), node.position[2]);
      SCALE.set(node.kind === "rtk" ? 0.42 : node.kind === "crop-camera" ? 0.65 : 1, node.kind === "rtk" ? 0.42 : node.kind === "crop-camera" ? 0.5 : 1, 1);
      MATRIX.compose(POSITION, ROTATION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, new Color(NODE_COLOR[node.kind]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const applyPoles = (mesh: import("three").InstancedMesh | null) => {
    if (!mesh) return;
    nodes.forEach((node, index) => {
      const height = node.kind === "rtk" ? 7 : node.kind === "crop-camera" ? 4 : 0.2;
      POSITION.set(node.position[0], node.position[1] + height / 2, node.position[2]);
      SCALE.set(1, height / 2.8, 1);
      MATRIX.compose(POSITION, ROTATION, SCALE);
      mesh.setMatrixAt(index, MATRIX);
      mesh.setColorAt(index, new Color(node.kind === "rtk" ? "#dadfd8" : "#596762"));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return (
    <group>
      <instancedMesh args={[POLE_GEOMETRY, undefined, nodes.length]} ref={applyPoles} castShadow={tier === "high"}>
        <meshStandardMaterial vertexColors metalness={0.35} roughness={0.55} />
      </instancedMesh>
      <instancedMesh args={[BODY_GEOMETRY, undefined, nodes.length]} ref={applyBodies} castShadow={tier === "high"}>
        <meshStandardMaterial vertexColors metalness={0.26} roughness={0.55} />
      </instancedMesh>

      {topologyVisible && nodes.map((node) => (
        <Line
          key={`topology-${node.id}`}
          points={[[-102, 3.2, 122], node.position]}
          color={NODE_COLOR[node.kind]}
          lineWidth={0.65}
          dashed
          dashSize={2.1}
          gapSize={2.8}
          transparent
          opacity={0.25}
        />
      ))}

      {corridor ? (
        <Line points={corridor.points} color={corridor.color} lineWidth={2.2} transparent opacity={0.78} />
      ) : null}

      {nodes.map((node) => {
        if (!labeledNodeIds.includes(node.id)) return null;
        const distance = corridor
          ? Math.hypot(node.position[0] - corridor.focus[0], node.position[2] - corridor.focus[2])
          : 0;
        const detail = topologyVisible ? "route" : spatialDetailLevel(distance);
        if (detail === "silhouette") return null;
        return (
          <Html key={node.id} position={[node.position[0], node.position[1] + (node.kind === "rtk" ? 8.2 : node.kind === "crop-camera" ? 4.9 : 1.8), node.position[2]]} center distanceFactor={machineCloseup ? 34 : 96} zIndexRange={[24, 3]}>
            <div className={`support-node-tag support-node-tag--${detail}`}>
              <i style={{ background: NODE_COLOR[node.kind] }} />
              <span>{node.label}</span>
            </div>
          </Html>
        );
      })}

      {corridor ? (
        <Html position={[corridor.focus[0], corridor.focus[1] + 5.8, corridor.focus[2]]} center distanceFactor={machineCloseup ? 30 : 82} zIndexRange={[27, 4]}>
          <div className="task-corridor-tag"><i style={{ background: corridor.color }} />{corridor.label}</div>
        </Html>
      ) : null}
    </group>
  );
}

export function SmartFarmInfrastructure() {
  return (
    <group>
      <SmartOperationsYard />
      <SupportNetwork />
    </group>
  );
}
