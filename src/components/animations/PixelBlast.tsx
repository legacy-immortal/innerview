/**
 * @file Pixel blast background animation — renders an interactive pixel/shader
 * background via the pixel-blast renderer hook.
 * @module components/animations/PixelBlast
 */

import type { ReactElement } from 'react';
import { usePixelBlastRenderer } from './pixel-blast/usePixelBlastRenderer';
import type { PixelBlastProps } from './pixel-blast/types';

export type { PixelBlastProps, PixelBlastVariant } from './pixel-blast/types';

/**
 * Renders the pixel blast interactive background container.
 * @param props - Pixel blast rendering options.
 * @returns The background container element.
 */
const PixelBlast = (props: PixelBlastProps): ReactElement => {
  const { containerRef } = usePixelBlastRenderer(props);
  const { className, style } = props;
  return (
    <div
      ref={containerRef}
      className={`pixel-blast-container ${className ?? ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        maxWidth: '100%',
        maxHeight: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        ...style,
        touchAction: 'none',
      }}
      aria-label="PixelBlast interactive background"
    />
  );
};

export default PixelBlast;
