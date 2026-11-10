import { Effect } from 'postprocessing';
import * as THREE from 'three';

/**
 * @file effects.ts — post-processing effects for pixel-blast (touch texture +
 * liquid distortion).
 * @module components/animations/pixel-blast/effects
 *
 * Provides `createTouchTexture` (offscreen canvas tracking pointer trails)
 * and `createLiquidEffect` (a `postprocessing` Effect distorting the frame
 * buffer from the touch texture). Consumed by `usePixelBlastRenderer`.
 */

/** Size of the touch-texture canvas in pixels. */
const TOUCH_TEXTURE_SIZE = 64;

/** Maximum age of a touch-trail point, in frames. */
const TOUCH_MAX_AGE = 64;

/** Maximum trail points kept before decaying older ones. */
const TOUCH_TRAIL_LIMIT = 64;

/** A single touch-trail sample. */
export interface TouchPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  force: number;
  age: number;
}

/** Normalized 2D touch coordinates. */
export interface NormalizedTouch {
  readonly x: number;
  readonly y: number;
}

/** Handle returned by {@link createTouchTexture}. */
export interface TouchTextureHandle {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.Texture;
  readonly size: number;
  addTouch: (norm: NormalizedTouch) => void;
  update: () => void;
  radiusScale: number;
}

/** Options for the liquid distortion effect. */
export interface LiquidEffectOptions {
  readonly strength?: number;
  readonly freq?: number;
}

/**
 * Create a touch texture that records pointer trails on an offscreen canvas.
 * @returns A handle exposing the texture and trail update functions.
 */
export function createTouchTexture(): TouchTextureHandle {
  const size = TOUCH_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const trail: TouchPoint[] = [];
  let last: NormalizedTouch | null = null;
  const maxAge = TOUCH_MAX_AGE;
  let radius = 0.1 * size;
  const speed = 1 / maxAge;
  const clear = (): void => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const drawPoint = (p: TouchPoint): void => {
    const pos = { x: p.x * size, y: (1 - p.y) * size };
    let intensity = easeOutSine(Math.min(p.age / (maxAge * 0.3), 1));
    if (p.age > maxAge * 0.3) {
      intensity = easeOutQuad(1 - (p.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
    }
    intensity *= p.force;
    const color = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = size * 5;
    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    ctx.shadowBlur = radius;
    ctx.shadowColor = `rgba(${color},${0.22 * intensity})`;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,0,0,1)';
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  const addTouch = (norm: NormalizedTouch): void => {
    let force = 0;
    let vx = 0;
    let vy = 0;
    if (last) {
      const dx = norm.x - last.x;
      const dy = norm.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / (d || 1);
      vy = dy / (d || 1);
      force = Math.min(dd * 10000, 1);
    }
    last = { x: norm.x, y: norm.y };
    trail.push({ x: norm.x, y: norm.y, age: 0, force, vx, vy });
    while (trail.length > TOUCH_TRAIL_LIMIT) {
      trail.shift();
    }
  };
  const update = (): void => {
    clear();
    for (let i = trail.length - 1; i >= 0; i--) {
      const point = trail[i];
      const f = point.force * speed * (1 - point.age / maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > maxAge) trail.splice(i, 1);
    }
    for (let i = 0; i < trail.length; i++) drawPoint(trail[i]);
    texture.needsUpdate = true;
  };
  return {
    canvas,
    texture,
    addTouch,
    update,
    set radiusScale(v: number) {
      radius = 0.1 * size * v;
    },
    get radiusScale() {
      return radius / (0.1 * size);
    },
    size,
  };
}

/**
 * Ease-out sine curve.
 * @param t - Input in [0, 1].
 * @returns The eased value.
 */
function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

/**
 * Ease-out quadratic curve.
 * @param t - Input in [0, 1].
 * @returns The eased value.
 */
function easeOutQuad(t: number): number {
  return -t * (t - 2);
}

/**
 * Create the liquid distortion effect driven by a touch texture.
 * @param texture - The touch texture providing displacement data.
 * @param opts - Optional strength and frequency overrides.
 * @returns The liquid distortion effect.
 */
export function createLiquidEffect(
  texture: THREE.Texture,
  opts?: LiquidEffectOptions
): Effect {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;

    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;

      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);

      float amt = uStrength * intensity * wave;

      uv += vec2(vx, vy) * amt;
    }
    `;
  return new Effect('LiquidEffect', fragment, {
    uniforms: new Map<string, THREE.Uniform>([
      ['uTexture', new THREE.Uniform(texture)],
      ['uStrength', new THREE.Uniform(opts?.strength ?? 0.025)],
      ['uTime', new THREE.Uniform(0)],
      ['uFreq', new THREE.Uniform(opts?.freq ?? 4.5)],
    ]),
  });
}
