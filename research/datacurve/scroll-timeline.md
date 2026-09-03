# Scroll timeline

## Coordinate system

All percentages below are normalized against the Datacurve narrative section's
own active scroll range:

```text
sectionProgress = clamp((scrollY - sectionStart) / (sectionHeight - viewportHeight))
```

In the desktop capture:

- section CSS height: `2450vh`
- measured section height: 22,050 px
- measured active range: 21,150 px

In the 390×844 mobile capture the corresponding measurements were 20,678 px
and 19,834 px. Pixel offsets in the table are desktop values; normalized
percentages are the portable definition.

## Intro range: 0–6%

The page controller applies five independent mappings:

| Section progress `p` | State |
|---|---|
| `0–2.1%` | Canvas opacity `clamp(p / 0.021)` |
| `0–4.2%` | Opening hero opacity `max(0, 1 - p / 0.042)` |
| `0–4.2%` | Opening hero moves down by `20 × (1-opacity)` px and scales from 1 to 0.92 |
| `3.9–6.0%` | Narrative text layer opacity `clamp((p - 0.039) / 0.021)` |
| `0–6.0%` | Particle intro `uIntroT = min(1, p / 0.06)` |

At 6%, the initial title/description is gone, the narrative layer is fully
visible, and the particle field has completed its seeded birth animation.

The scene timeline receives:

```text
sceneScroll = clamp((p - 0.06) / 0.94)
```

so its 0–100% is mapped onto section progress 6–100%.

## Scene phase construction

The eight video durations and live `transitionSpeed: 0.03` generate a weighted
timeline of `1020.8908703666666` units. There are eight play phases separated by
seven transitions.

For scene duration `d`:

```text
edge = clamp(0.7 / d, 0.08, 0.22)
playWeight = d × (playEnd - playStart) × holdMultiplier × 22
```

For a transition into the next scene:

```text
transitionWeight =
  clamp((outgoingEdge × outgoingDuration
       + incomingEdge × incomingDuration) × 1.18,
        1.35, 2.55)
  × transitionInScale
  / transitionSpeed
```

The current manifest sets scene 4's hold multiplier to 0.7, scene 7's to 1.1,
and scene 8's to 1.25. This is why the final two plays occupy much more scroll
than the earlier ones.

## Exact phase map

The media-progress ranges below are normalized video progress, not seconds.
The renderer multiplies them by approximately `(videoDuration - 0.035)`.

| Section range | Desktop px | Phase | Displayed text / side | Media behavior |
|---:|---:|---|---|---|
| 6.000–12.685% | 1,269–2,683 | Play 1: Sculpture 01 | “We've created beauty that outlived the hands that made it” / right | Clip 1, 0.000000→0.825000 |
| 12.685–17.755% | 2,683–3,755 | Transition 1→2 | outgoing text holds, then fades | Clip 1, 0.825000→1; clip 2, 0→0.175000 |
| 17.755–23.022% | 3,755–4,869 | Play 2: Telescope 02 | “Ground glass into lenses and pulled the stars close” / left | Clip 2, 0.175000→0.825000 |
| 23.022–28.092% | 4,869–5,942 | Transition 2→3 | outgoing text holds, then fades | Clip 2, 0.825000→1; clip 3, 0→0.172131 |
| 28.092–33.494% | 5,942–7,084 | Play 3: Sculpture 03 | “Stitched canvas to wood and taught ourselves the sky” / right | Clip 3, 0.172131→0.827869 |
| 33.494–38.564% | 7,084–8,156 | Transition 3→4 | outgoing text holds, then fades | Clip 3, 0.827869→1; clip 4, 0→0.115385 |
| 38.564–45.182% | 8,156–9,556 | Play 4: Telescope 04 | “Time and time again we've poured our hearts into craft.” / left | Clip 4, 0.115385→0.884615 |
| 45.182–50.252% | 9,556–10,628 | Transition 4→5 | outgoing text holds, then fades | Clip 4, 0.884615→1; clip 5, 0→0.175000 |
| 50.252–55.519% | 10,628–11,742 | Play 5: Sculpture 05 | “And let our passion lead us to new frontiers” / right | Clip 5, 0.175000→0.825000 |
| 55.519–60.589% | 11,742–12,815 | Transition 5→6 | outgoing text holds, then fades | Clip 5, 0.825000→1; clip 6, 0→0.172131 |
| 60.589–65.991% | 12,815–13,957 | Play 6: Telescope 06 | “None of it was inevitable.” / left | Clip 6, 0.172131→0.827869 |
| 65.991–71.061% | 13,957–15,029 | Transition 6→7 | outgoing text holds, then fades | Clip 6, 0.827869→1; clip 7, 0→0.115862 |
| 71.061–81.404% | 15,029–17,217 | Play 7: Sculpture 07 | “It took patience, and care, and the intention to reach for who we wanted to be” / right | Clip 7, 0.115862→0.884138 |
| 81.404–86.474% | 17,217–18,289 | Transition 7→8 | outgoing text holds, then fades | Clip 7, 0.884138→1; clip 8, 0→0.115862 |
| 86.474–100.000% | 18,289–21,150 | Play 8: Telescope 08 | “Intelligence is the next frontier. We intend to meet it the same way.” / left | Clip 8, 0.115862→1.000000 |

