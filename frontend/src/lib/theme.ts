import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const KEY = 'kursy:theme';

function detect(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function bootstrapTheme() {
  apply(detect());
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => detect());

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === 'dark',
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    set: setTheme,
  };
}
