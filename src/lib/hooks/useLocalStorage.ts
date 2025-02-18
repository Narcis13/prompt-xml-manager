/**
 * @file useLocalStorage.ts
 * @description A custom hook to manage persisted state in local storage.
 */

import { useState, useEffect } from 'react';

/**
 * Custom React hook that manages a state value in local storage.
 * 
 * @param key The local storage key
 * @param initialValue The initial default value if none is found in local storage
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error('useLocalStorage error reading key', key, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error('useLocalStorage error writing key', key, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}