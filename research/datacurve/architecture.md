# Runtime architecture

## Confidence summary

| Layer | Finding | Confidence |
|---|---|---|
| Application | Next.js App Router 16.2.6, delivered with Turbopack | **CONFIRMED** |
| UI runtime | React reports `19.3.0-canary-3f0b9e61-20260317` in the delivered runtime | **CONFIRMED** |
| Styling | Tailwind-like generated utility CSS | **LIKELY**; exact Tailwind version is **UNCONFIRMED** |
| Smooth scrolling | Lenis 1.3.23, enabled outside reduced-motion, coarse-pointer, and Safari cases | **CONFIRMED** |
| Particle renderer | Three.js revision 184 plus a custom `DotMorph` class and custom GLSL | **CONFIRMED** |
| Hero sequencing | Direct normalized-scroll calculations, React state for text, CSS opacity/transform, custom RAF | **CONFIRMED** |
| GSAP | GSAP 3.15.0 and ScrollTrigger are present in a route-prefetched chunk | **CONFIRMED** |
| GSAP as hero driver | No call path or runtime evidence connects it to this hero | **UNCONFIRMED**; the direct implementation is the observed driver |

Version evidence is in the downloaded runtime chunks inventoried by
`assets-manifest.json`. The homepage controller and renderer are in ignored
formatted copies `raw/07acnwh_9824e.formatted.js` and
`raw/0s99a.formatted.js`, respectively.

## Smallest faithful component model

```text
Next/React page
└── 2450vh narrative section
    └── sticky viewport
        ├── semantic DOM hero and scene text
        └── one transparent canvas
            └── Three.js scene
                ├── PerspectiveCamera
                └── Points
                    ├── immutable BufferGeometry
                    └── transparent ShaderMaterial

scroll progress ─┬─> DOM opacity / transform / text reveal
                 ├─> video seek times
                 └─> shader intro + morph uniforms

pointer position ──> smoothed Points rotation
scene manifest ────> hidden videos ──> VideoTextures ──> vertex shader
```

React and Next provide the surrounding page but are not fundamental to the
effect. A standalone implementation can use one section, one canvas, ordinary
DOM text, and a small state machine.

## Page and loading path

1. The server returns a Next.js/RSC homepage plus initial styles and scripts.
2. The homepage controller is part of the initial HTML's script set.
3. On mount it dynamically imports the particle module through Turbopack.
4. That module fetches `/gifs/depth-scenes.json` with a timestamp cache buster.
5. It creates eight off-screen `<video>` elements and corresponding Three.js
   `VideoTexture` objects.
6. It waits for the first video's metadata/data, sizes the renderer, builds one
   point grid, then fades the canvas in.
7. All eight media files are requested during load. The full scroll did not
   initiate more network traffic.

The complete request chain and initiators are in `network-requests.json`.
`assets-manifest.json` groups the two timestamp variants of the scene manifest
under one canonical URL.

## Canvas and WebGL

There is one canvas and one WebGL context.

| Setting | Desktop capture | Mobile emulation |
|---|---:|---:|
| Requested/actual API | WebGL2 / `WebGL2RenderingContext` | same |
| Alpha | true | true |
| Antialias | false | false |
| Depth | true | true |
| Stencil | false | false |
| Preserve drawing buffer | false | false |
| Power preference | `high-performance` | `default` |
| Browser-reported renderer | ANGLE Metal, Apple M3 Pro | same emulated run |

The Three.js renderer clears transparently. It owns a scene containing a single
`Points` object with one transparent `ShaderMaterial`. Depth testing is enabled;
depth writes are disabled. Runtime interception saw one linked program, two
shaders, and one `drawArrays` call per rendered frame.

The perspective camera is fixed at:

- FOV: 38 degrees
- Near/far: 0.1 / 10
- Position: `(0, 0, 2.55)`

Scroll does not translate or orbit this camera. Pointer input rotates the
`Points` object, changing its model-view matrix. Resize changes camera aspect
and projection.

## Layout and pixel sizing

The narrative section is exactly `2450vh`. Its child is sticky:

- Desktop (`lg`): height `111.12vh`; the canvas fills it.
- Narrow layout: canvas width is 100%, height is `65vw`, and its bottom aligns
  approximately with the viewport midpoint through
  `top: calc(50vh - 65vw)`.

