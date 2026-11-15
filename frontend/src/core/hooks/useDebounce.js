import { useEffect, useState } from "react";

/**
 * Retarde la mise à jour de la valeur renvoyée.
 * @example const debouncedSearch = useDebounce(search, 300);
 */
export function useDebounce(value, delay = 300) {
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError("Le délai doit être un nombre positif ou nul.");
  }

  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}
