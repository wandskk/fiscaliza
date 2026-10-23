import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileDrop, type FileItem } from './FileDrop';

function createFile(name: string, type = 'image/jpeg'): File {
  return new File(['content'], name, { type });
}

describe('FileDrop', () => {
  it('renders drop zone with accessible label', () => {
    render(<FileDrop onFilesSelected={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Área de soltar arquivos' })).toBeInTheDocument();
  });

  it('click on drop zone triggers hidden file input', async () => {
    const user = userEvent.setup();
    render(<FileDrop onFilesSelected={vi.fn()} />);
    const input = screen.getByLabelText('Selecionar arquivos') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    await user.click(screen.getByRole('region', { name: 'Área de soltar arquivos' }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('drop calls onFilesSelected with dropped files', () => {
    const onFilesSelected = vi.fn();
    render(<FileDrop onFilesSelected={onFilesSelected} />);
    const zone = screen.getByRole('region', { name: 'Área de soltar arquivos' });

    const file = createFile('foto.jpg');
    const dataTransfer = {
      files: [file],
      items: [],
      types: [],
    };

    fireEvent.dragOver(zone, { dataTransfer });
    fireEvent.drop(zone, { dataTransfer });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('displays file list with progress bars', () => {
    const files: FileItem[] = [
      { id: '1', name: 'foto.jpg', progress: 60 },
      { id: '2', name: 'planta.png', progress: 100 },
    ];
    render(<FileDrop onFilesSelected={vi.fn()} files={files} />);
    expect(screen.getByText('foto.jpg')).toBeInTheDocument();
    expect(screen.getByText('planta.png')).toBeInTheDocument();
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '60');
  });

  it('displays per-item error message', () => {
    const files: FileItem[] = [
      { id: '1', name: 'foto.jpg', progress: 0, error: 'Arquivo muito grande' },
    ];
    render(<FileDrop onFilesSelected={vi.fn()} files={files} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Arquivo muito grande');
  });

  it('does not call onFilesSelected when disabled and drop occurs', () => {
    const onFilesSelected = vi.fn();
    render(<FileDrop onFilesSelected={onFilesSelected} disabled />);
    const zone = screen.getByRole('region', { name: 'Área de soltar arquivos' });
    const file = createFile('foto.jpg');
    const dataTransfer = {
      files: [file],
      items: [],
      types: [],
    };
    fireEvent.drop(zone, { dataTransfer });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
