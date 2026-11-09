/**
 * @file GLSL shaders for the hypnotic background animation — radial
 * gradient layers, a geometric pattern overlay, an energy wave, and a
 * scanline overlay. Shader sources are UPPER_SNAKE_CASE constants per
 * project style.
 */

export const VERTEX_SHADER: string = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const PRIMARY_GRADIENT_FRAGMENT: string = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float intensity;
uniform float breathingSpeed;
uniform float breathingIntensity;
uniform int breathingEnabled;
uniform float rotationSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float breathing = 1.0;
  if (breathingEnabled == 1) {
    breathing = 1.0 + sin(time * breathingSpeed) * breathingIntensity;
  }

  float angle = time * rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedUv = rot * uv;

  float dist = length(rotatedUv);
  float gradient = 1.0 - smoothstep(0.0, 0.7, dist);
  vec3 color = mix(color2, color1, gradient);
  // Angular swirl: a radial-only gradient is rotation-invariant (length is
  // unchanged by rotation), so rotation produced no visible motion. The
  // swirl term depends on the rotated angle and moves with rotation.
  float swirlA = sin(atan(rotatedUv.y, rotatedUv.x) * 3.0 + dist * 6.0) * 0.5 + 0.5;
  color = mix(color, color1, swirlA * 0.25);
  color = mix(vec3(0.0), color, smoothstep(0.4, 0.0, dist));
  color *= intensity * breathing;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const SECONDARY_GRADIENT_FRAGMENT: string = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float intensity;
uniform float breathingSpeed;
uniform float breathingIntensity;
uniform int breathingEnabled;
uniform float rotationSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float breathing = 1.0;
  if (breathingEnabled == 1) {
    breathing = 1.0 + sin(time * breathingSpeed + 1.0) * breathingIntensity;
  }

  float angle = -time * rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedUv = rot * uv;

  float dist = length(rotatedUv);
  float gradient = 1.0 - smoothstep(0.0, 0.65, dist);
  vec3 color = mix(color2, color1, gradient);
  // Angular swirl: a radial-only gradient is rotation-invariant (length is
  // unchanged by rotation), so rotation produced no visible motion. The
  // swirl term depends on the rotated angle and moves with rotation.
  float swirlB = sin(atan(rotatedUv.y, rotatedUv.x) * 3.0 + dist * 6.0) * 0.5 + 0.5;
  color = mix(color, color2, swirlB * 0.25);
  color = mix(vec3(0.0), color, smoothstep(0.35, 0.0, dist));
  color *= intensity * breathing;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const TERTIARY_GRADIENT_FRAGMENT: string = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform float intensity;
uniform float breathingSpeed;
uniform float breathingIntensity;
uniform int breathingEnabled;
uniform float rotationSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float breathing = 1.0;
  if (breathingEnabled == 1) {
    breathing = 1.0 + sin(time * breathingSpeed + 2.0) * breathingIntensity;
  }

  float pulse = sin(time * 0.418879) * 0.5 + 0.5; // pulse over 15 seconds
  float scale = mix(1.0, 1.2, pulse);
  vec2 scaledUv = uv / scale;

  float angle = -time * rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotatedUv = rot * scaledUv;

  float dist = length(rotatedUv);
  float gradient = 1.0 - smoothstep(0.0, 0.5, dist);
  vec3 color = mix(color2, color1, gradient);
  // Angular swirl: a radial-only gradient is rotation-invariant (length is
  // unchanged by rotation), so rotation produced no visible motion. The
  // swirl term depends on the rotated angle and moves with rotation.
  float swirlC = sin(atan(rotatedUv.y, rotatedUv.x) * 3.0 + dist * 6.0) * 0.5 + 0.5;
  color = mix(color, color1, swirlC * 0.25);
  color = mix(vec3(0.0), color, smoothstep(0.3, 0.0, dist));
  color *= intensity * breathing;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const GEOMETRIC_PATTERN_FRAGMENT: string = `
precision highp float;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(resolution.x / resolution.y, 1.0);

  float pattern = 0.0;

  // Radial gradients: algebraic 1/(1+d^2) falloff instead of exp().
  vec2 p1 = (uv - vec2(0.25, 0.25)) * aspect;
  pattern += 0.01 / (1.0 + dot(p1, p1) * 200.0);

  vec2 p2 = (uv - vec2(0.75, 0.75)) * aspect;
  pattern += 0.008 / (1.0 + dot(p2, p2) * 200.0);

  vec2 p3 = (uv - vec2(0.5, 0.5)) * aspect;
  pattern += 0.005 / (1.0 + dot(p3, p3) * 400.0);

  // Conic gradient
  vec2 center = vec2(0.5, 0.5);
  vec2 dir = normalize((uv - center) * aspect);
  float angle = atan(dir.y, dir.x) + time * 0.314159; // rotate over 20 seconds
  float conic = sin(angle * 2.0) * 0.5 + 0.5;
  pattern += 0.008 * conic / (1.0 + length((uv - center) * aspect) * 10.0);

  gl_FragColor = vec4(vec3(pattern), 1.0);
}
`;

export const ENERGY_WAVE_FRAGMENT: string = `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= resolution.x / resolution.y;

  float pulse = sin(time * 0.785398) * 0.5 + 0.5; // pulse over 8 seconds
  float scale = mix(1.0, 1.5, pulse);
  vec2 scaledUv = uv / scale;

  float dist = length(scaledUv);
  float opacity = mix(0.05, 0.15, pulse); // Reduced opacity to be more subtle
  float gradient = opacity / (1.0 + dist * 2.5); // algebraic falloff (was exp())

  // Use theme colors instead of hardcoded purple
  vec3 color = mix(color2, color1, 0.5) * gradient;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const SCAN_LINES_FRAGMENT: string = `
precision highp float;
uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Create horizontal scan lines
  float scanLineCount = resolution.y * 0.3;

  // Add subtle scrolling effect
  float scroll = mod(time * 0.05, 1.0);
  float linePosition = mod(uv.y + scroll, 1.0 / scanLineCount);

  // Create subtle line pattern with soft edges
  float lineIntensity = smoothstep(0.0, 0.001, linePosition) *
                        smoothstep(0.005, 0.001, linePosition);

  // Only show the lines themselves, make background transparent
  float alpha = lineIntensity * 0.2;
  vec3 lineColor = vec3(0.05);

  gl_FragColor = vec4(lineColor, alpha);
}
`;
