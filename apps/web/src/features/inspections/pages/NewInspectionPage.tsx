import { MIN_NOTES_LENGTH } from '@fiscaliza/shared';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Skeleton, useToast } from '@/design-system';
import { useMe } from '@/features/auth/hooks/use-me';
import { InspectionForm } from '@/features/inspections/components/InspectionForm';
import { PhotoUploader } from '@/features/inspections/components/PhotoUploader';
import { useInspection } from '@/features/inspections/hooks/use-inspection';
import { useSubmitInspection } from '@/features/inspections/hooks/use-submit-inspection';
import { canSubmit } from '@/features/inspections/utils/can-submit';
import { ApiError } from '@/lib/http';

export function NewInspectionPage() {
  const [params] = useSearchParams();
  const siteId = params.get('site');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: me } = useMe();
  const [draftId, setDraftId] = useState<string>();
  const inspection = useInspection(draftId);
  const submit = useSubmitInspection();

  if (!siteId) {
    return (
      <section role="alert" className="space-y-3">
        <h1 className="text-2xl font-bold">Obra não informada.</h1>
        <p className="text-muted">Abra a vistoria a partir da página de uma obra.</p>
        <Link to="/construction-sites" className="text-primary underline">
          Voltar para obras
        </Link>
      </section>
    );
  }

  const draft = inspection.data;

  async function handleSubmit(id: string) {
    try {
      await submit.mutateAsync(id);
      showToast('success', 'Vistoria enviada', 'O relatório será gerado em instantes.');
      void navigate(`/inspections/${id}`);
    } catch {
      // The mutation error is displayed above the button.
    }
  }

  return (
    <section className="space-y-6">
      <Link to={`/construction-sites/${siteId}`} className="text-sm text-primary underline">
        Voltar para a obra
      </Link>
      <h1 className="text-2xl font-bold">Nova vistoria</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">1. Dados da vistoria</h2>
        {draftId && inspection.isPending && (
          <div role="status" aria-label="Carregando vistoria">
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {(!draftId || draft) && (
          <InspectionForm
            key={draft?.id ?? 'new'}
            constructionSiteId={siteId}
            inspection={draft}
            onSaved={(saved) => setDraftId(saved.id)}
          />
        )}
      </Card>

      {draftId && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">2. Fotos e envio</h2>
          {inspection.isError && (
            <div role="alert" className="space-y-2">
              <p className="text-danger">Não foi possível carregar o rascunho.</p>
              <Button onClick={() => void inspection.refetch()}>Tentar de novo</Button>
            </div>
          )}
          {draft && (
            <>
              <PhotoUploader inspectionId={draft.id} photos={draft.photos} />
              {submit.error && (
                <p role="alert" className="text-sm text-danger">
                  {submit.error instanceof ApiError
                    ? submit.error.message
                    : 'Não foi possível enviar a vistoria. Tente novamente.'}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <p className="text-sm text-muted">
                  Para enviar: observações com {MIN_NOTES_LENGTH} caracteres ou mais e ao menos 1
                  foto.
                </p>
                <Button
                  loading={submit.isPending}
                  disabled={!me || !canSubmit(draft, me.id)}
                  onClick={() => void handleSubmit(draft.id)}
                >
                  Enviar
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </section>
  );
}
