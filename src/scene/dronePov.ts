import type { Vector3 } from "three";

/**
 * 无人机云台第一人称切入（无人机扫描节拍的默认镜头行为）。
 *
 * 来源：fv-66y.6 原型（?pov=cut 硬切变体），经 HITL 评审签字晋升为正片。
 * 扫描进度进入 POV 窗口时，镜头从第三人称跟拍硬切到无人机腹下云台视角，
 * 让干旱斑块"以无人机视角"进入画面；窗口结束硬切回跟拍——硬切是刻意的
 * 电影剪辑语言，不是缺失的缓动。
 *
 * ?pov=off 可关闭（A/B 对照用）。QA 截图模式（?qa=1）下默认不接管镜头，
 * 除非显式 ?pov=cut——QA 脚本自己驱动相机。
 */

/** FPV 切入窗口（scanProgress 空间）。 */
export const POV_WINDOW = [0.38, 0.7] as const;

type PovPref = "cut" | "off" | null;

let cachedPref: PovPref | undefined;
let cachedQa: boolean | undefined;

function povPref(): PovPref {
  if (cachedPref !== undefined) return cachedPref;
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("pov");
  cachedPref = raw === "off" ? "off" : raw === "1" || raw === "cut" || raw === "sweep" || raw === "pip" ? "cut" : null;
  return cachedPref;
}

function qaMode(): boolean {
  if (cachedQa !== undefined) return cachedQa;
  cachedQa = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("qa");
  return cachedQa;
}

export function povWindowActive(scanProgress: number): boolean {
  return scanProgress >= POV_WINDOW[0] && scanProgress <= POV_WINDOW[1];
}

/** 当前帧镜头是否应处于云台第一人称。 */
export function povCutEngaged(scanProgress: number): boolean {
  if (povPref() === "off") return false;
  if (!povWindowActive(scanProgress)) return false;
  // QA 截图脚本自己驱动相机；显式 ?pov=cut 才在 QA 下启用切入。
  if (qaMode() && povPref() !== "cut") return false;
  return true;
}

// 扫描航线方向（Drone.tsx 扫描段：(-8,24,-43) → (31,24,-81)），归一化。
const SCAN_DIR_X = 0.7157;
const SCAN_DIR_Z = -0.6984;
// 航线垂线（云台缓慢横摇扫过干旱斑块）。
const SCAN_PERP_X = 0.6984;
const SCAN_PERP_Z = 0.7157;

/**
 * 云台镜头：位置贴在无人机腹下略前移出机身，朝航向前下方看（约 32° 俯角，
 * 保留地平线参照），随时间缓慢横摇。纯函数，QA 截图可复现；
 * time 只贡献微小振动（云台增稳后的残余晃动）。
 */
export function gimbalShot(
  drone: Vector3,
  time: number,
  outPosition: Vector3,
  outTarget: Vector3,
): void {
  const pan = Math.sin(time * 0.3) * 3;
  outPosition.set(
    drone.x + SCAN_DIR_X * 1.5,
    drone.y - 1.1 + Math.sin(time * 13) * 0.03,
    drone.z + SCAN_DIR_Z * 1.5,
  );
  outTarget.set(
    drone.x + SCAN_DIR_X * 16 + SCAN_PERP_X * pan,
    drone.y - 10,
    drone.z + SCAN_DIR_Z * 16 + SCAN_PERP_Z * pan,
  );
}
