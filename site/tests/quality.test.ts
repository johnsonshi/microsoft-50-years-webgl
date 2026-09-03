import { describe, expect, it } from "vitest";
import { selectQuality } from "../src/scene/quality";

describe("quality selection", () => {
  it("uses the desktop budget with a capped DPR", () => {
    expect(
      selectQuality({
        width: 1440,
        devicePixelRatio: 3,
        hardwareConcurrency: 10,
        coarsePointer: false,
        reducedMotion: false,
      }),
    ).toMatchObject({
      particleCount: 90_000,
      pixelRatio: 1.5,
      layoutShift: 1,
    });
  });

  it("reduces particles and DPR for mobile", () => {
    expect(
      selectQuality({
        width: 390,
        devicePixelRatio: 3,
        hardwareConcurrency: 8,
        coarsePointer: true,
        reducedMotion: false,
      }),
    ).toMatchObject({
      particleCount: 28_000,
      pixelRatio: 1,
      mobile: true,
    });
  });

  it("reduces the population further for reduced motion", () => {
    expect(
      selectQuality({
        width: 390,
        devicePixelRatio: 2,
        hardwareConcurrency: 8,
        coarsePointer: true,
        reducedMotion: true,
      }).particleCount,
    ).toBe(20_000);
  });
});

