import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { inspectionDetail } from './application/inspection-detail.js';
import { listConstructionSites } from './application/list-construction-sites.js';
import { pendingInspections } from './application/pending-inspections.js';
import { FiscalizaApiError, type FiscalizaApi } from './application/ports/fiscaliza-api.js';
import {
  formatConstructionSites,
  formatInspectionDetail,
  formatPendingInspections,
} from './presentation/format.js';

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

// A failure of the API is a result of the tool, never an exception that ends the server
async function respond(produce: () => Promise<string>): Promise<CallToolResult> {
  try {
    return { content: [{ type: 'text', text: await produce() }] };
  } catch (error) {
    const message =
      error instanceof FiscalizaApiError ? error.message : 'Erro inesperado ao consultar a API.';
    return { content: [{ type: 'text', text: message }], isError: true };
  }
}

export function createServer(api: FiscalizaApi): McpServer {
  const server = new McpServer({ name: 'fiscaliza', version: '0.0.0' });

  server.registerTool(
    'list_construction_sites',
    {
      title: 'Listar obras',
      description:
        'Lista as obras com o total de vistorias por status (aguardando decisão, devolvidas e aprovadas). ' +
        'Use para ter uma visão geral ou para descobrir o id de uma obra pelo nome.',
      inputSchema: {
        search: z
          .string()
          .trim()
          .max(120)
          .optional()
          .describe('Parte do nome da obra ou do contrato'),
      },
      annotations: READ_ONLY,
    },
    ({ search }) =>
      respond(async () => formatConstructionSites(await listConstructionSites(api, { search }))),
  );

  server.registerTool(
    'pending_inspections',
    {
      title: 'Vistorias pendentes',
      description:
        'Lista as vistorias enviadas que aguardam decisão do gestor, de todas as obras ou de uma só. ' +
        'Use para saber o que precisa ser aprovado ou devolvido e para obter o id de cada vistoria.',
      inputSchema: {
        constructionSiteId: z
          .uuid()
          .optional()
          .describe('Id da obra (veja list_construction_sites). Sem ele, lista todas as obras'),
      },
      annotations: READ_ONLY,
    },
    ({ constructionSiteId }) =>
      respond(async () =>
        formatPendingInspections(await pendingInspections(api, { constructionSiteId })),
      ),
  );

  server.registerTool(
    'inspection_detail',
    {
      title: 'Detalhe da vistoria',
      description:
        'Mostra uma vistoria: observação do fiscal, relatório da IA (sugestão, não decisão), motivo da devolução e histórico. ' +
        'Use depois de pending_inspections, com o id da vistoria.',
      inputSchema: { inspectionId: z.uuid().describe('Id da vistoria') },
      annotations: READ_ONLY,
    },
    ({ inspectionId }) =>
      respond(async () => formatInspectionDetail(await inspectionDetail(api, { inspectionId }))),
  );

  return server;
}
