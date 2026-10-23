import {
  pino,
  stdTimeFunctions,
  type DestinationStream,
  type LevelWithSilent,
  type Logger,
} from 'pino';

// JSON on stdout, same keys as the API (level as a label, "message"), so CloudWatch and the
// compose logs read the same. Each event gets a child with its correlationId (see dispatchEvent)
export function createLogger(level: LevelWithSilent, destination?: DestinationStream): Logger {
  return pino(
    {
      level,
      messageKey: 'message',
      timestamp: stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      base: { service: 'worker' },
    },
    destination,
  );
}
