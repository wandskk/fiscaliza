import { ACCEPTED_PHOTO_TYPES, MAX_PHOTOS, type InspectionDetail } from '@fiscaliza/shared';
import { Button, FileDrop, type FileItem } from '@/design-system';
import { useRemovePhoto } from '@/features/inspections/hooks/use-remove-photo';
import { useUploadPhoto } from '@/features/inspections/hooks/use-upload-photo';
import { ApiError } from '@/lib/http';

export interface PhotoUploaderProps {
  inspectionId: string;
  photos: InspectionDetail['photos'];
  disabled?: boolean;
}

export function PhotoUploader({ inspectionId, photos, disabled = false }: PhotoUploaderProps) {
  const { items, upload } = useUploadPhoto(inspectionId, photos.length);
  const removePhoto = useRemovePhoto();

  // Confirmed photos show up as thumbnails below, so "done" items leave the progress list
  const files: FileItem[] = items
    .filter((item) => item.status !== 'done')
    .map(({ id, name, progress, error }) => ({ id, name, progress, error }));

  return (
    <div className="space-y-4">
      <FileDrop
        accept={ACCEPTED_PHOTO_TYPES.join(',')}
        multiple
        disabled={disabled}
        onFilesSelected={upload}
        files={files}
      />
      <p className="text-sm text-muted">
        {photos.length} de {MAX_PHOTOS} fotos
      </p>
      {removePhoto.isError && (
        <p role="alert" className="text-sm text-danger">
          {removePhoto.error instanceof ApiError
            ? removePhoto.error.message
            : 'Não foi possível remover a foto. Tente novamente.'}
        </p>
      )}
      {photos.length > 0 && (
        <ul aria-label="Fotos da vistoria" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.id} className="flex flex-col gap-2">
              <img
                src={photo.url}
                alt={`Foto ${index + 1} da vistoria`}
                className="aspect-square w-full rounded-sm border border-border object-cover"
              />
              {!disabled && (
                <Button
                  variant="secondary"
                  loading={removePhoto.isPending && removePhoto.variables?.photoId === photo.id}
                  onClick={() => removePhoto.mutate({ inspectionId, photoId: photo.id })}
                  aria-label={`Remover foto ${index + 1}`}
                >
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
