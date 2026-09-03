# Site implementation

This directory contains the independently written static experience for
**Microsoft: 50 Years of Computing**.

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

The development server uses `/`. The production build uses the GitHub Pages
base path `/microsoft-50-years-webgl/`. The custom production preview prints
and serves the exact local URL, normally
`http://127.0.0.1:4174/microsoft-50-years-webgl/`.

Browser checks use the installed Chrome rather than downloading Chromium:

```bash
# Terminal 1
npm run dev -- --port 4173

# Terminal 2
npm run test:e2e
npm run capture
npm run profile
```

Set `BASE_URL` or `CHROME_PATH` to override their defaults. A `particles` query
parameter between 5,000 and 120,000 provides a repeatable profiling override:

```text
http://127.0.0.1:4173/?particles=50000
```

## Source map

```text
src/
├── config/       era-level camera, color, and motion values
├── geometry/     procedural samplers, text masks, target generation, Morton sort
├── input/        damped pointer state
├── scene/        Three.js renderer and particle system
├── shaders/      custom vertex and fragment shaders
├── timeline/     native-scroll normalization and semantic copy state
└── utils/        shared math
```

Every scene is generated locally from lines, boxes, grids, curves, spheres,
networks, waves, and off-screen system-font text. No historical artwork,
product icon, model, texture, or remote runtime asset is used.

## Architecture

- One semantic HTML timeline and one decorative sticky canvas.
- One fixed logical particle population.
- Eight equal-size XYZ target arrays.
- Morton/Z-order sorting for coherent broad-region correspondence.
- Two reusable GPU position buffers.
- Vertex-shader morphing, arcs, idle motion, point sizing, color, and text
  avoidance.
- Fragment-shader circular graphite points.
- Native scrolling, damped pointer parallax, and no scroll interception.

See [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md),
[SCENE_DESIGN.md](SCENE_DESIGN.md), and [PERFORMANCE.md](PERFORMANCE.md).

## Visual artifacts

The generated review set under [`screenshots/`](screenshots/) contains every
settled era, every transition midpoint, and mobile captures. The anniversary
frame is [`screenshots/scene-07.jpg`](screenshots/scene-07.jpg).

## Accessibility

All historical meaning is present in headings and paragraphs outside WebGL.
The canvas is `aria-hidden`, keyboard/native scrolling is untouched, and
reduced-motion mode snaps to settled scenes while preserving the full document.
If WebGL initialization fails, the timeline remains readable.

## Originality

The code, shaders, geometry, visual composition, and copy in `site/` are
original. The implementation imports nothing from `research/` and does not
reuse Datacurve source code, shaders, models, videos, position data, assets, or
screenshots.

This is an unofficial personal tribute and is not sponsored, endorsed, or
published by Microsoft.
