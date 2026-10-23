import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';
import { FiscalizaApiError } from '../src/application/ports/fiscaliza-api.js';
import { createServer } from '../src/server.js';
import { FakeFiscalizaApi, INSPECTION_1, MISSING, PHOTO_URL, SITE_A } from './support/fake-api.js';

const clients: Client[] = [];

async function connect(api: FakeFiscalizaApi): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer(api).connect(serverSide);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientSide);
  clients.push(client);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  const [block] = result.content;
  const text = block?.type === 'text' ? block.text : '';
  return { text, isError: result.isError === true };
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe('Fiscaliza MCP server', () => {
  it('lists the three read-only tools with descriptions', async () => {
    const client = await connect(new FakeFiscalizaApi());

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'inspection_detail',
      'list_construction_sites',
      'pending_inspections',
    ]);
    for (const tool of tools) {
      expect(tool.description).toMatch(/Use /);
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('list_construction_sites returns the sites with counts', async () => {
    const client = await connect(new FakeFiscalizaApi());

    const { text, isError } = await call(client, 'list_construction_sites', { search: 'aurora' });

    expect(isError).toBe(false);
    expect(text).toContain('Edifício Aurora');
    expect(text).not.toContain('Ponte Norte');
    expect(text).toContain('Aguardando decisão: 2');
  });

  it('pending_inspections works without and with a site', async () => {
    const client = await connect(new FakeFiscalizaApi());

    const all = await call(client, 'pending_inspections');
    const one = await call(client, 'pending_inspections', { constructionSiteId: SITE_A });

    expect(all.text).toContain('2 vistorias aguardando decisão.');
    expect(one.text).toContain('1 vistoria aguardando decisão em Edifício Aurora.');
    expect(one.text).toContain(INSPECTION_1);
  });

  it('inspection_detail returns the report as a suggestion and no photo URL', async () => {
    const client = await connect(new FakeFiscalizaApi());

    const { text, isError } = await call(client, 'inspection_detail', {
      inspectionId: INSPECTION_1,
    });

    expect(isError).toBe(false);
    expect(text).toContain('Sugestão da IA');
    expect(text).toContain('Armadura exposta');
    expect(text).not.toContain(PHOTO_URL);
  });

  it('turns an API error into isError with the Portuguese message', async () => {
    const client = await connect(new FakeFiscalizaApi());

    const { text, isError } = await call(client, 'inspection_detail', { inspectionId: MISSING });

    expect(isError).toBe(true);
    expect(text).toBe('Vistoria não encontrada.');
  });

  it('keeps serving after an error', async () => {
    const api = new FakeFiscalizaApi();
    const client = await connect(api);
    api.failWith = new FiscalizaApiError(401, 'Token inválido ou expirado.', 'UNAUTHORIZED');

    const failed = await call(client, 'pending_inspections');
    api.failWith = undefined;
    const ok = await call(client, 'pending_inspections');

    expect(failed).toEqual({ text: 'Token inválido ou expirado.', isError: true });
    expect(ok.isError).toBe(false);
  });

  it('turns an unexpected failure into isError without leaking details', async () => {
    const api = new FakeFiscalizaApi();
    const client = await connect(api);
    api.dashboard = () => Promise.reject(new Error('segredo interno'));

    const { text, isError } = await call(client, 'pending_inspections');

    expect(isError).toBe(true);
    expect(text).toBe('Erro inesperado ao consultar a API.');
  });

  it('rejects an id that is not a UUID before calling the API', async () => {
    const api = new FakeFiscalizaApi();
    const client = await connect(api);

    const { isError } = await call(client, 'inspection_detail', { inspectionId: 'abc' });

    expect(isError).toBe(true);
    expect(api.calls).toEqual([]);
  });
});
