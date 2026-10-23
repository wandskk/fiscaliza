import { ErrorCode, MAX_RETURN_REASON_LENGTH, MIN_RETURN_REASON_LENGTH } from '@fiscaliza/shared';
import { useState } from 'react';
import {
  Button,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  Textarea,
} from '@/design-system';
import { ApiError } from '@/lib/http';

interface DecisionPanelProps {
  canDecide: boolean;
  pending: boolean;
  error: Error | null;
  onApprove: () => void;
  onReturn: (reason: string) => void;
}

function errorMessage(error: Error): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível registrar a decisão. Tente novamente.';
}

export function DecisionPanel({
  canDecide,
  pending,
  error,
  onApprove,
  onReturn,
}: DecisionPanelProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!canDecide) return null;

  const trimmedLength = reason.trim().length;
  const reasonTooShort = trimmedLength < MIN_RETURN_REASON_LENGTH;
  const reasonError =
    error instanceof ApiError && error.code === ErrorCode.RN_06 ? error.message : undefined;
  const dialogError = error && !reasonError ? errorMessage(error) : undefined;

  return (
    <section aria-label="Decisão do gestor" className="space-y-3">
      <p className="text-sm text-muted">
        O relatório da IA é apenas uma sugestão. A decisão é sua.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setApproveOpen(true)} disabled={pending}>
          Aprovar
        </Button>
        <Button variant="secondary" onClick={() => setReturnOpen(true)} disabled={pending}>
          Devolver
        </Button>
      </div>

      <DialogRoot open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold text-text">Aprovar vistoria?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted">
            Depois de aprovada, a vistoria não pode mais ser alterada.
          </DialogDescription>
          {dialogError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {dialogError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              Cancelar
            </Button>
            <Button loading={pending} onClick={onApprove}>
              Confirmar aprovação
            </Button>
          </div>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold text-text">Devolver vistoria</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted">
            Explique ao inspetor o que precisa ser corrigido.
          </DialogDescription>
          <div className="mt-4">
            <Textarea
              label="Motivo da devolução"
              value={reason}
              maxLength={MAX_RETURN_REASON_LENGTH}
              onChange={(event) => setReason(event.target.value)}
              hint={`${trimmedLength}/${MIN_RETURN_REASON_LENGTH}`}
              error={reasonError}
            />
          </div>
          {dialogError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {dialogError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={pending}
              disabled={reasonTooShort}
              onClick={() => onReturn(reason.trim())}
            >
              Confirmar devolução
            </Button>
          </div>
        </DialogContent>
      </DialogRoot>
    </section>
  );
}
