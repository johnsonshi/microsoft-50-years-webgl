varying float vOpacity;

float paneMask(vec2 point, vec2 minimum, vec2 maximum) {
  vec2 leading = smoothstep(minimum - 0.025, minimum + 0.025, point);
  vec2 trailing =
    1.0 - smoothstep(maximum - 0.025, maximum + 0.025, point);
  return leading.x * leading.y * trailing.x * trailing.y;
}

void main() {
  vec2 point = gl_PointCoord;
  float panes = max(
    max(
      paneMask(point, vec2(0.1, 0.55), vec2(0.45, 0.9)),
      paneMask(point, vec2(0.55, 0.55), vec2(0.9, 0.9))
    ),
    max(
      paneMask(point, vec2(0.1, 0.1), vec2(0.45, 0.45)),
      paneMask(point, vec2(0.55, 0.1), vec2(0.9, 0.45))
    )
  );

  if (panes < 0.01) {
    discard;
  }

  gl_FragColor = vec4(vec3(0.067), panes * vOpacity);
}
