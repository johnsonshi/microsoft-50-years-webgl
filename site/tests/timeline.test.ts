import { describe, expect, it } from "vitest";
import { resolveTimeline } from "../src/timeline/ScrollTimeline";

describe("resolveTimeline", () => {
  it("clamps to the first and last scenes", () => {
    expect(resolveTimeline(-2, 8).sceneA).toBe(0);
    expect(resolveTimeline(2, 8)).toMatchObject({
      sceneA: 7,
      sceneB: 7,
      local: 0,
    });
  });

  it("maps a transition midpoint to neighboring scenes", () => {
    const state = resolveTimeline(2.5 / 7, 8);
    expect(state.sceneA).toBe(2);
    expect(state.sceneB).toBe(3);
    expect(state.local).toBeCloseTo(0.5, 6);
    expect(state.eased).toBeCloseTo(0.5, 6);
  });

  it("snaps to a settled scene for reduced motion", () => {
    expect(resolveTimeline(2.6 / 7, 8, true)).toMatchObject({
      sceneA: 3,
      sceneB: 3,
      local: 0,
      eased: 0,
    });
  });
});

