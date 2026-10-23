import { createLogger } from '../../src/infrastructure/logger.js';

// A real pino logger writing to memory, so the tests read the JSON lines it would print
export function captureLogger() {
  const lines: string[] = [];
  const logger = createLogger('info', { write: (line: string) => void lines.push(line) });
  return {
    logger,
    entries: () => lines.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}
