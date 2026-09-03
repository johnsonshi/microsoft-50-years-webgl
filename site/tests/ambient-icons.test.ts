import { describe, expect, it } from "vitest";
import { createAmbientIconData } from "../src/scene/AmbientIconField";

describe("ambient icon field", () => {
  it("creates deterministic icon attributes within visual bounds", () => {
    const first = createAmbientIconData(84);
    const second = createAmbientIconData(84);

    expect(second).toEqual(first);
    expect(first.positions).toHaveLength(84 * 3);
    expect(first.sizes).toHaveLength(84);
    expect(first.depths).toHaveLength(84);
    expect(first.phases).toHaveLength(84);
    expect(first.opacities).toHaveLength(84);
    expect(Array.from(first.positions).every(Number.isFinite)).toBe(true);
    expect(Math.min(...first.sizes)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...first.sizes)).toBeLessThanOrEqual(15);
    expect(Math.min(...first.depths)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...first.depths)).toBeLessThanOrEqual(1);
  });

  it("rejects invalid icon populations", () => {
    expect(() => createAmbientIconData(0)).toThrow(
      "Ambient icon count must be a positive integer.",
    );
  });
});
