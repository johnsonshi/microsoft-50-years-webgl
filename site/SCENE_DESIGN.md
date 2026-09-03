# Scene design

## Shared visual system

The page uses warm paper, dark graphite particles, restrained blue/green/red
accents, and editorial typography with large areas of empty space. The
particles are not a literal museum of product replicas. They behave like one
computational material learning new organizations over five decades.

Each scene sits in a shallow three-dimensional volume. The settled forms stay
legible from the front while small pointer-driven rotation reveals depth.
Transitions preserve broad spatial regions so the field reorganizes in
currents rather than dissolving into noise.

Each era now uses one continuous editorial sentence rather than a year,
heading, and subtitle. Entering words begin as pale graphite and fill with the
era accent as scrolling advances.

## 1. 1975 — Altair BASIC

- **Copy:** `In 1975, Altair BASIC turned a few pages of code into Microsoft's first product.`
- **Geometry:** A tall source-code listing with punched binder holes, an
  `ALTAIR BASIC` title, and one `MICRO-SOFT` card.
- **Depth:** Code lines sit above a thin sheet while the card lifts toward the
  reader.
- **Camera:** Frontal and document-like, preserving the archival silhouette
  without reproducing the reference photograph.
- **Transition out:** Code rows compress into the screen and keyboard strata
  of the personal computer.

## 2. 1980s — The personal computer

- **Copy:** `In the 1980s, the personal computer moved into everyday life.`
- **Geometry:** A compact PC silhouette, keyboard strata, and a large
  `C:\>` prompt assembled from dense rectilinear particles.
- **Depth:** The prompt floats just ahead of the monitor; keyboard rows step
  toward the viewer.
- **Camera:** Moves back slightly to reveal the whole workstation.
- **Transition out:** Prompt strokes split into the four Windows panes while
  the workstation gains a human figure and network path.

## 3. 1990s — Windows and the Internet

- **Copy:** `In the 1990s, Windows and the Internet connected people beyond the desktop.`
- **Geometry:** A solid seated silhouette at a CRT workstation, the four-pane
  Windows mark on screen, and an `@` envelope suspended above on a network arc.
- **Depth:** The monitor sits forward, the person occupies a middle plane, and
  the email path recedes into the network.
- **Camera:** Frontal enough to read as a period desktop while retaining a
  shallow three-dimensional profile.
- **Transition out:** The envelope leaves the screen and multiplies into a
  stream of connected work artifacts.

## 4. 2000s — Work begins to flow

- **Copy:** `In the 2000s, email, Word, and PowerPoint made work flow across the web.`
- **Geometry:** Email, Word-document, and PowerPoint-slide cards moving through
  one continuous system of broad Bezier paths.
- **Depth:** Artifacts occupy staggered planes along the flow, with no desk or
  human figure anchoring the composition.
- **Camera:** Wider than the 1990s scene so the movement between tools is the
  dominant form.
- **Transition out:** Document frames straighten, stack, and deepen into rows
  of server equipment.

## 5. 2010s — Cloud datacenters

- **Copy:** `In the 2010s, cloud datacenters made global computing available on demand.`
- **Geometry:** Three dense server racks with repeated units, routed cables,
  and a broad infrastructure ring.
- **Depth:** Racks occupy distinct depth bands while routes pass over and under
  the aisle.
- **Camera:** Broad and architectural, conveying a room-scale system.
- **Transition out:** Rack rows collapse into terminal lines while routing
  paths fan out into an agent topology.

## 6. 2020s — Agent fleets

- **Copy:** `In the 2020s, conversation became an interface to fleets of intelligent agents.`
- **Geometry:** A platform-neutral bordered TUI with textual `YOU>` and `AI>`
  prompts, response lines, and no desktop-window controls, connected to a
  three-by-three fleet of small agent terminals.
- **Depth:** The chat surface sits forward while agents step backward by
  column and remain linked as one system.
- **Camera:** Close enough to read the terminal structure without flattening
  the fleet.
- **Transition out:** Agent cards merge into four solid panes and terminal
  lines form the Microsoft wordmark.

## 7. 2025 — Microsoft at fifty

- **Copy:** `By 2025, Microsoft had spent fifty years turning ambitious ideas into everyday tools.`
- **Geometry:** Four filled panes above a locally sampled `Microsoft` wordmark.
- **Depth:** Each pane sits on a slightly different plane; the wordmark is
  shallow and calm beneath them.
- **Composition:** Anniversary copy remains on the right while the logo shifts
  left.
- **Camera:** Nearly frontal with reduced pointer parallax for recognition.
- **Transition out:** The panes lift into the rocket body, fins, and exhaust
  plume.

## 8. 2026 and Beyond — Powering abundance

- **Copy:** `Beyond 2026, AI can power an age of abundance—expanding agency, discovery, and possibility.`
- **Geometry:** A rising rocket with cylindrical body, conical nose, fins,
  window, turbulent exhaust, smoke volumes, stars, and an upward trajectory.
- **Depth:** The rocket occupies the near plane while smoke spreads toward the
  reader and stars recede behind it.
- **Camera:** Opens vertically to emphasize lift and forward momentum.
- **Composition:** The abundance statement sits on the left while the launch
  rises on the right.
- **Intent:** AI is framed as infrastructure for greater human agency,
  accelerated discovery, and capabilities that become broadly available.
- **End state:** The field continues a small, breathing idle motion before the
  final statement fades and the stage yields to the closing line.

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
  sentence fills word by word from pale graphite to its era accent.

## Responsive composition

- **Desktop:** Copy alternates left and right while the particle form occupies
  the opposite two-thirds of the viewport.
- **Tablet:** Copy stays near a lower corner; forms remain centered and slightly
  smaller.
- **Mobile:** Copy moves above the lower safe area, forms occupy the upper
  two-thirds, and particle count/depth/parallax are reduced.
- **Reduced motion:** All eras remain in the document. The renderer shows the
  nearest settled scene with no transition arcs and minimal ambient motion.
