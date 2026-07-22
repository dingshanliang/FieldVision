import { Html, Line } from "@react-three/drei";
import { deriveEvidenceState, evidenceMetadata } from "../state/evidenceModel";
import { useFarmStore } from "../state/useFarmStore";

export function SpatialEvidence() {
  const scanProgress = useFarmStore((state) => state.scanProgress);
  const irrigationProgress = useFarmStore((state) => state.irrigationProgress);
  const layerMode = useFarmStore((state) => state.layerMode);
  const demoStep = useFarmStore((state) => state.demoStep);
  const evidence = deriveEvidenceState(scanProgress, irrigationProgress);
  const analysisVisible = layerMode === "growth" && evidence.scanReveal >= 0.5;
  const diagnosisVisible = analysisVisible && evidence.scanReveal >= 0.82 && evidence.cropRecoveryProgress < 0.35;

  return (
    <group visible={demoStep !== "overview" && demoStep !== "intro"}>
      {analysisVisible && evidence.riskEvidenceStrength > 0.04 && (
        <>
          <Line points={[[7, 8.5, -54], [23, 2.9, -66]]} color="#e7a061" lineWidth={1} transparent opacity={0.72} />
          <Html position={[7, 9.2, -54]} center distanceFactor={78} zIndexRange={[30, 4]}>
            <div className="evidence-slip">
              <div className="evidence-slip__head"><em>{evidenceMetadata.provenance}</em><time>{evidenceMetadata.capturedAt}</time></div>
              <strong>A02-R1 / 缺水样区</strong>
              <dl>
                <div><dt>来源</dt><dd>{evidenceMetadata.source}</dd></div>
                <div><dt>墒情</dt><dd>{evidenceMetadata.moisture}%</dd></div>
                <div><dt>长势偏差</dt><dd>{evidenceMetadata.growthDelta}%</dd></div>
                <div><dt>置信度</dt><dd>{evidenceMetadata.confidence}%</dd></div>
              </dl>
            </div>
          </Html>
        </>
      )}

      {diagnosisVisible && (
        <>
          <Line points={[[23, 3.1, -66], [58, 2.4, -35]]} color="#dca266" lineWidth={1.2} dashed dashSize={1.2} gapSize={0.8} transparent opacity={0.68} />
          <Html position={[49, 18, -43]} center distanceFactor={82} zIndexRange={[28, 3]}>
            <div className="cause-marker"><span>供水诊断</span><strong>东支渠末端供水不足</strong></div>
          </Html>
        </>
      )}

      {evidence.verified && (
        <group position={[23, 2.88, -66]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[17.4, 18.2, 64]} />
            <meshBasicMaterial color="#d98b54" transparent opacity={0.32} depthWrite={false} />
          </mesh>
          <mesh position-z={0.025}>
            <circleGeometry args={[17.2, 64]} />
            <meshBasicMaterial color="#64aa70" transparent opacity={0.1} depthWrite={false} />
          </mesh>
        </group>
      )}

      {evidence.verified && (
        <Html position={[10, 10.5, -56]} center distanceFactor={76} zIndexRange={[32, 4]}>
          <div className="verification-slip">
            <div><span>处置前</span><strong>18%</strong><small>异常 23.6 亩</small></div>
            <i aria-hidden="true" />
            <div><span>{evidenceMetadata.reviewedAt} 复测</span><strong>27%</strong><small>残余 0.8 亩</small></div>
            <em>风险已解除</em>
          </div>
        </Html>
      )}
    </group>
  );
}
