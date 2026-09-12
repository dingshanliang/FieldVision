import { fields } from "../data/fields";
import { pointInPolygon } from "./geometry";

/**
 * 田块表面（畦土面）相对田块 elevation 的抬升：FieldParcel 的 slab 顶面在
 * elevation + 0.42，作物冠层底在 +0.475。农机轮底取 +0.44 —— 轻微压入土面，
 * 读作车重下陷而不是悬浮或埋没。
 */
const FIELD_SURFACE_OFFSET = 0.44;

/**
 * 若 (x, z) 落在某个田块内，返回该田畦土面高度；否则返回 null（调用方回退到
 * 手工调过的路面/场院高度）。用于农机运动系统的地形贴合——此前拖拉机在 B03
 * 作业时整车陷入田面近 1m（路径 y 按路面调，田面却是 elevation+0.42 的台地）。
 */
export function fieldSurfaceAt(x: number, z: number): number | null {
  for (const field of fields) {
    if (pointInPolygon([x, z], field.polygon)) {
      return field.elevation + FIELD_SURFACE_OFFSET;
    }
  }
  return null;
}
