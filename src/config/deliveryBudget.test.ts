import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function directoryBytes(path: string): number {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const child = join(path, entry.name);
    return total + (entry.isDirectory() ? directoryBytes(child) : statSync(child).size);
  }, 0);
}

describe("smart farm delivery budgets", () => {
  it("keeps all browser assets under 10 MB", () => {
    expect(directoryBytes(join(process.cwd(), "public", "assets"))).toBeLessThanOrEqual(10_000_000);
  });

  it("keeps this roadmap's new runtime assets under 3.2 MB", () => {
    const models = [
      "fieldvision-autonomous-tractor-seeder.glb",
      "fieldvision-inspection-robot.glb",
      "fieldvision-maintenance-vehicle.glb",
    ];
    const bytes = models.reduce((total, model) => total + statSync(join(process.cwd(), "public", "assets", "models", model)).size, 0);
    expect(bytes).toBeLessThanOrEqual(3_200_000);
  });
});
