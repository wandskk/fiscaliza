import {
  ERROR_MESSAGES,
  dashboardSchema,
  errorResponseSchema,
  inspectionDetailSchema,
  inspectionPageSchema,
  type InspectionStatus,
  paginatedSchema,
  constructionSiteSchema,
} from '@fiscaliza/shared';
import type { z } from 'zod';
import {
  type ConstructionSiteQuery,
  FiscalizaApiError,
  type FiscalizaApi,
} from '../application/ports/fiscaliza-api.js';

const constructionSitePageSchema = paginatedSchema(constructionSiteSchema);

type Fetch = typeof fetch;

// Hints about the token win over the API's generic text for 401 and 403
const TOKEN_MESSAGES: Record<number, string> = {
  401: 'Token inválido ou expirado. Confira o FISCALIZA_API_TOKEN.',
  403: 'O token não tem permissão de gestor para esta consulta.',
};

export class HttpFiscalizaApi implements FiscalizaApi {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: string,
    private readonly fetchFn: Fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  listConstructionSites(query: ConstructionSiteQuery) {
    return this.get('/construction-sites', constructionSitePageSchema, {
      search: query.search,
      page: query.page?.toString(),
      limit: query.limit?.toString(),
    });
  }

  dashboard() {
    return this.get('/dashboard', dashboardSchema);
  }

  siteInspections(constructionSiteId: string, status: InspectionStatus) {
    const id = encodeURIComponent(constructionSiteId);
    return this.get(`/construction-sites/${id}/inspections`, inspectionPageSchema, { status });
  }

  inspection(inspectionId: string) {
    return this.get(`/inspections/${encodeURIComponent(inspectionId)}`, inspectionDetailSchema);
  }

  private async get<S extends z.ZodType>(
    path: string,
    schema: S,
    params: Record<string, string | undefined> = {},
  ): Promise<z.infer<S>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(name, value);
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
      });
    } catch {
      throw new FiscalizaApiError(
        undefined,
        `Não foi possível conectar à API em ${this.baseUrl}. Ela está no ar?`,
      );
    }

    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw toApiError(response.status, body);

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new FiscalizaApiError(
        response.status,
        'A API respondeu em um formato inesperado.',
        'INVALID_RESPONSE',
      );
    }
    return parsed.data;
  }
}

function toApiError(status: number, body: unknown): FiscalizaApiError {
  const error = errorResponseSchema.safeParse(body);
  const fallback =
    status === 404 ? 'Registro não encontrado.' : `A API respondeu com erro ${status}.`;
  if (!error.success) return new FiscalizaApiError(status, TOKEN_MESSAGES[status] ?? fallback);

  const { code } = error.data;
  return new FiscalizaApiError(status, TOKEN_MESSAGES[status] ?? ERROR_MESSAGES[code], code);
}
