import { z } from 'zod';

const envSchema = z.object({
  // Root of the API with the version prefix, e.g. http://localhost:3000/api/v1
  FISCALIZA_API_URL: z.url(),
  // Manager token: "local-manager" in the local mode, a Cognito access token otherwise
  FISCALIZA_API_TOKEN: z.string().min(1),
});

export type McpConfig = z.infer<typeof envSchema>;

type Env = Record<string, string | undefined>;

export function loadConfig(env: Env): McpConfig {
  const values = withoutEmptyValues(env);
  const result = envSchema.safeParse(values);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join('.');
    return `${name}: ${values[name] === undefined ? 'obrigatória' : issue.message}`;
  });
  throw new Error(`Configuração inválida, confira o .env:\n${problems.join('\n')}`);
}

// A line like "FISCALIZA_API_TOKEN=" in the .env means the variable is not set
function withoutEmptyValues(env: Env): Env {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
}
