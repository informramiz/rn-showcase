/** Web: browsers give no periodic background execution here, so this is a no-op. */
export const REFRESH_TASK = 'hn-background-refresh';

export function registerBackgroundRefresh(): Promise<boolean> {
  return Promise.resolve(false);
}
