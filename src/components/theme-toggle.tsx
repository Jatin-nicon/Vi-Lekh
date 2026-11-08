"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage or default to light
    const saved = localStorage.getItem("vilekh-theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("vilekh-theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("vilekh-theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Cozy Linen (Light Mode)" : "Switch to Dark Peat"}
      className="px-2.5 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors flex items-center gap-1.5 text-xs font-medium"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-[#C4785E]" />
          <span className="hidden sm:inline">Cozy Linen</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#757069]" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
