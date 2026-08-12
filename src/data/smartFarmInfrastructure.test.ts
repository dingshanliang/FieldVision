import { describe, expect, it } from "vitest";
import type { PerformanceTier } from "../hooks/usePerformanceTier";
import {
  SUPPORT_NODE_LIMITS,
  SUPPORT_NODES,
  TASK_CORRIDORS,
  selectSupportNetwork,
  spatialDetailLevel,
} from "./smartFarmInfrastructure";

describe("representative smart farm infrastructure", () => {
  it("keeps the agreed representative node and label budgets per tier", () => {
    const tiers: PerformanceTier[] = ["high", "medium", "low"];
    tiers.forEach((tier) => {
      const network = selectSupportNetwork(tier);
      expect(network.nodes).toHaveLength(SUPPORT_NODE_LIMITS[tier].nodes);
      expect(network.labeledNodeIds).toHaveLength(SUPPORT_NODE_LIMITS[tier].labels);
      expect(network.labeledNodeIds.every((id) => network.nodes.some((node) => node.id === id))).toBe(true);
    });
  });

  it("models the complete high-tier mix without pretending every field has every sensor", () => {
    expect(SUPPORT_NODES).toHaveLength(15);
    expect(SUPPORT_NODES.filter((node) => node.kind === "crop-camera")).toHaveLength(3);
    expect(SUPPORT_NODES.filter((node) => node.kind === "soil-box")).toHaveLength(4);
    expect(SUPPORT_NODES.filter((node) => node.kind === "pest-monitor")).toHaveLength(1);
    expect(SUPPORT_NODES.filter((node) => node.kind === "water-meter")).toHaveLength(4);
    expect(SUPPORT_NODES.filter((node) => node.kind === "rtk")).toHaveLength(1);
    expect(SUPPORT_NODES.filter((node) => node.kind === "edge-cabinet")).toHaveLength(2);
  });

  it("retains positioning, A02 evidence, and water-chain essentials in low tier", () => {
    const lowIds = selectSupportNetwork("low").nodes.map((node) => node.id);
    expect(lowIds).toEqual(expect.arrayContaining([
      "RTK-YARD",
      "EDGE-YARD",
      "SOIL-A02",
      "WATER-PUMP",
      "WATER-A02-INLET",
      "CAM-A02",
    ]));
  });

  it("uses the approved distance language and task corridors", () => {
    expect(spatialDetailLevel(20)).toBe("action");
    expect(spatialDetailLevel(20.01)).toBe("route");
    expect(spatialDetailLevel(80)).toBe("route");
    expect(spatialDetailLevel(80.01)).toBe("silhouette");
    expect(Object.keys(TASK_CORRIDORS)).toEqual([
      "yard-to-b03",
      "central-patrol",
      "east-maintenance",
      "uav-a02",
      "a02-water-chain",
    ]);
  });
});
