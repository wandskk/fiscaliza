# 006 Base do web e design system: plano

## Stack (seção 6)
React 19 + Vite + TypeScript strict, Tailwind CSS 4 (plugin do Vite, tokens via `@theme`), Vitest + Testing Library + jsdom, `@fiscaliza/config` para ESLint e tsconfig, `@fiscaliza/shared` como dependência (usado a partir da T14). Componentes no padrão shadcn/ui: código próprio no repositório, com Radix UI só onde a acessibilidade é difícil de fazer à mão (Dialog e Toast). `clsx` + `tailwind-merge` num helper `cn`.

## Estrutura

```
apps/web/
├─ index.html, vite.config.ts, vitest.config.ts, tsconfig.json, eslint.config.js, .env.example
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├─ app.tsx                     por enquanto só a rota /design-system e uma página inicial simples
   │  └─ theme/theme-provider.tsx, use-theme.ts
   ├─ design-system/
   │  ├─ tokens.css                  variáveis da seção 17 (claro em :root, escuro em [data-theme="dark"])
   │  ├─ cn.ts
   │  ├─ components/                 Button, Input, Textarea, Select, Badge, Card, Table, Dialog, Toast,
   │  │                              Skeleton, EmptyState, FileDrop, ThemeToggle (um arquivo por componente, com teste ao lado ou em test/)
   │  └─ index.ts                    exporta tudo
   └─ pages/design-system-page.tsx   vitrine, carregada só com import.meta.env.DEV
```

Decisões:
- **Tema por atributo `data-theme` no `<html>`**, definido por um script inline no `index.html` antes do React (evita piscar), a partir do `localStorage` ou do `prefers-color-scheme`. O `ThemeProvider` só lê e troca.
- **Tokens em CSS, Tailwind lê os tokens**: `@theme` aponta para as variáveis (`--color-surface: var(--surface)`), então a troca de tema não precisa de classes `dark:`.
- **Fontes** Instrument Sans e JetBrains Mono pelo pacote `@fontsource` (sem CDN).
- **Teste de contraste**: os valores das cores ficam num `tokens.ts` exportado e o `tokens.css` usa os mesmos valores. Um teste calcula a razão WCAG dos pares (texto e texto secundário sobre fundo e surface, `primary-fg` sobre `primary`, cada cor de status sobre surface) e exige AA (4,5:1); outro confere que o CSS contém cada valor do `tokens.ts`.
- **Componentes não conhecem negócio**: o `StatusBadge` de vistoria (spec 003) usa o `Badge` com o tom; aqui só o `Badge` genérico.
- **Variáveis** no `.env.example` do web: `VITE_API_URL=http://localhost:3000/api/v1`, `VITE_AUTH_MODE=local` (usados a partir da T14).

## Riscos
| Risco | Mitigação |
|---|---|
| Tailwind 4 com tokens em variável perder autocomplete | `@theme` declara todas as cores e raios com nome |
| Radix e React 19 | usar as versões atuais dos pacotes `@radix-ui/react-*`, que suportam React 19 |
| jsdom sem `matchMedia` | stub no setup do Vitest |
