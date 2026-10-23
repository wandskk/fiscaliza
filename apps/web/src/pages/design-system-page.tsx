import {
  Badge,
  Button,
  Card,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  FileDrop,
  Input,
  Select,
  Skeleton,
  Table,
  type TableColumn,
  Textarea,
  ThemeToggle,
  ToastContainer,
  useToast,
} from '@/design-system';
import { useState } from 'react';

function ToastSection() {
  const { showToast } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="primary"
        size="sm"
        onClick={() =>
          showToast('success', 'Operação concluída', 'Os dados foram salvos com sucesso.')
        }
      >
        Disparar Toast de Sucesso
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() =>
          showToast('error', 'Falha no processamento', 'Não foi possível completar a solicitação.')
        }
      >
        Disparar Toast de Erro
      </Button>
    </div>
  );
}

export function DesignSystemPage() {
  const [tableSortKey, setTableSortKey] = useState<string>('name');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sampleColumns: TableColumn[] = [
    { key: 'code', label: 'Código', sortable: true },
    { key: 'name', label: 'Identificador', sortable: true },
    { key: 'category', label: 'Categoria', sortable: false },
    { key: 'status', label: 'Situação', sortable: true },
  ];

  const sampleData = [
    {
      code: 'ITM-001',
      name: 'Módulo de Verificação Alpha',
      category: 'Estrutural',
      status: 'Concluído',
    },
    { code: 'ITM-002', name: 'Painel de Controle Beta', category: 'Elétrico', status: 'Pendente' },
    {
      code: 'ITM-003',
      name: 'Condutor Hidráulico Gama',
      category: 'Hidráulico',
      status: 'Em Análise',
    },
  ];

  function handleSort(key: string) {
    if (tableSortKey === key) {
      setTableSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDir('asc');
    }
  }

  const sampleFiles = [
    { id: 'f1', name: 'evidencia_01.jpg', progress: 100 },
    { id: 'f2', name: 'documento_tecnico.pdf', progress: 65 },
    {
      id: 'f3',
      name: 'arquivo_corrompido.png',
      progress: 30,
      error: 'Falha no envio: arquivo corrompido ou formato inválido.',
    },
  ];

  return (
    <ToastContainer>
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Design System — Fiscaliza
            </h1>
            <p className="text-sm text-muted">
              Vitrine de componentes base, paleta de cores e tipografia técnica.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Alternar tema:</span>
            <ThemeToggle />
          </div>
        </header>

        <div className="space-y-12">
          {/* Seção 1: Badges */}
          <section className="space-y-3" aria-labelledby="sec-badges">
            <h2 id="sec-badges" className="text-lg font-medium text-text">
              1. Badges (Indicadores de Tom)
            </h2>
            <div className="flex flex-wrap gap-3">
              <Badge tone="info">Rascunho (Info)</Badge>
              <Badge tone="warning">Aguardando decisão (Warning)</Badge>
              <Badge tone="success">Aprovada (Success)</Badge>
              <Badge tone="danger">Devolvida (Danger)</Badge>
            </div>
          </section>

          {/* Seção 2: Botões */}
          <section className="space-y-4" aria-labelledby="sec-buttons">
            <h2 id="sec-buttons" className="text-lg font-medium text-text">
              2. Botões (Variantes, Tamanhos e Estados)
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primário MD</Button>
              <Button variant="primary" size="sm">
                Primário SM
              </Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button
                variant="primary"
                loading={isSubmitting}
                onClick={() => {
                  setIsSubmitting(true);
                  setTimeout(() => setIsSubmitting(false), 2000);
                }}
              >
                {isSubmitting ? 'Salvando...' : 'Clique para Simular Loading'}
              </Button>
              <Button variant="primary" disabled>
                Desabilitado
              </Button>
            </div>
          </section>

          {/* Seção 3: Formulários (Input, Textarea, Select) */}
          <section className="space-y-4" aria-labelledby="sec-forms">
            <h2 id="sec-forms" className="text-lg font-medium text-text">
              3. Entradas de Dados (Campos com Rótulo, Dica e Erro)
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-text">Inputs e Selects</h3>
                <Input
                  id="demo-input-normal"
                  label="Campo Padrão"
                  placeholder="Digite aqui..."
                  hint="Texto de instrução auxiliar ao usuário"
                />
                <Input
                  id="demo-input-error"
                  label="Campo com Erro de Validação"
                  defaultValue="Entrada inválida"
                  error="O valor informado não atende aos requisitos mínimos"
                />
                <Select
                  id="demo-select"
                  label="Seleção de Categoria"
                  hint="Selecione um item da lista"
                >
                  <option value="1">Opção Técnica 01</option>
                  <option value="2">Opção Técnica 02</option>
                  <option value="3">Opção Técnica 03</option>
                </Select>
              </Card>

              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-text">Textareas</h3>
                <Textarea
                  id="demo-textarea-normal"
                  label="Observações Detalhadas"
                  placeholder="Insira notas explicativas..."
                  hint="Espaço livre para anotações contextuais"
                />
                <Textarea
                  id="demo-textarea-error"
                  label="Observações com Erro"
                  defaultValue="Curto"
                  error="A descrição deve conter no mínimo 30 caracteres"
                />
              </Card>
            </div>
          </section>

          {/* Seção 4: Cards & Estrutura */}
          <section className="space-y-4" aria-labelledby="sec-cards">
            <h2 id="sec-cards" className="text-lg font-medium text-text">
              4. Cards e Superfícies
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <h3 className="font-medium text-text">Painel de Informações</h3>
                <p className="mt-1 text-sm text-muted">
                  Superfície neutra sem sombra conforme diretrizes da seção 17 do PROJETO.md.
                </p>
              </Card>
              <Card>
                <h3 className="font-medium text-text">Métricas Técnicas</h3>
                <p className="mt-1 font-mono text-2xl text-primary">1.248</p>
                <p className="text-xs text-muted">Registros consolidados no sistema</p>
              </Card>
              <Card>
                <h3 className="font-medium text-text">Status Geral</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="success">Operacional</Badge>
                  <span className="text-xs text-muted">Última checagem recente</span>
                </div>
              </Card>
            </div>
          </section>

          {/* Seção 5: Tabela de Dados */}
          <section className="space-y-4" aria-labelledby="sec-table">
            <h2 id="sec-table" className="text-lg font-medium text-text">
              5. Tabela com Ordenação e Rolagem Horizontal
            </h2>
            <Table
              columns={sampleColumns}
              data={sampleData}
              sortKey={tableSortKey}
              sortDir={tableSortDir}
              onSort={handleSort}
            />
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-text">Exemplo com Estado Vazio:</h3>
              <Table
                columns={sampleColumns}
                data={[]}
                emptyMessage="Nenhum registro encontrado para os filtros aplicados."
              />
            </div>
          </section>

          {/* Seção 6: Dialog e Toast */}
          <section className="space-y-4" aria-labelledby="sec-feedback">
            <h2 id="sec-feedback" className="text-lg font-medium text-text">
              6. Diálogos Modais e Notificações (Radix UI)
            </h2>
            <Card className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium text-text">Diálogo Modal Acessível</h3>
                <p className="text-sm text-muted">
                  Trava de foco, fechamento com tecla Esc e restauração de foco ao gatilho.
                </p>
                <div className="mt-3">
                  <DialogRoot>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Abrir Diálogo de Confirmação
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle className="text-lg font-semibold text-text">
                        Confirmar Procedimento
                      </DialogTitle>
                      <DialogDescription className="mt-2 text-sm text-muted">
                        Esta ação atualizará os parâmetros no banco de dados. Deseja prosseguir com
                        a operação?
                      </DialogDescription>
                      <div className="mt-6 flex justify-end gap-3">
                        <DialogClose asChild>
                          <Button variant="ghost" size="sm">
                            Cancelar
                          </Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button variant="primary" size="sm">
                            Confirmar
                          </Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </DialogRoot>
                </div>
              </div>

              <div className="border-t border-border pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <h3 className="font-medium text-text">Notificações Toast</h3>
                <p className="mb-3 text-sm text-muted">
                  Anunciadas aos leitores de tela com roles apropriadas (status/alert).
                </p>
                <ToastSection />
              </div>
            </Card>
          </section>

          {/* Seção 7: Skeleton e EmptyState */}
          <section className="space-y-4" aria-labelledby="sec-placeholders">
            <h2 id="sec-placeholders" className="text-lg font-medium text-text">
              7. Skeleton e EmptyState
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-text">Skeleton (Carregamento)</h3>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </Card>
              <Card>
                <EmptyState
                  title="Nenhum item atribuído"
                  description="Você não possui nenhum item pendente no momento. Quando novos itens forem designados, eles aparecerão aqui."
                  action={{
                    label: 'Atualizar Lista',
                    onClick: () => alert('Ação do EmptyState disparada'),
                  }}
                />
              </Card>
            </div>
          </section>

          {/* Seção 8: FileDrop */}
          <section className="space-y-4" aria-labelledby="sec-filedrop">
            <h2 id="sec-filedrop" className="text-lg font-medium text-text">
              8. FileDrop (Área de Transferência e Lista de Arquivos)
            </h2>
            <Card>
              <FileDrop
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                files={sampleFiles}
                onFilesSelected={(selected) => {
                  alert(
                    `Selecionados ${selected.length} arquivo(s): ${selected.map((f) => f.name).join(', ')}`,
                  );
                }}
              />
            </Card>
          </section>
        </div>
      </main>
    </ToastContainer>
  );
}
