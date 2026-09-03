import { generateTarget } from "./generate";
import {
  bezierSampler,
  boxEdgesSampler,
  boxSurfaceSampler,
  choiceSampler,
  gridSampler,
  lineSampler,
  planeSampler,
  polylineSampler,
  ringSampler,
  sphereShellSampler,
  sphereVolumeSampler,
  writePoint,
  type PointSampler,
  type Vec3,
  type WeightedSampler,
} from "./samplers";
import { textSampler } from "./textSampler";

const SCENE_SEEDS = [
  0x1975,
  0x1985,
  0x1995,
  0x2005,
  0x2015,
  0x2024,
  0x2025,
  0x2050,
] as const;

export async function buildSceneTargets(
  particleCount: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<Float32Array[]> {
  const targets: Float32Array[] = [];

  for (let index = 0; index < SCENE_SEEDS.length; index += 1) {
    const components = createSceneComponents(index);
    targets.push(generateTarget(particleCount, components, SCENE_SEEDS[index]));
    onProgress?.(index + 1, SCENE_SEEDS.length);
    await nextFrame();
  }

  return targets;
}

function createSceneComponents(index: number): WeightedSampler[] {
  switch (index) {
    case 0:
      return originScene();
    case 1:
      return personalScene();
    case 2:
      return visualScene();
    case 3:
      return platformScene();
    case 4:
      return cloudScene();
    case 5:
      return fabricScene();
    case 6:
      return fiftyScene();
    case 7:
      return futureScene();
    default:
      throw new Error(`Unknown scene index ${index}.`);
  }
}

function originScene(): WeightedSampler[] {
  const tapeLines = [-1.55, -1.35, -1.15].map((y, index) =>
    lineSampler([-3.7, y, -0.85 - index * 0.13], [3.7, y, -0.85 - index * 0.13], 0.04),
  );
  const tapeHoles = Array.from({ length: 19 }, (_, index) =>
    ringSampler([-3.4 + index * 0.38, -1.35 + (index % 3) * 0.2, -0.7], 0.055, 0.055, "xy", 0.014),
  );

  return [
    { weight: 0.19, sample: boxEdgesSampler([0, 0.28, 0], [4.25, 2.75, 0.65], 0.035) },
    { weight: 0.08, sample: planeSampler([0, 0.28, -0.27], 3.7, 2.2, 0.05) },
    {
      weight: 0.25,
      sample: textSampler("BASIC", {
        center: [0, 0.43, 0.38],
        width: 3.3,
        height: 1.55,
        depth: 0.22,
        weight: 760,
      }),
    },
    { weight: 0.08, sample: boxSurfaceSampler([1.44, -0.55, 0.48], [0.17, 0.7, 0.14], 0.025) },
    { weight: 0.13, sample: choiceSampler(tapeLines) },
    { weight: 0.11, sample: choiceSampler(tapeHoles) },
    { weight: 0.09, sample: boxEdgesSampler([0, -1.37, 0.1], [4.7, 0.35, 1.1], 0.04) },
    { weight: 0.07, sample: radialSignalSampler() },
  ];
}

function personalScene(): WeightedSampler[] {
  const keyboardRows = Array.from({ length: 6 }, (_, row) =>
    lineSampler(
      [-2.55 + row * 0.09, -1.38 - row * 0.12, 0.72 + row * 0.14],
      [1.35 - row * 0.06, -1.38 - row * 0.12, 0.72 + row * 0.14],
      0.035,
    ),
  );
  const vents = Array.from({ length: 8 }, (_, index) =>
    lineSampler([1.75, -0.65 + index * 0.19, -0.08], [2.35, -0.65 + index * 0.19, -0.08], 0.02),
  );

  return [
    { weight: 0.16, sample: boxEdgesSampler([-0.45, 0.45, 0], [3.75, 2.65, 0.72], 0.035) },
    { weight: 0.07, sample: planeSampler([-0.45, 0.45, -0.28], 3.2, 2.1, 0.04) },
    {
      weight: 0.22,
      sample: textSampler("C:\\>", {
        center: [-0.55, 0.5, 0.42],
        width: 2.85,
        height: 1.45,
        depth: 0.2,
        family: '"Cascadia Mono", "Courier New", monospace',
        weight: 700,
      }),
    },
    { weight: 0.14, sample: boxSurfaceSampler([1.95, 0.05, -0.1], [1.25, 3.35, 1.05], 0.035) },
    { weight: 0.08, sample: choiceSampler(vents) },
    { weight: 0.16, sample: choiceSampler(keyboardRows) },
    { weight: 0.11, sample: planeSampler([-0.62, -1.62, 1.02], 4.1, 1.05, 0.25) },
    { weight: 0.06, sample: lineSampler([-2.8, -2.05, 1.28], [1.65, -2.05, 1.28], 0.05) },
  ];
}

function visualScene(): WeightedSampler[] {
  const windowFrames = [
    boxEdgesSampler([-0.9, 0.45, -0.55], [4.1, 2.75, 0.08], 0.03),
    boxEdgesSampler([0.15, 0.1, -0.05], [3.8, 2.65, 0.08], 0.03),
    boxEdgesSampler([0.95, -0.2, 0.5], [3.4, 2.4, 0.08], 0.03),
  ];
  const nodes: Vec3[] = [
    [-2.8, -1.6, -0.5],
    [-1.1, -1.85, 0.3],
    [0.8, -1.68, -0.1],
    [2.7, -1.48, 0.55],
  ];
  const nodeSamplers = nodes.map((node) => sphereShellSampler(node, 0.17, 0.05));
  const links = nodes.slice(0, -1).map((node, index) =>
    bezierSampler(
      node,
      [node[0] + 0.5, -0.75, node[2] - 0.2],
      [nodes[index + 1][0] - 0.5, -0.75, nodes[index + 1][2] + 0.2],
      nodes[index + 1],
      0.025,
    ),
  );

  return [
    { weight: 0.25, sample: choiceSampler(windowFrames) },
    { weight: 0.17, sample: gridSampler([0.15, 0.1, 0.03], 3.45, 2.3, 5, 4, 0.11, 0.025) },
    { weight: 0.16, sample: planeSampler([0.15, 0.1, -0.62], 3.25, 2.1, 0.12) },
    { weight: 0.14, sample: choiceSampler(nodeSamplers) },
    { weight: 0.16, sample: choiceSampler(links) },
    { weight: 0.07, sample: ringSampler([0.15, 0.1, 0.2], 2.6, 1.75, "xy", 0.045) },
    { weight: 0.05, sample: lineSampler([-3.1, 1.95, -0.8], [3.1, 1.95, 0.8], 0.04) },
  ];
}

function platformScene(): WeightedSampler[] {
  const rackCenters = [-2, 0, 2];
  const racks = rackCenters.map((x, index) =>
    boxSurfaceSampler([x, 0, (index - 1) * 0.45], [1.2, 3.75, 1.15], 0.035),
  );
  const rackEdges = rackCenters.map((x, index) =>
    boxEdgesSampler([x, 0, (index - 1) * 0.45], [1.25, 3.8, 1.2], 0.03),
  );
  const units = rackCenters.flatMap((x, rackIndex) =>
    Array.from({ length: 10 }, (_, unit) =>
      lineSampler(
        [x - 0.48, -1.55 + unit * 0.34, (rackIndex - 1) * 0.45 + 0.59],
        [x + 0.48, -1.55 + unit * 0.34, (rackIndex - 1) * 0.45 + 0.59],
        0.025,
      ),
    ),
  );
  const routes = [
    bezierSampler([-2, 1.95, -0.45], [-1.5, 2.65, 0], [-0.55, 2.65, 0.2], [0, 1.95, 0], 0.035),
    bezierSampler([0, 1.95, 0], [0.6, 2.8, -0.2], [1.55, 2.65, 0.25], [2, 1.95, 0.45], 0.035),
    bezierSampler([-2, -1.95, -0.45], [-1, -2.55, 0.35], [1, -2.55, -0.25], [2, -1.95, 0.45], 0.035),
  ];

  return [
    { weight: 0.27, sample: choiceSampler(racks) },
    { weight: 0.14, sample: choiceSampler(rackEdges) },
    { weight: 0.24, sample: choiceSampler(units) },
    { weight: 0.17, sample: choiceSampler(routes) },
    { weight: 0.1, sample: ringSampler([0, 0, -0.7], 3.45, 2.35, "xy", 0.06) },
    { weight: 0.08, sample: sphereVolumeSampler([0, 0, 0], 0.5) },
  ];
}

function cloudScene(): WeightedSampler[] {
  const clusters: Array<{ center: Vec3; radius: number }> = [
    { center: [-2.1, 0.75, -0.4], radius: 1.05 },
    { center: [-0.85, 1.15, 0.2], radius: 1.25 },
    { center: [0.65, 1.12, -0.1], radius: 1.35 },
    { center: [2.05, 0.75, 0.45], radius: 0.98 },
    { center: [0, 0.45, 0.6], radius: 1.4 },
  ];
  const cloudVolumes = clusters.map(({ center, radius }) =>
    sphereVolumeSampler(center, radius),
  );
  const regionNodes: Vec3[] = [
    [-3.2, -1.25, -0.4],
    [-1.6, -1.7, 0.35],
    [0, -1.35, -0.65],
    [1.7, -1.75, 0.2],
    [3.25, -1.2, 0.55],
  ];
  const nodeSamplers = regionNodes.map((node) =>
    sphereShellSampler(node, 0.2, 0.05),
  );
  const uplinks = regionNodes.map((node, index) =>
    bezierSampler(
      node,
      [node[0] * 0.72, -0.35, node[2] + 0.25],
      [clusters[index % clusters.length].center[0], 0.1, clusters[index % clusters.length].center[2]],
      clusters[index % clusters.length].center,
      0.035,
    ),
  );

  return [
    { weight: 0.36, sample: choiceSampler(cloudVolumes) },
    { weight: 0.12, sample: choiceSampler(nodeSamplers) },
    { weight: 0.16, sample: choiceSampler(uplinks) },
    { weight: 0.11, sample: ringSampler([0, -0.9, 0], 3.5, 1.15, "xz", 0.055) },
    { weight: 0.11, sample: ringSampler([0, -0.9, 0], 2.45, 1.55, "yz", 0.055) },
    { weight: 0.14, sample: datacenterColumnsSampler() },
  ];
}

function fabricScene(): WeightedSampler[] {
  const cells: PointSampler[] = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 2) {
        cells.push(
          boxSurfaceSampler(
            [x * 1.65, y * 1.35, z * 0.65],
            [1.05, 0.82, 0.72],
            0.035,
          ),
        );
      }
    }
  }
  const rails = [
    lineSampler([-3.15, -1.75, -0.9], [3.15, -1.75, -0.9], 0.045),
    lineSampler([-3.15, 0, 0], [3.15, 0, 0], 0.045),
    lineSampler([-3.15, 1.75, 0.9], [3.15, 1.75, 0.9], 0.045),
  ];
  const tokenStreams = [
    bezierSampler([-3.4, 1.95, -0.8], [-1.6, 2.7, 0.8], [1.3, -2.65, -0.7], [3.45, -1.7, 0.85], 0.035),
    bezierSampler([-3.45, -1.4, 0.85], [-1.2, -2.55, -0.7], [1.4, 2.6, 0.75], [3.4, 1.55, -0.8], 0.035),
  ];

  return [
    { weight: 0.39, sample: choiceSampler(cells) },
    { weight: 0.16, sample: choiceSampler(rails) },
    { weight: 0.2, sample: choiceSampler(tokenStreams) },
    { weight: 0.12, sample: neuralGraphSampler() },
    { weight: 0.08, sample: ringSampler([0, 0, 0], 3.45, 2.35, "xy", 0.045) },
    { weight: 0.05, sample: sphereVolumeSampler([0, 0, 0], 0.48) },
  ];
}

