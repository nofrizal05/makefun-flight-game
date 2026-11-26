// A small seeded random number generator (mulberry32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Smooth 1-D value noise from a seed: a sum of sines with fixed, unrelated
 * frequencies, so terrain and ridges are deterministic and cheap.
 */
export function makeNoise(seed) {
  const rand = createRandom(seed);
  const phases = [];
  const freqs = [0.011, 0.023, 0.047, 0.091, 0.173];
  for (let i = 0; i < freqs.length; i += 1) phases.push(rand() * Math.PI * 2);
  const amps = [1.0, 0.55, 0.28, 0.14, 0.07];
  return function noise(t) {
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < freqs.length; i += 1) {
      sum += amps[i] * Math.sin(t * freqs[i] + phases[i]);
      norm += amps[i];
    }
    return sum / norm;
  };
}

/** Clamp a value into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Shortest signed angle from `from` to `to`, in radians, in (-PI, PI]. */
export function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
