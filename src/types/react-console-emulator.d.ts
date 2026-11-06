declare module 'react-console-emulator' {
  import { Component } from 'react';

  interface Command {
    description: string;
    usage?: string;
    fn: (...args: string[]) => string | Promise<string>;
    explicitExec?: boolean;
  }

  interface CommandData {
    command: string;
    args: string[];
    rawInput: string;
    result: unknown;
  }

  interface TerminalProps {
    commands?: Record<string, Command>;
    welcomeMessage?: string | boolean | string[];
    promptLabel?: string;
    autoFocus?: boolean;
    noHistory?: boolean;
    noEchoBack?: boolean;
    noAutoScroll?: boolean;
    commandCallback?: (commandData: CommandData) => void;
    errorText?: string;
    ignoreCommandCase?: boolean;
    noDefaults?: boolean;
    locked?: boolean;
    disabled?: boolean;
    disableOnProcess?: boolean;
    dangerMode?: boolean;
    messageClassName?: string;
    messageStyle?: React.CSSProperties;
    className?: string;
    contentClassName?: string;
    inputAreaClassName?: string;
    promptLabelClassName?: string;
    inputClassName?: string;
    style?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    inputAreaStyle?: React.CSSProperties;
    promptLabelStyle?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
    inputTextStyle?: React.CSSProperties;
    noNewlineParsing?: boolean;
  }

  export default class Terminal extends Component<TerminalProps> {
    focusTerminal: () => void;
    scrollToBottom: () => void;
    pushToStdout: (
      message: string,
      options?: { isEcho?: boolean; rawInput?: string }
    ) => void;
    clearStdout: () => void;
    clearInput: () => void;
  }
}
