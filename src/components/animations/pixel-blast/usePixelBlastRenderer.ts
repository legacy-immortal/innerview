import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PixelBlastProps } from './types';
import { createLiquidEffect, createTouchTexture } from './effects';
import { FRAGMENT_SRC, MAX_CLICKS, SHAPE_MAP, VERTEX_SRC } from './shaders';
import { isEffectPassWithEffects } from './types';
import {
  cappedDpr,
  FRAME_INTERVAL_MS,
  HIDDEN_POLL_MS,
  RENDER_COUNTER,
} from '../perf';
import { Effect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import * as THREE from 'three';

/**
 * @file Pixel-blast renderer hook — manages the Three.js renderer, composer,
 * pointer/ripple uniforms, offscreen auto-pause visibility, and cleanup.
 */

/** Refs returned by {@link usePixelBlastRenderer}. */
export interface UsePixelBlastRendererResult {
  readonly containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Set up the pixel-blast WebGL pipeline for the given props.
 * @param props - Pixel-blast behavior props.
 * @returns The container ref to bind to the host element.
 */
export function usePixelBlastRenderer({
  variant = 'square',
  pixelSize = 3,
  color = '#B19EEF',
  antialias = true,
  patternScale = 2,
  patternDensity = 1,
  liquid = false,
  liquidStrength = 0.1,
  liquidRadius = 1,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  liquidWobbleSpeed = 4.5,
  autoPauseOffscreen = true,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
  noiseAmount = 0,
}: PixelBlastProps): UsePixelBlastRendererResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibilityRef = useRef({ visible: true });
  const speedRef = useRef(speed);

  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    material: THREE.ShaderMaterial;
    clock: THREE.Clock;
    clickIx: number;
    uniforms: {
      uResolution: { value: THREE.Vector2 };
      uTime: { value: number };
      uColor: { value: THREE.Color };
      uClickPos: { value: THREE.Vector2[] };
      uClickTimes: { value: Float32Array };
      uShapeType: { value: number };
      uPixelSize: { value: number };
      uScale: { value: number };
      uDensity: { value: number };
      uPixelJitter: { value: number };
      uEnableRipples: { value: number };
      uRippleSpeed: { value: number };
      uRippleThickness: { value: number };
      uRippleIntensity: { value: number };
      uEdgeFade: { value: number };
    };
    resizeObserver?: ResizeObserver;
    raf?: number;
    pollId?: ReturnType<typeof setTimeout>;
    quad?: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    timeOffset?: number;
    composer?: EffectComposer;
    touch?: ReturnType<typeof createTouchTexture>;
    liquidEffect?: Effect;
  } | null>(null);
  const prevConfigRef = useRef<{
    antialias?: boolean;
    liquid?: boolean;
    noiseAmount?: number;
  } | null>(null);

  /**
   * Dispose the current Three.js instance (renderer, canvas, RAF loop).
   * @param container - The host element that owns the renderer canvas.
   */
  const disposeThree = (container: HTMLElement | null): void => {
    const t = threeRef.current;
    if (!t) return;
    t.resizeObserver?.disconnect();
    if (t.pollId !== undefined) clearTimeout(t.pollId);
    if (t.raf !== undefined) cancelAnimationFrame(t.raf);
    t.quad?.geometry.dispose();
    t.material.dispose();
    t.composer?.dispose();
    // Explicitly release WebGL context before dispose to prevent context limit issues
    t.renderer.forceContextLoss();
    t.renderer.dispose();
    if (container && t.renderer.domElement.parentElement === container)
      container.removeChild(t.renderer.domElement);
    threeRef.current = null;
  };

  // Dispose only on unmount — reinit on config change is handled in the main effect.
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      disposeThree(container);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    speedRef.current = speed;
    const needsReinitKeys = ['antialias', 'liquid', 'noiseAmount'];
    const cfg = { antialias, liquid, noiseAmount };
    let mustReinit = false;
    if (!threeRef.current) mustReinit = true;
    else if (prevConfigRef.current) {
      for (const k of needsReinitKeys)
        if (
          prevConfigRef.current[k as keyof typeof prevConfigRef.current] !==
          cfg[k as keyof typeof cfg]
        ) {
          mustReinit = true;
          break;
        }
    }
    if (mustReinit) {
      disposeThree(container);
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'none';
      renderer.setPixelRatio(cappedDpr());
      container.appendChild(renderer.domElement);
      if (transparent) renderer.setClearAlpha(0);
      else renderer.setClearColor(0x000000, 1);
      const uniforms = {
        uResolution: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uClickPos: {
          value: Array.from(
            { length: MAX_CLICKS },
            () => new THREE.Vector2(-1, -1)
          ),
        },
        uClickTimes: { value: new Float32Array(MAX_CLICKS) },
        uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
        uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
        uScale: { value: patternScale },
        uDensity: { value: patternDensity },
        uPixelJitter: { value: pixelSizeJitter },
        uEnableRipples: { value: enableRipples ? 1 : 0 },
        uRippleSpeed: { value: rippleSpeed },
        uRippleThickness: { value: rippleThickness },
        uRippleIntensity: { value: rippleIntensityScale },
        uEdgeFade: { value: edgeFade },
      };
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SRC,
        fragmentShader: FRAGMENT_SRC,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        glslVersion: THREE.GLSL3,
      });

      const quadGeom = new THREE.PlaneGeometry(2, 2);
      const quad = new THREE.Mesh(quadGeom, material);
      scene.add(quad);
      const clock = new THREE.Clock();
      const setSize = (): void => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height
        );
        if (threeRef.current?.composer)
          threeRef.current.composer.setSize(
            renderer.domElement.width,
            renderer.domElement.height
          );
        uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
      };
      setSize();
      const ro = new ResizeObserver(setSize);
      ro.observe(container);
      const randomFloat = (): number => {
        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
          const u32 = new Uint32Array(1);
          window.crypto.getRandomValues(u32);
          return u32[0] / 0xffffffff;
        }
        return Math.random();
      };
      const timeOffset = randomFloat() * 1000;
      let composer: EffectComposer | undefined;
      let touch: ReturnType<typeof createTouchTexture> | undefined;
      let liquidEffect: Effect | undefined;
      if (liquid) {
        touch = createTouchTexture();
        touch.radiusScale = liquidRadius;
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        liquidEffect = createLiquidEffect(touch.texture, {
          strength: liquidStrength,
          freq: liquidWobbleSpeed,
        });
        const effectPass = new EffectPass(camera, liquidEffect);
        effectPass.renderToScreen = true;
        composer.addPass(renderPass);
        composer.addPass(effectPass);
      }
      if (noiseAmount > 0) {
        if (!composer) {
          composer = new EffectComposer(renderer);
          composer.addPass(new RenderPass(scene, camera));
        }
        const noiseEffect: Effect = new Effect(
          'NoiseEffect',
          `uniform float uTime; uniform float uAmount; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);} void mainUv(inout vec2 uv){} void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){ float n=hash(floor(uv*vec2(1920.0,1080.0))+floor(uTime*60.0)); float g=(n-0.5)*uAmount; outputColor=inputColor+vec4(vec3(g),0.0);} `,
          {
            uniforms: new Map<string, THREE.Uniform>([
              ['uTime', new THREE.Uniform(0)],
              ['uAmount', new THREE.Uniform(noiseAmount)],
            ]),
          }
        );
        const noisePass = new EffectPass(camera, noiseEffect);
        noisePass.renderToScreen = true;
        if (composer && composer.passes.length > 0) {
          // Ensure only the final noise pass renders to screen.
          for (const p of composer.passes) {
            p.renderToScreen = false;
          }
        }
        composer.addPass(noisePass);
      }
      if (composer)
        composer.setSize(renderer.domElement.width, renderer.domElement.height);
      const mapToPixels = (
        e: PointerEvent
      ): {
        readonly fx: number;
        readonly fy: number;
        readonly w: number;
        readonly h: number;
      } => {
        const rect = renderer.domElement.getBoundingClientRect();
        const scaleX = renderer.domElement.width / rect.width;
        const scaleY = renderer.domElement.height / rect.height;
        const fx = (e.clientX - rect.left) * scaleX;
        const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
        return {
          fx,
          fy,
          w: renderer.domElement.width,
          h: renderer.domElement.height,
        };
      };
      const onPointerDown = (e: PointerEvent): void => {
        const { fx, fy } = mapToPixels(e);
        const ix = threeRef.current?.clickIx ?? 0;
        uniforms.uClickPos.value[ix].set(fx, fy);
        uniforms.uClickTimes.value[ix] = uniforms.uTime.value;
        if (threeRef.current) threeRef.current.clickIx = (ix + 1) % MAX_CLICKS;
      };
      const onPointerMove = (e: PointerEvent): void => {
        if (!touch) return;
        const { fx, fy, w, h } = mapToPixels(e);
        touch.addTouch({ x: fx / w, y: fy / h });
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown, {
        passive: true,
      });
      renderer.domElement.addEventListener('pointermove', onPointerMove, {
        passive: true,
      });
      let raf = 0;
      let pollId: ReturnType<typeof setTimeout> | undefined;
      let lastRender = 0;
      const animate = (t = 0): void => {
        if (autoPauseOffscreen && !visibilityRef.current.visible) {
          // Offscreen: poll instead of spinning RAF at 60fps.
          pollId = setTimeout(() => {
            pollId = undefined;
            if (!threeRef.current) return;
            raf = requestAnimationFrame(animate);
            if (threeRef.current) threeRef.current.raf = raf;
          }, HIDDEN_POLL_MS);
          if (threeRef.current) threeRef.current.pollId = pollId;
          return;
        }
        // Throttle background renders to ~30 fps.
        if (t - lastRender < FRAME_INTERVAL_MS) {
          raf = requestAnimationFrame(animate);
          if (threeRef.current) threeRef.current.raf = raf;
          return;
        }
        lastRender = t;
        uniforms.uTime.value =
          timeOffset + clock.getElapsedTime() * speedRef.current;
        if (liquidEffect) {
          const liquidUniforms = (
            liquidEffect as Effect & {
              uniforms?: Map<string, { value: number }>;
            }
          ).uniforms;
          if (liquidUniforms) {
            const uTime = liquidUniforms.get('uTime');
            if (uTime) uTime.value = uniforms.uTime.value;
          }
        }
        if (composer) {
          if (touch) touch.update();
          composer.passes.forEach((p) => {
            const candidate: unknown = p;
            if (isEffectPassWithEffects(candidate)) {
              candidate.effects.forEach((eff: Effect) => {
                const u = eff.uniforms?.get('uTime');
                if (u) u.value = uniforms.uTime.value;
              });
            }
          });
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
        RENDER_COUNTER.frames += 1;
        raf = requestAnimationFrame(animate);
        if (threeRef.current) threeRef.current.raf = raf;
      };
      raf = requestAnimationFrame(animate);
      threeRef.current = {
        renderer,
        scene,
        camera,
        material,
        clock,
        clickIx: 0,
        uniforms,
        resizeObserver: ro,
        raf,
        quad,
        timeOffset,
        composer,
        touch,
        liquidEffect,
      };
    } else {
      const t = threeRef.current!;
      t.uniforms.uShapeType.value = SHAPE_MAP[variant] ?? 0;
      t.uniforms.uPixelSize.value = pixelSize * t.renderer.getPixelRatio();
      t.uniforms.uColor.value.set(color);
      t.uniforms.uScale.value = patternScale;
      t.uniforms.uDensity.value = patternDensity;
      t.uniforms.uPixelJitter.value = pixelSizeJitter;
      t.uniforms.uEnableRipples.value = enableRipples ? 1 : 0;
      t.uniforms.uRippleIntensity.value = rippleIntensityScale;
      t.uniforms.uRippleThickness.value = rippleThickness;
      t.uniforms.uRippleSpeed.value = rippleSpeed;
      t.uniforms.uEdgeFade.value = edgeFade;
      if (transparent) t.renderer.setClearAlpha(0);
      else t.renderer.setClearColor(0x000000, 1);
      if (t.liquidEffect) {
        const liquidUniforms = (
          t.liquidEffect as Effect & {
            uniforms?: Map<string, { value: number }>;
          }
        ).uniforms;
        if (liquidUniforms) {
          const uStrength = liquidUniforms.get('uStrength');
          if (uStrength) uStrength.value = liquidStrength;
          const uFreq = liquidUniforms.get('uFreq');
          if (uFreq) uFreq.value = liquidWobbleSpeed;
        }
      }
      if (t.touch) t.touch.radiusScale = liquidRadius;
    }
    prevConfigRef.current = cfg;
    // No per-change cleanup: disposal happens only on unmount (above) and on
    // reinit inside this effect. Uniform-only prop changes take the update
    // path and must not tear down the renderer.
  }, [
    antialias,
    liquid,
    noiseAmount,
    pixelSize,
    patternScale,
    patternDensity,
    enableRipples,
    rippleIntensityScale,
    rippleThickness,
    rippleSpeed,
    pixelSizeJitter,
    edgeFade,
    transparent,
    liquidStrength,
    liquidRadius,
    liquidWobbleSpeed,
    autoPauseOffscreen,
    variant,
    color,
    speed,
  ]);

  // Set up IntersectionObserver for autoPauseOffscreen feature
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !autoPauseOffscreen) return;

    let intersecting = true;
    const updateVisible = (): void => {
      visibilityRef.current.visible = intersecting && !document.hidden;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          intersecting = entry.isIntersecting;
          updateVisible();
        });
      },
      { threshold: 0 }
    );

    observer.observe(container);
    document.addEventListener('visibilitychange', updateVisible);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisible);
    };
  }, [autoPauseOffscreen]);

  return { containerRef };
}
