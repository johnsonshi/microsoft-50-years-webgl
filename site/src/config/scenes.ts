export interface SceneDefinition {
  id: string;
  year: string;
  accent: readonly [number, number, number];
  focusX: number;
  focusY: number;
  scale: number;
  cameraZ: number;
  rotation: readonly [number, number, number];
  pointerScale: number;
  transitionStrength: number;
  idleAmplitude: number;
}

export const SCENES: readonly SceneDefinition[] = [
  {
    id: "origin",
    year: "1975",
    accent: [0.71, 0.28, 0.09],
    focusX: -1.05,
    focusY: 0.02,
    scale: 0.88,
    cameraZ: 7.75,
    rotation: [-0.03, 0.055, -0.012],
    pointerScale: 1,
    transitionStrength: 0.62,
    idleAmplitude: 0.018,
  },
  {
    id: "personal",
    year: "1980s",
    accent: [0.74, 0.45, 0.1],
    focusX: 1.28,
    focusY: 0,
    scale: 0.98,
    cameraZ: 7.65,
    rotation: [-0.04, -0.08, 0.014],
    pointerScale: 1,
    transitionStrength: 0.72,
    idleAmplitude: 0.017,
  },
  {
    id: "windows-internet",
    year: "1990s",
    accent: [0, 0.4, 0.66],
    focusX: -1.02,
    focusY: 0.05,
    scale: 0.96,
    cameraZ: 7.7,
    rotation: [0.035, 0.09, -0.018],
    pointerScale: 0.95,
    transitionStrength: 0.78,
    idleAmplitude: 0.019,
  },
  {
    id: "productivity",
    year: "2000s",
    accent: [0.74, 0.26, 0.1],
    focusX: 1.02,
    focusY: -0.03,
    scale: 0.94,
    cameraZ: 7.95,
    rotation: [-0.02, -0.1, 0.012],
    pointerScale: 0.9,
    transitionStrength: 0.82,
    idleAmplitude: 0.016,
  },
  {
    id: "datacenter",
    year: "2010s",
    accent: [0, 0.42, 0.7],
    focusX: -0.92,
    focusY: 0.04,
    scale: 0.96,
    cameraZ: 8.15,
    rotation: [0.025, 0.1, -0.01],
    pointerScale: 0.9,
    transitionStrength: 0.88,
    idleAmplitude: 0.021,
  },
  {
    id: "agents",
    year: "2020s",
    accent: [0.16, 0.48, 0.31],
    focusX: 0.94,
    focusY: 0.02,
    scale: 0.88,
    cameraZ: 7.95,
    rotation: [-0.055, -0.1, 0.02],
    pointerScale: 0.85,
    transitionStrength: 0.9,
    idleAmplitude: 0.022,
  },
  {
    id: "microsoft",
    year: "2025",
    accent: [0, 0.4, 0.72],
    focusX: -0.95,
    focusY: 0.02,
    scale: 0.93,
    cameraZ: 7.7,
    rotation: [0, 0.025, 0],
    pointerScale: 0.42,
    transitionStrength: 0.72,
    idleAmplitude: 0.012,
  },
  {
    id: "abundance",
    year: "2026 and Beyond",
    accent: [0.48, 0.25, 0.63],
    focusX: 1.05,
    focusY: 0.1,
    scale: 0.82,
    cameraZ: 8.35,
    rotation: [-0.08, 0.02, 0],
    pointerScale: 0.72,
    transitionStrength: 0.84,
    idleAmplitude: 0.032,
  },
] as const;
