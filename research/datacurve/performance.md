# Performance analysis

## Why a six-figure point field is smooth

The desktop effect is not 124,080 independent JavaScript particles. It is one
static vertex buffer set, one shader program, and one `POINTS` draw call. The
CPU sends only a small number of uniforms and video textures while the GPU
performs sampling, depth reconstruction, interpolation, noise, routing, point
size, and alpha in parallel.

That architecture removes the most expensive failure modes of large particle
systems:

- no per-particle JavaScript objects;
- no CPU simulation loop over the point count;
- no per-frame attribute upload;
- no one-draw-call-per-particle overhead;
- no sprite-image sampling in the fragment shader;
- no multisample antialiasing.

## Confirmed techniques

### 1. One static geometry and one draw

The capture saw:

- one linked WebGL program;
- three static float buffers;
- no `bufferSubData` updates;
- one `drawArrays(POINTS)` per rendered frame;
- 124,080 vertices desktop and 32,026 mobile.

The point grid is rebuilt only when the target count changes by more than 20%,
which avoids allocation churn during small responsive changes.

### 2. Adaptive particle budget

The point target responds to:

- CSS width bands;
- `navigator.hardwareConcurrency`;
- browser DPR;
- a manifest density multiplier;
- hard caps of 55k, 150k, or 200k.

At DPR at least 2, target count is multiplied by 0.8. Width is capped at 1600
for targeting, so ultrawide screens do not continue increasing particle count.
The observed live density is 1.55.

### 3. Aggressive drawing-buffer caps

Renderer pixel ratio is:

```text
min(devicePixelRatio, width < 720 ? 1 : 1.35)
```

The 1440×900/DPR-2 desktop capture therefore used a 1923×1350 buffer rather
than roughly 2850×2000 for the measured CSS canvas. The DPR-3 mobile emulation
used a 390×254 buffer, not 1170×762. This cuts fragment work and memory
bandwidth substantially.

Point scale is separately adjusted so the lower pixel ratio does not make
points disappear.

### 4. Cheap point rasterization

The fragment shader draws a procedural exponential core and halo from
`gl_PointCoord`, then discards alpha below 0.007. There is no point-sprite
texture, lighting model, post-processing pass, or off-screen framebuffer in the
observed renderer.

The renderer also requests `antialias: false`, uses transparent blending, keeps
depth testing, and disables depth writes.

### 5. Small, practical source media

The eight H.264 files total about 1.56 MB locally. Most are 640×360 at 15 fps;
the two larger clips are still below 752×464 at 24 fps. They are sufficient for
a UV point field and far cheaper than high-resolution color footage.

Each `VideoTexture` uses linear filtering and no mipmaps.

### 6. Throttled random-access seeking

Scroll scrubbing can otherwise flood the media pipeline. A seek is skipped
when:

- metadata is unavailable;
- a seek is already in flight and began less than 180 ms ago;
- target time is within 0.024 s of current media time;
- target time is within 0.014 s of the last requested seek;
- fewer than 28 ms have elapsed since the last request.

For jumps above 0.18 s, `fastSeek` is used where available. A video texture is
marked dirty only after a meaningful time change or media event. During play
phases, both shader inputs refer to the same record, so the record is not
updated twice.

### 7. Render on change, then sleep

The page has a RAF loop while active, but the renderer refuses unnecessary
work:

- minimum render interval: 13.667 ms;
- inactivity cutoff: 260 ms;
- active reasons: changed scroll/intro/final progress, seek in flight, or
  pointer rotation still settling;
- `uTime` advances only when scene/seek state changes.

The surrounding controller pauses its RAF when:

- `document.hidden` is true;
- the window is blurred;
- an `IntersectionObserver` says the section is off-screen.

At rest in the idle test, cumulative draw calls were 2,369 at 1 second and
remained 2,369 at 3 and 6 seconds.

### 8. Reduced-motion mode

When `prefers-reduced-motion` is set:

- the controller uses an event-driven single-frame mode instead of its
  continuous RAF;
