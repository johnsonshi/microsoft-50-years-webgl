export type RandomSource = () => number;

export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

export function randomBetween(
  random: RandomSource,
  minimum: number,
  maximum: number,
): number {
  return minimum + (maximum - minimum) * random();
}

export function centered(random: RandomSource, amplitude: number): number {
  return (random() - 0.5) * amplitude;
}

