import { cn } from '@/design-system/cn';
import { type DragEvent, useRef, useState } from 'react';

export interface FileItem {
  id: string;
  name: string;
  progress: number; // 0–100
  error?: string;
}

interface FileDropProps {
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  files?: FileItem[];
  disabled?: boolean;
  className?: string;
}

export function FileDrop({
  accept,
  multiple = false,
  onFilesSelected,
  files = [],
  disabled = false,
  className,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const filtered = filterByAccept(droppedFiles, accept);
    if (filtered.length > 0) onFilesSelected(filtered);
  }

  function handleChange() {
    const selected = Array.from(inputRef.current?.files ?? []);
    const filtered = filterByAccept(selected, accept);
    if (filtered.length > 0) onFilesSelected(filtered);
    // Reset so the same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleClick() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Drop zone */}
      <div
        role="region"
        aria-label="Área de soltar arquivos"
        aria-disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={disabled ? undefined : 0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2',
          'rounded-md border-2 border-dashed border-border px-6 py-10',
          'text-sm text-muted transition-colors',
          'focus-visible:outline-2 focus-visible:outline-primary',
          isDragOver && !disabled && 'border-primary bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M12 12v9" />
          <path d="m8 17 4-5 4 5" />
        </svg>
        <p>
          Arraste arquivos aqui ou{' '}
          <span className="text-primary underline">clique para selecionar</span>
        </p>
        {accept && <p className="text-xs text-muted">Tipos aceitos: {accept}</p>}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        aria-label="Selecionar arquivos"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Arquivos selecionados">
          {files.map((file) => (
            <li key={file.id} className="flex flex-col gap-1 rounded-sm border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-text">{file.name}</span>
                <span className="text-xs text-muted">{file.progress}%</span>
              </div>
              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={file.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso de ${file.name}`}
                className="h-1 overflow-hidden rounded-full bg-border"
              >
                <div
                  className={cn('h-full transition-all', file.error ? 'bg-danger' : 'bg-primary')}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              {/* Per-item error */}
              {file.error && (
                <p role="alert" className="text-xs text-danger">
                  {file.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterByAccept(files: File[], accept?: string): File[] {
  if (!accept) return files;
  const types = accept.split(',').map((t) => t.trim().toLowerCase());
  return files.filter((f) => {
    const mime = f.type.toLowerCase();
    const ext = `.${f.name.split('.').pop()?.toLowerCase()}`;
    return types.some(
      (t) => t === mime || t === ext || (t.endsWith('/*') && mime.startsWith(t.slice(0, -1))),
    );
  });
}