- shader transition-routing and dispersion are disabled;
- Lenis smooth scrolling is not initialized.

This reduces both motion and work. It is **CONFIRMED from delivered code**, not
a separate physical-device benchmark.

### 9. DOM work is throttled separately

Text-avoidance rectangles are not recalculated every animation frame without
need. Their update is coalesced with RAF and skipped when:

- less than 96 ms has elapsed since the last update, and
- scroll progress changed by less than 0.018.

This keeps layout reads associated with DOM text out of the hot particle path.
The WebGL shader then handles per-point clearance from the resulting four
rectangles.

## Observed cadence

An instrumented `requestAnimationFrame` measurement reported:

| Scenario | Window | Frames | Estimated cadence | Mean / p95 / max interval |
|---|---:|---:|---:|---:|
| Desktop emulation | 5.000 s | 301 | 60.20 FPS | 16.666 / 16.8 / 16.8 ms |
| Mobile emulation | 3.004 s | 181 | 60.24 FPS | 16.666 / 16.8 / 16.8 ms |

This confirms a stable browser RAF cadence during the measurement. It is not a
GPU frame-time trace and should not be read as proof that every physical phone
renders this workload at 60 FPS. Both scenarios used headless Chrome on the
same Apple M3 Pro.

CDP counters also contain the overhead of the capture itself: 101 forced scroll
samples, extensive state reads, screenshots, and DevTools instrumentation.
Totals such as cumulative layout count are therefore unsuitable as clean
production benchmarks.

## Cost centers and tradeoffs

### Vertex texture sampling

The custom vertex shader is substantial. Depending on phase, each vertex
samples:

- one or two main video textures;
- several neighboring texels for relief;
- dormant final textures in the compiled program;
- procedural FBM and hash functions.

This is viable because source resolution is modest, output is one draw call,
and the point budget/DPR is capped. Still, the shader is the primary GPU cost.

### “Low quality” Sobel uncertainty

At widths below 1440, `uLowQuality` is 1. The source comment claims four corner
texture samples are dropped. However, the compiled shader still expresses the
four texture calls and multiplies their results by `fullQ = 0`.

A sufficiently optimizing shader compiler may eliminate those uniform-gated
fetches, but this was not measured. Therefore:

- softer low-quality edge math: **CONFIRMED**;
- approximately 44% fewer Sobel fetches on actual hardware:
  **UNCONFIRMED**.

An independent implementation that needs guaranteed savings should use
separate shader variants or a compile-time define.

### All videos load up front

Preloading all eight small media files eliminates network stalls while
scrubbing, but front-loads bandwidth and decoder resources. In this capture:

- every video request completed during initial load;
- no scroll phase created a new request.

For larger media, a two-clip sliding window plus prefetch would be more
appropriate.

### Hidden final-composition branch

The active shader includes a dormant three-texture final-gather path. Its
uniform stays zero and textures are 1×1 placeholders, but the branch still
exists in the compiled shader. A purpose-built independent version can omit it
unless that feature is required.

## Recommended independent budget

Start below the observed maximum and scale only after profiling:

| Device class | Suggested starting points | DPR cap |
|---|---:|---:|
| Low-end/coarse pointer | 20–30k | 1.0 |
| Mid-size/tablet | 50–80k | 1.0–1.25 |
| Desktop | 90–125k | 1.25–1.5 |

Keep:

1. one immutable UV grid;
2. one points draw;
3. compact 480p-or-smaller grayscale/depth media;
4. seek thresholds;
5. a render-on-change cutoff;
6. visibility and reduced-motion controls;
7. separate compiled shader variants if mobile texture fetches must be
   predictably lower.

## Evidence

- `raw/performance-metrics.json`
- `raw/idle-samples.json`
- `raw/runtime-probe-desktop.json`
- `raw/runtime-probe-mobile.json`
- `raw/responsive-samples.json`
- `network-requests.json`
- `raw/0s99a.formatted.js`, approximately lines 11,275–11,580
- `raw/07acnwh_9824e.formatted.js`, approximately lines 220–355
