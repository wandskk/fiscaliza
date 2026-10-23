# 006 Base do web e design system

## Problema
As telas de login, obras, vistoria e painel (specs 001 a 003 e seguintes) precisam de um app web pronto e de um conjunto de componentes com a mesma aparência, acessíveis e com tema claro e escuro. Sem isso, cada tela inventaria o próprio visual.

## Usuários
Desenvolvedor (usa os componentes). Fiscal e gestor (veem o resultado).

## Histórias
- Como desenvolvedor, quero rodar o web com um comando e já ter lint, typecheck, testes e build no mesmo padrão do monorepo.
- Como desenvolvedor, quero componentes base prontos (botão, campos, badge, card, tabela, diálogo, toast, skeleton, estado vazio, área de soltar arquivo) que não conhecem obra nem vistoria.
- Como usuário, quero tema claro e escuro, seguindo o sistema e com troca manual que fica salva.
- Como usuário, quero usar tudo pelo teclado e com contraste legível.

## Regras
Seções 16 e 17 do `PROJETO.md`. Nenhuma RN de negócio aqui.

## Critérios de aceite
- `pnpm --filter @fiscaliza/web dev` sobe o app em `http://localhost:5173`; `build`, `lint`, `typecheck` e `test` rodam pela raiz junto com os outros pacotes e passam no CI.
- Os tokens da seção 17 existem como variáveis CSS nos dois temas e estão disponíveis como classes do Tailwind (ex.: `bg-surface`, `text-muted`).
- O tema segue `prefers-color-scheme` na primeira visita; a troca manual vale na hora e continua depois de recarregar.
- Button: variantes `primary`, `secondary`, `ghost`, `danger`, tamanhos `sm` e `md`; com `loading` mostra spinner, fica desabilitado e não dispara clique duplo.
- Input, Textarea e Select: `label` ligado ao campo, `hint` e `error` ligados por `aria-describedby`, `aria-invalid` quando há erro.
- Badge recebe tom (`info`, `warning`, `success`, `danger`) e sempre mostra texto.
- Dialog prende o foco, fecha com Esc e devolve o foco a quem abriu.
- Toast `success` e `error` anunciado para leitor de tela (`role="status"` ou `alert`).
- Table com ordenação por coluna (indicador e `aria-sort`), estado vazio e rolagem horizontal no celular.
- Skeleton e EmptyState (título, descrição e ação opcional).
- FileDrop aceita arrastar e clicar, filtra por `accept`, e mostra uma lista de arquivos com progresso e erro por item, vindos por props.
- Foco visível em todo elemento interativo; contraste AA nos pares texto/fundo dos tokens nos dois temas (conferido por teste).
- Página `/design-system`, só no modo de desenvolvimento, mostra todos os componentes nos dois temas.

## Fora do escopo
- Telas de negócio, router com perfil, cliente HTTP e login: spec 001 (T14) e seguintes.
- Container Docker do web e deploy: spec de entrega.
- Storybook.
