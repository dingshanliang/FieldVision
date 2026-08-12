import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SMART_MACHINE_ASSETS, smartMachinesForChapter } from "./smartMachineAssets";

describe("smart machine asset contract", () => {
  it("keeps every browser GLB valid and within its delivery budget", () => {
    let totalBytes = 0;

    for (const asset of SMART_MACHINE_ASSETS) {
      const path = join(process.cwd(), "public", asset.url);
      const bytes = statSync(path).size;
      const file = readFileSync(path);
      const header = file.subarray(0, 4).toString("utf8");

      expect(header, asset.id).toBe("glTF");
      expect(bytes, asset.id).toBeLessThanOrEqual(asset.maxBytes);
      for (const nodeName of asset.requiredNodes) {
        expect(file.includes(Buffer.from(nodeName)), `${asset.id}:${nodeName}`).toBe(true);
      }
      totalBytes += bytes;
    }

    expect(totalBytes).toBeLessThanOrEqual(2_500_000);
  });

  it("gives each normal-operation chapter one identifiable hero machine", () => {
    expect(smartMachinesForChapter("daily-plan").map((asset) => asset.id)).toEqual(["maintenance-vehicle"]);
    expect(smartMachinesForChapter("autonomous-operations").map((asset) => asset.id)).toEqual(["tractor-seeder"]);
    expect(smartMachinesForChapter("coordinated-patrol").map((asset) => asset.id)).toEqual(["inspection-robot"]);
  });

  it("declares contact-plane placement and close inspection cameras", () => {
    for (const asset of SMART_MACHINE_ASSETS) {
      expect(asset.position[1]).toBeGreaterThanOrEqual(0.1);
      expect(asset.position[1]).toBeLessThanOrEqual(0.7);
      expect(asset.camera.position[1]).toBeGreaterThan(asset.position[1]);
      expect(asset.camera.target[0]).toBe(asset.position[0]);
      expect(asset.camera.target[2]).toBe(asset.position[2]);
      expect(asset.camera.target[1]).toBeGreaterThan(asset.position[1]);
    }
  });
});
