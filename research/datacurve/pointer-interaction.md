# Pointer interaction and idle behavior

## Mechanism

Pointer input does not push individual particles and does not alter the
particle shader's scene uniforms. It rotates the complete Three.js `Points`
object, so the shallow luminance-derived Z relief becomes visible through the
camera projection.

For viewport coordinates `(clientX, clientY)`:

```text
mouseX = 2 × clientX / viewportWidth  - 1
mouseY = 2 × clientY / viewportHeight - 1

amplitude = 0.12 × (1 - finalProgress)
targetRotationX = -mouseY × amplitude
targetRotationY =  mouseX × amplitude
```

Each rendered frame applies:

```text
rotation += (targetRotation - rotation) × 0.06
```

This is **CONFIRMED** from the delivered controller/renderer and runtime state.
The target amplitude is about 6.88 degrees per axis. In the captured homepage,
`finalProgress` stays zero, so the full amplitude remains available at every
scroll position.

The controller records the latest mouse coordinate and applies it on the next
active animation frame. Touch/coarse-pointer input has no equivalent listener.

## Fixed-scroll test

The test held section progress at 0.55, used a 1440×900 viewport, moved to each
location, waited for the response to settle, and read the live renderer state.
The coordinates were inset by 24 px at edges to avoid browser chrome.

| Position | Coordinates | Normalized pointer | Rotation X | Rotation Y |
|---|---:|---:|---:|---:|
| Center | 720, 450 | 0.0000, 0.0000 | 0.000000 | 0.000000 |
| Left | 24, 450 | -0.9667, 0.0000 | 0.000000 | -0.114733 |
| Right | 1416, 450 | 0.9667, 0.0000 | 0.000000 | +0.113480 |
| Top | 720, 24 | 0.0000, -0.9467 | +0.112359 | +0.001240 |
| Bottom | 720, 876 | 0.0000, +0.9467 | -0.111132 | +0.000014 |
| Top-left | 24, 24 | -0.9667, -0.9467 | +0.111145 | -0.114733 |
| Top-right | 1416, 24 | +0.9667, -0.9467 | +0.113586 | +0.113473 |
| Bottom-left | 24, 876 | -0.9667, +0.9467 | -0.111119 | -0.113494 |
| Bottom-right | 1416, 876 | +0.9667, +0.9467 | -0.113573 | +0.113493 |

Values are radians. Minor cross-axis residue reflects the exponential settling
from the previous test point, not coupling in the formula.

Moving back to center and sampling immediately after the same settling window
left about `(-0.001241, +0.001252)` radians. The independent idle series then
measured the decay below.

## What actually changes

CDP instrumentation showed:

- the Three.js object rotation state changes;
- the uploaded `modelViewMatrix` changes;
- the same program, same 124,080-point draw, and same three static buffers are
  used;
- no pointer-specific uniform exists;
- `uMorph`, video selection, particle attributes, and `uTime` do not need to
  change solely because of pointer position.

Thus “parallax” is a real rigid rotation of a textured point relief, not a
screen-space cursor displacement.

## Smoothing characteristics

With a constant frame rate, the remaining error after `n` rendered frames is:

```text
error(n) = initialError × 0.94^n
```

Approximate implications at 60 Hz:

- one-frame response: 6% of the remaining distance;
- half-life: about 11.2 frames, or 187 ms;
- 90% settled: about 37.2 frames, or 620 ms;
- 99% settled: about 74.4 frames, or 1.24 s.

The renderer treats an axis as settled once its target difference is at most
`1e-4` radians. This threshold and a 260 ms inactivity cutoff eventually stop
draws.

## Idle test

After the corner sequence, the pointer returned to center while scroll remained
fixed. Runtime state was sampled over six seconds:

| Elapsed | Rotation X | Rotation Y | Cumulative draw calls | `uTime` |
|---:|---:|---:|---:|---:|
| 0 s | -0.00116623 | +0.00117716 | 2,314 | 5.1332667 |
| 1 s | -0.00003880 | +0.00003916 | 2,369 | 5.1332667 |
| 3 s | -0.00003880 | +0.00003916 | 2,369 | 5.1332667 |
| 6 s | -0.00003880 | +0.00003916 | 2,369 | 5.1332667 |

No new draw occurred after the one-second sample, and `uTime` stayed fixed.
Pixel comparison is represented by the ignored
`screenshots/desktop-idle-t0.png` and `desktop-idle-t6.png`.

## Idle-motion conclusion

**CONFIRMED:** there is no continuous ambient particle drift once scroll,
video seek, and pointer rotation have settled. The delivered shader source even
notes that an earlier ambient “silk” drift was removed so a still scroll gives
a still field.

Time-dependent terms remain in the shader for:

- intro tumble;
- active transition turbulence;
- early bottom-hint motion;
- dormant final-gather choreography.

But `uTime` advances only while the renderer considers scene state changing,
and rendering stops after inactivity. Therefore those terms do not create an
always-on idle animation in the observed steady mid-story state.

## Reduced motion and visibility

- `prefers-reduced-motion` changes the controller from a continuous RAF to
  event-driven single renders and disables transition-routing motion in the
  shader.
- The RAF pauses when the document is hidden, the window loses focus, or the
  narrative section leaves the viewport.
- Mouse movement while paused is retained and applied when the active loop
  resumes.

These lifecycle behaviors are **CONFIRMED from delivered code**. The primary
center/edge/corner measurements used the default motion preference.

## Evidence

- `raw/pointer-samples.json`
- `raw/idle-samples.json`
- `raw/runtime-probe-desktop.json`
- `screenshots/desktop-pointer-{center,top-left,bottom-right}.png`
- `screenshots/desktop-idle-{t0,t6}.png`
- `raw/07acnwh_9824e.formatted.js`, approximately lines 288–350
- `raw/0s99a.formatted.js`, approximately lines 11,300–11,335
