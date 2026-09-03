import * as THREE from "three";
import { createRandom, randomBetween } from "../geometry/random";
import fragmentShader from "../shaders/ambient-icons.frag.glsl?raw";
import vertexShader from "../shaders/ambient-icons.vert.glsl?raw";
import { clamp, lerp, smootherstep } from "../utils/math";

type ActivePane = "intro" | "closing" | null;

interface AmbientIconUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uPixelRatio: { value: number };
  uPaneProgress: { value: number };
  uReducedMotion: { value: number };
  uPointer: { value: THREE.Vector2 };
}

export interface AmbientIconData {
  positions: Float32Array;
  sizes: Float32Array;
  depths: Float32Array;
  phases: Float32Array;
  opacities: Float32Array;
}

export interface AmbientIconSnapshot {
  iconCount: number;
  visibility: number;
  paneProgress: number;
  pointerX: number;
  pointerY: number;
  drawCalls: number;
  activePane: ActivePane;
  reducedMotion: boolean;
}

export class AmbientIconField {
  private readonly canvas: HTMLCanvasElement;
  private readonly intro: HTMLElement;
  private readonly closing: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly material: THREE.ShaderMaterial;
  private readonly points: THREE.Points<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  >;
  private readonly uniforms: AmbientIconUniforms;
  private readonly pixelRatio: number;
  private readonly reducedMotion: boolean;
  private readonly iconCount: number;
  private introTop = 0;
  private introBottom = 0;
  private introHeight = 1;
  private closingTop = 0;
  private closingBottom = 0;
  private closingHeight = 1;
  private targetVisibility = 0;
  private visibility = 0;
  private paneProgress = 0;
  private activePane: ActivePane = null;
  private pointerX = 0;
  private pointerY = 0;
  private lastCanvasOpacity = -1;
  private destroyed = false;

