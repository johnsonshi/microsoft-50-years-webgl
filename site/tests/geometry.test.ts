import { describe, expect, it } from "vitest";
import { generateTarget } from "../src/geometry/generate";
import { sortByMorton } from "../src/geometry/morton";
import {
  boxEdgesSampler,
  lineSampler,
  type WeightedSampler,
} from "../src/geometry/samplers";

describe("procedural geometry", () => {
  const components: WeightedSampler[] = [
    {
      weight: 2,
      sample: lineSampler([-1, 0, 0], [1, 0, 0], 0.02),
    },
    {
      weight: 1,
      sample: boxEdgesSampler([0, 0, 0], [1, 1, 1], 0.02),
    },
  ];

  it("creates the exact requested finite population", () => {
    const target = generateTarget(4096, components, 42);
    expect(target).toHaveLength(4096 * 3);
    expect(Array.from(target).every(Number.isFinite)).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const first = generateTarget(256, components, 8);
    const second = generateTarget(256, components, 8);
    expect(second).toEqual(first);
  });

  it("Morton sorting preserves position values", () => {
    const source = new Float32Array([
      2, 1, 0,
      -2, 3, 1,
      0, -1, 4,
      1, 1, 1,
    ]);
    const sorted = sortByMorton(source);
    const sourceSum = Array.from(source).reduce((sum, value) => sum + value, 0);
    const sortedSum = Array.from(sorted).reduce((sum, value) => sum + value, 0);
    expect(sorted).toHaveLength(source.length);
    expect(sortedSum).toBe(sourceSum);
  });
});