function fiftyScene(): WeightedSampler[] {
  const markers = Array.from({ length: 50 }, (_, index) => {
    const angle = index / 50 * Math.PI * 2;
    const radiusX = 3.85;
    const radiusY = 2.35;
    return sphereShellSampler(
      [Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, Math.sin(angle * 3) * 0.5],
      0.075,
      0.025,
    );
  });

  return [
    {
      weight: 0.65,
      sample: textSampler("50", {
        center: [0, 0.35, 0],
        width: 5.2,
        height: 3.45,
        depth: 0.78,
        weight: 850,
        scanStep: 2,
      }),
    },
    { weight: 0.16, sample: choiceSampler(markers) },
    { weight: 0.12, sample: ringSampler([0, 0.1, -0.3], 4.2, 2.65, "xy", 0.045) },
    { weight: 0.07, sample: ringSampler([0, 0.1, 0], 2.2, 1.25, "xz", 0.04) },
  ];
}

function futureScene(): WeightedSampler[] {
  const branches = [
    polylineSampler([[-4.4, -1.5, -1.7], [-2.9, -0.9, -0.7], [-1.2, -0.2, 0.25], [0.2, 0.75, 0.9], [1.7, 1.45, 1.35]], 0.05),
    polylineSampler([[-3.4, -1.7, 1.6], [-1.9, -0.75, 0.65], [-0.4, 0.15, -0.2], [1.15, 0.85, -0.9], [3.6, 1.7, -1.45]], 0.05),
    bezierSampler([-4.5, 0.9, 0.4], [-2.4, 2.55, -1.4], [1.8, -2.1, 1.3], [4.5, 0.55, -0.35], 0.05),
  ];
  const towers = [-3.4, -1.75, 0, 1.8, 3.5].map((x, index) =>
    boxEdgesSampler(
      [x, -0.45 + (index % 2) * 0.32, -1.2 + index * 0.58],
      [0.42, 1.6 + (index % 3) * 0.48, 0.42],
      0.035,
    ),
  );

  return [
    { weight: 0.48, sample: futureLandscapeSampler() },
    { weight: 0.2, sample: choiceSampler(branches) },
    { weight: 0.13, sample: choiceSampler(towers) },
    { weight: 0.1, sample: openNodeFieldSampler() },
    { weight: 0.09, sample: ringSampler([0, 0.4, 0], 4.25, 2.3, "xz", 0.08) },
  ];
}

