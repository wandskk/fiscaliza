import { InspectionStatus, MIN_NOTES_LENGTH, type Decision } from '@fiscaliza/shared';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Skeleton, useToast } from '@/design-system';
import { useMe } from '@/features/auth/hooks/use-me';
import { useConstructionSite } from '@/features/construction-sites/hooks/use-construction-site';
import { DecisionPanel } from '@/features/inspections/components/DecisionPanel';
import { HistoryTimeline } from '@/features/inspections/components/HistoryTimeline';
import { InspectionForm } from '@/features/inspections/components/InspectionForm';
import { PhotoGallery } from '@/features/inspections/components/PhotoGallery';
import { PhotoUploader } from '@/features/inspections/components/PhotoUploader';
import { ReportCard } from '@/features/inspections/components/ReportCard';
import { StatusBadge } from '@/features/inspections/components/StatusBadge';
import { useDecideInspection } from '@/features/inspections/hooks/use-decide-inspection';
import { useInspection } from '@/features/inspections/hooks/use-inspection';
import { useSubmitInspection } from '@/features/inspections/hooks/use-submit-inspection';
import { canDecide } from '@/features/inspections/utils/can-decide';
import { canEdit } from '@/features/inspections/utils/can-edit';
import { canSubmit } from '@/features/inspections/utils/can-submit';
import { ApiError } from '@/lib/http';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const COMPLIANCE_LABEL = { COMPLIANT: 'Conforme', NON_COMPLIANT: 'Não conforme' } as const;

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { data: me } = useMe();
  const inspection = useInspection(id);
  const site = useConstructionSite(inspection.data?.constructionSiteId);
  const submit = useSubmitInspection();
  const decide = useDecideInspection(id ?? '');

  if (inspection.isPending) {
    return (
      <div role="status" aria-label="Carregando vistoria" className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (inspection.isError) {
    const notFound = inspection.error instanceof ApiError && inspection.error.status === 404;
    return (
      <section role="alert" className="space-y-3">
        <h1 className="text-2xl font-bold">
          {notFound ? 'Vistoria não encontrada' : 'Não foi possível carregar a vistoria.'}
        </h1>
        {!notFound && <Button onClick={() => void inspection.refetch()}>Tentar de novo</Button>}
        <Link to="/construction-sites" className="block text-primary underline">
          Voltar para obras
        </Link>
      </section>
    );
  }

  const { data } = inspection;
  const editable = !!me && canEdit(data, me.id);
  const decidable = !!me && canDecide(data, me.role);
  const siteName = site.data?.name ?? 'Ver obra';

  async function handleSubmit() {
    try {
      await submit.mutateAsync(data.id);
      showToast('success', 'Vistoria enviada', 'O relatório será gerado em instantes.');
    } catch {
      // The mutation error is displayed above the button.
    }
  }

  async function handleDecision(body: Decision) {
    try {
      await decide.mutateAsync(body);
      showToast(
        'success',
        body.decision === 'APPROVE' ? 'Vistoria aprovada' : 'Vistoria devolvida',
      );
    } catch {
      // The mutation error is displayed inside the decision dialog.
    }
  }

  return (
    <section className="space-y-6">
      <Link
        to={`/construction-sites/${data.constructionSiteId}`}
        className="text-sm text-primary underline"
      >
        Voltar para a obra
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Vistoria</h1>
        <StatusBadge status={data.status} />
      </div>
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Obra</dt>
            <dd>
              <Link
                to={`/construction-sites/${data.constructionSiteId}`}
                className="text-primary underline"
              >
                {siteName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Situação</dt>
            <dd>{COMPLIANCE_LABEL[data.compliance]}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Criada em</dt>
            <dd>{dateTimeFormatter.format(new Date(data.createdAt))}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Atualizada em</dt>
            <dd>{dateTimeFormatter.format(new Date(data.updatedAt))}</dd>
          </div>
        </dl>
      </Card>

      {data.status === InspectionStatus.RETURNED && data.returnReason && (
        <section
          aria-label="Motivo da devolução"
          className="rounded-md border border-danger bg-danger/10 p-4"
        >
          <h2 className="text-sm font-semibold text-danger">Vistoria devolvida</h2>
          <p className="mt-1 text-text">Motivo da devolução: {data.returnReason}</p>
        </section>
      )}

      {editable ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Dados da vistoria</h2>
          <InspectionForm
            key={data.id}
            constructionSiteId={data.constructionSiteId}
            inspection={data}
            onSaved={() => undefined}
          />
        </Card>
      ) : (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Observações</h2>
          <p className="whitespace-pre-wrap">{data.notes}</p>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Fotos</h2>
        {editable ? (
          <PhotoUploader inspectionId={data.id} photos={data.photos} />
        ) : (
          <PhotoGallery photos={data.photos} />
        )}
      </Card>

      {editable && (
        <div className="space-y-3">
          {submit.error && (
            <p role="alert" className="text-sm text-danger">
              {submit.error instanceof ApiError
                ? submit.error.message
                : 'Não foi possível enviar a vistoria. Tente novamente.'}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <p className="text-sm text-muted">
              Para enviar: observações com {MIN_NOTES_LENGTH} caracteres ou mais e ao menos 1 foto.
            </p>
            <Button
              loading={submit.isPending}
              disabled={!me || !canSubmit(data, me.id)}
              onClick={() => void handleSubmit()}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}

      <ReportCard report={data.report} status={data.status} />

      <DecisionPanel
        canDecide={decidable}
        pending={decide.isPending}
        error={decide.error}
        onApprove={() => void handleDecision({ decision: 'APPROVE' })}
        onReturn={(reason) => void handleDecision({ decision: 'RETURN', reason })}
      />

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        <HistoryTimeline history={data.history} />
      </Card>
    </section>
  );
}
