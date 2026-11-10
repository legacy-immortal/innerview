/**
 * @file Threads background animation — renders animated thread lines via an
 * OGL renderer hook.
 * @module components/animations/Threads
 */

import type { CSSProperties, HTMLAttributes, ReactElement } from 'react';
import { useThreadsRenderer } from './threads/useThreadsRenderer';
import type { ThreadsProps } from './threads/types';

export type { ThreadsProps } from './threads/types';

/** Combined props for the Threads component. */
type ThreadsComponentProps = ThreadsProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'color'>;

/**
 * Renders the threads background animation container.
 * @param props - Thread rendering options and div attributes.
 * @returns The threads container element.
 */
const Threads = ({ ...rest }: ThreadsComponentProps): ReactElement => {
  const { containerRef } = useThreadsRenderer(rest);
  const { style: restStyle, ...restProps } = rest as {
    style?: CSSProperties;
  } & Omit<HTMLAttributes<HTMLDivElement>, 'color'>;
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
