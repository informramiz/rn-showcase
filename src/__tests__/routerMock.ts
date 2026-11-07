/** Shared state behind the expo-router mock installed in jest.setup.ts. */
export const routerMock = {
  push: jest.fn(),
  params: {} as Record<string, string>,
};
