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

export function describeError(e: unknown): string {
  if (!isApiError(e)) return 'Something went wrong.';
  switch (e.kind) {
    case 'network':
      return 'No connection. Check your network and try again.';
    case 'timeout':
      return 'The request timed out. Try again.';
    case 'http':
      return `The server returned an error (${e.status ?? 'unknown'}).`;
    case 'not_found':
      return 'This item no longer exists.';
    case 'parse':
      return 'The server sent an unexpected response.';
  }
}
