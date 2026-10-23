import { randomUUID } from 'node:crypto';
import { stdTimeFunctions, type LevelWithSilent } from 'pino';
import type { Options } from 'pino-http';
import { currentCorrelationId } from './request-context';

// Called by the compose healthcheck every 10 s; only a failing check is worth a log line
const HEALTH_URL = '/api/v1/health';

function requestLogLevel(
  req: { url?: string },
  res: { statusCode: number },
  error?: Error,
): LevelWithSilent {
  if (error || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return req.url === HEALTH_URL ? 'silent' : 'info';
}

export function pinoHttpOptions(level: LevelWithSilent): Options {
  return {
    level,
    messageKey: 'message',
    timestamp: stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    // The id was set by correlationIdMiddleware; the UUID only covers routes outside it
    genReqId: () => currentCorrelationId() ?? randomUUID(),
    // Binds the id to every log of the request, not only the "request completed" one
    quietReqLogger: true,
    customLogLevel: requestLogLevel,
    customAttributeKeys: { reqId: 'correlationId', responseTime: 'durationMs' },
    // Only what is needed to find the request: headers carry tokens and cookies
    serializers: {
      req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  };
}
