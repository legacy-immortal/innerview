/**
 * Server logger with level-based formatting and colors for debugging.
 * Use %s for interpolation; no emojis in output.
 */

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
} as const;

const LEVEL_STYLE: Record<string, string> = {
  debug: COLORS.dim,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
};

function formatMessage(
  level: string,
  tag: string,
  template: string,
  args: unknown[]
): string {
  let msg = template;
  for (const a of args) {
    msg = msg.replace(/%s/, String(a ?? ''));
  }
  const style = LEVEL_STYLE[level] ?? COLORS.reset;
  const levelStr = level.toUpperCase().padEnd(5);
  const timestamp = new Date().toISOString();
  return `${COLORS.dim}${timestamp}${COLORS.reset} ${style}[${levelStr}]${COLORS.reset} ${COLORS.magenta}[${tag}]${COLORS.reset} ${msg}`;
}

function createLogger(tag: string) {
  return {
    debug(template: string, ...args: unknown[]): void {
      if (process.env.NODE_ENV === 'production') return;
      process.stdout.write(formatMessage('debug', tag, template, args) + '\n');
    },
    info(template: string, ...args: unknown[]): void {
      process.stdout.write(formatMessage('info', tag, template, args) + '\n');
    },
    warn(template: string, ...args: unknown[]): void {
      process.stderr.write(formatMessage('warn', tag, template, args) + '\n');
    },
    error(template: string, ...args: unknown[]): void {
      process.stderr.write(formatMessage('error', tag, template, args) + '\n');
    },
  };
}

const logAgent = createLogger('agent');
const logChat = createLogger('chat');

export { createLogger, logAgent, logChat };
