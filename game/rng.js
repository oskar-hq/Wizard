/**
 * Kleiner, deterministischer Zufallsgenerator (mulberry32) + Fisher-Yates-Shuffle.
 *
 * Deterministisch, damit die Engine-Tests reproduzierbar sind. Der Server
 * verwendet standardmäßig einen zufälligen Seed.
 */

/** Erzeugt eine Zufallsfunktion aus einem 32-Bit-Seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zufallsseed aus der Systemzeit + Math.random. */
export function randomSeed() {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

/**
 * Mischt ein Array in-place (Fisher-Yates) und gibt es zurück.
 * @param {Array} array
 * @param {() => number} random Zufallsfunktion mit Werten in [0, 1)
 */
export function shuffle(array, random = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
