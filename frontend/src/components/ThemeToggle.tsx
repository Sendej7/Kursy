import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="btn-ghost !p-2 rounded-lg"
      aria-label={isDark ? 'Tryb jasny' : 'Tryb ciemny'}
      title={isDark ? 'Tryb jasny' : 'Tryb ciemny'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
