import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark theme

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      // Optional: Add/remove class on body for global CSS targeting
      document.body.classList.remove(prevTheme);
      document.body.classList.add(newTheme);
      return newTheme;
    });
  }, []);
  
  // Set initial class on body
  useEffect(() => {
    document.body.classList.add(theme);
    return () => {
        document.body.classList.remove(theme); // Clean up on unmount if provider is ever unmounted
    }
  }, [theme]);


  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
