import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { cappedDpr, createVisibilityPause, HIDDEN_POLL_MS } from '../perf';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';
import type { OrbProps } from './types';

/**
 * @file Orb renderer hook — manages the OGL renderer, program,
 * hover/rotation state, and resize handling for the orb animation.
 */

/** Refs returned by {@link useOrbRenderer}. */
export interface UseOrbRendererResult {
  readonly ctnDom: RefObject<HTMLDivElement | null>;
}

/**
 * Create and drive the OGL orb for the given props.
 * @param props - Orb behavior props (hue, hover, rotation).
 * @returns The container ref to bind to the host element.
 */
export function useOrbRenderer({
  hue = 0,
  hoverIntensity = 0.2,
  rotateOnHover = true,
  forceHoverState = false,
}: OrbProps): UseOrbRendererResult {
  const ctnDom = useRef<HTMLDivElement>(null);
  // Live-read refs so prop changes update the running loop without tearing
  // down the renderer (which previously lost the WebGL context per change).
  const hueRef = useRef(hue);
  hueRef.current = hue;
  const hoverIntensityRef = useRef(hoverIntensity);
  hoverIntensityRef.current = hoverIntensity;
  const rotateOnHoverRef = useRef(rotateOnHover);
  rotateOnHoverRef.current = rotateOnHover;
  const forceHoverStateRef = useRef(forceHoverState);
  forceHoverStateRef.current = forceHoverState;

  useEffect(() => {
    const container = ctnDom.current;
    if (!container) return;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: false,
      dpr: cappedDpr(),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Vec3(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: hoverIntensity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize(): void {
      if (!container) return;
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      // OGL multiplies by the renderer dpr (capped above) internally.
      renderer.setSize(width, height);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms.iResolution.value.set(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
      );
    }
    window.addEventListener('resize', resize);
    resize();

    let targetHover = 0;
    let lastTime = 0;
    let currentRot = 0;
    const rotationSpeed = 0.3;

    const handleMouseMove = (e: MouseEvent): void => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;
      const size = Math.min(width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const uvX = ((x - centerX) / size) * 2.0;
      const uvY = ((y - centerY) / size) * 2.0;

      if (Math.sqrt(uvX * uvX + uvY * uvY) < 0.8) {
        targetHover = 1;
      } else {
        targetHover = 0;
      }
    };

    const handleMouseLeave = (): void => {
      targetHover = 0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    const visibility = createVisibilityPause(container);
    let rafId = 0;
    let pollId: ReturnType<typeof setTimeout> | undefined;
    const update = (t: number): void => {
      if (!visibility.isVisible()) {
        // Offscreen / tab hidden: poll instead of rendering at 60fps.
        pollId = setTimeout(() => {
          pollId = undefined;
          rafId = requestAnimationFrame(update);
        }, HIDDEN_POLL_MS);
        return;
      }
      rafId = requestAnimationFrame(update);
      const dt = (t - lastTime) * 0.001;
      lastTime = t;
      program.uniforms.iTime.value = t * 0.001;
      program.uniforms.hue.value = hueRef.current;
      program.uniforms.hoverIntensity.value = hoverIntensityRef.current;

      const effectiveHover = forceHoverStateRef.current ? 1 : targetHover;
      program.uniforms.hover.value +=
        (effectiveHover - program.uniforms.hover.value) * 0.1;

      if (rotateOnHoverRef.current && effectiveHover > 0.5) {
        currentRot += dt * rotationSpeed;
      }
      program.uniforms.rot.value = currentRot;

      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      if (pollId !== undefined) clearTimeout(pollId);
      visibility.dispose();
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Single mount: uniforms and hover flags are read live via refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ctnDom };
}