function radialSignalSampler(): PointSampler {
  return (random, output, offset) => {
    const angle = random() * Math.PI * 2;
    const radius = 1.9 + Math.pow(random(), 1.7) * 2.2;
    writePoint(
      output,
      offset,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.72,
      -1.3 - random() * 0.9,
    );
  };
}

function datacenterColumnsSampler(): PointSampler {
  return (random, output, offset) => {
    const column = Math.floor(random() * 11);
    const x = -3.2 + column * 0.64;
    const height = 0.55 + (column % 4) * 0.18;
    writePoint(
      output,
      offset,
      x + (random() - 0.5) * 0.22,
      -2 + random() * height,
      -0.35 + (random() - 0.5) * 0.75,
    );
  };
}

function neuralGraphSampler(): PointSampler {
  const nodes: Vec3[] = [
    [-2.8, 1.8, -0.4],
    [-1.6, 0.85, 0.55],
    [-1.9, -0.9, -0.7],
    [-0.25, 1.45, -0.8],
    [0, 0, 0.85],
    [0.4, -1.5, -0.4],
    [1.75, 0.95, 0.65],
    [2.15, -0.75, -0.75],
    [3.05, 1.65, 0.1],
  ];
  const links: PointSampler[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    links.push(lineSampler(nodes[index], nodes[index + 1], 0.035));
    if (index + 3 < nodes.length) {
      links.push(lineSampler(nodes[index], nodes[index + 3], 0.035));
    }
  }
  const nodeSamplers = nodes.map((node) => sphereShellSampler(node, 0.13, 0.04));
  return choiceSampler([...links, ...nodeSamplers, ...nodeSamplers]);
}

function futureLandscapeSampler(): PointSampler {
  return (random, output, offset) => {
    const x = (random() - 0.5) * 9.2;
    const z = (random() - 0.5) * 5.2;
    const ridge =
      -0.8 +
      Math.sin(x * 0.78 + z * 0.42) * 0.34 +
      Math.cos(z * 1.18 - x * 0.16) * 0.24 +
      Math.sin((x + z) * 1.7) * 0.08;
    writePoint(
      output,
      offset,
      x,
      ridge + (random() - 0.5) * 0.12,
      z,
    );
  };
}

function openNodeFieldSampler(): PointSampler {
  return (random, output, offset) => {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 4.5;
    const height = -0.3 + Math.pow(random(), 2.2) * 3.1;
    writePoint(
      output,
      offset,
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius * 0.75,
    );
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
