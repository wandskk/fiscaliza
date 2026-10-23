import {
  Compliance,
  MIN_NOTES_LENGTH,
  createInspectionSchema,
  type InspectionDetail,
} from '@fiscaliza/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button, Select, Textarea } from '@/design-system';
import { useSaveInspection } from '@/features/inspections/hooks/use-save-inspection';
import { ApiError } from '@/lib/http';

// The same contract the API validates, minus the site (it comes from the page)
const inspectionFormSchema = createInspectionSchema.pick({ notes: true, compliance: true });
type InspectionFormValues = z.input<typeof inspectionFormSchema>;

const COMPLIANCE_LABELS: Record<Compliance, string> = {
  [Compliance.COMPLIANT]: 'Conforme',
  [Compliance.NON_COMPLIANT]: 'Não conforme',
};

export interface InspectionFormProps {
  constructionSiteId: string;
  // Present when the draft already exists: the form then updates it
  inspection?: Pick<InspectionDetail, 'id' | 'notes' | 'compliance'>;
  onSaved: (inspection: InspectionDetail) => void;
}

export function InspectionForm({ constructionSiteId, inspection, onSaved }: InspectionFormProps) {
  const save = useSaveInspection();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      notes: inspection?.notes ?? '',
      compliance: inspection?.compliance,
    },
  });
  const notesLength = (watch('notes') ?? '').trim().length;

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={handleSubmit(async (data) => {
        try {
          const saved = await save.mutateAsync(
            inspection ? { id: inspection.id, data } : { data: { constructionSiteId, ...data } },
          );
          onSaved(saved);
        } catch {
          // The mutation error is displayed next to the fields.
        }
      })}
    >
      <Textarea
        label="Observações"
        hint={`${notesLength} de ${MIN_NOTES_LENGTH} caracteres mínimos para enviar`}
        error={errors.notes?.message}
        {...register('notes')}
      />
      <Select
        label="Situação"
        error={errors.compliance ? 'Selecione a situação da obra.' : undefined}
        {...register('compliance')}
      >
        <option value="">Selecione...</option>
        <option value={Compliance.COMPLIANT}>{COMPLIANCE_LABELS[Compliance.COMPLIANT]}</option>
        <option value={Compliance.NON_COMPLIANT}>
          {COMPLIANCE_LABELS[Compliance.NON_COMPLIANT]}
        </option>
      </Select>
      {save.error && (
        <p role="alert" className="text-sm text-danger">
          {save.error instanceof ApiError
            ? save.error.message
            : 'Não foi possível salvar a vistoria. Tente novamente.'}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>
          {inspection ? 'Salvar rascunho' : 'Criar rascunho'}
        </Button>
      </div>
    </form>
  );
}
