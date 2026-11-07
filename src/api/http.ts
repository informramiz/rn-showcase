import { ApiError } from './errors';

export const BASE_URL = 'https://hacker-news.firebaseio.com/v0';
export const DEFAULT_TIMEOUT_MS = 10_000;

interface GetJsonOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * GET a JSON document with a timeout. Every failure is mapped to an ApiError
 * so callers never have to inspect raw fetch errors.
 */
export async function getJson<T>(path: string, options: GetJsonOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;
  const controller = new AbortController();
  const state = { timedOut: false };
  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!res.ok) {
      throw new ApiError('http', `HTTP ${res.status} for ${path}`, res.status);
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError('parse', `Invalid JSON for ${path}`);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (state.timedOut) throw new ApiError('timeout', `Timed out after ${timeoutMs}ms: ${path}`);
    if (signal?.aborted) throw e;
    throw new ApiError('network', e instanceof Error ? e.message : 'Network request failed');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
