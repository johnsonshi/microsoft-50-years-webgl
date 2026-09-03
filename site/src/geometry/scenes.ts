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
      return rocketScene();
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
  const cardFrame = boxEdgesSampler(
    [0.72, -1.58, 0.58],
    [2.45, 0.94, 0.12],
    0.025,
  );
  const cardLabel = textSampler("MICRO-SOFT", {
    center: [0.72, -1.57, 0.67],
    width: 2.02,
    height: 0.4,
    depth: 0.06,
    weight: 750,
    scanStep: 2,
  });

  return [
    {
      weight: 0.13,
      sample: boxEdgesSampler([-0.18, 0.05, 0], [4.85, 4.7, 0.22], 0.03),
    },
    {
      weight: 0.17,
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
    { weight: 0.34, sample: choiceSampler(codeLines) },
    { weight: 0.08, sample: choiceSampler(punchHoles) },
    { weight: 0.09, sample: cardFrame },
    { weight: 0.13, sample: cardLabel },
    {
      weight: 0.06,
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

function windowsInternetScene(): WeightedSampler[] {
  const monitor = crtMonitorSamplers([-1.25, 0.2, 0], 2.5, 1.95);
  const desk = deskSamplers([-0.65, -1.0, 0.45], 4.65);
  const person = seatedPersonSamplers([1.25, -0.72, 0.28], 1);
  const windowsPanes = paneSamplers([-1.25, 0.26, 0.36], 0.48);
  const envelope = envelopeSamplers([0.82, 1.72, 0.58], 1.28, 0.76);
  const connections = [
    bezierSampler(
      [-1.15, 1.05, 0.25],
      [-0.7, 1.7, -0.25],
      [-0.05, 1.9, 0.4],
      [0.18, 1.72, 0.58],
      0.025,
    ),
    bezierSampler(
      [1.46, 1.72, 0.58],
      [1.85, 2.25, -0.15],
      [2.45, 1.65, 0.45],
      [3.2, 1.95, -0.35],
      0.025,
    ),
  ];

  return [
    { weight: 0.3, sample: choiceSampler(monitor) },
    { weight: 0.11, sample: choiceSampler(desk) },
    { weight: 0.18, sample: choiceSampler(person) },
    { weight: 0.14, sample: choiceSampler(windowsPanes) },
    { weight: 0.12, sample: choiceSampler(envelope) },
    { weight: 0.15, sample: choiceSampler(connections) },
  ];
}

function productivityScene(): WeightedSampler[] {
  const firstMail = envelopeSamplers([-2.2, 1.12, 0.15], 1.15, 0.72);
  const wordDocument = documentSamplers([-0.7, 0.48, 0.42], 1.18, 1.5, "W");
  const presentation = documentSamplers([0.92, -0.52, 0.62], 1.58, 1.06, "PPT");
  const secondMail = envelopeSamplers([2.38, 0.92, -0.25], 1.08, 0.68);
  const secondDocument = documentSamplers([2.85, -1.02, 0.22], 1.12, 1.38, "W");
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
      [-0.7, 0.48, 0.42],
      [-0.1, 0.1, -0.35],
      [0.45, -0.15, 0.85],
      [0.92, -0.52, 0.62],
      0.03,
    ),
    bezierSampler(
      [0.92, -0.52, 0.62],
      [1.2, 0.35, 0.8],
      [1.95, 1.3, -0.5],
      [2.38, 0.92, -0.25],
      0.03,
    ),
    bezierSampler(
      [0.92, -0.52, 0.62],
      [1.55, -1.35, -0.55],
      [2.4, -1.55, 0.65],
      [2.85, -1.02, 0.22],
      0.03,
    ),
    bezierSampler(
      [-3.8, -1.55, -0.7],
      [-1.6, -2.2, 0.75],
      [1.65, 2.15, -0.65],
      [3.75, 1.55, 0.6],
      0.035,
    ),
  ];
  const flowNodeCenters: Vec3[] = [
    [-2.2, 1.12, 0.15],
    [-0.7, 0.48, 0.42],
    [0.92, -0.52, 0.62],
    [2.38, 0.92, -0.25],
    [2.85, -1.02, 0.22],
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

function agentsScene(): WeightedSampler[] {
  const terminal = [
    boxEdgesSampler([-1.0, 0.1, 0], [4.2, 3.35, 0.36], 0.03),
    boxEdgesSampler([-1.0, 0.04, 0.2], [3.72, 2.75, 0.06], 0.025),
    lineSampler([-2.55, 1.08, 0.25], [0.55, 1.08, 0.25], 0.02),
  ];
  const chatLines = [
    lineSampler([-2.55, 0.82, 0.27], [-0.35, 0.82, 0.27], 0.025),
    lineSampler([-2.2, 0.48, 0.27], [0.45, 0.48, 0.27], 0.025),
    lineSampler([-2.55, 0.02, 0.27], [-0.72, 0.02, 0.27], 0.025),
    lineSampler([-2.2, -0.32, 0.27], [0.25, -0.32, 0.27], 0.025),
    lineSampler([-2.55, -0.78, 0.27], [-0.15, -0.78, 0.27], 0.025),
  ];
  const agentCenters: Vec3[] = [];
  for (let column = 0; column < 3; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      agentCenters.push([
        1.45 + column * 0.92,
        1.08 - row * 1.02,
        -0.45 + column * 0.35,
      ]);
    }
  }
  const agentCards = agentCenters.flatMap((center) => [
    boxEdgesSampler(center, [0.68, 0.54, 0.42], 0.025),
    sphereShellSampler(
      [center[0], center[1] + 0.06, center[2] + 0.24],
      0.085,
      0.025,
    ),
    lineSampler(
      [center[0] - 0.16, center[1] - 0.14, center[2] + 0.24],
      [center[0] + 0.16, center[1] - 0.14, center[2] + 0.24],
      0.02,
    ),
  ]);
  const fleetLinks = agentCenters.flatMap((center, index) => {
    const links: PointSampler[] = [
      bezierSampler(
        [0.82, 0.18, 0.05],
        [1.0, center[1], -0.3],
        [1.2, center[1], center[2]],
        center,
        0.022,
      ),
    ];
    if (Math.floor(index / 3) < 2) {
      links.push(lineSampler(center, agentCenters[index + 3], 0.02));
    }
    if (index % 3 !== 2) {
      links.push(lineSampler(center, agentCenters[index + 1], 0.02));
    }
    return links;
  });

  return [
    { weight: 0.19, sample: choiceSampler(terminal) },
    {
      weight: 0.11,
      sample: textSampler("[ AGENT CHAT ]", {
        center: [-1.0, 1.32, 0.28],
        width: 2.6,
        height: 0.38,
        depth: 0.06,
        family: '"Cascadia Mono", "Courier New", monospace',
        weight: 700,
        scanStep: 2,
      }),
    },
    { weight: 0.16, sample: choiceSampler(chatLines) },
    {
      weight: 0.08,
      sample: choiceSampler([
        textSampler("YOU>", {
          center: [-2.22, 0.78, 0.29],
          width: 0.72,
          height: 0.3,
          depth: 0.05,
          family: '"Cascadia Mono", "Courier New", monospace',
          weight: 700,
          scanStep: 2,
        }),
        textSampler("AI>", {
          center: [-2.28, -0.1, 0.29],
          width: 0.58,
          height: 0.3,
          depth: 0.05,
          family: '"Cascadia Mono", "Courier New", monospace',
          weight: 700,
          scanStep: 2,
        }),
      ]),
    },
    {
      weight: 0.12,
      sample: textSampler(">_", {
        center: [-1.05, -1.03, 0.28],
        width: 1.45,
        height: 0.64,
        depth: 0.08,
        family: '"Cascadia Mono", "Courier New", monospace',
        weight: 700,
        scanStep: 2,
      }),
    },
    { weight: 0.22, sample: choiceSampler(agentCards) },
    { weight: 0.12, sample: choiceSampler(fleetLinks) },
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

function rocketScene(): WeightedSampler[] {
  const bodyCenter: Vec3 = [0.85, 0.28, 0.05];
  const body = [
    cylinderShellSampler(bodyCenter, 0.5, 2.55, 0.035),
    ringSampler([0.85, -0.36, 0.05], 0.5, 0.5, "xz", 0.035),
    ringSampler([0.85, 0.93, 0.05], 0.5, 0.5, "xz", 0.035),
  ];
  const nose = coneShellSampler([0.85, 1.555, 0.05], 0.5, 1.18, 0.035);
  const fins = [
    triangleSurfaceSampler(
      [0.36, -0.62, 0.04],
      [-0.58, -1.47, 0.02],
      [0.36, -1.18, 0.04],
      0.05,
    ),
    triangleSurfaceSampler(
      [1.34, -0.62, 0.04],
      [2.28, -1.47, 0.02],
      [1.34, -1.18, 0.04],
      0.05,
    ),
    polylineSampler(
      [
        [0.36, -0.62, 0.04],
        [-0.58, -1.47, 0.02],
        [0.36, -1.18, 0.04],
      ],
      0.025,
    ),
    polylineSampler(
      [
        [1.34, -0.62, 0.04],
        [2.28, -1.47, 0.02],
        [1.34, -1.18, 0.04],
      ],
      0.025,
    ),
  ];
  const smokeCenters: Array<{ center: Vec3; radius: number }> = [
    { center: [0.85, -2.15, 0], radius: 0.65 },
    { center: [0.15, -2.35, 0.15], radius: 0.8 },
    { center: [1.6, -2.45, -0.1], radius: 0.85 },
    { center: [-0.65, -2.55, -0.2], radius: 0.72 },
    { center: [2.45, -2.62, 0.25], radius: 0.7 },
  ];
  const smoke = smokeCenters.map(({ center, radius }) =>
    sphereVolumeSampler(center, radius),
  );
  const trajectory = [
    bezierSampler(
      [0.85, 2.55, -0.2],
      [1.15, 3.25, 0.65],
      [2.45, 3.1, -0.55],
      [3.75, 3.55, 0.35],
      0.035,
    ),
    ringSampler([0.85, 0.25, -0.85], 2.65, 3.15, "yz", 0.055),
  ];
  const launchPad = [
    lineSampler([-1.8, -2.58, 0.35], [3.55, -2.58, 0.35], 0.04),
    lineSampler([-1.2, -2.9, 0.6], [3.0, -2.9, 0.6], 0.04),
  ];

  return [
    { weight: 0.21, sample: choiceSampler(body) },
    { weight: 0.1, sample: nose },
    { weight: 0.1, sample: choiceSampler(fins) },
    {
      weight: 0.06,
      sample: ringSampler([0.85, 0.62, 0.55], 0.23, 0.23, "xy", 0.025),
    },
    { weight: 0.22, sample: rocketPlumeSampler([0.85, -0.98, 0.05]) },
    { weight: 0.14, sample: choiceSampler(smoke) },
    { weight: 0.08, sample: starFieldSampler() },
    { weight: 0.06, sample: choiceSampler(trajectory) },
    { weight: 0.03, sample: choiceSampler(launchPad) },
  ];
}

function crtMonitorSamplers(
  center: Vec3,
  width: number,
  height: number,
): PointSampler[] {
  const [x, y, z] = center;
  const screenZ = z + 0.33;
  return [
    boxEdgesSampler(center, [width, height, 0.62], 0.03),
    boxEdgesSampler(
      [x, y + 0.03, screenZ],
      [width * 0.82, height * 0.73, 0.05],
      0.022,
    ),
    planeSampler(
      [x, y + 0.03, screenZ - 0.02],
      width * 0.77,
      height * 0.67,
      0.035,
    ),
    lineSampler(
      [x, y - height * 0.5, z],
      [x, y - height * 0.72, z + 0.08],
      0.03,
    ),
    lineSampler(
      [x - width * 0.25, y - height * 0.72, z + 0.08],
      [x + width * 0.25, y - height * 0.72, z + 0.08],
      0.03,
    ),
  ];
}

function deskSamplers(center: Vec3, width: number): PointSampler[] {
  const [x, y, z] = center;
  return [
    lineSampler(
      [x - width / 2, y, z],
      [x + width / 2, y, z],
      0.045,
    ),
    lineSampler(
      [x - width * 0.42, y, z],
      [x - width * 0.42, y - 1.15, z - 0.2],
      0.035,
    ),
    lineSampler(
      [x + width * 0.42, y, z],
      [x + width * 0.42, y - 1.15, z - 0.2],
      0.035,
    ),
    planeSampler([x + width * 0.04, y - 0.18, z + 0.38], width * 0.34, 0.38, 0.08),
  ];
}

function seatedPersonSamplers(center: Vec3, scale: number): PointSampler[] {
  const [x, y, z] = center;
  const head: Vec3 = [
    x - 0.08 * scale,
    y + 1.42 * scale,
    z + 0.2 * scale,
  ];
  return [
    sphereVolumeSampler(head, 0.31 * scale),
    ellipsoidVolumeSampler(
      [x + 0.06 * scale, y + 0.72 * scale, z],
      [0.34 * scale, 0.6 * scale, 0.28 * scale],
    ),
    capsuleVolumeSampler(
      [x - 0.1 * scale, y + 0.88 * scale, z + 0.12],
      [x - 0.48 * scale, y + 0.57 * scale, z + 0.23],
      0.12 * scale,
    ),
    capsuleVolumeSampler(
      [x - 0.48 * scale, y + 0.57 * scale, z + 0.23],
      [x - 0.96 * scale, y + 0.54 * scale, z + 0.3],
      0.1 * scale,
    ),
    capsuleVolumeSampler(
      [x + 0.18 * scale, y + 0.87 * scale, z - 0.12],
      [x - 0.36 * scale, y + 0.49 * scale, z - 0.04],
      0.11 * scale,
    ),
    capsuleVolumeSampler(
      [x + 0.1 * scale, y + 0.25 * scale, z + 0.03],
      [x + 0.58 * scale, y - 0.08 * scale, z + 0.04],
      0.17 * scale,
    ),
    capsuleVolumeSampler(
      [x + 0.58 * scale, y - 0.08 * scale, z + 0.04],
      [x + 0.5 * scale, y - 0.88 * scale, z + 0.08],
      0.13 * scale,
    ),
    capsuleVolumeSampler(
      [x + 0.02 * scale, y + 0.2 * scale, z - 0.12],
      [x + 0.45 * scale, y - 0.18 * scale, z - 0.18],
      0.15 * scale,
    ),
    capsuleVolumeSampler(
      [x + 0.45 * scale, y - 0.18 * scale, z - 0.18],
      [x + 0.92 * scale, y - 0.72 * scale, z - 0.2],
      0.12 * scale,
    ),
    polylineSampler(
      [
        [x + 0.58 * scale, y + 0.9 * scale, z - 0.36],
        [x + 0.72 * scale, y + 0.08 * scale, z - 0.36],
        [x + 0.08 * scale, y + 0.02 * scale, z - 0.36],
      ],
      0.035 * scale,
    ),
  ];
}

function ellipsoidVolumeSampler(
  center: Vec3,
  radii: Vec3,
): PointSampler {
  return (random, output, offset) => {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const distance = Math.cbrt(random());
    writePoint(
      output,
      offset,
      center[0] + Math.cos(angle) * radial * radii[0] * distance,
      center[1] + y * radii[1] * distance,
      center[2] + Math.sin(angle) * radial * radii[2] * distance,
    );
  };
}

function capsuleVolumeSampler(
  start: Vec3,
  end: Vec3,
  radius: number,
): PointSampler {
  return (random, output, offset) => {
    const progress = random();
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const distance = Math.cbrt(random()) * radius;
    writePoint(
      output,
      offset,
      start[0] + (end[0] - start[0]) * progress +
        Math.cos(angle) * radial * distance,
      start[1] + (end[1] - start[1]) * progress + y * distance,
      start[2] + (end[2] - start[2]) * progress +
        Math.sin(angle) * radial * distance,
    );
  };
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
  return [
    boxEdgesSampler(center, [width, height, 0.12], 0.025),
    textSampler(label, {
      center: [x, y + height * 0.16, z + 0.09],
      width: width * 0.72,
      height: height * 0.35,
      depth: 0.06,
      family: '"Segoe UI", Helvetica, Arial, sans-serif',
      weight: 750,
      scanStep: 2,
    }),
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

function coneShellSampler(
  baseCenter: Vec3,
  radius: number,
  height: number,
  thickness = 0.03,
): PointSampler {
  return (random, output, offset) => {
    const vertical = 1 - Math.sqrt(1 - random());
    const angle = random() * Math.PI * 2;
    const sampledRadius =
      radius * (1 - vertical) + (random() - 0.5) * thickness;
    writePoint(
      output,
      offset,
      baseCenter[0] + Math.cos(angle) * sampledRadius,
      baseCenter[1] + vertical * height,
      baseCenter[2] + Math.sin(angle) * sampledRadius,
    );
  };
}

function triangleSurfaceSampler(
  a: Vec3,
  b: Vec3,
  c: Vec3,
  thickness = 0.03,
): PointSampler {
  return (random, output, offset) => {
    const root = Math.sqrt(random());
    const aWeight = 1 - root;
    const bWeight = root * (1 - random());
    const cWeight = 1 - aWeight - bWeight;
    writePoint(
      output,
      offset,
      a[0] * aWeight + b[0] * bWeight + c[0] * cWeight +
        (random() - 0.5) * thickness,
      a[1] * aWeight + b[1] * bWeight + c[1] * cWeight +
        (random() - 0.5) * thickness,
      a[2] * aWeight + b[2] * bWeight + c[2] * cWeight +
        (random() - 0.5) * thickness,
    );
  };
}

function rocketPlumeSampler(origin: Vec3): PointSampler {
  return (random, output, offset) => {
    const vertical = Math.pow(random(), 0.72);
    const angle = random() * Math.PI * 2;
    const radius = (0.1 + vertical * 0.72) * Math.sqrt(random());
    const turbulence = Math.sin(vertical * 18 + angle * 2) * 0.12 * vertical;
    writePoint(
      output,
      offset,
      origin[0] + Math.cos(angle) * radius + turbulence,
      origin[1] - vertical * 2.35,
      origin[2] + Math.sin(angle) * radius,
    );
  };
}

function starFieldSampler(): PointSampler {
  return (random, output, offset) => {
    const x = (random() - 0.5) * 8.8;
    const y = -0.1 + Math.pow(random(), 0.72) * 3.75;
    const z = -1.6 + random() * 2.6;
    writePoint(output, offset, x, y, z);
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
