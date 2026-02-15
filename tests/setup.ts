import { vi } from 'vitest';

// Mock crypto.getRandomValues for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  const nodeCrypto = await import('crypto');
  globalThis.crypto = {
    getRandomValues: (array: Uint8Array) => {
      return nodeCrypto.randomFillSync(array);
    },
    randomUUID: () => nodeCrypto.randomUUID(),
    subtle: {} as SubtleCrypto
  } as Crypto;
}

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockDate = (date: string | Date) => {
  const mockNow = new Date(date).getTime();
  vi.spyOn(Date, 'now').mockReturnValue(mockNow);
  return () => vi.restoreAllMocks();
};
