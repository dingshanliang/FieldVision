/**
 * 体积云层（fv-i1s）：drei <Clouds> 的离线安全纹理 + seeded 布局。
 *
 * 纹理：drei 默认云纹理是远程 CDN 图（断网汇报会挂），这里用 canvas 程序
 * 化生成软 puff alpha 贴图并以 data URL 传入——零网络请求、零外部资产。
 * 布局：纯函数、seeded，全部落在 y>190（照片全景圆柱顶 y≈173，之下会与
 * 全景带穿帮——圆柱不写深度，云画在其上会露出"贴片感"）。
 */
import { seededRandom } from "../utils/geometry";

export function makeCloudTextureUrl(seed = 20260913): string {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const random = seededRandom(seed);
    // 多团径向渐变叠成一朵软 puff：中心浓、边缘多方向不规则淡出。
    for (let blob = 0; blob < 26; blob += 1) {
      const cx = 58 + random() * 140;
      const cy = 86 + random() * 92;
      const radius = 24 + random() * 56;
      const alpha = 0.09 + random() * 0.15;
      const gradient = context.createRadialGradient(cx, cy, 1, cx, cy, radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
    }
  }
  return canvas.toDataURL("image/png");
}

export interface CloudSpec {
  position: readonly [number, number, number];
  scale: number;
  rotation: number;
  segments: number;
  opacity: number;
  seed: number;
}

/** 6 朵云绕基地散布（seeded，determinism 供 qaRun 与重放一致）。 */
export function cloudLayout(): CloudSpec[] {
  const random = seededRandom(31415);
  const specs: CloudSpec[] = [];
  const count = 6;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + random() * 0.7;
    const radius = 130 + random() * 210;
    const y = 200 + random() * 115;
    specs.push({
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      scale: 0.85 + random() * 0.75,
      rotation: random() * Math.PI,
      segments: 14 + Math.floor(random() * 8),
      opacity: 0.5 + random() * 0.22,
      seed: index * 31 + 7,
    });
  }
  return specs;
}
