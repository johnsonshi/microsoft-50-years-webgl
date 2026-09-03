import { generateTarget } from "./generate";
import {
  bezierSampler,
  boxEdgesSampler,
  boxSurfaceSampler,
  choiceSampler,
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
      return windowsInternetScene();
    case 3:
      return productivityScene();
    case 4:
      return datacenterScene();
    case 5:
      return agentsScene();
    case 6:
      return microsoftScene();
    case 7:
      return spaceScene();
    default:
      throw new Error(`Unknown scene index ${index}.`);
  }
}

function originScene(): WeightedSampler[] {
  const codeLines = Array.from({ length: 33 }, (_, index) => {
    const y = 1.55 - index * 0.102;
    const indent =
      index % 7 === 0 ? 0.42 : index % 4 === 0 ? 0.2 : 0;
    const lineLength = 2.35 + ((index * 17) % 10) * 0.15;
    const startX = -1.88 + indent;
    return lineSampler(
      [startX, y, 0.16],
      [Math.min(1.95, startX + lineLength), y, 0.16],
      0.014,
    );
  });
  const punchHoles = Array.from({ length: 14 }, (_, index) =>
    ringSampler(
      [-2.28, 1.78 - index * 0.285, 0.2],
      0.055,
      0.055,
      "xy",
      0.014,
    ),
  );
  return [
    {
      weight: 0.15,
      sample: boxEdgesSampler([-0.18, 0.05, 0], [4.85, 4.7, 0.22], 0.03),
    },
    {
      weight: 0.19,
      sample: textSampler("ALTAIR BASIC", {
        center: [-0.02, 1.94, 0.19],
        width: 3.55,
        height: 0.56,
        depth: 0.08,
        family: '"Cascadia Mono", "Courier New", monospace',
        weight: 700,
        scanStep: 2,
      }),
    },
    { weight: 0.48, sample: choiceSampler(codeLines) },
    { weight: 0.1, sample: choiceSampler(punchHoles) },
    {
      weight: 0.08,
      sample: choiceSampler([
        lineSampler([-1.88, 1.7, 0.18], [1.93, 1.7, 0.18], 0.018),
        lineSampler([-1.88, -1.93, 0.18], [1.92, -1.93, 0.18], 0.018),
        planeSampler([-0.15, 0.05, -0.08], 4.45, 4.25, 0.04),
      ]),
    },
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
  const terminalLines = [
    lineSampler([-1.68, 1.02, 0.42], [0.55, 1.02, 0.42], 0.02),
    lineSampler([-1.68, 0.72, 0.42], [0.1, 0.72, 0.42], 0.02),
    lineSampler([-1.38, 0.42, 0.42], [0.72, 0.42, 0.42], 0.02),
    lineSampler([-1.68, 0.08, 0.42], [-0.28, 0.08, 0.42], 0.02),
    lineSampler([-1.38, -0.22, 0.42], [0.46, -0.22, 0.42], 0.02),
    lineSampler([-1.68, -0.55, 0.42], [-0.55, -0.55, 0.42], 0.02),
  ];
  const terminalFrames = [
    boxEdgesSampler([-0.52, 0.45, 0.4], [2.85, 1.86, 0.08], 0.022),
    lineSampler([-1.94, 0.72, 0.45], [-1.94, 1.38, 0.45], 0.02),
    lineSampler([-1.94, 0.72, 0.45], [-1.25, 0.72, 0.45], 0.02),
    boxEdgesSampler([0.18, -0.58, 0.45], [1.05, 0.35, 0.05], 0.018),
  ];
  const terminalText = [
    textSampler("READY", {
      center: [-0.95, 1.28, 0.47],
      width: 1.42,
      height: 0.3,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
    textSampler("> RUN", {
      center: [-1.1, 0.14, 0.47],
      width: 1.25,
      height: 0.3,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
    textSampler(">_", {
      center: [0.1, -0.57, 0.48],
      width: 0.62,
      height: 0.25,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
  ];

  return [
    { weight: 0.15, sample: boxEdgesSampler([-0.45, 0.45, 0], [3.75, 2.65, 0.72], 0.035) },
    { weight: 0.05, sample: planeSampler([-0.45, 0.45, -0.28], 3.2, 2.1, 0.04) },
    { weight: 0.12, sample: choiceSampler(terminalFrames) },
    { weight: 0.2, sample: choiceSampler(terminalLines) },
    { weight: 0.15, sample: choiceSampler(terminalText) },
    { weight: 0.12, sample: boxSurfaceSampler([1.95, 0.05, -0.1], [1.25, 3.35, 1.05], 0.035) },
    { weight: 0.06, sample: choiceSampler(vents) },
    { weight: 0.09, sample: choiceSampler(keyboardRows) },
    { weight: 0.04, sample: planeSampler([-0.62, -1.62, 1.02], 4.1, 1.05, 0.25) },
    { weight: 0.02, sample: lineSampler([-2.8, -2.05, 1.28], [1.65, -2.05, 1.28], 0.05) },
  ];
}

function windowsInternetScene(): WeightedSampler[] {
  const browserWindow = interfacePanelSamplers(
    [-1.35, 0.52, -0.5],
    4.35,
    3.0,
    "HTTP://",
    5,
  );
  const mailWindow = interfacePanelSamplers(
    [0.1, -0.42, 0.2],
    3.45,
    2.35,
    "MAIL @",
    4,
  );
  const terminalWindow = interfacePanelSamplers(
    [-2.05, -1.28, 0.72],
    2.45,
    1.35,
    "> CONNECT",
    3,
  );
  const windowsPanes = paneSamplers([-2.7, 1.55, 0.66], 0.24);
  const envelope = envelopeSamplers([0.72, 0.12, 0.48], 0.95, 0.58);
  const nodeCenters: Vec3[] = [
    [-3.05, 1.75, -0.7],
    [-2.6, -1.85, 0.3],
    [0.25, 1.88, -0.35],
    [2.3, 0.45, -0.45],
    [1.55, -1.62, 0.55],
  ];
  const nodes = nodeCenters.map((center) =>
    sphereShellSampler(center, 0.11, 0.035),
  );
  const connections = nodeCenters.map((center, index) => {
    const next = nodeCenters[(index + 1) % nodeCenters.length];
    return bezierSampler(
      center,
      [center[0] * 0.75, center[1] * 0.35, center[2] + 0.35],
      [next[0] * 0.75, next[1] * 0.35, next[2] - 0.35],
      next,
      0.022,
    );
  });
  const protocolLabels = [
    textSampler("TCP/IP", {
      center: [-0.8, 1.82, 0.75],
      width: 1.05,
      height: 0.28,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
    textSampler("WWW", {
      center: [1.92, -1.25, 0.78],
      width: 0.8,
      height: 0.3,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
  ];

  return [
    { weight: 0.24, sample: choiceSampler(browserWindow) },
    { weight: 0.22, sample: choiceSampler(mailWindow) },
    { weight: 0.14, sample: choiceSampler(terminalWindow) },
    { weight: 0.08, sample: choiceSampler(windowsPanes) },
    { weight: 0.1, sample: choiceSampler(envelope) },
    { weight: 0.12, sample: choiceSampler(connections) },
    { weight: 0.06, sample: choiceSampler(nodes) },
    { weight: 0.04, sample: choiceSampler(protocolLabels) },
  ];
}

function productivityScene(): WeightedSampler[] {
  const firstMail = envelopeSamplers([-2.2, 1.12, 0.15], 1.15, 0.72);
  const wordDocument = documentSamplers(
    [-0.7, 0.48, 0.42],
    1.5,
    1.55,
    "DOCS",
  );
  const presentation = documentSamplers(
    [0.92, -0.52, 0.62],
    2.35,
    1.18,
    "SLIDES",
  );
  const secondMail = envelopeSamplers([2.38, 0.92, -0.25], 1.08, 0.68);
  const secondDocument = documentSamplers(
    [2.85, -1.02, 0.22],
    1.48,
    1.4,
    "REPORT",
  );
  const streams = [
    bezierSampler(
      [-3.7, 0.45, -0.65],
      [-3.15, 1.32, 0.5],
      [-2.7, 1.42, -0.3],
      [-2.2, 1.12, 0.15],
      0.03,
    ),
    bezierSampler(
      [-2.2, 1.12, 0.15],
      [-1.75, 1.65, -0.2],
      [-1.05, 1.25, 0.65],
      [-0.7, 0.48, 0.42],
      0.03,
    ),
    bezierSampler(
      [0.0, -0.12, 0.42],
      [0.05, -0.3, -0.35],
      [-0.08, 0.08, 0.85],
      [-0.22, 0.02, 0.62],
      0.03,
    ),
    bezierSampler(
      [1.98, -0.02, 0.62],
      [2.12, 0.38, 0.8],
      [2.12, 0.75, -0.5],
      [1.88, 0.88, -0.25],
      0.03,
    ),
    bezierSampler(
      [2.02, -0.72, 0.62],
      [2.22, -0.86, -0.55],
      [2.12, -0.95, 0.65],
      [2.14, -0.98, 0.22],
      0.03,
    ),
    bezierSampler(
      [-3.8, -1.55, -0.7],
      [-1.7, -2.45, 0.75],
      [1.7, -2.35, -0.65],
      [3.75, -1.62, 0.6],
      0.035,
    ),
  ];
  const flowNodeCenters: Vec3[] = [
    [-2.2, 1.12, 0.15],
    [0.0, -0.12, 0.42],
    [-0.22, 0.02, 0.62],
    [1.88, 0.88, -0.25],
    [2.14, -0.98, 0.22],
  ];
  const flowNodes = flowNodeCenters.map((point) =>
    sphereShellSampler(point, 0.1, 0.035),
  );

  return [
    { weight: 0.13, sample: choiceSampler(firstMail) },
    { weight: 0.18, sample: choiceSampler(wordDocument) },
    { weight: 0.18, sample: choiceSampler(presentation) },
    { weight: 0.12, sample: choiceSampler(secondMail) },
    { weight: 0.18, sample: choiceSampler(secondDocument) },
    { weight: 0.17, sample: choiceSampler(streams) },
    { weight: 0.04, sample: choiceSampler(flowNodes) },
  ];
}

function datacenterScene(): WeightedSampler[] {
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
    bezierSampler([-2, -1.95, -0.45], [-1, -2.55, 0.35], [1, -2.55, -0.25], [2, -1.95, 0.45], 0.035),
  ];

  return [
    { weight: 0.31, sample: choiceSampler(racks) },
    { weight: 0.14, sample: choiceSampler(rackEdges) },
    { weight: 0.3, sample: choiceSampler(units) },
    { weight: 0.1, sample: choiceSampler(routes) },
    { weight: 0.1, sample: ringSampler([0, -1.72, -0.7], 3.45, 0.52, "xy", 0.06) },
    { weight: 0.05, sample: sphereVolumeSampler([0, 0, 0], 0.5) },
  ];
}

function agentsScene(): WeightedSampler[] {
  const coreCenter: Vec3 = [0.08, 0.02, 0.12];
  const core = [
    sphereVolumeSampler(coreCenter, 0.64),
    sphereShellSampler(coreCenter, 0.82, 0.05),
    ringSampler(coreCenter, 1.02, 1.02, "xy", 0.045),
    ringSampler(coreCenter, 1.08, 0.72, "xz", 0.045),
  ];
  const systemSpecs: Array<{ center: Vec3; label: string }> = [
    { center: [-2.65, 1.25, 0.48], label: "PLAN" },
    { center: [-1.2, 1.85, 0.18], label: "MEMORY" },
    { center: [1.2, 1.85, 0.58], label: "CODE" },
    { center: [2.7, 1.15, 0.22], label: "DEPLOY" },
    { center: [2.78, -0.9, 0.62], label: "TOOLS" },
    { center: [1.25, -1.65, 0.24], label: "DATA" },
    { center: [-1.25, -1.7, 0.64], label: "VISION" },
    { center: [-2.75, -0.75, 0.22], label: "SEARCH" },
  ];
  const systemPanels = systemSpecs.flatMap(({ center, label }) =>
    labeledPanelSamplers(center, 1.05, 0.62, label),
  );
  const systemNodes = systemSpecs.map(({ center }) =>
    sphereShellSampler(center, 0.12, 0.035),
  );
  const systemLinks = systemSpecs.flatMap(({ center }, index) => {
    const next = systemSpecs[(index + 1) % systemSpecs.length].center;
    return [
      bezierSampler(
        coreCenter,
        [center[0] * 0.35, center[1] * 0.2, -0.55],
        [center[0] * 0.78, center[1] * 0.85, center[2] + 0.35],
        center,
        0.025,
      ),
      lineSampler(center, next, 0.02),
    ];
  });
  const tokenStreams = [
    bezierSampler(
      [-3.65, 1.9, -0.8],
      [-1.9, 0.6, 0.9],
      [1.7, 0.8, -0.9],
      [3.6, -1.55, 0.75],
      0.035,
    ),
  ];

  return [
    { weight: 0.22, sample: choiceSampler(core) },
    {
      weight: 0.1,
      sample: textSampler("AI", {
        center: coreCenter,
        width: 0.88,
        height: 0.68,
        depth: 0.06,
        family: '"Segoe UI", Helvetica, Arial, sans-serif',
        weight: 700,
        scanStep: 2,
      }),
    },
    { weight: 0.32, sample: choiceSampler(systemPanels) },
    { weight: 0.06, sample: choiceSampler(systemNodes) },
    { weight: 0.24, sample: choiceSampler(systemLinks) },
    { weight: 0.06, sample: choiceSampler(tokenStreams) },
  ];
}

function microsoftScene(): WeightedSampler[] {
  const paneCenters: Vec3[] = [
    [-1.2, 1.08, 0.1],
    [-0.12, 1.08, 0.22],
    [-1.2, 0, 0.18],
    [-0.12, 0, 0.3],
  ];
  const paneSurfaces = paneCenters.map((center) =>
    boxSurfaceSampler(center, [0.92, 0.92, 0.18], 0.03),
  );
  const paneEdges = paneCenters.map((center) =>
    boxEdgesSampler(center, [0.96, 0.96, 0.2], 0.025),
  );

  return [
    { weight: 0.4, sample: choiceSampler(paneSurfaces) },
    { weight: 0.08, sample: choiceSampler(paneEdges) },
    {
      weight: 0.47,
      sample: textSampler("Microsoft", {
        center: [-0.62, -1.22, 0.15],
        width: 5.2,
        height: 1.05,
        depth: 0.26,
        family: '"Segoe UI", Helvetica, Arial, sans-serif',
        weight: 650,
        scanStep: 2,
      }),
    },
    { weight: 0.05, sample: planeSampler([-0.65, 0, -0.8], 5.7, 3.4, 0.25) },
  ];
}

function spaceScene(): WeightedSampler[] {
  const moonCenter: Vec3 = [1.15, 0.55, -0.7];
  const moon = discSampler(moonCenter, 1.28, 0.1);
  const moonDetails = [
    ringSampler([1.15, 0.55, -0.54], 1.3, 1.3, "xy", 0.045),
    ringSampler([0.72, 0.9, -0.48], 0.28, 0.22, "xy", 0.035),
    ringSampler([1.52, 0.25, -0.46], 0.2, 0.16, "xy", 0.03),
    ringSampler([1.52, 1.03, -0.45], 0.13, 0.11, "xy", 0.025),
    ringSampler([0.95, 0.18, -0.44], 0.11, 0.09, "xy", 0.022),
  ];
  const orbitLines = [
    ringSampler(moonCenter, 1.78, 0.64, "xy", 0.03),
    ringSampler([1.15, 0.55, -0.82], 2.2, 0.92, "xy", 0.025),
  ];
  const rocketCenter: Vec3 = [0.62, -0.12, 0.62];
  const rocketAngle = -0.4;
  const transform = (sample: PointSampler) =>
    rotateTranslateSampler(sample, rocketCenter, rocketAngle);
  const rocketBody = transform(
    cylinderShellSampler([0, 0, 0], 0.24, 2.45, 0.025),
  );
  const rocketNose = transform(
    ogiveShellSampler([0, 1.225, 0], 0.24, 0.66, 0.025),
  );
  const rocketBands = [-1.2, -0.55, 0.18, 0.78, 1.18].map((y) =>
    transform(ringSampler([0, y, 0], 0.245, 0.245, "xz", 0.022)),
  );
  const rocketDetails = [
    transform(
      polylineSampler(
        [
          [-0.22, -0.72, 0.02],
          [-0.56, -1.34, 0.02],
          [-0.2, -1.18, 0.02],
        ],
        0.025,
      ),
    ),
    transform(
      polylineSampler(
        [
          [0.22, -0.72, 0.02],
          [0.56, -1.34, 0.02],
          [0.2, -1.18, 0.02],
        ],
        0.025,
      ),
    ),
    transform(ringSampler([0, 0.42, 0.25], 0.11, 0.11, "xy", 0.025)),
  ];
  const stars = starFieldSamplers();

  return [
    { weight: 0.23, sample: moon },
    { weight: 0.08, sample: choiceSampler(moonDetails) },
    { weight: 0.08, sample: choiceSampler(orbitLines) },
    { weight: 0.18, sample: rocketBody },
    { weight: 0.06, sample: rocketNose },
    { weight: 0.045, sample: choiceSampler(rocketBands) },
    { weight: 0.045, sample: choiceSampler(rocketDetails) },
    { weight: 0.1, sample: choiceSampler(stars) },
    { weight: 0.175, sample: planeSampler([0, 0, -1.4], 8.6, 5.4, 0.5) },
  ];
}

function interfacePanelSamplers(
  center: Vec3,
  width: number,
  height: number,
  title: string,
  rowCount: number,
): PointSampler[] {
  const [x, y, z] = center;
  const front = z + 0.09;
  const titleY = y + height * 0.34;
  const samplers: PointSampler[] = [
    boxEdgesSampler(center, [width, height, 0.14], 0.025),
    lineSampler(
      [x - width * 0.46, y + height * 0.24, front],
      [x + width * 0.46, y + height * 0.24, front],
      0.02,
    ),
    lineSampler(
      [x - width * 0.27, y + height * 0.2, front],
      [x - width * 0.27, y - height * 0.42, front],
      0.018,
    ),
    textSampler(title, {
      center: [x, titleY, front],
      width: width * 0.7,
      height: height * 0.15,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
  ];

  for (let row = 0; row < rowCount; row += 1) {
    const rowY =
      y + height * 0.13 - row * (height * 0.5 / Math.max(1, rowCount - 1));
    const indent = row % 3 === 0 ? width * 0.08 : 0;
    const rowWidth = width * (0.48 + ((row * 7) % 4) * 0.08);
    samplers.push(
      lineSampler(
        [x - width * 0.19 + indent, rowY, front],
        [Math.min(x + width * 0.43, x - width * 0.19 + indent + rowWidth), rowY, front],
        0.018,
      ),
      boxEdgesSampler(
        [x - width * 0.36, rowY, front],
        [width * 0.1, height * 0.08, 0.04],
        0.014,
      ),
    );
  }

  return samplers;
}

function labeledPanelSamplers(
  center: Vec3,
  width: number,
  height: number,
  label: string,
): PointSampler[] {
  const [x, y, z] = center;
  return [
    boxEdgesSampler(center, [width, height, 0.16], 0.022),
    textSampler(label, {
      center: [x, y + height * 0.05, z + 0.11],
      width: width * 0.72,
      height: height * 0.34,
      depth: 0.05,
      family: '"Cascadia Mono", "Courier New", monospace',
      weight: 700,
      scanStep: 2,
    }),
    lineSampler(
      [x - width * 0.3, y - height * 0.28, z + 0.1],
      [x + width * 0.3, y - height * 0.28, z + 0.1],
      0.018,
    ),
  ];
}

function paneSamplers(center: Vec3, size: number): PointSampler[] {
  const [x, y, z] = center;
  const offset = size * 0.58;
  return [
    [-offset, offset],
    [offset, offset],
    [-offset, -offset],
    [offset, -offset],
  ].map(([offsetX, offsetY]) =>
    boxSurfaceSampler(
      [x + offsetX, y + offsetY, z],
      [size, size, 0.09],
      0.018,
    ),
  );
}

function envelopeSamplers(
  center: Vec3,
  width: number,
  height: number,
): PointSampler[] {
  const [x, y, z] = center;
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y + height / 2;
  return [
    boxEdgesSampler(center, [width, height, 0.1], 0.022),
    lineSampler(
      [left, top, z + 0.07],
      [x, y - height * 0.08, z + 0.08],
      0.022,
    ),
    lineSampler(
      [right, top, z + 0.07],
      [x, y - height * 0.08, z + 0.08],
      0.022,
    ),
    textSampler("@", {
      center: [x, y - height * 0.07, z + 0.12],
      width: width * 0.42,
      height: height * 0.58,
      depth: 0.05,
      family: '"Segoe UI", Helvetica, Arial, sans-serif',
      weight: 700,
      scanStep: 2,
    }),
  ];
}

function documentSamplers(
  center: Vec3,
  width: number,
  height: number,
  label: string,
): PointSampler[] {
  const [x, y, z] = center;
  const labelSampler = textSampler(label, {
    center: [x, y + height * 0.16, z + 0.09],
    width: width * 0.82,
    height: height * 0.32,
    depth: 0.06,
    family: '"Segoe UI", Helvetica, Arial, sans-serif',
    weight: 750,
    scanStep: 2,
  });

  return [
    boxEdgesSampler(center, [width, height, 0.12], 0.025),
    labelSampler,
    lineSampler(
      [x - width * 0.32, y - height * 0.16, z + 0.09],
      [x + width * 0.32, y - height * 0.16, z + 0.09],
      0.02,
    ),
    lineSampler(
      [x - width * 0.32, y - height * 0.29, z + 0.09],
      [x + width * 0.18, y - height * 0.29, z + 0.09],
      0.02,
    ),
  ];
}

function cylinderShellSampler(
  center: Vec3,
  radius: number,
  height: number,
  thickness = 0.03,
): PointSampler {
  return (random, output, offset) => {
    const angle = random() * Math.PI * 2;
    const sampledRadius = radius + (random() - 0.5) * thickness;
    writePoint(
      output,
      offset,
      center[0] + Math.cos(angle) * sampledRadius,
      center[1] + (random() - 0.5) * height,
      center[2] + Math.sin(angle) * sampledRadius,
    );
  };
}

function ogiveShellSampler(
  baseCenter: Vec3,
  radius: number,
  height: number,
  thickness = 0.03,
): PointSampler {
  return (random, output, offset) => {
    const vertical = random();
    const angle = random() * Math.PI * 2;
    const sampledRadius =
      radius *
        Math.pow(Math.cos(vertical * Math.PI * 0.5), 0.68) +
      (random() - 0.5) * thickness;
    writePoint(
      output,
      offset,
      baseCenter[0] + Math.cos(angle) * sampledRadius,
      baseCenter[1] + vertical * height,
      baseCenter[2] + Math.sin(angle) * sampledRadius,
    );
  };
}

function discSampler(
  center: Vec3,
  radius: number,
  depth: number,
): PointSampler {
  return (random, output, offset) => {
    const angle = random() * Math.PI * 2;
    const sampledRadius = Math.sqrt(random()) * radius;
    writePoint(
      output,
      offset,
      center[0] + Math.cos(angle) * sampledRadius,
      center[1] + Math.sin(angle) * sampledRadius,
      center[2] + (random() - 0.5) * depth,
    );
  };
}

function rotateTranslateSampler(
  sample: PointSampler,
  center: Vec3,
  angle: number,
): PointSampler {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const sampled = new Float32Array(3);
  return (random, output, offset) => {
    sample(random, sampled, 0);
    writePoint(
      output,
      offset,
      center[0] + sampled[0] * cosine - sampled[1] * sine,
      center[1] + sampled[0] * sine + sampled[1] * cosine,
      center[2] + sampled[2],
    );
  };
}

function starFieldSamplers(): PointSampler[] {
  return Array.from({ length: 28 }, (_, index) => {
    const x = -4.1 + ((index * 47) % 97) / 96 * 8.2;
    const y = -2.45 + ((index * 71) % 89) / 88 * 4.9;
    const z = -1.15 + (index % 5) * 0.08;
    const radius = 0.035 + (index % 4) * 0.018;
    return choiceSampler([
      lineSampler([x - radius, y, z], [x + radius, y, z], 0.012),
      lineSampler([x, y - radius, z], [x, y + radius, z], 0.012),
      lineSampler(
        [x - radius * 0.55, y - radius * 0.55, z],
        [x + radius * 0.55, y + radius * 0.55, z],
        0.01,
      ),
      lineSampler(
        [x + radius * 0.55, y - radius * 0.55, z],
        [x - radius * 0.55, y + radius * 0.55, z],
        0.01,
      ),
    ]);
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
