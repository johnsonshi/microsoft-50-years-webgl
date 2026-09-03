# Implementation plan

## Product goal

Build an original, static WebGL essay titled **Microsoft: 50 Years of
Computing**. One persistent particle field evolves through eight eras as the
reader scrolls. Semantic HTML carries the complete narrative; the canvas is a
decorative, interactive interpretation of that history.

The implementation may reuse the interaction pattern learned from the public
Datacurve runtime—persistent canvas, scroll-scrubbed state, and damped pointer
parallax—but it will not reuse Datacurve code, shaders, media, geometry, copy,
layout, or assets.

## Delivery phases

1. **Foundation**
   - Scaffold Vite, TypeScript, Three.js, Vitest, and a lightweight Playwright
     inspection harness.
   - Establish GitHub Pages base-path handling.
   - Build the semantic timeline and responsive page shell.
2. **Procedural scenes**
   - Implement deterministic point samplers for linework, boxes, grids,
     networks, clouds, text masks, rings, and flowing fields.
   - Generate equal-size point arrays for all eight scenes.
   - Normalize and Morton-sort each scene for stable correspondence.
3. **WebGL renderer**
   - Create one `THREE.Points` object with immutable seed/color attributes and
     two replaceable target-position attributes.
   - Interpolate targets in a custom vertex shader.
   - Render circular paper-ink point sprites in a custom fragment shader.
4. **Timeline and interaction**
   - Map normalized section scroll to scene index, local morph progress, copy
     state, camera framing, and group orientation.
   - Add damped pointer/touch parallax independent of scroll.
   - Add restrained shader-side idle motion.
5. **Responsive and accessible behavior**
   - Scale the particle budget and DPR by viewport/device capability.
   - Keep all historical content in semantic HTML.
   - Treat the canvas as decorative and provide a reduced-motion mode that
     swaps scenes discretely while preserving every era.
6. **Visual iteration**
   - Capture every era, transition midpoint, final `50`, future scene, mobile
     layout, and reduced-motion layout.
   - Tune density, framing, text clearance, morph readability, and contrast.
7. **Validation and delivery**
   - Run unit and browser interaction tests.
   - Build and inspect the production output under the repository subpath.
   - Profile FPS, frame time, draw calls, memory, and bundle/geometry size.
   - Add GitHub Pages deployment and final documentation.

## Dependencies

| Package | Reason |
|---|---|
| `three` | WebGL renderer, camera, buffers, and resource lifecycle |
| `vite` | Small static-site development and production build |
| `typescript` | Typed scene, timeline, and renderer contracts |
| `vitest` | Deterministic unit tests for timeline and geometry helpers |
| `playwright-core` | Drive the already-installed Chrome for visual, interaction, console, and performance checks without downloading a browser |

No React layer, smooth-scroll library, animation framework, backend, runtime
API, model loader, or external asset pipeline is required.

## Test plan

### Unit

- Timeline clamps correctly at the first and last scene.
- Every transition resolves to the intended source, destination, and local
  progress.
- Reduced motion snaps to a stable scene rather than leaving a partial morph.
- Every generated scene has exactly the requested particle count.
- Generated positions and bounds contain only finite values.
- Morton sorting is deterministic and preserves the point set.
- Particle budgets and DPR caps select the intended desktop/tablet/mobile
  tiers.

### Browser

- Scroll top to bottom and bottom to top.
- Stop at the midpoint of each transition and verify a stable mixed state.
- Move the pointer left/right and up/down at a fixed scroll position.
- Leave the page idle and verify bounded, subtle motion.
- Resize desktop and tablet viewports.
- Run at a mobile viewport with touch-style input.
- Run with `prefers-reduced-motion: reduce`.
- Reload at a mid-page scroll position.
- Fail on console errors, page errors, missing assets, shader errors, or
  non-finite renderer state.

### Visual review

- Beginning and all eight settled scenes.
- Seven transition midpoints.
- Final `50` scene and future field.
- Desktop, tablet, mobile, and reduced-motion variants.
- Text/canvas collisions, contrast, density, silhouette readability, and
  GitHub Pages asset paths.

## Performance targets

- 90,000 particles on a typical desktop, subject to profiling.
- 54,000 particles on tablet-size layouts.
- 28,000 particles on mobile/coarse-pointer layouts.
- One points draw call and no per-particle CPU work per frame.
- DPR capped at 1.5 desktop, 1.25 tablet, and 1 mobile.
- No allocations in the animation loop.
- Mean visual cadence near 60 FPS on the local modern laptop at 1440×900.

## Completion criteria

- Production build works with no backend at
  `/microsoft-50-years-webgl/`.
- The whole narrative remains readable without WebGL or animation.
- The final implementation contains no Datacurve source, shaders, media,
  geometry, screenshots, or other proprietary assets.
- Research evidence remains isolated under `research/datacurve/`.

