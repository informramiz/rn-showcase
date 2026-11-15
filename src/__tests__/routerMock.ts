/** Shared state behind the expo-router mock installed in jest.setup.ts. */
export const routerMock = {
  push: jest.fn(),
  params: {} as Record<string, string>,
  /** Callbacks registered with useFocusEffect; `focus()` re-runs them as if the screen regained focus. */
  focusEffects: new Set<() => void>(),
  focus() {
    for (const effect of this.focusEffects) effect();
  },
};
