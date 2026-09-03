import {
  centered,
  randomBetween,
  type RandomSource,
} from "./random";

export type Vec3 = readonly [number, number, number];
export type PointSampler = (
  random: RandomSource,
  output: Float32Array,
  offset: number,
) => void;

export interface WeightedSampler {
  weight: number;
  sample: PointSampler;
}

export function writePoint(
  output: Float32Array,
  offset: number,
  x: number,
  y: number,
  z: number,
): void {
  output[offset] = x;
  output[offset + 1] = y;
  output[offset + 2] = z;
}

export function lineSampler(
  start: Vec3,
  end: Vec3,
  thickness = 0,
): PointSampler {
  return (random, output, offset) => {
    const t = random();
    writePoint(
      output,
      offset,
      start[0] + (end[0] - start[0]) * t + centered(random, thickness),
      start[1] + (end[1] - start[1]) * t + centered(random, thickness),
      start[2] + (end[2] - start[2]) * t + centered(random, thickness),
    );
  };
}

export function polylineSampler(
  points: readonly Vec3[],
  thickness = 0,
): PointSampler {
  if (points.length < 2) {
    throw new Error("A polyline needs at least two points.");
  }

  const cumulative = new Float32Array(points.length - 1);
  let totalLength = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    totalLength += Math.hypot(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2],
    );
    cumulative[index] = totalLength;
  }

  return (random, output, offset) => {
    const target = random() * totalLength;
    let segment = 0;
    while (
      segment < cumulative.length - 1 &&
      target > cumulative[segment]
    ) {
      segment += 1;
    }

    const previous = segment === 0 ? 0 : cumulative[segment - 1];
    const length = cumulative[segment] - previous || 1;
    const t = (target - previous) / length;
    const start = points[segment];
    const end = points[segment + 1];

    writePoint(
      output,
      offset,
      start[0] + (end[0] - start[0]) * t + centered(random, thickness),
      start[1] + (end[1] - start[1]) * t + centered(random, thickness),
      start[2] + (end[2] - start[2]) * t + centered(random, thickness),
    );
  };
}

export function bezierSampler(
  start: Vec3,
  controlA: Vec3,
  controlB: Vec3,
  end: Vec3,
  thickness = 0,
): PointSampler {
  return (random, output, offset) => {
    const t = random();
    const inverse = 1 - t;
    const a = inverse * inverse * inverse;
    const b = 3 * inverse * inverse * t;
    const c = 3 * inverse * t * t;
    const d = t * t * t;

    writePoint(
      output,
      offset,
      start[0] * a +
        controlA[0] * b +
        controlB[0] * c +
        end[0] * d +
        centered(random, thickness),
      start[1] * a +
        controlA[1] * b +
        controlB[1] * c +
        end[1] * d +
        centered(random, thickness),
      start[2] * a +
        controlA[2] * b +
        controlB[2] * c +
        end[2] * d +
        centered(random, thickness),
    );
  };
}

export function boxSurfaceSampler(
  center: Vec3,
  size: Vec3,
  shell = 0.02,
): PointSampler {
  const areas = [
    size[1] * size[2],
    size[1] * size[2],
    size[0] * size[2],
    size[0] * size[2],
    size[0] * size[1],
    size[0] * size[1],
  ];
  const totalArea = areas.reduce((sum, area) => sum + area, 0);

  return (random, output, offset) => {
    let choice = random() * totalArea;
    let face = 0;
    while (face < areas.length - 1 && choice > areas[face]) {
      choice -= areas[face];
      face += 1;
    }

    const x = randomBetween(random, -size[0] / 2, size[0] / 2);
    const y = randomBetween(random, -size[1] / 2, size[1] / 2);
    const z = randomBetween(random, -size[2] / 2, size[2] / 2);
    const halfX = size[0] / 2 + centered(random, shell);
    const halfY = size[1] / 2 + centered(random, shell);
    const halfZ = size[2] / 2 + centered(random, shell);

    switch (face) {
      case 0:
        writePoint(output, offset, center[0] - halfX, center[1] + y, center[2] + z);
        break;
      case 1:
        writePoint(output, offset, center[0] + halfX, center[1] + y, center[2] + z);
        break;
      case 2:
        writePoint(output, offset, center[0] + x, center[1] - halfY, center[2] + z);
        break;
      case 3:
        writePoint(output, offset, center[0] + x, center[1] + halfY, center[2] + z);
        break;
      case 4:
        writePoint(output, offset, center[0] + x, center[1] + y, center[2] - halfZ);
        break;
      default:
        writePoint(output, offset, center[0] + x, center[1] + y, center[2] + halfZ);
        break;
    }
  };
}

