/**
 * Design token values exported for tests (contrast, CSS presence checks).
 * The CSS counterpart lives in tokens.css — both files must stay in sync.
 */
export const tokens = {
  light: {
    bg: '#f5f7fa',
    surface: '#ffffff',
    border: '#dce2ea',
    text: '#18212f',
    textMuted: '#5a6577',
    primary: '#2152b8',
    primaryFg: '#ffffff',
    success: '#1e7a4c',
    warning: '#9e5e00',
    danger: '#b3261e',
    info: '#5a6577',
  },
  dark: {
    bg: '#0f1520',
    surface: '#161e2c',
    border: '#273246',
    text: '#e4e9f1',
    textMuted: '#97a3b6',
    primary: '#7fa6f5',
    primaryFg: '#0f1520',
    success: '#6fd19e',
    warning: '#f0b467',
    danger: '#f08a8f',
    info: '#97a3b6',
  },
} as const;

export type ThemeTokens = (typeof tokens)['light'];
