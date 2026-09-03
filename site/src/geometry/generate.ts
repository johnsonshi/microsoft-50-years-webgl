import { sortByMorton } from "./morton";
import { createRandom } from "./random";
import type { WeightedSampler } from "./samplers";

export function generateTarget(
  particleCount: number,
  components: readonly WeightedSampler[],
  seed: number,
): Float32Array {
  if (particleCount <= 0) {
    throw new Error("Particle count must be positive.");
  }

  const totalWeight = components.reduce(
    (sum, component) => sum + component.weight,
    0,
  );
  if (totalWeight <= 0) {
    throw new Error("A scene needs at least one positively weighted sampler.");
  }

  const output = new Float32Array(particleCount * 3);
  const random = createRandom(seed);
  let written = 0;

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    const remaining = particleCount - written;
    const componentCount =
      index === components.length - 1
        ? remaining
        : Math.min(
            remaining,
            Math.round(particleCount * component.weight / totalWeight),
          );

    for (let point = 0; point < componentCount; point += 1) {
      component.sample(random, output, written * 3);
      written += 1;
    }
  }

  while (written < particleCount) {
    components[components.length - 1].sample(random, output, written * 3);
    written += 1;
  }

  return sortByMorton(output);
}

