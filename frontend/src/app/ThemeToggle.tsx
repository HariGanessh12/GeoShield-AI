"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("geoshield_theme") === "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", isLight);
  }, [isLight]);

  const toggleTheme = () => {
    if (isLight) {
      document.documentElement.classList.remove("light-mode");
      localStorage.setItem("geoshield_theme", "dark");
      setIsLight(false);
    } else {
      document.documentElement.classList.add("light-mode");
      localStorage.setItem("geoshield_theme", "light");
      setIsLight(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`rounded-full border p-3 shadow-xl transition-transform hover:scale-105 active:scale-95 ${
        isLight
          ? "border-black/10 bg-black/5 text-black hover:bg-black/10"
          : "border-white/15 bg-white/5 text-white hover:bg-white/10"
      }`}
      aria-label="Toggle Theme"
      title="Toggle Light/Dark Theme"
    >
      {isLight ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}
