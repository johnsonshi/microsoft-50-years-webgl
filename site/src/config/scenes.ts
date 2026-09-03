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
    accent: [0.73, 0.33, 0.12],
    focusX: -1.25,
    focusY: 0.08,
    scale: 1.02,
    cameraZ: 7.4,
    rotation: [-0.03, 0.07, -0.015],
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
    id: "visual",
    year: "1990s",
    accent: [0.08, 0.42, 0.68],
    focusX: -1.12,
    focusY: 0.05,
    scale: 1,
    cameraZ: 7.7,
    rotation: [0.035, 0.09, -0.018],
    pointerScale: 0.95,
    transitionStrength: 0.78,
    idleAmplitude: 0.019,
  },
  {
    id: "platform",
    year: "2000s",
    accent: [0.3, 0.48, 0.18],
    focusX: 1.12,
    focusY: -0.03,
    scale: 0.96,
    cameraZ: 7.95,
    rotation: [-0.02, -0.1, 0.012],
    pointerScale: 0.9,
    transitionStrength: 0.82,
    idleAmplitude: 0.016,
  },
  {
    id: "cloud",
    year: "2010s",
    accent: [0.04, 0.45, 0.73],
    focusX: -0.88,
    focusY: 0.04,
    scale: 0.96,
    cameraZ: 8.15,
    rotation: [0.025, 0.1, -0.01],
    pointerScale: 0.9,
    transitionStrength: 0.88,
    idleAmplitude: 0.021,
  },
  {
    id: "fabric",
    year: "2020s",
    accent: [0.3, 0.5, 0.2],
    focusX: 0.88,
    focusY: 0.02,
    scale: 0.94,
    cameraZ: 7.85,
    rotation: [-0.055, -0.1, 0.02],
    pointerScale: 0.85,
    transitionStrength: 0.9,
    idleAmplitude: 0.022,
  },
  {
    id: "fifty",
    year: "2025",
    accent: [0.08, 0.39, 0.67],
    focusX: 0,
    focusY: 0,
    scale: 1.08,
    cameraZ: 7.55,
    rotation: [0, 0.025, 0],
    pointerScale: 0.42,
    transitionStrength: 0.72,
    idleAmplitude: 0.012,
  },
  {
    id: "future",
    year: "NEXT",
    accent: [0.43, 0.24, 0.55],
    focusX: 0,
    focusY: 0.18,
    scale: 0.92,
    cameraZ: 8.35,
    rotation: [-0.08, 0.02, 0],
    pointerScale: 0.72,
    transitionStrength: 0.84,
    idleAmplitude: 0.032,
  },
] as const;

