export const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://fiscaliza:dev@localhost:5432/fiscaliza',
  AWS_REGION: 'us-east-1',
  AWS_ENDPOINT: 'http://localhost:4566',
  // Tests never reach an LLM: the stub answers offline
  LLM_PROVIDERS: 'stub',
};
