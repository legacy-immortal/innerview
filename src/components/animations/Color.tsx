import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { createVisibilityPause, HIDDEN_POLL_MS } from './perf';

/**
 * @file Color.tsx — canvas-filled background (flat color or gradient) with
 * an optional animated scanline overlay.
 * @module components/animations/Color
 *
 * Renders a full-screen color or gradient background on a 2D canvas, with an
 * optional horizontally-scrolling scanline effect. Consumed by
 * `BackgroundSwitcher` for the `color` background type. The canvas pauses
 * when offscreen or the tab is hidden.
 */

/** Settings describing the color background. */
export interface ColorBackgroundSettings {
  /** Solid fill color (CSS color string). */
  readonly color?: string;
  /** Whether to render a gradient instead of a solid color. */
  readonly gradientEnabled?: boolean;
  /** Gradient second color (CSS color string). */
  readonly gradientColor?: string;
  /** Gradient direction. */
  readonly gradientDirection?:
    'horizontal' | 'vertical' | 'diagonal' | 'radial';
  /** Whether to draw the animated scanline overlay. */
  readonly scanlineEnabled?: boolean;
  /** Scanline opacity in [0, 1]. */
  readonly scanlineOpacity?: number;
  /** Scanline animation speed (px per frame). */
  readonly scanlineSpeed?: number;
  /** Scanline color (CSS color string). */
  readonly scanlineColor?: string;
}

/** Props for the color background. */
interface ColorProps {
  readonly settings: ColorBackgroundSettings;
}

/**
 * Render the color background canvas.
 * @param props - Background color settings.
 * @returns The background element.
 */
export function Color({ settings }: ColorProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const scanlineOffsetRef = useRef(0);

  const {
    color = '#000000',
    gradientEnabled = false,
    gradientColor = '#ffffff',
    gradientDirection = 'vertical',
    scanlineEnabled = false,
    scanlineOpacity = 0.1,
    scanlineSpeed = 1,
    scanlineColor = '#ffffff',
  } = settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Redraw after resize for static backgrounds
      if (!scanlineEnabled) {
        drawStatic();
      }
    };

    // Cache the background gradient: it only depends on dimensions and
    // settings, not on the scanline offset, so rebuilding it every frame
    // was wasted work.
    let cachedGradient: CanvasGradient | null = null;
    let cachedGradientKey = '';

    const fillBackground = (): void => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (gradientEnabled) {
        const gradientKey = `${gradientDirection}:${width}x${height}:${color}:${gradientColor}`;
        if (!cachedGradient || cachedGradientKey !== gradientKey) {
          let gradient: CanvasGradient;
          switch (gradientDirection) {
            case 'horizontal':
              gradient = ctx.createLinearGradient(0, 0, width, 0);
              break;
            case 'vertical':
              gradient = ctx.createLinearGradient(0, 0, 0, height);
              break;
            case 'diagonal':
              gradient = ctx.createLinearGradient(0, 0, width, height);
              break;
            case 'radial':
              gradient = ctx.createRadialGradient(
                width / 2,
                height / 2,
                0,
                width / 2,
                height / 2,
                Math.max(width, height) / 2
              );
              break;
            default:
              gradient = ctx.createLinearGradient(0, 0, 0, height);
          }
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, gradientColor);
          cachedGradient = gradient;
          cachedGradientKey = gradientKey;
        }
        ctx.fillStyle = cachedGradient;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(0, 0, width, height);
    };

    // Draws the static background (color or gradient) without scanlines
    const drawStatic = (): void => {
      fillBackground();
    };

    const visibility = createVisibilityPause(canvas);
    let pollId: ReturnType<typeof setTimeout> | undefined;

    // Animated draw with scanlines
    const drawAnimated = (): void => {
      if (!visibility.isVisible()) {
        // Offscreen / tab hidden: poll instead of redrawing at 60fps.
        pollId = setTimeout(() => {
          pollId = undefined;
          drawAnimated();
        }, HIDDEN_POLL_MS);
        return;
      }
      const width = canvas.width;
      const height = canvas.height;

      // Draw background
      fillBackground();

      // Draw scanlines as a single batched path (one stroke call).
      const lineHeight = 2;
      const lineSpacing = 4;
      const totalLines = Math.ceil(height / lineSpacing) + 1;

      ctx.strokeStyle = scanlineColor;
      ctx.lineWidth = lineHeight;
      ctx.globalAlpha = scanlineOpacity;

      const offset = scanlineOffsetRef.current % lineSpacing;

      ctx.beginPath();
      for (let i = -1; i < totalLines; i++) {
        const y = i * lineSpacing + offset;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      ctx.globalAlpha = 1;
      scanlineOffsetRef.current += scanlineSpeed * 0.5;

      animationRef.current = requestAnimationFrame(drawAnimated);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Only run animation loop if scanlines are enabled, otherwise draw once
    if (scanlineEnabled) {
      drawAnimated();
    } else {
      drawStatic();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (pollId !== undefined) clearTimeout(pollId);
      visibility.dispose();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    color,
    gradientEnabled,
    gradientColor,
    gradientDirection,
    scanlineEnabled,
    scanlineOpacity,
    scanlineSpeed,
    scanlineColor,
  ]);

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      zIndex={0}
      pointerEvents="none"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
}
