import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react'; // Using lucide-react icons

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 fixed top-4 right-4 z-50"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{
        // Ensuring visibility against potentially varied backgrounds from plasma
        backgroundColor: theme === 'dark' ? 'rgba(50, 50, 50, 0.7)' : 'rgba(230, 230, 230, 0.7)',
        color: theme === 'dark' ? '#FFF' : '#000',
        border: theme === 'dark' ? '1px solid rgba(100,100,100,0.5)' : '1px solid rgba(150,150,150,0.5)'
      }}
    >
      {theme === 'dark' ? (
        <Sun size={24} />
      ) : (
        <Moon size={24} />
      )}
    </button>
  );
};

export default ThemeToggleButton;
