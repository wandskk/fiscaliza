import { EmptyState } from '@/design-system';

// Placeholder: the construction sites list arrives with spec 002
export function ConstructionSitesPage() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Obras</h1>
      <EmptyState title="Em construção" description="A lista de obras chega na próxima etapa." />
    </section>
  );
}