  constructor(
    canvas: HTMLCanvasElement,
    intro: HTMLElement,
    closing: HTMLElement,
    pixelRatio: number,
    mobile: boolean,
    reducedMotion: boolean,
  ) {
    this.canvas = canvas;
    this.intro = intro;
    this.closing = closing;
    this.pixelRatio = pixelRatio;
    this.reducedMotion = reducedMotion;
    this.iconCount = mobile ? 45 : 84;

    const data = createAmbientIconData(this.iconCount);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(data.positions, 3),
    );
    geometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(data.sizes, 1),
    );
    geometry.setAttribute(
      "aDepth",
      new THREE.BufferAttribute(data.depths, 1),
    );
    geometry.setAttribute(
      "aPhase",
      new THREE.BufferAttribute(data.phases, 1),
    );
    geometry.setAttribute(
      "aOpacity",
      new THREE.BufferAttribute(data.opacities, 1),
    );

    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uPaneProgress: { value: 0 },
      uReducedMotion: { value: reducedMotion ? 1 : 0 },
      uPointer: { value: new THREE.Vector2() },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: mobile ? "default" : "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = true;

    this.canvas.addEventListener(
      "webglcontextlost",
      this.handleContextLost,
    );
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    this.resize();
  }

  update(
    deltaSeconds: number,
    elapsedTime: number,
    pointerX: number,
    pointerY: number,
  ): void {
    if (this.destroyed) {
      return;
    }

    const alpha = 1 - Math.exp(-12 * deltaSeconds);
    this.visibility = lerp(
      this.visibility,
      this.targetVisibility,
      alpha,
    );
    this.pointerX = this.reducedMotion ? 0 : pointerX;
    this.pointerY = this.reducedMotion ? 0 : -pointerY;
    this.uniforms.uTime.value = elapsedTime;
    this.uniforms.uPaneProgress.value = this.paneProgress;
    this.uniforms.uPointer.value.set(this.pointerX, this.pointerY);

    if (
      this.lastCanvasOpacity < 0 ||
      Math.abs(this.visibility - this.lastCanvasOpacity) > 0.002
    ) {
      this.canvas.style.opacity = this.visibility.toFixed(3);
      this.lastCanvasOpacity = this.visibility;
    }

    if (this.visibility > 0.002) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize(): void {
    if (this.destroyed) {
      return;
    }

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.uniforms.uPixelRatio.value = this.pixelRatio;
    this.measure();
    this.updateScrollState();
  }

  getSnapshot(): AmbientIconSnapshot {
    return {
      iconCount: this.iconCount,
      visibility: this.visibility,
      paneProgress: this.paneProgress,
      pointerX: this.pointerX,
      pointerY: this.pointerY,
      drawCalls: this.renderer.info.render.calls,
      activePane: this.activePane,
      reducedMotion: this.reducedMotion,
    };
  }

  dispose(): void {
    this.destroyed = true;
    window.removeEventListener("scroll", this.handleScroll);
    this.canvas.removeEventListener(
      "webglcontextlost",
      this.handleContextLost,
    );
    this.points.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }

  private readonly handleScroll = (): void => {
    this.updateScrollState();
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    document.body.classList.add("is-ambient-icons-unavailable");
  };

  private measure(): void {
    const scrollY = window.scrollY;
    const introRect = this.intro.getBoundingClientRect();
    const closingRect = this.closing.getBoundingClientRect();
    this.introTop = scrollY + introRect.top;
    this.introHeight = Math.max(1, introRect.height);
    this.introBottom = this.introTop + this.introHeight;
    this.closingTop = scrollY + closingRect.top;
    this.closingHeight = Math.max(1, closingRect.height);
    this.closingBottom = this.closingTop + this.closingHeight;
  }

  private updateScrollState(): void {
    const scrollY = window.scrollY;
    const viewportHeight = Math.max(1, window.innerHeight);
    const introFadeStart = this.introBottom - viewportHeight * 0.55;
    const introVisibility =
      1 -
      smootherstep(
        clamp(
          (scrollY - introFadeStart) / (viewportHeight * 0.45),
          0,
          1,
        ),
      );
    const introProgress = clamp(
      (scrollY - this.introTop) / this.introHeight,
      0,
      1,
    );

    const closingFadeStart = this.closingTop - viewportHeight;
    const closingFadeIn = smootherstep(
      clamp(
        (scrollY - closingFadeStart) / (viewportHeight * 0.45),
        0,
        1,
      ),
    );
    const closingFadeOut =
      1 -
      smootherstep(
        clamp(
          (scrollY -
            (this.closingBottom - viewportHeight * 0.35)) /
            (viewportHeight * 0.35),
          0,
          1,
        ),
      );
    const closingVisibility = closingFadeIn * closingFadeOut;
    const closingProgress = clamp(
      (scrollY - closingFadeStart) /
        (this.closingHeight + viewportHeight),
      0,
      1,
    );

    if (introVisibility >= closingVisibility && introVisibility > 0) {
      this.targetVisibility = introVisibility;
      this.paneProgress = introProgress;
      this.activePane = "intro";
      return;
    }

    if (closingVisibility > 0) {
      this.targetVisibility = closingVisibility;
      this.paneProgress = closingProgress;
      this.activePane = "closing";
      return;
    }

    this.targetVisibility = 0;
    this.paneProgress = 0;
    this.activePane = null;
  }
}

export function createAmbientIconData(
  iconCount: number,
  seed = 0x50f1e1d,
): AmbientIconData {
  if (!Number.isInteger(iconCount) || iconCount < 1) {
    throw new Error("Ambient icon count must be a positive integer.");
  }

  const random = createRandom(seed);
  const positions = new Float32Array(iconCount * 3);
  const sizes = new Float32Array(iconCount);
  const depths = new Float32Array(iconCount);
  const phases = new Float32Array(iconCount);
  const opacities = new Float32Array(iconCount);
  const columns = Math.ceil(Math.sqrt(iconCount * 1.7));
  const rows = Math.ceil(iconCount / columns);

  for (let index = 0; index < iconCount; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions[index * 3] =
      ((column + randomBetween(random, 0.12, 0.88)) / columns) *
        2.16 -
      1.08;
    positions[index * 3 + 1] =
      ((row + randomBetween(random, 0.12, 0.88)) / rows) * 2.16 -
      1.08;
    positions[index * 3 + 2] = 0;
    sizes[index] = randomBetween(random, 7, 15);
    depths[index] = randomBetween(random, 0.08, 1);
    phases[index] = randomBetween(random, 0, Math.PI * 2);
    opacities[index] = randomBetween(random, 0.55, 1);
  }

  return { positions, sizes, depths, phases, opacities };
}
