import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

const apiUrl = (process.env.API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
const localstackUrl = (process.env.LOCALSTACK_URL ?? 'http://localhost:4566').replace(/\/$/, '');
const reportTimeout = Number(process.env.REPORT_TIMEOUT_MS ?? 90000);
const manager = 'local-manager';
const inspector = 'local-inspector';
let lastResponse;

async function request(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token
        ? { Authorization: `Bearer ${token}`, ...(path === '/me' ? { 'x-id-token': token } : {}) }
        : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  lastResponse = { path, status: response.status, body: text };
  assert.equal(response.status, expected, JSON.stringify(lastResponse));
  return text ? JSON.parse(text) : null;
}

async function step(name, action) {
  const started = performance.now();
  try {
    await action();
    console.log(`ok ${name} (${Math.round(performance.now() - started)}ms)`);
  } catch (error) {
    throw new Error(`${name}: ${error.message}\nÚltima resposta: ${JSON.stringify(lastResponse)}`, {
      cause: error,
    });
  }
}

async function poll(read, accept, timeout) {
  const deadline = Date.now() + timeout;
  while (true) {
    const value = await read();
    if (accept(value)) return value;
    assert.ok(Date.now() < deadline, `Tempo esgotado após ${timeout}ms: ${JSON.stringify(value)}`);
    await sleep(Math.min(2000, Math.max(1, deadline - Date.now())));
  }
}

async function main() {
  assert.ok(
    Number.isFinite(reportTimeout) && reportTimeout > 0,
    'REPORT_TIMEOUT_MS deve ser positivo',
  );
  let user, site, inspection, firstReport;
  const reason = `Corrigir evidências da vistoria smoke ${Date.now()}.`;
  const detail = () => request(`/inspections/${inspection.id}`, inspector);
  const email = async (subject) =>
    poll(
      async () => {
        const response = await fetch(`${localstackUrl}/_aws/ses`, {
          signal: AbortSignal.timeout(15000),
        });
        const text = await response.text();
        lastResponse = { path: '/_aws/ses', status: response.status, body: text };
        assert.equal(response.status, 200, text);
        return JSON.parse(text).messages;
      },
      (messages) =>
        messages.some(
          (message) =>
            message.Destination?.ToAddresses?.includes(user.email) &&
            message.Subject === subject &&
            message.Body?.text_part?.includes(site.name),
        ),
      30000,
    );

  await step('1 saúde e usuários locais', async () => {
    await request('/health');
    assert.equal((await request('/me', manager)).role, 'MANAGER');
    user = await request('/me', inspector);
    assert.equal(user.role, 'INSPECTOR');
  });
  await step('2 criar obra e atribuir fiscal', async () => {
    site = await request(
      '/construction-sites',
      manager,
      'POST',
      {
        name: `Obra smoke ${crypto.randomUUID()}`,
        contract: `SMOKE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        address: 'Rua do teste, 100',
      },
      201,
    );
    const assigned = await request(`/construction-sites/${site.id}/inspectors`, manager, 'PUT', {
      inspectorIds: [user.id],
    });
    assert.deepEqual(assigned.inspectorIds, [user.id]);
  });
  await step('3 criar rascunho', async () => {
    inspection = await request(
      '/inspections',
      inspector,
      'POST',
      {
        constructionSiteId: site.id,
        notes: 'A vistoria identificou fissuras que precisam de correção na parede.',
        compliance: 'NON_COMPLIANT',
      },
      201,
    );
    assert.equal(inspection.status, 'DRAFT');
  });
  await step('4 enviar PNG ao S3 e confirmar foto', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
      'base64',
    );
    const upload = await request(
      `/inspections/${inspection.id}/photos/upload-url`,
      inspector,
      'POST',
      { contentType: 'image/png', size: png.length },
    );
    const response = await fetch(upload.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(png.length) },
      body: png,
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    lastResponse = { path: 'S3 PUT', status: response.status, body: text };
    assert.ok(response.ok, JSON.stringify(lastResponse));
    inspection = await request(
      `/inspections/${inspection.id}/photos`,
      inspector,
      'POST',
      { key: upload.key },
      201,
    );
    assert.equal(inspection.photos.length, 1);
  });
  await step('5 enviar vistoria', async () => {
    inspection = await request(`/inspections/${inspection.id}/submit`, inspector, 'POST');
    assert.equal(inspection.status, 'SUBMITTED');
  });
  await step('6 aguardar relatório', async () => {
    inspection = await poll(detail, (value) => value.report != null, reportTimeout);
    firstReport = inspection.report;
    assert.ok(firstReport.summary?.trim());
    assert.equal(firstReport.model, 'stub');
  });
  await step('7 devolver com motivo no histórico', async () => {
    inspection = await request(`/inspections/${inspection.id}/decision`, manager, 'POST', {
      decision: 'RETURN',
      reason,
    });
    assert.equal(inspection.status, 'RETURNED');
    assert.equal(inspection.returnReason, reason);
    assert.equal(inspection.history.at(-1).reason, reason);
  });
  await step('8 aguardar e-mail de devolução', () => email('Vistoria devolvida'));
  await step('9 editar, reenviar e gerar novo relatório', async () => {
    await request(`/inspections/${inspection.id}`, inspector, 'PATCH', {
      notes: 'As fissuras foram corrigidas e as evidências revisadas nesta nova vistoria.',
    });
    inspection = await request(`/inspections/${inspection.id}/submit`, inspector, 'POST');
    assert.equal(inspection.status, 'SUBMITTED');
    assert.equal(inspection.report, null);
    const submittedAt = inspection.history.at(-1).at;
    inspection = await poll(detail, (value) => value.report != null, reportTimeout);
    assert.ok(Date.parse(inspection.report.generatedAt) > Date.parse(submittedAt));
    assert.ok(Date.parse(inspection.report.generatedAt) > Date.parse(firstReport.generatedAt));
    assert.ok(inspection.report.summary?.trim());
    assert.equal(inspection.report.model, 'stub');
  });
  await step('10 aprovar, conferir histórico e e-mail', async () => {
    inspection = await request(`/inspections/${inspection.id}/decision`, manager, 'POST', {
      decision: 'APPROVE',
    });
    assert.equal(inspection.status, 'APPROVED');
    const statuses = ['DRAFT', 'SUBMITTED', 'RETURNED', 'SUBMITTED', 'APPROVED'];
    assert.deepEqual(
      inspection.history.map((change) => [change.from, change.to]),
      statuses.map((status, index) => [index ? statuses[index - 1] : null, status]),
    );
    await email('Vistoria aprovada');
  });
  await step('11 conferir painel', async () => {
    const dashboard = await request('/dashboard', manager);
    assert.equal(dashboard.sites.find((item) => item.id === site.id)?.counts.APPROVED, 1);
  });
  await step('12 RN-07 impede editar aprovada', async () => {
    const error = await request(
      `/inspections/${inspection.id}`,
      inspector,
      'PATCH',
      { notes: 'Tentativa de alterar uma vistoria já aprovada pelo gestor.' },
      422,
    );
    assert.equal(error.code, 'RN-07');
  });
  console.log(`Dados preservados: obra ${site.id}, vistoria ${inspection.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
