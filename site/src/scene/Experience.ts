import * as THREE from "three";
import { SCENES } from "../config/scenes";
import { buildSceneTargets } from "../geometry/scenes";
import { PointerController } from "../input/PointerController";
import { ScrollTimeline } from "../timeline/ScrollTimeline";
import { lerp, smootherstep } from "../utils/math";
import { ParticleSystem } from "./ParticleSystem";
import { selectQuality, type QualitySettings } from "./quality";

export interface ExperienceSnapshot {
  ready: boolean;
  particleCount: number;
  sceneA: number;
  sceneB: number;
  morphProgress: number;
  scrollProgress: number;
  pointerX: number;
  pointerY: number;
  drawCalls: number;
  cumulativeFrames: number;
  geometryBytes: number;
  pixelRatio: number;
  reducedMotion: boolean;
  meanFrameMs: number;
  p95FrameMs: number;
}

export class Experience {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  private readonly quality: QualitySettings;
  private readonly reducedMotion: boolean;
  private readonly copyElements: readonly HTMLElement[];
  private readonly pointer: PointerController;
  private readonly timeline: ScrollTimeline;
  private readonly particleSystem: ParticleSystem;
  private readonly frameIntervals = new Float32Array(600);
  private readonly avoidRectA = new Float32Array(4);
  private readonly avoidRectB = new Float32Array(4);
  private targets: Float32Array[] = [];
  private activeSceneA = -1;
  private activeSceneB = -1;
  private animationFrame = 0;
  private previousTime = performance.now();
  private elapsedTime = 0;
  private frameIntervalIndex = 0;
  private frameIntervalCount = 0;
  private cumulativeFrames = 0;
  private destroyed = false;

  private constructor(
    canvas: HTMLCanvasElement,
    renderer: THREE.WebGLRenderer,
    quality: QualitySettings,
    reducedMotion: boolean,
    timeline: ScrollTimeline,
    copyElements: readonly HTMLElement[],
  ) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.timeline = timeline;
    this.copyElements = copyElements;
    this.pointer = new PointerController(reducedMotion);
    this.particleSystem = new ParticleSystem(
      quality.particleCount,
      quality.pixelRatio,
      quality.pointSize,
      reducedMotion,
    );
    this.scene.add(this.particleSystem.points);
    this.camera.position.z = SCENES[0].cameraZ;

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = true;

    this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    window.addEventListener("resize", this.handleResize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.resize();
  }

