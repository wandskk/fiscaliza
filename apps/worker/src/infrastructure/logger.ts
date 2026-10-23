import { pino, stdTimeFunctions, type Logger, type LevelWithSilent } from 'pino';

// JSON on stdout, same keys as the API (level as a label, "message"), so CloudWatch and the
// compose logs read the same. Each event gets a child with its correlationId (see dispatchEvent)
export function createLogger(level: LevelWithSilent): Logger {
  return pino({
    level,
    messageKey: 'message',
    timestamp: stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    base: { service: 'worker' },
  });
}
