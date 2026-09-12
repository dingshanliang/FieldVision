import { Html, Line, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Group, InstancedMesh, Mesh } from "three";
import { AdditiveBlending, BoxGeometry, Color, CylinderGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { usePerformanceTier } from "../hooks/usePerformanceTier";
import {
  corridorForChapter,
  selectSupportNetwork,
  spatialDetailLevel,
  type SupportNode,
  type SupportNodeKind,
} from "../data/smartFarmInfrastructure";
import { droneDockingState } from "./droneDockingState";
import {
  DRONE_DOCK_LOCAL_POSITION,
  SMART_YARD_POSITION,
  SMART_YARD_ROTATION_Y,
  droneFlightTelemetry,
  type DroneFlightPhase,
} from "./droneFlightTelemetry";
import { useFarmStore } from "../state/useFarmStore";

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

// 数据回传拓扑：所有感知节点向作业场边缘控制柜（EDGE-YARD）回传。
const TOPOLOGY_ANCHOR: readonly [number, number, number] = [-102, 3.2, 122];
const FLOW_PACKETS_PER_LINE = 2;
const FLOW_TRAVEL_SECONDS = 5.2;
const FLOW_GEOMETRY = new SphereGeometry(0.34, 10, 10);

interface FlowSegment {
  from: Vector3;
  to: Vector3;
  offset: number;
  lift: number;
  color: Color;
}

// 沿回传链路流动的"数据包"光点：方向为 节点 → 边缘控制柜。
function TopologyFlow({ nodes }: { nodes: readonly SupportNode[] }) {
  const paused = useFarmStore((state) => state.paused);
  const meshRef = useRef<InstancedMesh>(null);
  const clock = useRef(0);

  const segments = useMemo<FlowSegment[]>(
    () =>
      nodes.map((node, index) => {
        const from = new Vector3(node.position[0], node.position[1] + 0.6, node.position[2]);
        const to = new Vector3(TOPOLOGY_ANCHOR[0], TOPOLOGY_ANCHOR[1], TOPOLOGY_ANCHOR[2]);
        const length = from.distanceTo(to);
        return {
          from,
          to,
          offset: (index * 0.37) % 1,
          lift: Math.min(7, length * 0.045),
          color: new Color(NODE_COLOR[node.kind]),
        };
      }),
    [nodes],
  );

  const applyColors = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    segments.forEach((segment, nodeIndex) => {
      for (let k = 0; k < FLOW_PACKETS_PER_LINE; k += 1) {
        mesh.setColorAt(nodeIndex * FLOW_PACKETS_PER_LINE + k, segment.color);
      }
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!paused) clock.current = (clock.current + delta / FLOW_TRAVEL_SECONDS) % 1;
    let instance = 0;
    for (const segment of segments) {
      for (let k = 0; k < FLOW_PACKETS_PER_LINE; k += 1) {
        const t = (clock.current + segment.offset + k / FLOW_PACKETS_PER_LINE) % 1;
        POSITION.lerpVectors(segment.from, segment.to, t);
        POSITION.y += Math.sin(t * Math.PI) * segment.lift;
        const pulse = 0.75 + 0.45 * Math.sin((t * 2 + segment.offset) * Math.PI * 2);
        SCALE.setScalar(pulse);
        MATRIX.compose(POSITION, ROTATION, SCALE);
        mesh.setMatrixAt(instance, MATRIX);
        instance += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      args={[FLOW_GEOMETRY, undefined, segments.length * FLOW_PACKETS_PER_LINE]}
      ref={(mesh) => {
        meshRef.current = mesh;
        applyColors(mesh);
      }}
      frustumCulled={false}
    >
      <meshBasicMaterial vertexColors transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}

// 汇聚终点：边缘控制柜处的脉动光晕。
function TopologyAnchorPulse() {
  const paused = useFarmStore((state) => state.paused);
  const glowRef = useRef<Mesh>(null);
  const phase = useRef(0);
  useFrame((_, delta) => {
    if (!glowRef.current) return;
    if (!paused) phase.current += delta;
    glowRef.current.scale.setScalar(1 + 0.35 * Math.sin(phase.current * 2.4));
  });
  return (
    <mesh ref={glowRef} position={[TOPOLOGY_ANCHOR[0], TOPOLOGY_ANCHOR[1] + 0.4, TOPOLOGY_ANCHOR[2]]}>
      <sphereGeometry args={[0.9, 14, 14]} />
      <meshBasicMaterial color={NODE_COLOR["edge-cabinet"]} transparent opacity={0.35} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function DroneDockLid() {
  const lid = useRef<Group>(null);
  const paused = useFarmStore((state) => state.paused);
  useFrame((_, delta) => {
    if (!lid.current) return;
    if (paused) return;
    const dockState = droneDockingState(droneFlightTelemetry.phase);
    lid.current.rotation.z += ((dockState.lidOpen ? -0.92 : -0.08) - lid.current.rotation.z) * Math.min(1, delta * 3.5);
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

const DOCK_STATUS_LABEL: Record<DroneFlightPhase, string> = {
  ready: "机库待命",
  "self-check": "开盖自检",
  "taking-off": "起飞爬升",
  airborne: "任务执行中",
  returning: "返航进近",
  landing: "垂直降落",
  charging: "已降落 · 充电中",
};

function DroneDockStatusLabel() {
  const [phase, setPhase] = useState<DroneFlightPhase>(droneFlightTelemetry.phase);
  const paused = useFarmStore((state) => state.paused);
  useFrame(() => {
    if (paused) return;
    if (droneFlightTelemetry.phase !== phase) setPhase(droneFlightTelemetry.phase);
  });
  return (
    <Html position={[19, 4.2, 6]} center distanceFactor={56} zIndexRange={[25, 4]}>
      <div className="facility-tag"><i className="is-online" />巡田无人机 01 · {DOCK_STATUS_LABEL[phase]}</div>
    </Html>
  );
}

function SmartOperationsYard() {
  return (
    <group position={SMART_YARD_POSITION} rotation={[0, SMART_YARD_ROTATION_Y, 0]}>
      <mesh position={[12, 0.02, 1]} receiveShadow>
        <boxGeometry args={[24, 0.18, 20]} />
        <meshStandardMaterial color="#77766f" roughness={0.94} />
      </mesh>
      {/* 自动无人机机库，低矮盒体 + 可辨识舱盖。 */}
      <group position={DRONE_DOCK_LOCAL_POSITION}>
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
      <DroneDockStatusLabel />
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
          points={[TOPOLOGY_ANCHOR, node.position]}
          color={NODE_COLOR[node.kind]}
          lineWidth={0.5}
          transparent
          opacity={0.14}
        />
      ))}

      {topologyVisible && (
        <>
          <TopologyFlow nodes={nodes} />
          <TopologyAnchorPulse />
        </>
      )}

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
