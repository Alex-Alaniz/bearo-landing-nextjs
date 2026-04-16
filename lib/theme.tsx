import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration-safe initialization - must run after mount to read localStorage
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = localStorage.getItem('bearo-theme') as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(stored);
    } else {
      // Default to dark
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState('dark');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('bearo-theme', theme);
      document.documentElement.classList.toggle('light', theme === 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};


