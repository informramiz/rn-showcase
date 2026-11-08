import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { getAlertPermission, requestAlertPermission } from '@/shared/notifications/notifications';
import { newTestClient, newTestServices, renderWithClient } from '../../../__tests__/helpers';

jest.mock('@/shared/notifications/notifications', () => ({
  getAlertPermission: jest.fn(),
  requestAlertPermission: jest.fn(),
}));

const get = jest.mocked(getAlertPermission);
const request = jest.mocked(requestAlertPermission);
const render = () => renderWithClient(<SettingsScreen />, newTestClient(), newTestServices());

describe('Settings comment alerts', () => {
  it('asks for permission and shows the result', async () => {
    get.mockResolvedValue('undetermined');
    request.mockResolvedValue('granted');
    await render();
    await fireEvent.press(await screen.findByTestId('alerts-enable'));
    expect(request).toHaveBeenCalled();
    expect(await screen.findByText('On')).toBeTruthy();
    expect(screen.queryByTestId('alerts-enable')).toBeNull();
  });

  it('sends a denied user to the system settings', async () => {
    get.mockResolvedValue('denied');
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render();
    await fireEvent.press(await screen.findByTestId('alerts-settings'));
    expect(open).toHaveBeenCalled();
  });
});
