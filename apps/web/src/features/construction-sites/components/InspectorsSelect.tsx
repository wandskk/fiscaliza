import { useEffect, useState } from 'react';
import {
  Button,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  EmptyState,
  Skeleton,
} from '@/design-system';
import { useAssignInspectors } from '@/features/construction-sites/hooks/use-assign-inspectors';
import { useInspectors } from '@/features/construction-sites/hooks/use-inspectors';
import { ApiError } from '@/lib/http';

export interface InspectorsSelectProps {
  siteId: string;
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InspectorsSelect({
  siteId,
  selectedIds,
  open,
  onOpenChange,
}: InspectorsSelectProps) {
  const inspectors = useInspectors(open);
  const assign = useAssignInspectors();
  const [selection, setSelection] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setSelection(selectedIds);
  }, [open, selectedIds]);

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-text">Definir fiscais</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted">
          Selecione os fiscais responsáveis por esta obra.
        </DialogDescription>
        <div className="mt-5 max-h-64 overflow-y-auto">
          {inspectors.isPending && <Skeleton className="h-20 w-full" />}
          {inspectors.isError && (
            <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
              Não foi possível carregar os fiscais.
              <Button variant="secondary" size="sm" onClick={() => void inspectors.refetch()}>
                Tentar de novo
              </Button>
            </div>
          )}
          {inspectors.isSuccess && inspectors.data.length === 0 && (
            <EmptyState
              title="Nenhum fiscal disponível"
              description="Cadastre fiscais para atribuí-los a esta obra."
            />
          )}
          {inspectors.isSuccess && inspectors.data.length > 0 && (
            <div className="flex flex-col gap-3">
              {inspectors.data.map((inspector) => (
                <label key={inspector.id} className="flex items-center gap-3 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={selection.includes(inspector.id)}
                    onChange={(event) =>
                      setSelection((current) =>
                        event.target.checked
                          ? [...current, inspector.id]
                          : current.filter((id) => id !== inspector.id),
                      )
                    }
                  />
                  <span>{inspector.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {assign.error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {assign.error instanceof ApiError
              ? assign.error.message
              : 'Não foi possível salvar os fiscais. Tente novamente.'}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            loading={assign.isPending}
            disabled={!inspectors.isSuccess}
            onClick={async () => {
              try {
                await assign.mutateAsync({ id: siteId, inspectorIds: selection });
                onOpenChange(false);
              } catch {
                // The mutation error is displayed in the dialog.
              }
            }}
          >
            Salvar fiscais
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
