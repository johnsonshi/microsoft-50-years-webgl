precision highp float;

uniform float uProgress;
uniform float uTime;
uniform float uPixelRatio;
uniform float uPointSize;
uniform float uTransitionStrength;
uniform float uIdleAmplitude;
uniform float uFinaleProgress;
uniform float uReducedMotion;
uniform vec3 uAccentA;
uniform vec3 uAccentB;
uniform vec4 uAvoidRectA;
uniform vec4 uAvoidRectB;
uniform float uAvoidStrengthA;
uniform float uAvoidStrengthB;

attribute vec3 positionTarget;
attribute float aSeed;
attribute float aAccent;

varying vec3 vColor;
varying float vAlpha;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float smoother(float value) {
  float t = clamp(value, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float avoidanceAt(vec2 screenPosition, vec4 rectangle, float strength) {
  vec2 rectangleCenter = (rectangle.xy + rectangle.zw) * 0.5;
  vec2 rectangleHalfSize = max(
    vec2(0.0),
    (rectangle.zw - rectangle.xy) * 0.5
  );
  vec2 edgeDistance =
    abs(screenPosition - rectangleCenter) - rectangleHalfSize;
  float signedDistance = max(edgeDistance.x, edgeDistance.y);
  float inside = 1.0 - smoothstep(-0.035, 0.025, signedDistance);
  return inside * strength;
}

void main() {
  float staggered = clamp(
    uProgress * 1.2 - 0.1 + (aSeed - 0.5) * 0.16,
    0.0,
    1.0
  );
  float morph = smoother(staggered);
  float transitionEnergy = sin(morph * PI) * (1.0 - uReducedMotion);

  vec3 base = mix(position, positionTarget, morph);
  float rocketHorizontal =
    1.0 - smoothstep(0.48, 0.82, abs(positionTarget.x - 1.15));
  float rocketDepth =
    smoothstep(0.22, 0.38, positionTarget.z) *
    (1.0 - smoothstep(1.0, 1.12, positionTarget.z));
  float rocketHeight = smoothstep(-2.2, -2.12, positionTarget.y);
  float rocketMask = rocketHorizontal * rocketDepth * rocketHeight;
  float smokeDepth =
    smoothstep(1.7, 1.78, positionTarget.z) *
    (1.0 - smoothstep(2.5, 2.58, positionTarget.z));
  float smokeHeight = 1.0 - smoothstep(-0.82, -0.62, positionTarget.y);
  float smokeMask = smokeDepth * smokeHeight;
  float liftProgress = mix(
    smoother(uFinaleProgress),
    step(0.001, uFinaleProgress) * 0.7,
    uReducedMotion
  );
  base.y += rocketMask * liftProgress * 2.0;
  float smokeProgress = smoother(
    clamp((uFinaleProgress - 0.06) / 0.5, 0.0, 1.0)
  );
  vec3 smokeOrigin = vec3(1.15, -2.04, 2.12);
  vec3 expandedSmoke =
    smokeOrigin + (base - smokeOrigin) * smokeProgress;
  base = mix(base, expandedSmoke, smokeMask);
  float seedAngle = aSeed * TAU;
  vec3 flow = vec3(
    sin(base.y * 1.25 + seedAngle * 0.35),
    cos(base.x * 0.92 - seedAngle * 0.27),
    sin((base.x + base.y) * 0.7 + seedAngle * 0.21)
  );
  flow = normalize(flow + vec3(0.001));

  vec3 arc = flow *
    transitionEnergy *
    uTransitionStrength *
    mix(0.12, 0.42, aAccent);
  arc.y +=
    sin(base.x * 0.72 + seedAngle) *
    transitionEnergy *
    uTransitionStrength *
    0.16;

  vec3 idle = vec3(
    sin(uTime * 0.43 + seedAngle + base.y * 0.38),
    cos(uTime * 0.36 + seedAngle * 1.17 + base.x * 0.31),
    sin(uTime * 0.29 + seedAngle * 0.73 + base.z * 0.46)
  ) * uIdleAmplitude * mix(0.45, 1.0, aAccent) * (1.0 - uReducedMotion);

  vec3 transformed = base + arc + idle;
  vec4 modelViewPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * modelViewPosition;
  vec2 screenPosition = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
  float avoidance = max(
    avoidanceAt(screenPosition, uAvoidRectA, uAvoidStrengthA),
    avoidanceAt(screenPosition, uAvoidRectB, uAvoidStrengthB)
  );
  float sparseRetention = smoothstep(0.94, 1.0, aSeed) * 0.7;
  float suppression = avoidance * (1.0 - sparseRetention);

  float perspective = clamp(7.2 / max(2.0, -modelViewPosition.z), 0.68, 1.55);
  gl_PointSize = clamp(
    uPointSize *
    uPixelRatio *
    perspective *
    mix(0.72, 1.38, aAccent) *
    (1.0 - transitionEnergy * 0.1) *
    mix(1.0, 0.16, suppression),
    1.0,
    5.4
  );

  vec3 graphite = vec3(0.035, 0.034, 0.031);
  vec3 accent = mix(uAccentA, uAccentB, smoother(uProgress));
  float accentMix = smoothstep(0.72, 1.0, aAccent) * 0.48;
  vColor = mix(graphite, accent, accentMix);
  vAlpha =
    mix(0.45, 0.94, aAccent) *
    mix(1.0, 0.58, transitionEnergy) *
    mix(1.0, 0.06, suppression) *
    mix(1.0, smokeProgress, smokeMask);
}
