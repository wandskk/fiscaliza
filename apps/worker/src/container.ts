import { readFileSync } from 'node:fs';
import type { Logger } from 'pino';
import { buildReportPrompt } from './application/build-report-prompt.js';
import { GenerateReportUseCase } from './application/generate-report.use-case.js';
import type { LlmProvider } from './application/ports/llm.provider.js';
import type { LlmProviderName, WorkerConfig } from './config.js';
import { dispatchEvent, type DispatchOutcome } from './dispatch-event.js';
import { createPrismaClient } from './infrastructure/database/prisma-client.js';
import { PrismaInspectionReader } from './infrastructure/database/prisma-inspection.reader.js';
import { PrismaReportRepository } from './infrastructure/database/prisma-report.repository.js';
import { FallbackProvider } from './infrastructure/llm/fallback.provider.js';
import { GeminiProvider } from './infrastructure/llm/gemini.provider.js';
import { LlmWithFallback } from './infrastructure/llm/llm-with-fallback.js';
import { StubProvider } from './infrastructure/llm/stub.provider.js';
import { createLogger } from './infrastructure/logger.js';

// Next to src/ and dist/, so the path is the same running from either
const PROMPT_URL = new URL('../prompts/report.v1.md', import.meta.url);

export interface Container {
  logger: Logger;
  // Takes the body of a queue message; throws when the message must go back to the queue
  dispatch: (body: string) => Promise<DispatchOutcome>;
  close: () => Promise<void>;
}

// No DI framework: the worker has one use case, so the wiring is plain code
export function buildContainer(config: WorkerConfig, logger?: Logger): Container {
  const log = logger ?? createLogger(config.LOG_LEVEL);
  const prisma = createPrismaClient(config.DATABASE_URL);
  const template = readFileSync(PROMPT_URL, 'utf8');

  const generateReport = new GenerateReportUseCase({
    reports: new PrismaReportRepository(prisma),
    inspections: new PrismaInspectionReader(prisma),
    llm: new LlmWithFallback(config.LLM_PROVIDERS.map((name) => buildProvider(name, config))),
    buildPrompt: (inspection) => buildReportPrompt(template, inspection),
    clock: { now: () => new Date() },
  });

  return {
    logger: log,
    dispatch: (body) => dispatchEvent(body, { generateReport, logger: log }),
    close: () => prisma.$disconnect(),
  };
}

// loadConfig already refused a chain whose variables are missing, hence the guards
function buildProvider(name: LlmProviderName, config: WorkerConfig): LlmProvider {
  switch (name) {
    case 'gemini':
      return new GeminiProvider({
        apiKey: required(config.GEMINI_API_KEY, 'GEMINI_API_KEY'),
        model: config.GEMINI_MODEL,
      });
    case 'fallback':
      return new FallbackProvider({
        baseUrl: required(config.FALLBACK_LLM_BASE_URL, 'FALLBACK_LLM_BASE_URL'),
        apiKey: required(config.FALLBACK_LLM_API_KEY, 'FALLBACK_LLM_API_KEY'),
        model: required(config.FALLBACK_LLM_MODEL, 'FALLBACK_LLM_MODEL'),
      });
    case 'stub':
      return new StubProvider();
  }
}

function required(value: string | undefined, variable: string): string {
  if (value === undefined) throw new Error(`${variable} é obrigatória`);
  return value;
}