export function boxEdgesSampler(
  center: Vec3,
  size: Vec3,
  thickness = 0.025,
): PointSampler {
  const x = size[0] / 2;
  const y = size[1] / 2;
  const z = size[2] / 2;
  const vertices: Vec3[] = [
    [center[0] - x, center[1] - y, center[2] - z],
    [center[0] + x, center[1] - y, center[2] - z],
    [center[0] + x, center[1] + y, center[2] - z],
    [center[0] - x, center[1] + y, center[2] - z],
    [center[0] - x, center[1] - y, center[2] + z],
    [center[0] + x, center[1] - y, center[2] + z],
    [center[0] + x, center[1] + y, center[2] + z],
    [center[0] - x, center[1] + y, center[2] + z],
  ];
  const edgeIndexes = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const;
  const edges = edgeIndexes.map(([start, end]) =>
    lineSampler(vertices[start], vertices[end], thickness),
  );

  return choiceSampler(edges);
}

export function planeSampler(
  center: Vec3,
  width: number,
  height: number,
  depth = 0.04,
): PointSampler {
  return (random, output, offset) => {
    writePoint(
      output,
      offset,
      center[0] + centered(random, width),
      center[1] + centered(random, height),
      center[2] + centered(random, depth),
    );
  };
}

export function gridSampler(
  center: Vec3,
  width: number,
  height: number,
  columns: number,
  rows: number,
  depth = 0.04,
  thickness = 0.02,
): PointSampler {
  return (random, output, offset) => {
    const vertical = random() < columns / (columns + rows);
    if (vertical) {
      const column = Math.floor(random() * (columns + 1));
      writePoint(
        output,
        offset,
        center[0] - width / 2 + width * column / columns + centered(random, thickness),
        center[1] + centered(random, height),
        center[2] + centered(random, depth),
      );
      return;
    }

    const row = Math.floor(random() * (rows + 1));
    writePoint(
      output,
      offset,
      center[0] + centered(random, width),
      center[1] - height / 2 + height * row / rows + centered(random, thickness),
      center[2] + centered(random, depth),
    );
  };
}

export function ringSampler(
  center: Vec3,
  radiusX: number,
  radiusY: number,
  axis: "xy" | "xz" | "yz" = "xy",
  thickness = 0.04,
): PointSampler {
  return (random, output, offset) => {
    const angle = random() * Math.PI * 2;
    const a = Math.cos(angle) * (radiusX + centered(random, thickness));
    const b = Math.sin(angle) * (radiusY + centered(random, thickness));
    const depth = centered(random, thickness);

    if (axis === "xz") {
      writePoint(output, offset, center[0] + a, center[1] + depth, center[2] + b);
    } else if (axis === "yz") {
      writePoint(output, offset, center[0] + depth, center[1] + a, center[2] + b);
    } else {
      writePoint(output, offset, center[0] + a, center[1] + b, center[2] + depth);
    }
  };
}

export function sphereShellSampler(
  center: Vec3,
  radius: number,
  thickness = 0.06,
): PointSampler {
  return (random, output, offset) => {
    const y = randomBetween(random, -1, 1);
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const sampledRadius = radius + centered(random, thickness);
    writePoint(
      output,
      offset,
      center[0] + Math.cos(angle) * radial * sampledRadius,
      center[1] + y * sampledRadius,
      center[2] + Math.sin(angle) * radial * sampledRadius,
    );
  };
}

export function sphereVolumeSampler(
  center: Vec3,
  radius: number,
): PointSampler {
  return (random, output, offset) => {
    const y = randomBetween(random, -1, 1);
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const sampledRadius = Math.cbrt(random()) * radius;
    writePoint(
      output,
      offset,
      center[0] + Math.cos(angle) * radial * sampledRadius,
      center[1] + y * sampledRadius,
      center[2] + Math.sin(angle) * radial * sampledRadius,
    );
  };
}

export function choiceSampler(
  samplers: readonly PointSampler[],
): PointSampler {
  if (samplers.length === 0) {
    throw new Error("A sampler choice cannot be empty.");
  }

  return (random, output, offset) => {
    const index = Math.min(
      samplers.length - 1,
      Math.floor(random() * samplers.length),
    );
    samplers[index](random, output, offset);
  };
}

