export const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://fiscaliza:dev@localhost:5432/fiscaliza_test',
  AWS_REGION: 'us-east-1',
  AWS_ENDPOINT: 'http://localhost:4566',
  AWS_PUBLIC_ENDPOINT: 'http://localhost:4566',
  INSPECTIONS_QUEUE_URL: 'http://localhost:4566/000000000000/fiscaliza-inspections',
  // High enough that no test file trips the limit by accident; the rate limit test lowers it
  RATE_LIMIT_PER_MINUTE: '100000',
  // Tests must not publish as a side effect; the publisher test runs a cycle by hand
  OUTBOX_PUBLISHER_ENABLED: 'false',
};
