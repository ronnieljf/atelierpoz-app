'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/store/theme-store';

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 transition-opacity hover:opacity-60"
      title={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
      ) : (
        <Moon className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
      )}
    </button>
  );
}
