import { Button, DialogContent, DialogDescription, DialogRoot, DialogTitle } from '@/design-system';
import { useSaveConstructionSite } from '@/features/construction-sites/hooks/use-save-construction-site';
import { ApiError } from '@/lib/http';

export interface CloseConstructionSiteDialogProps {
  siteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseConstructionSiteDialog({
  siteId,
  open,
  onOpenChange,
}: CloseConstructionSiteDialogProps) {
  const save = useSaveConstructionSite();

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-text">Encerrar obra?</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted">
          Uma obra encerrada não pode receber novas vistorias.
        </DialogDescription>
        {save.error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {save.error instanceof ApiError
              ? save.error.message
              : 'Não foi possível encerrar a obra. Tente novamente.'}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync({ id: siteId, data: { closed: true } });
                onOpenChange(false);
              } catch {
                // The mutation error is displayed in the dialog.
              }
            }}
          >
            Encerrar obra
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
