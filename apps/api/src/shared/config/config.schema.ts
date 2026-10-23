import { z } from 'zod';

// Each spec adds the variables it starts to use (auth in 001, storage in 003)
export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.url(),
});

export type AppConfig = z.infer<typeof configSchema>;

type Env = Record<string, string | undefined>;

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
