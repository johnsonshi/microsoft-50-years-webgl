# Scene design

## Shared visual system

The page uses warm paper, dark graphite particles, and light sans-serif
editorial typography with large areas of empty space. The particles are not a
literal museum of product replicas. They behave like one computational
material learning new organizations over five decades.

Each scene sits in a shallow three-dimensional volume. The settled forms stay
legible from the front while small pointer-driven rotation reveals depth.
Transitions preserve broad spatial regions so the field reorganizes in
currents rather than dissolving into noise.

Each era uses one continuous editorial sentence rather than a year, heading,
and subtitle. Entering words begin as pale graphite and fill to black as
scrolling advances.

## 1. 1975 — Altair BASIC

- **Copy:** `In 1975, Altair BASIC turned a few pages of code into Microsoft's first product.`
- **Geometry:** A tall `ALTAIR BASIC` source-code listing with punched binder
  holes and layered program rows. No separate Microsoft or Micro-Soft card is
  present.
- **Depth:** Code lines sit just above the thin source sheet.
- **Camera:** Frontal and document-like, preserving the archival silhouette
  without reproducing the reference photograph.
- **Transition out:** Code rows compress into the screen and keyboard strata
  of the personal computer.

## 2. 1980s — The personal computer

- **Copy:** `In the 1980s, the personal computer moved into everyday life.`
- **Geometry:** A compact PC silhouette, keyboard strata, nested terminal
  frames, status areas, and multiple `READY`, `> RUN`, and prompt rows.
- **Depth:** The detailed terminal interface floats just ahead of the monitor;
  keyboard rows step toward the viewer.
- **Camera:** Moves back slightly to reveal the whole workstation.
- **Transition out:** Terminal rows split into overlapping Windows, browser,
  mail, and network interface structures.

## 3. 1990s — Windows and the Internet

- **Copy:** `In the 1990s, Windows and the Internet connected people beyond the desktop.`
- **Geometry:** A dense software-only composition of overlapping browser,
  email, terminal, contacts, and Windows-pane interfaces labeled `HTTP://`,
  `MAIL @`, `> CONNECT`, `ONLINE`, `TCP/IP`, and `WWW`. Network nodes and
  cross-links fill the surrounding field; there is no table, workstation, or
  person.
- **Depth:** Interface layers overlap across several shallow planes while
  network paths weave through and behind them.
- **Camera:** Wide enough to hold the intentionally complicated system without
  resolving it into one physical desktop.
- **Transition out:** Window frames flatten into document, slide, report, and
  email artifacts moving through a shared flow.

## 4. 2000s — Work begins to flow

- **Copy:** `In the 2000s, enterprise work moved online, connecting teams, information, and decisions across the web.`
- **Geometry:** Email, `DOCS`, `SLIDES`, and `REPORT` cards moving through one
  continuous system of broad Bezier paths.
- **Depth:** Artifacts occupy staggered planes along the flow, with no desk or
  human figure anchoring the composition.
- **Camera:** Wider than the 1990s scene so the movement between tools is the
  dominant form.
- **Transition out:** Document frames straighten, stack, and deepen into rows
  of server equipment.

## 5. 2010s — Enterprise cloud

- **Copy:** `In the 2010s, enterprise systems moved into cloud datacenters built for global scale.`
- **Geometry:** Three dense server racks with repeated units and infrastructure
  routes kept below the cabinets. No application cards or decorative routing
  sits above the rack line.
- **Depth:** Racks occupy distinct depth bands while routes pass over and under
  the aisle.
- **Camera:** Broad and architectural, conveying a room-scale system.
- **Transition out:** Rack rows and enterprise routes fan out into a dense
  orchestration topology.

## 6. 2020s — Agent fleets

- **Copy:** `In the 2020s, Microsoft powered intelligence across people, software, and enterprise systems.`
- **Geometry:** A central `AI` core surrounded by twelve
  specialized panels (`PLAN`, `MEMORY`, `SEARCH`, `CODE`, `TEST`, `REVIEW`,
  `DEPLOY`, `TOOLS`, `DATA`, `MAIL`, `DOCS`, and `VISION`), token streams,
  rings, and numerous cross-links. There is no single chat or TUI window.
- **Depth:** The core sits forward while specialist panels occupy several
  planes and the connection mesh passes through the system.
- **Camera:** Wide enough to preserve the deliberately dense fleet topology.
- **Transition out:** Panels and connection rings merge into four solid panes
  and the Microsoft wordmark.

## 7. 2025 — Microsoft at fifty

- **Copy:** `By 2025, Microsoft had spent fifty years turning ambitious ideas into everyday tools.`
- **Geometry:** Four filled panes above a locally sampled `Microsoft` wordmark.
- **Depth:** Each pane sits on a slightly different plane; the wordmark is
  shallow and calm beneath them.
- **Composition:** Anniversary copy remains on the right while the logo shifts
  left.
- **Camera:** Nearly frontal with reduced pointer parallax for recognition.
- **Transition out:** The panes lengthen into the launch vehicle while the
  wordmark disperses into the tower, horizon, smoke, and crowd.

## 8. 2026 and Beyond — Powering abundance

- **Copy:** `2026 and Beyond: AI can power an age of abundance, expanding agency, discovery, and possibility.`
- **Geometry:** A tall staged orbital rocket with an ogive fairing, launch
  tower and service arms, a Florida-like horizon, and 28 stationary foreground
  crowd silhouettes. Exhaust and ground-smoke geometry are intentionally
  omitted.
- **Depth:** The crowd occupies the foreground, the pad and tower occupy the
  middle plane, and the rocket sits slightly behind them before lifting.
- **Camera:** Nearly frontal and vertically open, like a distant public launch
  viewed across the coast.
- **Composition:** The abundance statement sits on the left while the launch
  rises on the right.
- **Intent:** AI is framed as infrastructure for greater human agency,
  accelerated discovery, and capabilities that become broadly available.
- **End state:** Late-scroll shader displacement raises only the rocket by a
  full two world units. The crowd, tower, and horizon remain fixed while the
  statement fades and the stage yields to the closing line.

## Transition language

- Each scene is sampled to the same population.
- Points are normalized and Morton-sorted so nearby regions tend to retain
  nearby indices.
- The vertex shader mixes source and destination positions, but each point
  follows a shallow deterministic arc based on its seed and transition energy.
- Arc energy peaks at the middle and is exactly zero at both settled ends.
- A low-frequency sine field keeps the material alive without obscuring the
  target.
- Copy crossfades in the DOM independently of the point buffer. The incoming
  sentence fills word by word from pale graphite to black.

## Responsive composition

- **Desktop:** Copy alternates left and right while the particle form occupies
  the opposite two-thirds of the viewport.
- **Tablet:** Copy stays near a lower corner; forms remain centered and slightly
  smaller.
- **Mobile:** Copy moves above the lower safe area, forms occupy the upper
  two-thirds, and particle count/depth/parallax are reduced.
- **Reduced motion:** All eras remain in the document. The renderer shows the
  nearest settled scene with no transition arcs and minimal ambient motion.