Captured sizes:

| Scenario | Viewport / device DPR | Canvas CSS size | Drawing buffer | Renderer ratio |
|---|---:|---:|---:|---:|
| Desktop | 1440×900 / 2 | 1425×1000 | 1923×1350 | 1.35 |
| High-DPR resize | 1200×800 / 3 | 1185×889 | 1599×1200 | 1.35 |
| Mobile | 390×844 / 3 | 390×254 | 390×254 | 1.0 |

The 15-pixel desktop width difference is the browser scrollbar. The backing
sizes are rounded results of the CSS size times the capped renderer ratio.

## Responsive quality policy

The renderer:

- caps effective CSS width at 1600 and plane-height input at 1000;
- caps pixel ratio at 1.35 on widths at least 720px and at 1 below 720px;
- uses point-scale 1.9 desktop and 1.66 mobile;
- uses text-avoidance feather 0.095 desktop and 0.15 mobile;
- sets `uLowQuality = 1` below 1440 CSS pixels;
- lowers particle count by width, hardware concurrency, and high DPR;
- rebuilds geometry only when the requested target differs by more than 20%.

The rendered plane preserves the current video aspect, occupies about 84% of
the available dimension on desktop and 94% on narrow layouts, and enables an
edge fade beyond 1600×1000.

The low-quality Sobel comment says four diagonal samples are dropped. The
compiled expression still contains those texture calls multiplied by a uniform
zero. Whether a specific GPU/compiler removes the fetches is **UNCONFIRMED**;
the visible output is softened as intended, but the claimed fetch reduction
should not be assumed without a GPU trace.

## Animation and update ownership

### Scroll

The page controller calculates progress from the section's actual scrollable
range, not total document progress. It writes:

- `uIntroT` for the first 6%;
- a remapped scene timeline for the remaining 94%;
- DOM opacity, scale, translation, and per-character reveal;
- up to four text-avoidance rectangles.

The particle renderer turns scene progress into source video times and two
texture bindings. See [scroll-timeline.md](scroll-timeline.md).

### Pointer

`mousemove` is normalized against the viewport. The renderer smooths toward
rotations derived from those coordinates and assigns them to the point-cloud
object. No pointer uniform or CPU-side point update exists. See
[pointer-interaction.md](pointer-interaction.md).

### Time and RAF

With normal motion preferences, the controller requests animation frames while
the section is active. The renderer itself suppresses redundant draws:

- it renders while scroll, intro, final progress, video seek, or pointer
  rotation is changing;
- it stops after 260 ms without change;
- it rejects calls less than 13.667 ms after the last render;
- it increments `uTime` only while scroll/final/seek state is changing.

It also pauses the controller RAF when the document is hidden, the window is
blurred, or the section is outside the viewport.

With `prefers-reduced-motion: reduce`, the controller switches to event-driven
single renders and the shader disables its transition-routing block and
dispersion. This behavior is **CONFIRMED from delivered code** but was not
separately visual-regression tested.

## Text and particle coexistence

The text remains DOM content above the canvas. Instead of relying only on
z-index, the controller computes text-line rectangles and passes up to four
normalized rectangles to the shader. Within those regions the shader reduces
point alpha and size using deterministic sparse retention. During energetic
transitions, avoidance is reduced so the transition plume can cross the text
region.

Before the narrative text takes over, the hero title and body receive separate
avoidance strengths. During the narrative, each rendered text line gets a
strong avoidance region. On narrow screens, the rectangle padding is scaled to
70%.

## Present but inactive paths

The renderer has methods and uniforms for gathering points into three final
targets (`uFinalTexture0..2`, rectangles, and `uFinalT`). In this homepage:

- no controller calls `setFinalSources`, `setFinalTargets`, or
  `setFinalProgress`;
- the capture reports `finalProgress = 0`;
- the final texture uniforms point to 1×1 empty textures.

This is **CONFIRMED dormant code**, not evidence of another visible scene.

## Evidence

- `network-requests.json`
- `assets-manifest.json`
- `raw/runtime-probe-desktop.json`
- `raw/runtime-probe-mobile.json`
- `raw/responsive-samples.json`
- `raw/timeline-samples.json`
- `raw/07acnwh_9824e.formatted.js`, approximately lines 145–370
- `raw/0s99a.formatted.js`, approximately lines 10,290–11,580
