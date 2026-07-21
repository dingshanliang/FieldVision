/**
 * Deterministic 2D value noise + fbm for terrain and organic variation.
 * Seeded so the landscape is identical on every load.
 */

function hash2(ix: number, iz: number, seed: number) {
  let h = ix * 374761393 + iz * 668265263 + seed * 1442695041;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x: number, z: number, seed = 0) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const ux = smooth(fx);
  const uz = smooth(fz);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
}

/** Fractal Brownian motion, output roughly in [-1, 1]. */
export function fbm2D(x: number, z: number, octaves = 4, seed = 0) {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  let normalization = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(x * frequency, z * frequency, seed + octave * 101) * amplitude;
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / normalization;
}