At exactly the last endpoint, the renderer explicitly pins clip 8 to progress
1.

## What changes within a play phase

For local play progress `q`:

- the active video frame advances through the media range in the table;
- `uMorph = 0`;
- the same texture is bound as A and B;
- particle XY/depth/alpha follow that frame's luminance/depth;
- text reveal is `clamp(q × textRevealSpeed)`;
- text opacity ramps to 1 over the first 8% of the play phase.

The first seven scenes use text reveal speed 1. The final scene uses 2, so its
character reveal completes halfway through its play phase.

Text alternates:

- even zero-based scene indexes: right-aligned on desktop;
- odd indexes: left-aligned on desktop.

On narrow layouts the text remains centered, while its vertical placement and
canvas framing change responsively.

## What changes within a transition

For transition-local progress `q`:

- `uMorph = q`;
- outgoing video progress uses an exponential-out curve;
- incoming video progress uses an exponential-in curve;
- scene identity switches from A to B when morph crosses 0.5;
- `uTransitionSeed` changes deterministically for each pair;
- particle routing, noisy plume, midpoint dispersion, and image interpolation
  happen in the vertex shader;
- the old text's reveal is frozen at its last play value;
- text opacity remains 1 through local 0.45 and reaches 0 at 0.85:

```text
textOpacity = clamp(1 - (q - 0.45) / 0.4)
```

React keeps the outgoing text mounted during the transition. It changes to the
new scene text only after entering the next play phase.

## Camera and rotation

- **Camera translation/orbit versus scroll:** none observed. Camera Z remains
  2.55; scroll selects imagery and shader state.
- **Plane scale:** may interpolate slightly when transitioning between source
  videos with different aspect ratios.
- **Pointer rotation:** independent of scroll except for the dormant
  `finalProgress` attenuation. In the captured homepage `finalProgress` is
  always zero, so pointer amplitude stays constant across the timeline.

See [pointer-interaction.md](pointer-interaction.md) for exact formulas.

## Scroll feel versus timeline

On desktop, Lenis 1.3.23 smooths native wheel input with:

- duration 1.2 seconds;
- exponential-out easing;
- its own visibility-aware RAF loop.

It is skipped for reduced-motion users, coarse pointers, and Safari. The scene
math itself reads ordinary `window.scrollY`; therefore the normalized phase
boundaries above do not depend on Lenis.

## Validation

The table was calculated from the live runtime's exact
`timelinePhases` array. `raw/timeline-samples.json` contains 101 evenly spaced
section samples and records section geometry, active text, scene index/local
progress, morph, media records, and WebGL state.

Representative ignored screenshots:

- `screenshots/desktop-scroll-000.png`
- `screenshots/desktop-scroll-010.png`
- `screenshots/desktop-scroll-025.png`
- `screenshots/desktop-scroll-040.png`
- `screenshots/desktop-scroll-055.png`
- `screenshots/desktop-scroll-070.png`
- `screenshots/desktop-scroll-085.png`
- `screenshots/desktop-scroll-100.png`
- `screenshots/mobile-scroll-{000,055,100}.png`
