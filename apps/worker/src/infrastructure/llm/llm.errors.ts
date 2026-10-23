// Cota esgotada (HTTP 429): retrying the same provider is pointless, the chain moves on
export class LlmQuotaError extends Error {
  constructor(provider: string) {
    super(`${provider}: cota esgotada (429)`);
    this.name = 'LlmQuotaError';
  }
}

export class LlmTimeoutError extends Error {
  constructor(provider: string, timeoutMs: number) {
    super(`${provider}: sem resposta em ${timeoutMs} ms`);
    this.name = 'LlmTimeoutError';
  }
}

// Not JSON, or JSON that does not fit the schema: the chain tries the same provider once more
export class LlmInvalidResponseError extends Error {
  constructor(provider: string, reason: string) {
    super(`${provider}: resposta inválida (${reason})`);
    this.name = 'LlmInvalidResponseError';
  }
}
