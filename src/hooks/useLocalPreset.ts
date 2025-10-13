import { useEffect, useState } from "react";

/**
 * Persist a preset-like object in localStorage and keep React state in sync.
 * Falls back to the provided initial value when localStorage is unavailable.
 */
export function useLocalPreset<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore JSON/storage errors and fall back to the initial value below.
    }
    return initial;
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Non-fatal – just skip persistence when storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue];
}