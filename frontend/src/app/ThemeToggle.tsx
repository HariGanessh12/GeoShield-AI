"use client";
import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('geoshield_theme');
    if (savedTheme === 'light') {
      setIsLight(true);
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('geoshield_theme', 'dark');
      setIsLight(false);
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('geoshield_theme', 'light');
      setIsLight(true);
    }
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <button 
      onClick={toggleTheme}
      className={`fixed bottom-8 right-8 z-9999 p-4 rounded-full shadow-2xl backdrop-blur-xl transition-transform hover:scale-110 active:scale-95 border ${
        isLight ? 'bg-black/10 border-black/20 text-black hover:bg-black/20' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
      }`}
      aria-label="Toggle Theme"
      title="Toggle Light/Dark Theme"
    >
      {isLight ? (
         // Dark mode icon (moon) - to switch back to dark
         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
         </svg>
      ) : (
         // Light mode icon (sun) - to switch to light
         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
         </svg>
      )}
    </button>
  );
}
