/**
 * Test Reliability Helpers
 * Utilities to reduce flakiness and improve test consistency
 */

/**
 * Retry wrapper for flaky tests
 */
export function retryTest(
  testFn: () => Promise<void>,
  maxRetries = 2,
): () => Promise<void> {
  return async () => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await testFn();
        return; // Success, exit
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    throw lastError!;
  };
}

/**
 * Deterministic mock dates for consistent testing
 */
export const MOCK_DATES = {
  NOW: new Date("2024-01-15T10:00:00Z"),
  PAST: new Date("2024-01-01T10:00:00Z"),
  FUTURE: new Date("2024-02-01T10:00:00Z"),
} as const;

/**
 * Mock timers setup
 */
export function setupMockTimers() {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATES.NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}

/**
 * Async test wrapper with timeout protection
 */
export function safeAsyncTest(testFn: () => Promise<void>, timeout = 5000) {
  return async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Test timeout after ${timeout}ms`)),
        timeout,
      );
    });

    await Promise.race([testFn(), timeoutPromise]);
  };
}

/**
 * Form data test helper
 */
export function createMockFormData(
  data: Record<string, string | File>,
): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

/**
 * Mock console methods for cleaner test output
 */
export function suppressConsoleWarnings(
  patterns: string[] = [
    "Warning: An update to",
    "Warning: Each child in a list",
    "Warning: React does not recognize",
  ],
) {
  const originalMethods = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  };

  beforeAll(() => {
    patterns.forEach((pattern) => {
      console.error = jest.fn((...args) => {
        const message = args[0]?.toString() || "";
        if (!patterns.some((p) => message.includes(p))) {
          originalMethods.error(...args);
        }
      });
    });
  });

  afterAll(() => {
    Object.assign(console, originalMethods);
  });
}

/**
 * Memory leak detection
 */
export function detectMemoryLeaks() {
  const initialMemory = process.memoryUsage().heapUsed;

  return {
    check: (threshold = 50 * 1024 * 1024) => {
      // 50MB threshold
      if (global.gc) {
        global.gc();
      }
      const currentMemory = process.memoryUsage().heapUsed;
      const diff = currentMemory - initialMemory;

      if (diff > threshold) {
        console.warn(
          `Potential memory leak detected: ${Math.round(diff / 1024 / 1024)}MB increase`,
        );
      }
    },
  };
}

/**
 * Test performance measurement
 */
export function measureTestPerformance(testName: string) {
  let startTime: number;

  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      const duration = performance.now() - startTime;
      if (duration > 1000) {
        // Warn for slow tests
        console.warn(
          `Slow test detected: ${testName} took ${Math.round(duration)}ms`,
        );
      }
      return duration;
    },
  };
}
