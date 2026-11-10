/**
 * @file Orb background animation — renders an interactive WebGL orb using an
 * OGL-based renderer hook.
 * @module components/animations/Orb
 */

import type { ReactElement } from 'react';
import { Box } from '@chakra-ui/react';
import { useOrbRenderer } from './orb/useOrbRenderer';
import type { OrbProps } from './orb/types';

export type { OrbProps } from './orb/types';

/**
 * Renders the orb background animation container.
 * @param props - Orb rendering options.
 * @returns The orb container element.
 */
export default function Orb(props: OrbProps): ReactElement {
  const { ctnDom } = useOrbRenderer(props);
  return (
    <Box
      ref={ctnDom}
      as="div"
      className="orb-container"
      position="absolute"
      top={0}
      left={0}
      width="100vw"
      height="100dvh"
      maxWidth="100%"
      maxHeight="100%"
      minWidth={0}
      minHeight={0}
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSizing="border-box"
      style={{ touchAction: 'none' }}
      css={{
        '& > canvas': {
          width: '100% !important',
          height: '100% !important',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          touchAction: 'none',
        },
      }}
    />
  );
}
