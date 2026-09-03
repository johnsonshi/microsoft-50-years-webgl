precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 centeredCoord = gl_PointCoord - 0.5;
  float distanceFromCenter = length(centeredCoord) * 2.0;
  float core = 1.0 - smoothstep(0.42, 1.0, distanceFromCenter);
  float edge = 1.0 - smoothstep(0.86, 1.0, distanceFromCenter);
  float alpha = vAlpha * mix(core, edge, 0.22);

  if (alpha < 0.025) {
    discard;
  }

  gl_FragColor = vec4(vColor, alpha);
}

