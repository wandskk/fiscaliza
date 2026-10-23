import { Compliance, InspectionStatus } from '@fiscaliza/shared';
import { vi } from 'vitest';

export const inspectionId = 'ec3de278-ffb6-4ccd-a6b4-1cfa40efad8a';
export const siteId = '94e06449-b4b4-4b08-a2f6-a66c04fd7576';

export const draftInspection = {
  id: inspectionId,
  constructionSiteId: siteId,
  inspectorId: 'inspector-1',
  notes: 'Observação suficientemente detalhada para o envio.',
  compliance: Compliance.COMPLIANT,
  status: InspectionStatus.DRAFT,
  returnReason: null,
  photos: [],
  history: [],
  report: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Minimal XMLHttpRequest double: tests drive progress and the result by hand
export class FakeXhr {
  static instances: FakeXhr[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    this.body = body;
  }

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }

  finish(status = 200) {
    this.status = status;
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

export function installFakeXhr() {
  FakeXhr.instances = [];
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
}
