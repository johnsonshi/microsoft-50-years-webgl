# Datacurve public-runtime research

Captured from `https://datacurve.ai/` on `2026-09-03T05:59:53.766Z` with Google
Chrome 152. This is a behavioral study of material delivered to an ordinary
browser. It is not a source-code transplant: downloaded bundles, media, and
screenshots are local, ignored research evidence and must not be copied into the
independent implementation.

## The shortest useful answer

> **If I were independently implementing this interaction model from scratch,
> what is the smallest reasonable architecture and stack?**

Use:

1. A long semantic section with one sticky viewport.
2. One WebGL2 canvas, preferably managed by Three.js for camera, buffers, video
   textures, and cleanup.
3. One immutable UV-aligned point grid: about 100–125k points on desktop and
   25–35k on phones.
4. A small manifest and a handful of low-resolution grayscale/depth videos.
5. One custom vertex shader that samples two videos, converts luminance to
   visibility and Z depth, and performs the transition entirely on the GPU.
6. One tiny fragment shader that renders soft point sprites.
7. A scroll mapper for intro, scene-play, and scene-transition phases; ordinary
   DOM/CSS for text.
8. Pointer-normalized group rotation with exponential smoothing.
9. DPR/particle-count caps, throttled video seeks, visibility pausing, and an
   idle render cutoff.

Three.js is useful but Next.js, React, Lenis, GSAP, and ScrollTrigger are not
required to reproduce the interaction. Lenis changes the feel of wheel input;
it does not define the particle timeline. GSAP/ScrollTrigger is present in a
prefetched bundle, but no evidence ties it to this hero.

## Confidence convention

- **CONFIRMED** — observed in the live runtime, network log, WebGL calls, or
  publicly delivered executable code.
- **LIKELY** — strongly implied, but not directly established in the captured
  run.
- **UNCONFIRMED** — plausible or present elsewhere in the payload, but not
  demonstrated as part of this interaction.

## Principal findings

| Finding | Status | Evidence |
|---|---|---|
| Next.js App Router 16.2.6, Turbopack, and a React 19 canary runtime deliver the page. | **CONFIRMED** | Bundle-reported versions, RSC requests, and `self.__next_f` in `index.html`; relevant chunks are inventoried in `assets-manifest.json`. |
| The particle layer is a custom Three.js r184 `Points` renderer. | **CONFIRMED** | Dynamic `0s99a.txitfa_.js`, one linked shader program, and one `drawArrays(POINTS)` stream in `raw/runtime-probe-*.json`. |
| The canvas uses WebGL2. | **CONFIRMED** | `requestedType: webgl2` and `actualType: WebGL2RenderingContext` in both runtime probes. |
| Recognizable shapes come from eight H.264 depth/luminance videos, not meshes. | **CONFIRMED** | `depth-scenes.json`, eight MP4 requests, shader texture sampling, and no GLB/GLTF/model request. |
| Desktop draws 124,080 points; the mobile emulation draws 32,026. | **CONFIRMED** | Captured draw counts and static attribute buffers in `raw/runtime-probe-desktop.json` and `raw/runtime-probe-mobile.json`. |
| Scene interpolation, depth, dispersion, noise, point size, and alpha are GPU-side. | **CONFIRMED** | Captured shaders and uniform writes under `raw/shaders/` and `raw/runtime-probe-*.json`. |
| Scroll drives video time and scene morph; scroll does not move the perspective camera. | **CONFIRMED** | 101 samples in `raw/timeline-samples.json` and the delivered `DotMorph` logic. |
| Pointer movement rotates the entire point cloud up to about ±0.12 radians per axis. | **CONFIRMED** | `raw/pointer-samples.json` and the renderer update formula. |
| A still pointer and still scroll produce a still field after settling. | **CONFIRMED** | Draw count and `uTime` stop changing in `raw/idle-samples.json`. |
| Tailwind generated the utility stylesheet. | **LIKELY** | Utility naming and `--tw-*` output are present; an exact package version was not exposed. |
| GSAP/ScrollTrigger controls the hero. | **UNCONFIRMED** and contradicted by the observed path | The library exists in route-prefetched chunk `0xyc02bewuh8y.js`; the hero instead uses direct scroll math, CSS styles, and its own RAF loop. |

## Capture inventory

- `network-requests.json` — 129 request observations across fresh desktop and
  mobile loads, including MIME, status, encoded size, initiator, timing, and
  dynamic-script classification.
  - Desktop: 67 requests, about 4.05 MB encoded.
  - Mobile: 62 requests, about 4.03 MB encoded.
  - Each pass fetched 25 scripts and eight videos.
  - The capture changed phase through the entire scroll, pointer, and idle
    sequence. No request began after either load phase; the media was already
    available for scrubbing.
- `assets-manifest.json` — 124 unique declared or observed URLs. It includes all
  initial `src`, `href`, and `srcset` candidates, 12 script chunks absent from
  initial HTML, roles, initiators, MIME types, sizes, and local paths where
  retained.
- `index.html` — saved initial response; ignored by Git.
- `raw/public/` — 31 relevant same-origin JS/CSS/data/media files; ignored.
- `screenshots/` — representative desktop/mobile scroll, pointer, idle, and
  depth-source frames; ignored.

Dynamic here means “a script fetched by the runtime but absent from the initial
HTML.” The Three.js/DotMorph chunk is in that category. Several other dynamic
chunks are route prefetches rather than scroll-triggered loads.

## Document map

- [architecture.md](architecture.md) — framework, canvas, lifecycle, rendering,
  responsive behavior, and component boundaries.
- [particles.md](particles.md) — source media, geometry, attributes, shaders,
  uniforms, point count, and GPU/CPU responsibilities.
- [scroll-timeline.md](scroll-timeline.md) — exact intro and 15-phase scene
  mapping.
- [pointer-interaction.md](pointer-interaction.md) — center/edge/corner tests,
  smoothing, and idle behavior.
- [performance.md](performance.md) — quality scaling, seek/render throttling,
  measured cadence, and tradeoffs.

## Reproduce

No npm dependency is required. The capture client uses Node's built-in
WebSocket and the installed Chrome DevTools Protocol endpoint.

```bash
cd research/datacurve/tools
npm run capture
npm run assets
```

Environment overrides:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
TARGET_URL="https://datacurve.ai/" \
node capture.mjs
```

`capture.mjs` rewrites the tracked network log and ignored runtime evidence and
screenshots. `download-assets.py` regenerates the manifest and refreshes only
same-origin JS/CSS plus particle-relevant JSON/MP4 files.

## Limits

- Results describe this deployment and capture environment, not all historical
  versions of the site.
- “Mobile” is Chrome device emulation on the same Apple M3 Pro GPU, not a
  physical phone benchmark.
- Source maps were not available or required.
- The renderer contains dormant uniforms and methods for a three-target final
  composition. The homepage never sets them in the observed implementation, so
  they are documented as inactive rather than inferred as a hidden ninth scene.
- Full third-party source, editorial imagery, fonts, and screenshots are not
  tracked. Nothing from this research was placed in `site/`.
