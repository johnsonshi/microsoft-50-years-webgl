# Performance

## Final production budget

The shipped quality selector uses:

| Device class | Particles | DPR cap | Point size |
|---|---:|---:|---:|
| Desktop | 90,000 | 1.5 | 1.62 px base |
| Tablet | 54,000 | 1.25 | 1.72 px base |
| Mobile/coarse pointer | 28,000 | 1.0 | 1.85 px base |
| Reduced-motion desktop | 64,000 | 1.5 | 1.62 px base |
| Reduced-motion mobile | 20,000 | 1.0 | 1.85 px base |

The renderer uses one `THREE.Points` object, one shader material, and one
`drawArrays(POINTS)` call per frame. Particle interpolation, transition arcs,
idle movement, depth sizing, accent color, and text avoidance all run in the
vertex shader.

## Measured profile

Captured on the local Apple M3 Pro with Google Chrome 152.0.7977.76, WebGL2
through ANGLE Metal, a 1440×900 CSS viewport, device scale factor 2, and an
effective 1.5 renderer DPR. Each run generated all eight targets, then scrubbed
the full timeline over five seconds.

| Particles | Ready | Mean frame | p95 frame | Estimated cadence | Draws/frame | Active geometry |
|---:|---:|---:|---:|---:|---:|---:|
| 25,000 | 985 ms | 16.660 ms | 16.70 ms | 60.02 FPS | 1 | 0.80 MB |
| 50,000 | 980 ms | 16.661 ms | 16.70 ms | 60.02 FPS | 1 | 1.60 MB |
| 100,000 | 979 ms | 16.653 ms | 16.80 ms | 60.05 FPS | 1 | 3.20 MB |

The 100k run used a 2160×1350 drawing buffer. It reported no console errors,
failed requests, shader failures, or extra draw calls.

Chrome main-thread counters over the measured run remained small:

| Particles | Task duration | Script duration | Sampled JS heap |
|---:|---:|---:|---:|
| 25,000 | 0.330 s | 0.076 s | 3.50 MB |
| 50,000 | 0.350 s | 0.084 s | 4.42 MB |
| 100,000 | 0.378 s | 0.093 s | 3.44 MB |

Heap samples are not monotonic because Chrome may collect garbage at different
points in each run. They are included as bounded observations, not a claim that
larger particle sets use less memory.

Raw results are in
[`performance/profile-results.json`](performance/profile-results.json).

## Memory model

Active GPU-facing attributes consume 32 bytes per logical particle:

- source position: 12 bytes;
- target position: 12 bytes;
- seed: 4 bytes;
- accent: 4 bytes.

The eight retained scene targets consume another 96 bytes per particle. The
default 90k desktop population therefore uses about 11.52 MB of typed position
and attribute storage before Three.js/WebGL bookkeeping.

The active source and destination arrays are reused. They upload only when the
timeline crosses into another scene pair; there is no per-frame particle-buffer
upload.

## Production transfer

The production build is split so the HTML and 2.8 kB bootstrap can paint before
the WebGL implementation loads:

| Asset | Uncompressed | Gzip |
|---|---:|---:|
| Bootstrap JavaScript | 2.75 kB | 1.36 kB |
| Experience JavaScript | 29.37 kB | 10.24 kB |
| Three.js chunk | 494.27 kB | 124.52 kB |
| CSS | 7.11 kB | 2.41 kB |
| HTML | 6.08 kB | 1.83 kB |

There are no runtime images, models, textures, videos, fonts, API calls, or
backend requests.

## Techniques

- GPU-side interpolation between two position attributes.
- Morton/Z-order correspondence generated once at startup.
- Fixed typed arrays and no allocations in the animation hot path.
- One points draw, no lights, shadows, antialiasing, post-processing, or
  framebuffer simulation.
- DPR and particle caps by device class.
- Small point-sprite fragment shader with early discard.
- Dynamic import of the WebGL experience after the semantic shell loads.
- Visibility-aware elapsed-time reset.
- Reduced-motion scene snapping with transition and idle displacement disabled.
- Shader-side negative space around the active semantic copy.

## Limits

The frame numbers are requestAnimationFrame cadence measurements in automated
Chrome, not a hardware GPU trace. Chrome exposed its Metal renderer and stable
frame intervals, but this profile cannot directly report GPU utilization.
Physical low-end phones may perform differently from desktop device emulation;
that is why the production mobile budget is 28k rather than the measured 100k.