  static async create(
    canvas: HTMLCanvasElement,
    onProgress: (completed: number, total: number) => void,
  ): Promise<Experience> {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const selectedQuality = selectQuality({
      width: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 8,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      reducedMotion,
    });
    const requestedParticles = Number(
      new URLSearchParams(window.location.search).get("particles"),
    );
    const quality = {
      ...selectedQuality,
      particleCount:
        Number.isFinite(requestedParticles) &&
        requestedParticles >= 5_000 &&
        requestedParticles <= 120_000
          ? Math.round(requestedParticles)
          : selectedQuality.particleCount,
    };

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      depth: true,
      stencil: false,
      powerPreference: quality.mobile ? "default" : "high-performance",
    });

    const section = requireElement<HTMLElement>("#timeline");
    const copies = Array.from(
      document.querySelectorAll<HTMLElement>(".era-copy"),
    );
    const timeline = new ScrollTimeline(
      section,
      copies,
      reducedMotion,
    );
    const experience = new Experience(
      canvas,
      renderer,
      quality,
      reducedMotion,
      timeline,
      copies,
    );

    experience.targets = await buildSceneTargets(
      quality.particleCount,
      onProgress,
    );
    experience.setPair(0, reducedMotion ? 0 : 1);
    return experience;
  }

  start(): void {
    if (this.destroyed || this.animationFrame !== 0) {
      return;
    }
    this.previousTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.render);
  }

  getSnapshot(): ExperienceSnapshot {
    const intervals = Array.from(
      this.frameIntervals.subarray(0, this.frameIntervalCount),
    ).sort((left, right) => left - right);
    const sum = intervals.reduce((total, value) => total + value, 0);
    const mean = intervals.length > 0 ? sum / intervals.length : 0;
    const p95Index = Math.max(0, Math.ceil(intervals.length * 0.95) - 1);

    return {
      ready: this.targets.length === SCENES.length,
      particleCount: this.quality.particleCount,
      sceneA: this.timeline.state.sceneA,
      sceneB: this.timeline.state.sceneB,
      morphProgress: this.timeline.state.eased,
      scrollProgress: this.timeline.state.progress,
      pointerX: this.pointer.currentX,
      pointerY: this.pointer.currentY,
      drawCalls: this.renderer.info.render.calls,
      cumulativeFrames: this.cumulativeFrames,
      geometryBytes: this.particleSystem.geometryBytes,
      pixelRatio: this.quality.pixelRatio,
      reducedMotion: this.reducedMotion,
      meanFrameMs: mean,
      p95FrameMs: intervals[p95Index] ?? 0,
    };
  }

  dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.timeline.dispose();
    this.pointer.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibility);
  }

  private readonly render = (now: number): void => {
    if (this.destroyed) {
      return;
    }

    const frameMs = Math.min(100, now - this.previousTime);
    const deltaSeconds = frameMs / 1000;
    this.previousTime = now;
    this.elapsedTime += deltaSeconds;
    this.recordFrameInterval(frameMs);

    const timeline = this.timeline.update(deltaSeconds);
    this.pointer.update(deltaSeconds);

    if (
      timeline.sceneA !== this.activeSceneA ||
      timeline.sceneB !== this.activeSceneB
    ) {
      this.setPair(timeline.sceneA, timeline.sceneB);
    }

    const sceneA = SCENES[timeline.sceneA];
    const sceneB = SCENES[timeline.sceneB];
    const blend = timeline.eased;
    const points = this.particleSystem.points;
    const layoutShift = this.quality.layoutShift;

    this.camera.position.z = lerp(sceneA.cameraZ, sceneB.cameraZ, blend);
    points.position.x =
      lerp(sceneA.focusX, sceneB.focusX, blend) * layoutShift;
    points.position.y =
      lerp(sceneA.focusY, sceneB.focusY, blend) +
      (this.quality.mobile ? 0.72 : 0);

    const scale =
      lerp(sceneA.scale, sceneB.scale, blend) *
      (this.quality.mobile ? 0.72 : 1);
    points.scale.setScalar(scale);

    const pointerScale = lerp(
      sceneA.pointerScale,
      sceneB.pointerScale,
      blend,
    );
    points.rotation.x =
      lerp(sceneA.rotation[0], sceneB.rotation[0], blend) -
      this.pointer.currentY * 0.055 * pointerScale;
    points.rotation.y =
      lerp(sceneA.rotation[1], sceneB.rotation[1], blend) +
      this.pointer.currentX * 0.09 * pointerScale;
    points.rotation.z = lerp(
      sceneA.rotation[2],
      sceneB.rotation[2],
      blend,
    );

    this.particleSystem.update(
      timeline.local,
      this.elapsedTime,
      lerp(
        sceneA.transitionStrength,
        sceneB.transitionStrength,
        blend,
      ),
      lerp(sceneA.idleAmplitude, sceneB.idleAmplitude, blend),
    );
    this.updateAvoidance(
      timeline.sceneA,
      timeline.sceneB,
      timeline.local,
      timeline.visibility,
    );

    this.renderer.render(this.scene, this.camera);
    this.cumulativeFrames += 1;
    this.animationFrame = requestAnimationFrame(this.render);
  };

  private setPair(sceneA: number, sceneB: number): void {
    if (this.targets.length === 0) {
      return;
    }

    this.activeSceneA = sceneA;
    this.activeSceneB = sceneB;
    this.particleSystem.setTargets(
      this.targets[sceneA],
      this.targets[sceneB],
    );
    this.particleSystem.setAccents(
      SCENES[sceneA].accent,
      SCENES[sceneB].accent,
    );
  }

  private readonly handleResize = (): void => {
    this.resize();
  };

  private readonly handleVisibility = (): void => {
    if (!document.hidden) {
      this.previousTime = performance.now();
    }
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    document.body.classList.add("is-webgl-unavailable");
    const status = requireElement<HTMLElement>("#loading-status");
    status.textContent =
      "The interactive field is unavailable, but the complete timeline remains below.";
  };

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.particleSystem.setPixelRatio(this.quality.pixelRatio);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.updateAvoidance(
      this.timeline.state.sceneA,
      this.timeline.state.sceneB,
      this.timeline.state.local,
      this.timeline.state.visibility,
    );
  }

  private updateAvoidance(
    sceneA: number,
    sceneB: number,
    localProgress: number,
    visibility: number,
  ): void {
    this.writeAvoidRect(this.copyElements[sceneA], this.avoidRectA);

    if (sceneA === sceneB) {
      this.particleSystem.setAvoidance(
        this.avoidRectA,
        visibility,
        this.avoidRectB,
        0,
      );
      return;
    }

    this.writeAvoidRect(this.copyElements[sceneB], this.avoidRectB);
    const sourceStrength = Math.min(
      1,
      smootherstep(1 - localProgress) * 1.5,
    ) * visibility;
    const targetStrength = Math.min(
      1,
      smootherstep(localProgress) * 1.5,
    ) * visibility;
    this.particleSystem.setAvoidance(
      this.avoidRectA,
      sourceStrength,
      this.avoidRectB,
      targetStrength,
    );
  }

  private writeAvoidRect(
    element: HTMLElement,
    output: Float32Array,
  ): void {
    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const canvasWidth = Math.max(1, canvasRect.width);
    const canvasHeight = Math.max(1, canvasRect.height);
    const paddingX = this.quality.mobile ? 12 : 30;
    const paddingY = this.quality.mobile ? 10 : 24;
    output[0] =
      (rect.left - paddingX - canvasRect.left) / canvasWidth;
    output[1] =
      1 -
      (rect.bottom + paddingY - canvasRect.top) / canvasHeight;
    output[2] =
      (rect.right + paddingX - canvasRect.left) / canvasWidth;
    output[3] =
      1 -
      (rect.top - paddingY - canvasRect.top) / canvasHeight;
  }

  private recordFrameInterval(frameMs: number): void {
    this.frameIntervals[this.frameIntervalIndex] = frameMs;
    this.frameIntervalIndex =
      (this.frameIntervalIndex + 1) % this.frameIntervals.length;
    this.frameIntervalCount = Math.min(
      this.frameIntervalCount + 1,
      this.frameIntervals.length,
    );
  }
}

function requireElement<T extends Element = HTMLElement>(
  selector: string,
): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}
