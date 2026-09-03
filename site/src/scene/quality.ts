export interface QualitySettings {
  particleCount: number;
  pixelRatio: number;
  pointSize: number;
  layoutShift: number;
  mobile: boolean;
}

export interface QualityInput {
  width: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  coarsePointer: boolean;
  reducedMotion: boolean;
}

export function selectQuality(input: QualityInput): QualitySettings {
  const mobile =
    input.width < 640 ||
    input.coarsePointer ||
    input.hardwareConcurrency > 0 && input.hardwareConcurrency <= 4;

  if (mobile) {
    return {
      particleCount: input.reducedMotion ? 20_000 : 28_000,
      pixelRatio: Math.min(input.devicePixelRatio, 1),
      pointSize: 1.85,
      layoutShift: 0,
      mobile: true,
    };
  }

  if (input.width < 1024) {
    return {
      particleCount: input.reducedMotion ? 38_000 : 54_000,
      pixelRatio: Math.min(input.devicePixelRatio, 1.25),
      pointSize: 1.72,
      layoutShift: 0.45,
      mobile: false,
    };
  }

  return {
    particleCount: input.reducedMotion ? 64_000 : 90_000,
    pixelRatio: Math.min(input.devicePixelRatio, 1.5),
    pointSize: 1.62,
    layoutShift: 1,
    mobile: false,
  };
}

