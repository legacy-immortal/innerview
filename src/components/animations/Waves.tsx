/**
 * @file Waves background animation — renders animated canvas waves via the
 * `useWaves` hook.
 * @module components/animations/Waves
 */

import type { ReactElement } from 'react';
import { useWaves } from './waves/useWaves';
import type { WavesProps } from './waves/types';

export type { WavesProps } from './waves/types';

/**
 * Renders the waves background animation.
 * @param props - Wave rendering options.
 * @returns The waves container element.
 */
const Waves = (props: WavesProps): ReactElement => {
  const { containerRef, canvasRef } = useWaves(props);
  const { backgroundColor = 'transparent', style = {}, className = '' } = props;
  return (
    <div
      ref={containerRef}
      className={`waves ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        width: '100vw',
        height: '100dvh',
        maxWidth: '100%',
        maxHeight: '100%',
        minWidth: 0,
        minHeight: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        ...style,
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        className="waves-canvas"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />
    </div>
  );
};

export default Waves;
