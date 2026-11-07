export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'not_found';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export interface ErrorInfo {
  kind: ApiErrorKind | 'unknown';
  status?: number;
}

/** Classify any thrown value. The UI decides how to word each kind. */
export function describeError(e: unknown): ErrorInfo {
  if (!isApiError(e)) return { kind: 'unknown' };
  return { kind: e.kind, status: e.status };
}
