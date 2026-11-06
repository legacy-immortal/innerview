import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

export interface ColorBackgroundSettings {
  color?: string;
  gradientEnabled?: boolean;
  gradientColor?: string;
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal' | 'radial';
  scanlineEnabled?: boolean;
  scanlineOpacity?: number;
  scanlineSpeed?: number;
  scanlineColor?: string;
}

interface ColorProps {
  settings: ColorBackgroundSettings;
}

export const Color = ({ settings }: ColorProps) => {
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

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Redraw after resize for static backgrounds
      if (!scanlineEnabled) {
        drawStatic();
      }
    };

    // Draws the static background (color or gradient) without scanlines
    const drawStatic = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (gradientEnabled) {
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
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(0, 0, width, height);
    };

    // Animated draw with scanlines
    const drawAnimated = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw background
      if (gradientEnabled) {
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
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(0, 0, width, height);

      // Draw scanlines
      const lineHeight = 2;
      const lineSpacing = 4;
      const totalLines = Math.ceil(height / lineSpacing) + 1;

      ctx.strokeStyle = scanlineColor;
      ctx.lineWidth = lineHeight;
      ctx.globalAlpha = scanlineOpacity;

      const offset = scanlineOffsetRef.current % lineSpacing;

      for (let i = -1; i < totalLines; i++) {
        const y = i * lineSpacing + offset;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

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
};
