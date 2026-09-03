# Particle system

## Conclusion

The recognizable forms are not point-sampled 3D meshes and are not generated
from mathematical primitives. They are encoded in eight small H.264 videos.
Each point owns a fixed image-space UV. The vertex shader samples the current
and next video at that UV, interprets luminance as occupancy/depth, and moves
and shades the point accordingly.

That conclusion is **CONFIRMED** by all of the following:

- `/gifs/depth-scenes.json` declares eight MP4 sources.
- The network capture contains those eight media requests and no `.glb`,
  `.gltf`, `.bin`, Draco, KTX model, or comparable geometry asset.
- Runtime inspection finds eight off-screen video elements and Three.js
  `VideoTexture`s.
- The custom vertex shader samples the video textures using each point's
  `aUv`.
- Representative source frames in the ignored
  `screenshots/depth-clips-contact-sheet.png` visibly contain the forms.

## Source media

The live manifest's scene labels alternate between sculpture and telescope
subjects:

| Clip | Label | Resolution | FPS | Duration | Local bytes |
|---|---|---:|---:|---:|---:|
| 01 | Sculpture 01 | 640×360 | 15 | 4.000 s | 105,464 |
| 02 | Telescope 02 | 640×360 | 15 | 4.000 s | 53,448 |
| 03 | Sculpture 03 | 640×360 | 15 | 4.067 s | 62,480 |
| 04 | Telescope 04 | 640×354 | 15 | 6.067 s | 165,020 |
| 05 | Sculpture 05 | 640×360 | 15 | 4.000 s | 90,765 |
| 06 | Telescope 06 | 640×360 | 15 | 4.067 s | 100,351 |
| 07 | Sculpture 07 | 688×464 | 24 | 6.042 s | 745,039 |
| 08 | Telescope 08 | 752×416 | 24 | 6.042 s | 234,801 |

All use H.264/YUV420p. The manifest also supplies `depthGamma`, optional hold
multipliers, flip flags, transition directions, and text reveal speed. The
current configuration has `densityScale: 1.55` and
`transitionSpeed: 0.03`.

The renderer creates muted, inline, non-looping, preloaded videos in a
1×1-pixel off-screen container. Each becomes a linearly filtered `VideoTexture`
with mipmaps disabled. Scroll maps to `video.currentTime`; the videos do not
simply play in real time.

## Geometry and point count

### Static grid

The renderer creates one non-indexed `BufferGeometry` with three float
attributes:

| Attribute | Components | Meaning |
|---|---:|---|
| `position` | 3 | Regular plane coordinate centered on `(0,0)`, with tiny deterministic cell jitter; Z starts at 0 |
| `aUv` | 2 | Exact normalized sample coordinate over the video |
| `aSeed` | 1 | Deterministic per-point random seed |

The grid dimensions are derived from the target count and first source aspect:

```text
columns = max(96, round(sqrt(target × sourceAspect)))
rows    = max(96, round(columns / sourceAspect))
actual  = columns × rows
```

The geometry is uploaded with static usage. The capture saw three
`ARRAY_BUFFER` uploads and no `bufferSubData` updates:

| Capture | Grid | Points | Buffer bytes (`position`, `aUv`, `aSeed`) |
|---|---:|---:|---:|
| Desktop | 470×264 | 124,080 | 1,488,960; 992,640; 496,320 |
| Mobile | 239×134 | 32,026 | 384,312; 256,208; 128,104 |

### Target-count policy

Let `w = min(canvas CSS width, 1600)`, `c = hardwareConcurrency`, and
`d = 0.8` when browser DPR is at least 2, otherwise `1`.

| Condition | Base | Cap |
|---|---:|---:|
| `w < 640` or `c < 4` | 26,000 | 55,000 |
| `640 ≤ w < 1024` | 72,000 | 150,000 |
| `w ≥ 1024` | 100,000 | 200,000 |

```text
target = min(cap, round(base × densityScale × d))
```

With the live density of 1.55:

- desktop/high-DPR target = `100,000 × 1.55 × 0.8 = 124,000`;
- mobile target = `26,000 × 1.55 × 0.8 = 32,240`.

The regular-grid rounding produces the observed 124,080 and 32,026 points. A
resize only rebuilds geometry if the old target differs from the new target by
more than 20%.

## Vertex shader pipeline

The following behavior is **CONFIRMED** from the delivered custom shader and
the captured, Three.js-expanded runtime shader. This is a functional
description rather than a source reproduction.

### 1. Sample and normalize two scenes

For textures A and B, the shader:

1. optionally flips the UV vertically;
2. samples RGB;
3. computes Rec. 601-style luminance;
4. removes a small black floor, scales, clamps, and applies a mild gamma;
5. applies the per-clip depth gamma.

Thus a dark pixel suppresses or recesses a point while a bright pixel makes it
present and nearer. The source files act as animated depth/occupancy fields.

### 2. Estimate local relief

A one-texel Sobel/Laplacian-style neighborhood estimate detects depth edges.
That relief term:

- preserves fine contours;
- raises presence around silhouettes;
- increases Z slightly;
- increases point size and opacity;
- darkens contour color.

The shader exposes `uLowQuality`. Its source comment says low quality omits the
four diagonal Sobel samples. In the compiled shader those texture expressions
remain and are multiplied by zero when low quality is active. Functional
softening is **CONFIRMED**; physical elimination of the texture fetches by a
driver is **UNCONFIRMED**.

