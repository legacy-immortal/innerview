/**
 * @file useTerminalWelcome.ts — Hook showing the welcome banner once per terminal session.
 * @module components/chat/terminal/useTerminalWelcome
 *
 * Hook showing the welcome banner once per terminal session. Pushes the Ubuntu-style banner
 * via the terminal ref exactly once (avoiding the library's double-fire under Strict Mode) and
 * resets the flag when leaving filesystem mode. Consumed by `TerminalChat`.
 */

import { useEffect } from 'react';
import type Terminal from 'react-console-emulator';
import type { RefObject } from 'react';
import {
  globalWelcomeShown,
  resetWelcomeIfLeavingFilesystem,
  setGlobalWelcomeShown,
} from './terminalSystemInfo';
import type { TerminalMode } from './terminalTypes';

/**
 * Hook showing the welcome banner once per terminal session.
 *
 * @param mode - Current terminal mode.
 * @param systemInfo - Banner text to push once.
 * @param terminalRef - Terminal emulator ref.
 */
export const useTerminalWelcome = (
  mode: TerminalMode,
  systemInfo: string,
  terminalRef: RefObject<InstanceType<typeof Terminal> | null>
): void => {
  useEffect(() => {
    resetWelcomeIfLeavingFilesystem(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'filesystem' || globalWelcomeShown) return;
    const rafId = requestAnimationFrame(() => {
      if (terminalRef.current && !globalWelcomeShown) {
        terminalRef.current.pushToStdout(systemInfo);
        setGlobalWelcomeShown(true);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [mode, systemInfo, terminalRef]);
};
