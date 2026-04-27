import { MAX_RETRIES, RETRY_DELAY } from "../constants/index.js";

// -------------------------------------------------------------------------
// Rate Limiter & Retry Utility
// -------------------------------------------------------------------------

export class RateLimiter {
  private queue: Array<() => void> = [];
  private activeRequests = 0;

  constructor(
    private readonly maxConcurrent: number = 3,
    private readonly minDelayMs: number = 200
  ) {}

  async acquire(): Promise<void> {
    if (this.activeRequests < this.maxConcurrent) {
      this.activeRequests++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.activeRequests++;
  }

  release(): void {
    this.activeRequests--;
    const next = this.queue.shift();
    if (next) {
      setTimeout(next, this.minDelayMs);
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

export const globalLimiter = new RateLimiter(3, 300);

/**
 * Retries a function with exponential backoff on failure.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(delay * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
