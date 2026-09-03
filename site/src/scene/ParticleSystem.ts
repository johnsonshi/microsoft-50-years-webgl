import * as THREE from "three";
import vertexShader from "../shaders/particles.vert.glsl?raw";
import fragmentShader from "../shaders/particles.frag.glsl?raw";

interface ParticleUniforms {
  [uniform: string]: THREE.IUniform;
  uProgress: { value: number };
  uTime: { value: number };
  uPixelRatio: { value: number };
  uPointSize: { value: number };
  uTransitionStrength: { value: number };
  uIdleAmplitude: { value: number };
  uReducedMotion: { value: number };
  uAccentA: { value: THREE.Color };
  uAccentB: { value: THREE.Color };
  uAvoidRectA: { value: THREE.Vector4 };
  uAvoidRectB: { value: THREE.Vector4 };
  uAvoidStrengthA: { value: number };
  uAvoidStrengthB: { value: number };
}

export class ParticleSystem {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly geometryBytes: number;

  private readonly sourcePositions: Float32Array;
  private readonly targetPositions: Float32Array;
  private readonly sourceAttribute: THREE.BufferAttribute;
  private readonly targetAttribute: THREE.BufferAttribute;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: ParticleUniforms;

  constructor(
    particleCount: number,
    pixelRatio: number,
    pointSize: number,
    reducedMotion: boolean,
  ) {
    this.sourcePositions = new Float32Array(particleCount * 3);
    this.targetPositions = new Float32Array(particleCount * 3);
    this.sourceAttribute = new THREE.BufferAttribute(this.sourcePositions, 3);
    this.targetAttribute = new THREE.BufferAttribute(this.targetPositions, 3);
    this.sourceAttribute.setUsage(THREE.DynamicDrawUsage);
    this.targetAttribute.setUsage(THREE.DynamicDrawUsage);

    const seeds = new Float32Array(particleCount);
    const accents = new Float32Array(particleCount);
    for (let index = 0; index < particleCount; index += 1) {
      seeds[index] = hash(index * 0.754877666);
      accents[index] = hash(index * 0.569840296 + 0.31);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", this.sourceAttribute);
    geometry.setAttribute("positionTarget", this.targetAttribute);
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aAccent", new THREE.BufferAttribute(accents, 1));

    this.uniforms = {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uPointSize: { value: pointSize },
      uTransitionStrength: { value: 0.7 },
      uIdleAmplitude: { value: 0.018 },
      uReducedMotion: { value: reducedMotion ? 1 : 0 },
      uAccentA: { value: new THREE.Color(0.1, 0.4, 0.68) },
      uAccentB: { value: new THREE.Color(0.1, 0.4, 0.68) },
      uAvoidRectA: { value: new THREE.Vector4(2, 2, 2, 2) },
      uAvoidRectB: { value: new THREE.Vector4(2, 2, 2, 2) },
      uAvoidStrengthA: { value: 0 },
      uAvoidStrengthB: { value: 0 },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.geometryBytes = particleCount * (3 + 3 + 1 + 1) * 4;
  }

  setTargets(source: Float32Array, target: Float32Array): void {
    if (
      source.length !== this.sourcePositions.length ||
      target.length !== this.targetPositions.length
    ) {
      throw new Error("Scene targets do not match the particle population.");
    }

    this.sourcePositions.set(source);
    this.targetPositions.set(target);
    this.sourceAttribute.needsUpdate = true;
    this.targetAttribute.needsUpdate = true;
  }

  setAccents(
    source: readonly [number, number, number],
    target: readonly [number, number, number],
  ): void {
    this.uniforms.uAccentA.value.setRGB(source[0], source[1], source[2]);
    this.uniforms.uAccentB.value.setRGB(target[0], target[1], target[2]);
  }

  update(
    progress: number,
    time: number,
    transitionStrength: number,
    idleAmplitude: number,
  ): void {
    this.uniforms.uProgress.value = progress;
    this.uniforms.uTime.value = time;
    this.uniforms.uTransitionStrength.value = transitionStrength;
    this.uniforms.uIdleAmplitude.value = idleAmplitude;
  }

  setAvoidance(
    rectangleA: Float32Array,
    strengthA: number,
    rectangleB: Float32Array,
    strengthB: number,
  ): void {
    this.uniforms.uAvoidRectA.value.fromArray(rectangleA);
    this.uniforms.uAvoidRectB.value.fromArray(rectangleB);
    this.uniforms.uAvoidStrengthA.value = strengthA;
    this.uniforms.uAvoidStrengthB.value = strengthB;
  }

  setPixelRatio(pixelRatio: number): void {
    this.uniforms.uPixelRatio.value = pixelRatio;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

function hash(value: number): number {
  return Math.abs(Math.sin(value * 12_989.8) * 43_758.5453) % 1;
}
