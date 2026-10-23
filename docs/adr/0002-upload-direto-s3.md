# ADR 0002: Upload direto ao S3 por URL pré-assinada

- Status: Aceito (2026-10-23)
- Spec: 003 Vistoria e fotos, constitution seção 2

## Contexto

Cada vistoria aceita até 10 fotos de até 10 MB (RN-05). Passar esses arquivos pela API gastaria banda, memória e tempo do processo que atende todas as rotas, e a API teria de lidar com arquivo, o que não é o papel dela.

## Decisão

O arquivo nunca passa pela API. O envio de uma foto tem três passos:

1. `POST /inspections/:id/photos/upload-url` com tipo e tamanho. A API valida RN-05 (JPEG, PNG ou WebP, até 10 MB, no máximo 10 fotos), gera a chave `inspections/<inspectionId>/<uuid>.<ext>` no servidor e devolve uma URL `PUT` que expira em 5 minutos, com `Content-Type` assinado.
2. O navegador envia o arquivo direto ao S3.
3. `POST /inspections/:id/photos` com a chave. A API faz um `HeadObject`, confere tipo e tamanho reais e só então grava a foto. O front poderia confirmar sem ter enviado, por isso o bucket é a fonte da verdade.

O bucket é privado. Para exibir, o detalhe da vistoria devolve URLs de leitura pré-assinadas de 5 minutos. O limite de 10 fotos é conferido ao assinar e de novo ao confirmar, dentro da transação, com a vistoria travada por `FOR UPDATE` (duas abas assinando ao mesmo tempo).

## Consequências

Boas:

- A API continua leve e sem arquivo em memória. O cliente não escolhe a chave, então não escreve fora da própria vistoria.
- O mesmo código serve ao LocalStack e ao S3 real, trocando só o endpoint.

Ruins:

- Fotos enviadas e nunca confirmadas ficam órfãs no bucket. Não há rotina de limpeza (seria uma regra de ciclo de vida no S3, fora do escopo).
- Ao remover uma foto, o objeto é apagado depois do commit. Se a remoção no S3 falhar, sobra um objeto sem registro.
- É preciso CORS no bucket (`PUT` e `GET` da origem do front) e, no ambiente local, dois endpoints: `AWS_ENDPOINT` (rede do compose) e `AWS_PUBLIC_ENDPOINT` (o que o navegador alcança) para assinar a URL.
- O SDK do S3 assina por padrão um checksum do corpo vazio, o que quebra o envio real. O adapter usa `requestChecksumCalculation: 'WHEN_REQUIRED'`.

## Alternativas descartadas

- Receber o arquivo na API (multipart) e repassar ao S3: carga e memória na API sem ganho.
- Uma rota só, sem confirmação: não prova que o arquivo existe com o tipo e o tamanho declarados.
- Bucket público ou URL de leitura permanente: expõe fotos de obras públicas.

## Onde está no código

- Casos de uso: `apps/api/src/modules/inspections/application/request-upload-url.use-case.ts`, `confirm-photo.use-case.ts` e `remove-photo.use-case.ts`.
- Adapter: `apps/api/src/modules/inspections/infrastructure/s3-storage.adapter.ts` (porta `Storage` em `application/ports/storage.port.ts`).
- Regra RN-05 e limite: `apps/api/src/modules/inspections/domain/inspection.entity.ts` e `packages/shared/src/schemas/upload.schema.ts`.
- Bucket e CORS: `infra/localstack/init.sh`. O front das vistorias (`use-upload-photo`, spec 003 T15) ainda não existe neste código: hoje só a API cumpre os três passos.
- Spec: `specs/003-vistoria-e-fotos` (tarefas T08 e T09).
- Diferença para o `PROJETO.md`: rotas e chave estão em inglês no código (`/inspections`, `inspections/<id>/...`); o `PROJETO.md` usa `/vistorias` e `vistorias/<id>/...`.
