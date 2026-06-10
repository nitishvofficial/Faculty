/**
 * storageService.ts — AM_Faculty
 *
 * Thin MMKV wrapper for local caching.
 * Identical to Student_BLE/src/services/storageService.ts
 */
import {MMKV} from 'react-native-mmkv';

const storageInstance = new MMKV();

export const storageService = {
  setObject: (key: string, value: any) => {
    try {
      storageInstance.set(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[Storage] Error saving ${key}:`, e);
    }
  },

  getObject: (key: string): any | null => {
    try {
      const data = storageInstance.getString(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`[Storage] Error reading ${key}:`, e);
      return null;
    }
  },

  setString: (key: string, value: string) => {
    storageInstance.set(key, value);
  },

  getString: (key: string): string | null => {
    return storageInstance.getString(key) ?? null;
  },

  clearAll: () => {
    storageInstance.clearAll();
  },
};
