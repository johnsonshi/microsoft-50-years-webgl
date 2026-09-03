# Technical design

## Architecture

```text
semantic document
└── historical timeline section
    ├── sticky copy rail (HTML)
    └── decorative canvas
        └── Experience
            ├── Renderer
            ├── ParticleSystem
            │   ├── positionA buffer
            │   ├── positionB buffer
            │   ├── seed/accent buffers
            │   └── custom GLSL material
            ├── SceneLibrary
            │   ├── procedural samplers
            │   └── Morton correspondence
            ├── ScrollTimeline
            └── PointerController
```

Vite emits static files. TypeScript initializes the semantic page, generates
scene targets, and owns the render lifecycle. Three.js handles WebGL resource
creation and cleanup. There is no React renderer, animation dependency,
backend, database, runtime fetch, model, texture, video, or font dependency.

## Particle population and buffers

The app selects one fixed population at startup:

| Tier | Nominal population | DPR cap |
|---|---:|---:|
| Desktop | 90,000 | 1.5 |
| Tablet | 54,000 | 1.25 |
| Mobile/coarse pointer | 28,000 | 1.0 |

Every scene generator returns exactly `N` XYZ positions. The WebGL geometry
contains:

- `positionA: vec3` — current scene target;
- `positionB: vec3` — next scene target;
- `aSeed: float` — deterministic transition/idle phase;
- `aAccent: float` — sparse color and brightness variation.

Only `positionA` and `positionB` change when the timeline crosses into another
scene pair. They are never interpolated on the CPU. A frame changes only
uniforms and object/camera transforms.

## Procedural target generation

All geometry is authored locally through deterministic samplers:

- line, polyline, arc, and Bezier strokes;
- box surfaces and wireframes;
- planes, grids, rings, spheres, and clustered volumes;
- network nodes and connecting paths;
- text masks sampled from an off-screen 2D canvas using system fonts;
- stratified background fields and flow bands.

Generators produce more weighted candidates than required. A deterministic
stratified resampler selects exactly `N` points while preserving each scene's
intended density distribution. No external model or copyrighted artwork is
needed.

## Correspondence strategy

Arbitrary index pairing creates television-static morphs. This implementation
uses a deterministic spatial strategy:

1. Compute each scene's bounds.
2. Normalize points into a common unit cube.
3. Quantize each axis to ten bits.
4. Interleave the bits into a 30-bit Morton/Z-order key.
5. Sort by Morton key, with the original deterministic index as a tiebreaker.
6. Pair equal sorted indices across scenes.

Morton ordering is inexpensive at initialization, preserves broad spatial
neighborhoods, and is stable for 28k–90k points. It is less exact than global
optimal transport but avoids its startup cost and memory requirements.

## Shader architecture

### Vertex shader

Conceptually:

```glsl
vec3 base = mix(positionA, positionB, easedProgress);
float energy = sin(PI * progress);
vec3 arc = transitionArc(base, aSeed) * energy;
vec3 idle = lowFrequencyMotion(base, aSeed, time) * idleAmplitude;
vec3 finalPosition = base + arc + idle;
```

The shader also:

- applies scene-level scale and offset;
- derives subtle depth-aware point size;
- fades peripheral and low-density particles;
- reduces transition energy under reduced motion;
- supplies an ink/accent color to the fragment shader.

The idle displacement is intentionally bounded and lower than the normal gap
between important silhouette points. It remains active when scroll stops,
which is a deliberate difference from the observed Datacurve runtime.

### Fragment shader

`gl_PointCoord` forms an antialiased circular core with a soft outer falloff.
The shader discards transparent corners and outputs near-black graphite with
sparse restrained accent color. No sprite texture, lighting pass,
post-processing, or framebuffer simulation is used.

## Scroll architecture

The experience section contains one viewport-height step per era plus
transition travel. JavaScript calculates:

```text
progress = clamp((scrollY - sectionTop) /
                 (sectionHeight - viewportHeight))
scaled = progress × (sceneCount - 1)
sceneA = floor(scaled)
sceneB = min(sceneA + 1, lastScene)
local = fract(scaled)
```

A smootherstep curve shapes `local` for particle motion while raw local
progress remains available for copy opacity. The controller updates the active
pair only when `sceneA`/`sceneB` changes.

Each scene definition also supplies interpolated:

- camera Z and vertical framing;
- particle-group yaw/pitch/roll;
- scene scale;
- pointer amplitude;
- transition arc strength.

No scroll trapping or synthetic smooth scrolling is used. Native scrolling
keeps keyboard, trackpad, browser restoration, and reduced-motion behavior
predictable.

## Pointer and touch architecture

Pointer coordinates are normalized to `[-1, 1]`. They set small yaw and pitch
targets. The animation loop uses time-correct exponential damping:

```text
alpha = 1 - exp(-damping * deltaSeconds)
current += (target - current) * alpha
```

The result rotates the complete point object, revealing real Z depth while
leaving scroll state unchanged. Maximum desktop angles are approximately
`±0.09` radians yaw and `±0.055` radians pitch. Mobile uses device-independent
touch position when available and lower amplitudes; it never enables free
orbit controls.

## Render lifecycle

- A single RAF drives pointer damping, time, timeline uniforms, and rendering.
- The loop allocates no arrays, vectors, or objects.
- Scroll/pointer handlers only update scalar targets and use passive listeners.
- `ResizeObserver`/resize events update camera, drawing buffer, and framing.
- `visibilitychange` pauses elapsed-time accumulation while hidden.
- WebGL context loss displays the semantic experience without crashing.

Unlike the reference implementation, the future scene deliberately retains a
small continuous idle motion. Other settled scenes use a lower idle amplitude.

## DOM and accessibility

- The document contains one `h1` and ordered era sections with headings and
  concise descriptions.
- The canvas uses `aria-hidden="true"` and cannot receive focus.
- A non-WebGL/reduced-motion presentation keeps the timeline legible.
- CSS follows the system motion preference and avoids scroll interception.
- A status line identifies the project as an unofficial personal tribute.
- Contrast is checked against the warm paper background.

## Performance plan

- One `THREE.Points` draw call.
- Static seed/accent attributes and pair buffers updated only at scene
  boundaries.
- Typed arrays reused across transitions.
- No per-frame particle loops or buffer uploads.
- No antialiasing, shadows, lights, post-processing, textures, or transparent
  full-screen passes.
- Adaptive particle count and DPR caps.
- Compact shaders with low-cost trigonometric motion and no iterative noise.
- Scene generation yields periodically during startup so the page shell can
  paint first.

Browser profiling will record actual point count, attribute bytes, draw calls,
mean/p95 frame intervals, approximate FPS, JS heap, startup duration, and
production asset size in `PERFORMANCE.md`.

## GitHub Pages

`vite.config.ts` derives the production base as
`/microsoft-50-years-webgl/` and allows `/` in local development. The Actions
workflow installs with `npm ci`, runs tests, builds `site/dist`, uploads that
directory as the Pages artifact, and deploys it with the official Pages
actions.

## Separation from research

The implementation imports nothing from `../research`. A final repository scan
will reject Datacurve URLs or filenames under `site/`. Research downloads and
screenshots remain ignored and local; only independently written analysis and
reproduction tooling are tracked.

