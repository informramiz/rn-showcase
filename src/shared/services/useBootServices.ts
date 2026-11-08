import { useCallback, useEffect, useState } from 'react';
import type { AppServices } from './AppServices';

export type BootState =
  { status: 'loading' } | { status: 'ready'; services: AppServices } | { status: 'error'; error: unknown };

/** Run the async composition root once, with a retry for the error screen. */
export function useBootServices(create: () => Promise<AppServices>): BootState & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BootState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    create().then(
      (services) => {
        if (!cancelled) setState({ status: 'ready', services });
      },
      (error: unknown) => {
        console.error('Failed to open local store', error);
        if (!cancelled) setState({ status: 'error', error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [create, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { ...state, retry };
}
