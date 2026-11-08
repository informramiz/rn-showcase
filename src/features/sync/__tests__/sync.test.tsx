import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { MAX_ATTEMPTS } from '@/shared/sync/outbox';
import { SyncBridge } from '../SyncBridge';
import { newTestClient, newTestServices, renderWithClient } from '../../../__tests__/helpers';

describe('Settings sync section', () => {
  it('shows outbox counts, syncs on demand and retries parked changes', async () => {
    const services = newTestServices();
    const client = newTestClient();
    const note = await services.repos.notes.save({ storyId: 1, body: 'n', tags: [] }, 0);
    await renderWithClient(
      <>
        <SyncBridge />
        <SettingsScreen />
      </>,
      client,
      services,
    );
    expect(await screen.findByText('1 waiting · 0 failed')).toBeTruthy();

    // Flaky until the change is parked.
    await fireEvent(screen.getByTestId('sync-flaky'), 'valueChange', true);
    expect(services.network.isFlaky()).toBe(true);
    const entry = await services.repos.outbox.get(note.id);
    if (entry) await services.repos.outbox.put({ ...entry, attempts: MAX_ATTEMPTS - 1 });
    await fireEvent.press(screen.getByTestId('sync-now'));
    expect(await screen.findByText('0 waiting · 1 failed')).toBeTruthy();

    await fireEvent(screen.getByTestId('sync-flaky'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('sync-retry'));
    expect(await screen.findByText('0 waiting · 0 failed')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('sync-retry')).toBeNull());
  });
});
