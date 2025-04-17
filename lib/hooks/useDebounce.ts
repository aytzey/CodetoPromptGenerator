// lib/hooks/useDebounce.ts
import { useEffect, useState } from "react";

/**
 * Debounce any primitive or serialisable value.
 * Returns the debounced value that only updates
 * after `delay` ms of no changes.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
