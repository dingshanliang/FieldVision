import { Html } from "@react-three/drei";
import { deriveIrrigationEvent } from "../state/irrigationEvent";
import { useFarmStore } from "../state/useFarmStore";

interface Receipt {
  key: string;
  position: [number, number, number];
  label: string;
  value: string;
  progress: number;
}

export function IrrigationTelemetry() {
  const progress = useFarmStore((state) => state.irrigationProgress);
  const demoStep = useFarmStore((state) => state.demoStep);
  const event = deriveIrrigationEvent(progress);
  if (demoStep !== "irrigation" && demoStep !== "recovered") return null;

  const receipts: Receipt[] = [
    { key: "pump", position: [82, 13.2, 108], label: "泵站出力", value: event.pumpProgress >= 1 ? "稳定" : "启动中", progress: event.pumpProgress },
    { key: "gate", position: [69, 9.2, -18], label: "东支闸门", value: `${Math.round(event.gateProgress * 100)}%`, progress: event.gateProgress },
    { key: "main", position: [73, 5.5, 38], label: "主渠到水", value: event.mainChannelProgress >= 1 ? "已确认" : "推进中", progress: event.mainChannelProgress },
    { key: "branch", position: [61, 5.1, -31], label: "东支渠末端", value: event.branchChannelProgress >= 1 ? "已到水" : "等待", progress: event.branchChannelProgress },
    { key: "inlet", position: [57, 5.6, -34], label: "A02 进水口", value: event.inletProgress >= 1 ? "已到水" : "等待", progress: event.inletProgress },
  ];

  return (
    <group>
      {receipts.filter((receipt) => receipt.progress > 0).map((receipt) => (
        <Html key={receipt.key} position={receipt.position} center distanceFactor={92} zIndexRange={[12, 0]}>
          <div className={`telemetry-marker ${receipt.progress >= 1 ? "is-complete" : "is-current"}`}>
            <i />
            <span>{receipt.label}</span>
            <strong>{receipt.value}</strong>
          </div>
        </Html>
      ))}
    </group>
  );
}
