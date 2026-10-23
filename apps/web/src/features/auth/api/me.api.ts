import { meResponseSchema, type MeResponse } from '@fiscaliza/shared';
import { http } from '@/lib/http';

export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return http.get('/me', meResponseSchema, signal, { withIdToken: true });
}
