import { useCallback, useEffect, useState } from "react";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Synchronise le thème clair/sombre avec la classe `dark` et localStorage.
 * @example const { theme, toggleTheme } = useTheme();
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);
  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, toggleTheme };
}
