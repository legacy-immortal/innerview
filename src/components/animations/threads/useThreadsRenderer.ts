import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { createVisibilityPause, HIDDEN_POLL_MS } from '../perf';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';
import type { ThreadsProps } from './types';

/**
 * @file Threads renderer hook — manages the OGL renderer, program,
 * mouse-follow smoothing, and animation loop for the threads animation.
 */

/** Refs returned by {@link useThreadsRenderer}. */
export interface UseThreadsRendererResult {
  readonly containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Create and drive the OGL threads field for the given props.
 * @param props - Threads behavior props (color, amplitude, distance).
 * @returns The container ref to bind to the host element.
 */
export function useThreadsRenderer({
  color = [1, 1, 1],
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = false,
}: ThreadsProps): UseThreadsRendererResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // OGL dpr defaults to 1 here: the shader's iResolution is in CSS
    // pixels, so upscaling the canvas would distort the line field.
    // Resolution scaling is handled by the reduced line count instead.
    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.maxWidth = '100%';
    gl.canvas.style.maxHeight = '100%';
    gl.canvas.style.display = 'block';
    gl.canvas.style.touchAction = 'none';
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uColor: { value: new Color(...color) },
        uAmplitude: { value: amplitude },
        uDistance: { value: distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize(): void {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      program.uniforms.iResolution.value.r = clientWidth;
      program.uniforms.iResolution.value.g = clientHeight;
      program.uniforms.iResolution.value.b = clientWidth / clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    let currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];

    function handleMouseMove(e: MouseEvent): void {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouse = [x, y];
    }
    function handleMouseLeave(): void {
      targetMouse = [0.5, 0.5];
    }
    if (enableMouseInteraction) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    const visibility = createVisibilityPause(container);
    let pollId: ReturnType<typeof setTimeout> | undefined;

    function update(t: number): void {
      if (!visibility.isVisible()) {
        // Offscreen / tab hidden: poll instead of rendering at 60fps.
        pollId = setTimeout(() => {
          pollId = undefined;
          animationFrameId.current = requestAnimationFrame(update);
        }, HIDDEN_POLL_MS);
        return;
      }
      if (enableMouseInteraction) {
        const smoothing = 0.05;
        currentMouse[0] += smoothing * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += smoothing * (targetMouse[1] - currentMouse[1]);
        program.uniforms.uMouse.value[0] = currentMouse[0];
        program.uniforms.uMouse.value[1] = currentMouse[1];
      } else {
        program.uniforms.uMouse.value[0] = 0.5;
        program.uniforms.uMouse.value[1] = 0.5;
      }
      program.uniforms.iTime.value = t * 0.001;

      renderer.render({ scene: mesh });
      animationFrameId.current = requestAnimationFrame(update);
    }
    animationFrameId.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
      if (pollId !== undefined) clearTimeout(pollId);
      visibility.dispose();
      window.removeEventListener('resize', resize);

      if (enableMouseInteraction) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [color, amplitude, distance, enableMouseInteraction]);

  return { containerRef };
}
