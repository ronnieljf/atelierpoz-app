'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  theme: 'dark';
  resolvedTheme: 'dark';
  setTheme: (theme: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyDarkTheme() {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.add('dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Aplicar tema dark al montar
  useEffect(() => {
    applyDarkTheme();
  }, []);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setTheme = (_theme: 'dark' | 'light') => {
    // Por ahora solo soportamos dark theme
    applyDarkTheme();
  };
  
  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
