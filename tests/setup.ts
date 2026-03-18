import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock navigator.onLine
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    onLine: true
  }
});

// Mock IndexedDB
global.indexedDB = {} as any;