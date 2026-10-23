import { z } from 'zod';

export const LLM_PROVIDER_NAMES = ['gemini', 'fallback', 'stub'] as const;
export type LlmProviderName = (typeof LLM_PROVIDER_NAMES)[number];

// "gemini, fallback" becomes ['gemini', 'fallback']; the order is the order of the chain
const providerList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== ''),
  )
  .pipe(z.array(z.enum(LLM_PROVIDER_NAMES)).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  AWS_REGION: z.string().min(1).default('us-east-1'),
  AWS_ENDPOINT: z.url().optional(),
  // Only the local poller reads it; on Lambda the queue hands the messages to the handler
  INSPECTIONS_QUEUE_URL: z.url().optional(),
  // The stub is safe as a default because production refuses it below
  LLM_PROVIDERS: providerList.default(['stub']),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
  FALLBACK_LLM_BASE_URL: z.url().optional(),
  FALLBACK_LLM_API_KEY: z.string().min(1).optional(),
  FALLBACK_LLM_MODEL: z.string().min(1).optional(),
});

type Env = Record<string, string | undefined>;
type ParsedEnv = z.infer<typeof envSchema>;

export const configSchema = envSchema.transform((env, ctx) => {
  const problems = providerProblems(env);
  for (const [variable, message] of problems) {
    ctx.addIssue({ code: 'custom', path: [variable], message });
  }
  return problems.length > 0 ? z.NEVER : env;
});

export type WorkerConfig = z.infer<typeof configSchema>;

function providerProblems(env: ParsedEnv): [string, string][] {
  const problems: [string, string][] = [];
  const providers = env.LLM_PROVIDERS;

  if (providers.includes('stub') && env.NODE_ENV === 'production') {
    problems.push(['LLM_PROVIDERS', 'o provedor stub não pode ser usado em produção']);
  }
  if (providers.includes('gemini') && env.GEMINI_API_KEY === undefined) {
    problems.push(['GEMINI_API_KEY', 'obrigatória com gemini em LLM_PROVIDERS']);
  }
  if (providers.includes('fallback')) {
    const required = [
      'FALLBACK_LLM_BASE_URL',
      'FALLBACK_LLM_API_KEY',
      'FALLBACK_LLM_MODEL',
    ] as const;
    for (const variable of required) {
      if (env[variable] === undefined) {
        problems.push([variable, 'obrigatória com fallback em LLM_PROVIDERS']);
      }
    }
  }
  return problems;
}

export function loadConfig(env: Env): WorkerConfig {
  const values = withoutEmptyValues(env);
  const result = configSchema.safeParse(values);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join('.');
    return `${name}: ${values[name] === undefined ? 'obrigatória' : issue.message}`;
  });
  throw new Error(`Configuração inválida, confira o .env:\n${problems.join('\n')}`);
}

// A line like "AWS_ENDPOINT=" in the .env means the variable is not set
function withoutEmptyValues(env: Env): Env {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
}
