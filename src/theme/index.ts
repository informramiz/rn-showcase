import { useColorScheme } from 'react-native';
import { useSettings, type ThemeMode } from '../store/settings';

export interface Colors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  danger: string;
  skeleton: string;
  banner: string;
}

export const lightColors: Colors = {
  background: '#f6f6ef',
  surface: '#ffffff',
  text: '#1c1c1e',
  textMuted: '#6b6b70',
  border: '#e2e2dc',
  accent: '#d9480f',
  danger: '#c92a2a',
  skeleton: '#e4e4dd',
  banner: '#495057',
};

export const darkColors: Colors = {
  background: '#101012',
  surface: '#1b1b1f',
  text: '#f2f2f3',
  textMuted: '#9a9aa2',
  border: '#2c2c31',
  accent: '#ff8a4c',
  danger: '#ff6b6b',
  skeleton: '#2a2a2f',
  banner: '#495057',
};

export function resolveScheme(mode: ThemeMode, system: 'light' | 'dark' | null | undefined) {
  if (mode === 'system') return system === 'dark' ? 'dark' : 'light';
  return mode;
}

export function useTheme() {
  const system = useColorScheme();
  const mode = useSettings((s) => s.themeMode);
  const scheme = resolveScheme(mode, system);
  return { scheme, colors: scheme === 'dark' ? darkColors : lightColors };
}
