# Modelo de dados

```mermaid
erDiagram
  users {
    string id PK "sub do Cognito"
    string name
    string email UK
    Role role "INSPECTOR ou MANAGER"
  }
  construction_sites {
    string id PK
    string name
    string contract UK
    string address
    boolean closed
    datetime createdAt
  }
  site_assignments {
    string constructionSiteId PK, FK
    string inspectorId PK, FK
  }
  inspections {
    string id PK
    string constructionSiteId FK
    string inspectorId FK
    string notes
    Compliance compliance
    InspectionStatus status "DRAFT, SUBMITTED, APPROVED ou RETURNED"
    string returnReason "nulo fora de RETURNED"
    datetime createdAt
    datetime updatedAt
  }
  photos {
    string id PK
    string inspectionId FK
    string key UK "chave do objeto no S3"
    string contentType
    int size
  }
  inspection_status_history {
    string id PK
    string inspectionId FK
    InspectionStatus from "nulo na criação"
    InspectionStatus to
    string userId FK
    datetime at
    string reason "motivo da devolução, RN-06"
  }
  reports {
    string id PK
    string inspectionId FK, UK
    string summary
    json nonConformities "validado por aiReportSchema"
    Severity severity
    string model "LLM que respondeu"
    string eventId UK "evento que gerou o relatório"
    datetime generatedAt
  }
  outbox_events {
    string id PK "mesmo id do envelope"
    string type "InspectionSubmitted ou InspectionDecided"
    json payload "envelope inteiro"
    datetime createdAt
    datetime publishedAt "nulo enquanto pendente"
    int attempts
  }
  notifications {
    string id PK
    string eventId UK "evento que causou o e-mail"
    string userId FK
    string inspectionId FK
    string channel "EMAIL"
    string subject
    datetime sentAt
  }

  construction_sites ||--o{ site_assignments : "tem fiscais"
  users ||--o{ site_assignments : "é atribuído"
  construction_sites ||--o{ inspections : "recebe"
  users ||--o{ inspections : "cria como fiscal"
  inspections ||--o{ photos : "tem até 10"
  inspections ||--o{ inspection_status_history : "registra"
  users ||--o{ inspection_status_history : "muda o status"
  inspections ||--o| reports : "tem no máximo um"
  inspections ||--o{ notifications : "gera"
  users ||--o{ notifications : "recebe"
```

## O que mostrar na entrevista

`outbox_events` é a única tabela sem relação com as outras, de propósito: o evento carrega o envelope inteiro e nasce na mesma transação da mudança. `reports` e `notifications` são escritas pelo worker e têm `eventId` único, que é o que torna os consumidores idempotentes. `reports` tem uma linha por vistoria (`inspectionId` único), então um reenvio depois de devolvida sobrescreve o relatório anterior.

## Notas de conferência com o código

- Nomes em inglês, pelo glossário da constitution: `Obra` é `construction_sites`, `ObraFiscal` é `site_assignments`, `HistoricoStatus` é `inspection_status_history`, `OutboxEvento` é `outbox_events`.
- O `PROJETO.md` (seção 11) está desatualizado em relação ao schema: faltam `Notification`, `InspectionStatusHistory.reason`, `Report.eventId`, `Report.generatedAt` sem default, `OutboxEvent` com índice `(publishedAt, createdAt)`, a relação de `User` com vistorias e histórico, e os índices trigram de `construction_sites`.
- `Photo`, `InspectionStatusHistory`, `Report` e `Notification` apagam em cascata com a vistoria. `SiteAssignment` apaga em cascata com a obra.
- Os valores dos enums estão em inglês: `Role { INSPECTOR, MANAGER }`, `Compliance { COMPLIANT, NON_COMPLIANT }`, `InspectionStatus { DRAFT, SUBMITTED, APPROVED, RETURNED }` e `Severity { LOW, MEDIUM, HIGH }`.
- O diagrama é gerado à mão a partir de `apps/api/prisma/schema.prisma`. Se o schema mudar, o diagrama precisa ser atualizado.
