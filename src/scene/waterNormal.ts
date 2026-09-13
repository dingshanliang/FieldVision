/**
 * 程序化可平铺水法线贴图（fv-2zv）。纯数据层不触 DOM，便于单测；组件侧
 * 用薄封装转 DataTexture。算法：seeded 值噪声多倍频叠加（环绕采样保证
 * 四向平铺）→ 中心差分求梯度 → 法线编码到 RGB。
 *
 * Water2 会交叉采样 normalMap0/1（halfCycle 混合）制造流动错相位，因此
 * 生成器对两张图用同噪声场不同 seed 偏移，避免完全相关的图案。
 */

const SIZE = 256;

/** LCG seeded 随机，与 utils/geometry 的 seededRandom 同族但独立（避免共享状态）。 */
function makeRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/** 值噪声格点（size×size，按自身尺寸环绕），双线性插值采样。 */
function sampleWrapped(field: Float32Array, size: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sx = smooth(fx);
  const sy = smooth(fy);
  const idx = (ix: number, iy: number) => (((iy % size) + size) % size) * size + (((ix % size) + size) % size);
  const v00 = field[idx(x0, y0)]!;
  const v10 = field[idx(x0 + 1, y0)]!;
  const v01 = field[idx(x0, y0 + 1)]!;
  const v11 = field[idx(x0 + 1, y0 + 1)]!;
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v11 - v10 - v01 + v00) * sx * sy;
}

/** 多倍频分形噪声高度场；freq 为基础频率（格点数），平铺由环绕索引保证。 */
function heightField(seed: number, freq: number, octaves: number): Float32Array {
  const random = makeRandom(seed);
  // 每倍频一层独立格点；累积幅度 0.5 衰减。
  const layers: Array<{ data: Float32Array; cells: number }> = [];
  for (let octave = 0; octave < octaves; octave += 1) {
    const cells = freq * 2 ** octave;
    const data = new Float32Array(cells * cells);
    for (let i = 0; i < data.length; i += 1) data[i] = random();
    layers.push({ data, cells });
  }
  const result = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let value = 0;
      let amplitude = 1;
      let total = 0;
      for (const { data, cells } of layers) {
        value += sampleWrapped(data, cells, (x / SIZE) * cells, (y / SIZE) * cells) * amplitude;
        total += amplitude;
        amplitude *= 0.5;
      }
      result[y * SIZE + x] = value / total;
    }
  }
  return result;
}

/** 从高度场生成法线 RGB（中心差分，环绕邻居 → 天然平铺）。 */
export function generateWaterNormalData(seed: number): Uint8Array {
  const heights = heightField(seed, 4, 4);
  const data = new Uint8Array(SIZE * SIZE * 4);
  const strength = 2.2;
  const at = (x: number, y: number) => heights[(((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE)]!;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // 法线 = normalize(-dx, -dy, 1)，编码到 [0,255]。
      const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * SIZE + x) * 4;
      data[i] = Math.round((-dx * inverse * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((-dy * inverse * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((inverse * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}

export const WATER_NORMAL_SIZE = SIZE;
