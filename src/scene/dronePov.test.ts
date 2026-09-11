import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { gimbalShot, POV_WINDOW, povCutEngaged, povWindowActive } from "./dronePov";

// Node 环境无 window：povPref 为 null（默认开启）、非 QA 模式，
// 因此 povCutEngaged 在此退化为纯窗口判断。
describe("povWindowActive", () => {
  it("窗口边界闭合，窗外不激活", () => {
    expect(povWindowActive(POV_WINDOW[0])).toBe(true);
    expect(povWindowActive(POV_WINDOW[1])).toBe(true);
    expect(povWindowActive(POV_WINDOW[0] - 0.01)).toBe(false);
    expect(povWindowActive(POV_WINDOW[1] + 0.01)).toBe(false);
    expect(povWindowActive(0)).toBe(false);
    expect(povWindowActive(1)).toBe(false);
  });

  it("povCutEngaged 默认开启且跟随窗口", () => {
    expect(povCutEngaged(0.5)).toBe(true);
    expect(povCutEngaged(0.1)).toBe(false);
    expect(povCutEngaged(0.95)).toBe(false);
  });
});

describe("gimbalShot", () => {
  const drone = new Vector3(10, 24, -60);

  it("相机贴在无人机腹下并向前移出机身", () => {
    const pos = new Vector3();
    const target = new Vector3();
    gimbalShot(drone, 1.23, pos, target);
    expect(pos.y).toBeLessThan(drone.y);
    expect(pos.y).toBeGreaterThan(drone.y - 2);
    // 沿扫描航线方向（+x / -z）前移
    expect(pos.x).toBeGreaterThan(drone.x);
    expect(pos.z).toBeLessThan(drone.z);
  });

  it("朝航向前下方看（保留地平线的浅俯角）", () => {
    const pos = new Vector3();
    const target = new Vector3();
    gimbalShot(drone, 1.23, pos, target);
    expect(target.y).toBeLessThan(pos.y);
    const horizontal = Math.hypot(target.x - pos.x, target.z - pos.z);
    const drop = pos.y - target.y;
    // 俯角约 20°–45°：太平会失去地面主体，太陡会失去地平线参照
    const angleDeg = (Math.atan2(drop, horizontal) * 180) / Math.PI;
    expect(angleDeg).toBeGreaterThan(20);
    expect(angleDeg).toBeLessThan(45);
  });

  it("同一输入完全确定（QA 截图可复现）", () => {
    const a1 = new Vector3();
    const b1 = new Vector3();
    const a2 = new Vector3();
    const b2 = new Vector3();
    gimbalShot(drone, 4.56, a1, b1);
    gimbalShot(drone, 4.56, a2, b2);
    expect(a1.equals(a2)).toBe(true);
    expect(b1.equals(b2)).toBe(true);
  });

  it("横摇幅度有界，不会甩出斑块区域", () => {
    const target = new Vector3();
    const pos = new Vector3();
    let maxPerp = 0;
    for (let t = 0; t < 30; t += 0.1) {
      gimbalShot(drone, t, pos, target);
      // 垂线方向分量 = target 相对 (drone + dir*16) 在 perp 上的投影
      const relX = target.x - (drone.x + 0.7157 * 16);
      const relZ = target.z - (drone.z + -0.6984 * 16);
      const perp = Math.abs(relX * 0.6984 + relZ * 0.7157);
      maxPerp = Math.max(maxPerp, perp);
    }
    expect(maxPerp).toBeLessThanOrEqual(3.01);
  });
});