### 3. Reveal the initial field

`uIntroT` is eased and combined with radius plus the point seed. Points emerge
from a tiny central seed in staggered waves, with short radial/tangential arcs
and temporary tumble. `uIntroT` reaches 1 at 6% of section progress.

### 4. Play or transition

During a play phase, A and B are the same video and `uMorph = 0`; scroll merely
selects its frame.

During a transition:

- A seeks from its late edge to its end.
- B seeks from its beginning to its early edge.
- `uMorph` advances from 0 to 1.
- per-transition hashes derived from `uTransitionSeed` choose a mirrored,
  slightly rotated route;
- FBM noise and per-point hashes stagger departure and arrival;
- points leave the old image, travel through a curved stream/plume, and settle
  into the new image;
- a small seeded dispersion peaks at the midpoint and disappears at both ends.

The final occupancy, relief, depth, position, size, and alpha are computed per
vertex. No particle positions are transformed on the CPU.

With reduced motion, the elaborate route block and transition dispersion are
disabled. Texture interpolation remains, so the scene can still follow scroll
without the turbulent travel.

### 5. Derive Z depth

The main depth term is centered luminance multiplied by
`uDepthStrength` (0.96). Highlights receive a small crest lift; valleys recess;
relief, radial position, seeded jitter, and transition state add smaller
offsets. A subtle image-space parallax offset is also derived from depth.

The resulting `(x, y, depth)` is transformed by the point object's model-view
matrix and the perspective camera. Pointer interaction therefore rotates a
real shallow 3D relief field rather than shifting a flat screen-space bitmap.

### 6. Protect text

After projection, each point calculates screen coordinates and tests up to four
soft rectangles. Within a text rectangle:

- most points become smaller and more transparent;
- a deterministic sparse subset remains;
- transition energy weakens the avoidance, allowing the plume to pass through.

This is shader-side compositional masking, not a second canvas or DOM mask.

### 7. Compute point size

`gl_PointSize` combines:

- desktop/mobile base point scale;
- capped pixel ratio;
- perspective attenuation;
- intro reveal;
- source clarity and occupancy;
- Sobel relief and near-depth emphasis;
- transition/plume/bottom-hint state;
- per-point grain and rare sparkle;
- text-avoidance size reduction;
- a motion-time fine-detail reduction.

The captured base values are 1.9 on desktop and 1.66 below 720px.

### 8. Compute color and alpha

Although the public manifest contains tint colors, the observed homepage writes
black into the active A/B tint uniforms. The resulting palette is a nearly
monochrome dark depth ramp on the cream page, with lighter haze/glow during
motion.

Vertex alpha combines image occupancy, edge relief, intro birth, depth,
transition plume, text avoidance, field-edge fade, and occasional sparkle.

## Fragment shader

The fragment shader is intentionally small:

- center `gl_PointCoord`;
- form a tight exponential core plus a broader, dimmer halo;
- multiply by vertex alpha;
- discard fragments with alpha below 0.007;
- output the interpolated point color and capped alpha.

This creates soft circular particles without a sprite texture.

## Important uniforms

| Group | Uniforms | Purpose |
|---|---|---|
| Scene sampling | `uTextureA/B`, `uTexelA/B`, `uFlipA/B`, `uDepthGammaA/B` | Current/next video, texel spacing, orientation, luminance response |
| Timeline | `uIntroT`, `uMorph`, `uTransitionSeed`, `uTime` | Intro birth, cross-scene progress, deterministic route, animated turbulence |
| Routing | `uExitAxis`, `uEnterSide`, `uReducedMotion` | Optional direction overrides and motion suppression |
| Projection/quality | `uPlaneScale`, `uViewportScale`, `uPixelRatio`, `uPointScale`, `uDepthStrength`, `uFieldFade`, `uLowQuality` | Fit, depth, size, and quality policy |
| Text clearance | `uAvoidRect0..3`, `uAvoidStrength0..3`, `uAvoidFeather` | Screen-space sparse zones around DOM text |
| Color | `uTintA/B` | Active-scene tint; set to black in the observed homepage |
| Dormant final mode | `uFinalTexture0..2`, `uFinalFlip0..2`, `uFinalRect0..2`, `uFinalTint0..2`, `uFinalT` | Three-way gather/composition path not activated by this page |
| Three.js built-ins | `modelViewMatrix`, `projectionMatrix` | Object/camera transform |

## GPU versus CPU

**CPU responsibilities**

- fetch and parse scene metadata;
- create and seek videos;
- construct the grid once;
- map scroll to phase and video progress;
- update compact uniforms;
- calculate text rectangles;
- apply smoothed object rotation.

**GPU responsibilities**

- sample source images;
- interpolate/morph;
- generate seeded noise and curved transition paths;
- calculate depth and screen position;
- avoid text;
- calculate point size/color/alpha;
- rasterize the soft sprites.

This division—static CPU geometry, compact uniforms, and massively parallel
vertex work—is the central reason a six-figure point count is practical.

## Evidence

- `assets-manifest.json`
- `network-requests.json`
- `raw/public/gifs/depth-scenes.json`
- `raw/runtime-probe-desktop.json`
- `raw/runtime-probe-mobile.json`
- `raw/shaders/program-1.vert.glsl`
- `raw/shaders/program-1.frag.glsl`
- `raw/0s99a.formatted.js`, approximately lines 10,410–11,580
