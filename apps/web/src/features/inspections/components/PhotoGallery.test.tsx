import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PhotoGallery } from './PhotoGallery';

const photos = [
  { id: 'p1', key: 'k1', contentType: 'image/jpeg', size: 1, url: 'https://cdn.example.com/1.jpg' },
  { id: 'p2', key: 'k2', contentType: 'image/jpeg', size: 1, url: 'https://cdn.example.com/2.jpg' },
];

describe('PhotoGallery', () => {
  it('shows an empty message when there are no photos', () => {
    render(<PhotoGallery photos={[]} />);
    expect(screen.getByText('Nenhuma foto anexada.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a thumbnail per photo with a descriptive alt', () => {
    render(<PhotoGallery photos={photos} />);
    expect(screen.getByAltText('Foto 1 de 2 da vistoria')).toHaveAttribute('src', photos[0]?.url);
    expect(screen.getByAltText('Foto 2 de 2 da vistoria')).toHaveAttribute('src', photos[1]?.url);
  });

  it('opens the photo in a larger view and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<PhotoGallery photos={photos} />);
    await user.click(screen.getByRole('button', { name: 'Ampliar foto 2 de 2' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('Foto 2 de 2 da vistoria, ampliada')).toHaveAttribute(
      'src',
      photos[1]?.url,
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
