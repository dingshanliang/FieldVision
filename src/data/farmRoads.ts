/**
 * Farm track network data: a ring road around the field blocks plus a short
 * spur toward the pump station. Points are [x, z] scene coordinates.
 *
 * 机耕路是无人农机"安全边界"语义的载体：所有路面（含两侧路缘）不得压进
 * 任何田块多边形，由 src/scene/farmRoads.test.ts 固化回归。
 */
export const roadPaths: Array<{ points: Array<[number, number]>; width: number }> = [
  { points: [[-165, -104], [-60, -106], [40, -103], [162, -100]], width: 5.6 }, // south
  { points: [[162, -100], [166, -20], [164, 60], [150, 96]], width: 5.6 }, // east
  { points: [[150, 96], [110, 102], [92, 103]], width: 4.2 }, // pump spur
  { points: [[-165, -104], [-168, 0], [-166, 80], [-150, 122]], width: 5.2 }, // west
  { points: [[-150, 122], [-60, 126], [30, 124], [80, 120]], width: 5.2 }, // north
  { points: [[-153, -18], [-82, -21], [-10, -22], [63, -20], [154, -15]], width: 4.4 }, // central field track
  // 南北向机耕道：沿各地块间走廊走行——A01/A02 间 → 中央道 → B01/B02 间 →
  // B02/C01 间空隙 → C01 东侧边缘 → 北环路。田块顶点已同步微调以让出路面。
  { points: [[-42, -104], [-43, -70], [-41.5, -55], [-38, -42], [-36.5, -30], [-40, -20], [-49, 0], [-48.5, 25], [-47.5, 45], [-35, 69.5], [-5, 71], [28, 72], [42, 85], [44, 105], [40, 122]], width: 3.8 }, // north-south service track
];
