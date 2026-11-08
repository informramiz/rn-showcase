import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { createMemoryRepositories } from '@/shared/data/memory/repositories';
import { createServices } from '@/shared/services/createAppServices';
import {
  REFRESH_TASK,
  REFRESH_INTERVAL_MINUTES,
  registerBackgroundRefresh,
  runRefreshTask,
} from '../backgroundTask';

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));
jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
  getStatusAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
}));
jest.mock('@/shared/notifications/notifications', () => ({ notifyNewComments: jest.fn() }));

const bg = jest.mocked(BackgroundTask);
const tm = jest.mocked(TaskManager);

describe('background refresh task', () => {
  it('is defined at import time under a stable name', () => {
    expect(tm.defineTask).toHaveBeenCalledWith(REFRESH_TASK, expect.any(Function));
  });

  it('registers once, only where background tasks are available', async () => {
    bg.getStatusAsync.mockResolvedValue(BackgroundTask.BackgroundTaskStatus.Restricted);
    await expect(registerBackgroundRefresh()).resolves.toBe(false);

    bg.getStatusAsync.mockResolvedValue(BackgroundTask.BackgroundTaskStatus.Available);
    tm.isTaskRegisteredAsync.mockResolvedValue(false);
    await expect(registerBackgroundRefresh()).resolves.toBe(true);
    expect(bg.registerTaskAsync).toHaveBeenCalledWith(REFRESH_TASK, {
      minimumInterval: REFRESH_INTERVAL_MINUTES,
    });

    bg.registerTaskAsync.mockClear();
    tm.isTaskRegisteredAsync.mockResolvedValue(true);
    await registerBackgroundRefresh();
    expect(bg.registerTaskAsync).not.toHaveBeenCalled();
  });

  it('reports success or failure to the OS', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    const services = createServices(createMemoryRepositories(), { schedule: () => () => undefined });
    await expect(runRefreshTask(() => Promise.resolve(services))).resolves.toBe(1);
    await expect(runRefreshTask(() => Promise.reject(new Error('db locked')))).resolves.toBe(2);
    warn.mockRestore();
  });
});
