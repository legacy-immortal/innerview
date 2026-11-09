'use client';

import type { IconButtonProps, SpanProps } from '@chakra-ui/react';
import { ClientOnly, IconButton, Skeleton, Span } from '@chakra-ui/react';
import * as React from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';

type ThemeName = 'light' | 'dark';

export interface ColorModeProviderProps {
  attribute?: string | string[];
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
  forcedTheme?: string;
  disableTransitionOnChange?: boolean;
  themes?: string[];
  nonce?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface ThemeContextValue {
  theme: string;
  resolvedTheme: ThemeName;
  setTheme: (theme: string | ((prev: string) => string)) => void;
  forcedTheme?: string;
  themes: string[];
  systemTheme?: ThemeName;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

function getSystemTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(theme: string, enableSystem: boolean): ThemeName {
  if (theme === 'system' && enableSystem) return getSystemTheme();
  return theme === 'light' ? 'light' : 'dark';
}

function applyTheme(
  resolved: ThemeName,
  attribute: string | string[],
  disableTransition: boolean
): void {
  if (typeof document === 'undefined') return;
  let restore: (() => void) | null = null;
  if (disableTransition) {
    const style = document.createElement('style');
    style.appendChild(
      document.createTextNode(
        '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
      )
    );
    document.head.appendChild(style);
    restore = () => {
      window.getComputedStyle(document.body);
      window.setTimeout(() => style.remove(), 1);
    };
  }
  const attrs = Array.isArray(attribute) ? attribute : [attribute];
  for (const attr of attrs) {
    if (attr === 'class') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    } else if (attr) {
      document.documentElement.setAttribute(attr, resolved);
    }
  }
  document.documentElement.style.colorScheme = resolved;
  restore?.();
}

function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: () => undefined,
      themes: ['light', 'dark'],
    };
  }
  return ctx;
}

export function ColorModeProvider({
  attribute = 'class',
  defaultTheme = 'dark',
  enableSystem = true,
  storageKey = 'theme',
  forcedTheme,
  disableTransitionOnChange = false,
  themes = ['light', 'dark'],
  children,
}: ColorModeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });
  const [systemTheme, setSystemTheme] =
    React.useState<ThemeName>(getSystemTheme);

  const resolvedTheme = React.useMemo(
    () =>
      forcedTheme
        ? resolveTheme(forcedTheme, enableSystem)
        : resolveTheme(theme, enableSystem),
    [forcedTheme, theme, enableSystem]
  );

  React.useEffect(() => {
    applyTheme(resolvedTheme, attribute, disableTransitionOnChange);
  }, [resolvedTheme, attribute, disableTransitionOnChange]);

  React.useEffect(() => {
    if (!enableSystem) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemTheme(mq.matches ? 'dark' : 'light');
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [enableSystem]);

  const setTheme = React.useCallback(
    (next: string | ((prev: string) => string)) => {
      setThemeState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        try {
          localStorage.setItem(storageKey, value);
        } catch {
          // ignore
        }
        return value;
      });
    },
    [storageKey]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      forcedTheme,
      themes: enableSystem ? [...themes, 'system'] : themes,
      systemTheme: enableSystem ? systemTheme : undefined,
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
      forcedTheme,
      themes,
      enableSystem,
      systemTheme,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export type ColorMode = 'light' | 'dark';

export interface UseColorModeReturn {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
}

function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme } = useTheme();
  const toggleColorMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  return {
    colorMode: resolvedTheme as ColorMode,
    setColorMode: setTheme,
    toggleColorMode,
  };
}

// (useColorModeValue removed: unused; re-add if needed)

export function ColorModeIcon() {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? <LuMoon /> : <LuSun />;
}

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>;

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  ColorModeButtonProps
>(function ColorModeButton(props, ref) {
  const { toggleColorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
      >
        <ColorModeIcon />
      </IconButton>
    </ClientOnly>
  );
});

export const LightMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function LightMode(props, ref) {
    return (
      <Span
        color="fg"
        display="contents"
        className="chakra-theme light"
        colorPalette="gray"
        colorScheme="light"
        ref={ref}
        {...props}
      />
    );
  }
);

export const DarkMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function DarkMode(props, ref) {
    return (
      <Span
        color="fg"
        display="contents"
        className="chakra-theme dark"
        colorPalette="gray"
        colorScheme="dark"
        ref={ref}
        {...props}
      />
    );
  }
);
