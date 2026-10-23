import {
  createConstructionSiteSchema,
  updateConstructionSiteSchema,
  type ConstructionSiteResponse,
  type CreateConstructionSite,
  type UpdateConstructionSite,
} from '@fiscaliza/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Button,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  Input,
} from '@/design-system';
import { useSaveConstructionSite } from '@/features/construction-sites/hooks/use-save-construction-site';
import { ApiError } from '@/lib/http';

export interface ConstructionSiteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: Pick<ConstructionSiteResponse, 'id' | 'name' | 'contract' | 'address'>;
}

function ErrorMessage({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {error instanceof ApiError
        ? error.message
        : 'Não foi possível salvar a obra. Tente novamente.'}
    </p>
  );
}

function CreateForm({ onOpenChange }: Pick<ConstructionSiteFormProps, 'onOpenChange'>) {
  const save = useSaveConstructionSite();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateConstructionSite>({
    resolver: zodResolver(createConstructionSiteSchema),
    defaultValues: { name: '', contract: '', address: '' },
  });

  return (
    <form
      className="mt-5 flex flex-col gap-4"
      onSubmit={handleSubmit(async (data) => {
        try {
          await save.mutateAsync({ data });
          onOpenChange(false);
        } catch {
          // The mutation error is displayed next to the fields.
        }
      })}
    >
      <Input label="Nome" error={errors.name?.message} {...register('name')} />
      <Input label="Contrato" error={errors.contract?.message} {...register('contract')} />
      <Input label="Endereço" error={errors.address?.message} {...register('address')} />
      <ErrorMessage error={save.error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          Criar obra
        </Button>
      </div>
    </form>
  );
}

function EditForm({
  site,
  onOpenChange,
}: Required<Pick<ConstructionSiteFormProps, 'site' | 'onOpenChange'>>) {
  const save = useSaveConstructionSite();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateConstructionSite>({
    resolver: zodResolver(updateConstructionSiteSchema),
    defaultValues: { name: site.name, contract: site.contract, address: site.address },
  });

  return (
    <form
      className="mt-5 flex flex-col gap-4"
      onSubmit={handleSubmit(async (data) => {
        try {
          await save.mutateAsync({ id: site.id, data });
          onOpenChange(false);
        } catch {
          // The mutation error is displayed next to the fields.
        }
      })}
    >
      <Input label="Nome" error={errors.name?.message} {...register('name')} />
      <Input label="Contrato" error={errors.contract?.message} {...register('contract')} />
      <Input label="Endereço" error={errors.address?.message} {...register('address')} />
      <ErrorMessage error={save.error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

export function ConstructionSiteForm({ open, onOpenChange, site }: ConstructionSiteFormProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold text-text">
          {site ? 'Editar obra' : 'Nova obra'}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted">
          {site ? 'Atualize os dados da obra.' : 'Informe os dados para cadastrar a obra.'}
        </DialogDescription>
        {open &&
          (site ? (
            <EditForm key={site.id} site={site} onOpenChange={onOpenChange} />
          ) : (
            <CreateForm onOpenChange={onOpenChange} />
          ))}
      </DialogContent>
    </DialogRoot>
  );
}
