import { ApiError } from '@/shared/api';
import { createQueryClient, shouldRetry } from '@/shared/query/queryClient';

describe('shouldRetry', () => {
  it('never retries a missing item', () => {
    expect(shouldRetry(0, new ApiError('not_found', 'x'))).toBe(false);
  });

  it('retries other failures twice', () => {
    const err = new ApiError('network', 'x');
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(1, err)).toBe(true);
    expect(shouldRetry(2, err)).toBe(false);
    expect(shouldRetry(0, new Error('plain'))).toBe(true);
  });
});

describe('createQueryClient', () => {
  it('uses the retry policy and runs queries offline so the local cache can answer', () => {
    const queries = createQueryClient().getDefaultOptions().queries;
    expect(queries?.retry).toBe(shouldRetry);
    expect(queries?.networkMode).toBe('offlineFirst');
  });
});
