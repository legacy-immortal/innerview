/**
 * useTerminalWelcome.ts — Hook showing the welcome banner once per terminal session.
 *
 * @module components/chat/terminal/useTerminalWelcom
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
 * Push system info ourselves so it shows exactly once (library's welcomeMessage runs in
 * componentDidMount and fires twice under Strict Mode; we avoid it and push via ref)
 * Also tracks mode changes to reset welcome message flag when switching modes.
 */
export const useTerminalWelcome = (
  mode: TerminalMode,
  systemInfo: string,
  terminalRef: RefObject<InstanceType<typeof Terminal> | null>
) => {
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
