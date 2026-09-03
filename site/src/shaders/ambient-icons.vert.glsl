attribute float aSize;
attribute float aDepth;
attribute float aPhase;
attribute float aOpacity;

uniform float uTime;
uniform float uPixelRatio;
uniform float uPaneProgress;
uniform float uReducedMotion;
uniform vec2 uPointer;

varying float vOpacity;

void main() {
  float motion = 1.0 - uReducedMotion;
  vec2 base = position.xy;
  vec2 toPointer = uPointer - base;
  float proximity = exp(-dot(toPointer, toPointer) * 2.4);
  vec2 pointerAttraction =
    toPointer * proximity * mix(0.008, 0.058, aDepth);
  vec2 pointerParallax = uPointer * mix(0.004, 0.026, aDepth);
  vec2 idle = vec2(
    sin(uTime * 0.16 + aPhase),
    cos(uTime * 0.13 + aPhase * 1.37)
  ) * mix(0.0015, 0.008, aDepth);
  vec2 scrollParallax = vec2(
    sin(aPhase * 1.71) * 0.008,
    (uPaneProgress - 0.5) * mix(0.025, 0.13, aDepth)
  );

  base +=
    (pointerAttraction + pointerParallax + idle + scrollParallax) *
    motion;

  gl_Position = vec4(base, 0.0, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  vOpacity = aOpacity * mix(0.045, 0.12, aDepth);
}
