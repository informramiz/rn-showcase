import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBootServices } from '@/shared/services/useBootServices';
import { newTestServices } from '../../__tests__/helpers';

describe('useBootServices', () => {
  it('goes from loading to ready', async () => {
    const services = newTestServices();
    const create = () => Promise.resolve(services);
    const { result } = await renderHook(() => useBootServices(create));
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current).toMatchObject({ services });
  });

  it('reports a failure and retries', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const services = newTestServices();
    const create = jest.fn().mockRejectedValueOnce(new Error('locked')).mockResolvedValueOnce(services);
    const { result } = await renderHook(() => useBootServices(create));
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    await act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(create).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
