import { z } from 'zod';

export type AuthConfig =
  { mode: 'local' } | { mode: 'cognito'; userPoolId: string; clientId: string };

// Each spec adds the variables it starts to use (auth in 001, storage in 003, queue in 004)
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Requests per minute per IP; the health check is outside the limit
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(100),
  DATABASE_URL: z.url(),
  AWS_REGION: z.string().min(1).default('us-east-1'),
  AWS_ENDPOINT: z.url().optional(),
  AWS_PUBLIC_ENDPOINT: z.url().optional(),
  PHOTOS_BUCKET: z.string().min(1).default('fiscaliza-photos'),
  INSPECTIONS_QUEUE_URL: z.url(),
  // Off in tests that must not publish as a side effect; on by default
  OUTBOX_PUBLISHER_ENABLED: z.stringbool().default(true),
  // Local is safe as a default because production refuses it below
  AUTH_MODE: z.enum(['cognito', 'local']).default('local'),
  // The region is the prefix of the id (us-east-1_xxx), so it needs no variable of its own
  COGNITO_USER_POOL_ID: z
    .string()
    .regex(/^[a-z]{2}-[a-z]+-\d_\w+$/, 'use o formato região_id, ex.: us-east-1_AbC123')
    .optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
});

type Env = Record<string, string | undefined>;
type ParsedEnv = z.infer<typeof envSchema>;

export const configSchema = envSchema.transform((env, ctx) => {
  const problems = authProblems(env);
  for (const [variable, message] of problems) {
    ctx.addIssue({ code: 'custom', path: [variable], message });
  }
  return problems.length > 0 ? z.NEVER : { ...env, auth: toAuthConfig(env) };
});

export type AppConfig = z.infer<typeof configSchema>;

function authProblems(env: ParsedEnv): [string, string][] {
  if (env.AUTH_MODE === 'local') {
    return env.NODE_ENV === 'production'
      ? [['AUTH_MODE', 'o modo local não pode ser usado em produção']]
      : [];
  }
  const required = ['COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID'] as const;
  return required
    .filter((variable) => env[variable] === undefined)
    .map((variable) => [variable, 'obrigatória com AUTH_MODE=cognito']);
}

function toAuthConfig(env: ParsedEnv): AuthConfig {
  if (env.AUTH_MODE === 'local') return { mode: 'local' };
  return {
    mode: 'cognito',
    userPoolId: env.COGNITO_USER_POOL_ID ?? '',
    clientId: env.COGNITO_CLIENT_ID ?? '',
  };
}

export function loadConfig(env: Env): AppConfig {
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
