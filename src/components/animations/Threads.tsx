import React from 'react';
import { useThreadsRenderer } from './threads/useThreadsRenderer';
import type { ThreadsProps } from './threads/types';

export type { ThreadsProps } from './threads/types';

const Threads: React.FC<
  ThreadsProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>
> = ({ ...rest }) => {
  const { containerRef } = useThreadsRenderer(rest);
  const { style: restStyle, ...restProps } = rest as {
    style?: React.CSSProperties;
  } & Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>;
  return (
    <div
      ref={containerRef}
      className="threads-container"
      {...restProps}
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
        ...restStyle,
        touchAction: 'none',
      }}
    />
  );
};

export default Threads;
