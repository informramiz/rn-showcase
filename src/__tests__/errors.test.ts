import { ApiError, describeError } from '../api';
import { strings } from '../i18n/strings';

describe('describeError', () => {
  it.each(['network', 'timeout', 'parse', 'not_found'] as const)('classifies a %s error', (kind) => {
    expect(describeError(new ApiError(kind, 'x'))).toEqual({ kind, status: undefined });
  });

  it('keeps the status of an http error', () => {
    expect(describeError(new ApiError('http', 'x', 503))).toEqual({ kind: 'http', status: 503 });
  });

  it('classifies anything else as unknown', () => {
    expect(describeError(new Error('boom'))).toEqual({ kind: 'unknown' });
    expect(describeError('nope')).toEqual({ kind: 'unknown' });
  });
});

describe('error strings', () => {
  it('words an http error with or without a status', () => {
    expect(strings.error.http(503)).toBe('The server returned an error (503).');
    expect(strings.error.http(undefined)).toBe('The server returned an error (unknown).');
  });
});
