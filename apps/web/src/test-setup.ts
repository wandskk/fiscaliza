import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Pages are lazy chunks and Radix mounts after a frame: on a loaded machine (the whole monorepo
// running its tests at once) the default 1 s of findBy/waitFor is not enough
configure({ asyncUtilTimeout: 5000 });

// jsdom does not implement matchMedia — stub it so ThemeProvider tests work
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList,
});
