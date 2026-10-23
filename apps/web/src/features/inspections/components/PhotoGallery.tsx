import type { InspectionDetail } from '@fiscaliza/shared';
import { useState } from 'react';
import { DialogContent, DialogDescription, DialogRoot, DialogTitle } from '@/design-system';

interface PhotoGalleryProps {
  photos: InspectionDetail['photos'];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selected, setSelected] = useState<number | null>(null);

  if (photos.length === 0) {
    return <p className="text-sm text-muted">Nenhuma foto anexada.</p>;
  }

  const current = selected === null ? undefined : photos[selected];

  return (
    <>
      <ul aria-label="Fotos da vistoria" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}
              className="block w-full overflow-hidden rounded-sm border border-border"
            >
              <img
                src={photo.url}
                alt={`Foto ${index + 1} de ${photos.length} da vistoria`}
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <DialogRoot open={current !== undefined} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold text-text">
            Foto {(selected ?? 0) + 1} de {photos.length}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Foto da vistoria em tamanho maior
          </DialogDescription>
          {current && (
            <img
              src={current.url}
              alt={`Foto ${(selected ?? 0) + 1} de ${photos.length} da vistoria, ampliada`}
              className="mt-4 max-h-[70vh] w-full rounded-sm object-contain"
            />
          )}
        </DialogContent>
      </DialogRoot>
    </>
  );
}
