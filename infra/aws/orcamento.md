# Alerta de orçamento na AWS

Passo a passo para criar um orçamento mensal de US$ 5 no AWS Budgets, com aviso por e-mail quando o gasto real chegar a 80% (US$ 4) e a 100% (US$ 5). Serve para não ser surpreendido por cobrança enquanto o Fiscaliza roda na conta.

Dois avisos antes de começar:

- O AWS Budgets avisa, mas não bloqueia nem desliga nada. Se aparecer o alerta, apague os recursos que não precisa mais.
- O dado de custo atrasa algumas horas. O alerta não é em tempo real.

Use o e-mail que você realmente lê. Nada de dados reais da conta fica neste arquivo: os comandos abaixo pegam o id da conta na hora.

## Pelo console

1. Entre no console da AWS e abra **Billing and Cost Management** (pesquise "Billing").
2. No menu lateral, abra **Budgets** e clique em **Create budget**.
3. Escolha **Customize (advanced)** e o tipo **Cost budget**. Avance.
4. Em **Budget name**, use `fiscaliza-mensal`. Período **Monthly**, tipo de renovação **Recurring budget**, **Budgeted amount** `5` (USD). Deixe o escopo em todos os serviços. Avance.
5. Adicione o primeiro alerta: **Threshold** `80`, **% of budgeted amount**, gatilho **Actual**. Em **Email recipients**, informe seu e-mail.
6. Adicione o segundo alerta: **Threshold** `100`, **% of budgeted amount**, gatilho **Actual**, com o mesmo e-mail.
7. Avance até **Review** e clique em **Create budget**.

## Pela AWS CLI

Precisa da AWS CLI v2 e de um perfil com permissão em `budgets:*`. O serviço Budgets responde pela região `us-east-1`. Rode tudo no mesmo terminal (bash).

```bash
export AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
EMAIL="voce@exemplo.com"   # troque pelo seu e-mail
```

Crie o orçamento com os dois alertas:

```bash
aws budgets create-budget \
  --account-id "$ACCOUNT_ID" \
  --budget '{
    "BudgetName": "fiscaliza-mensal",
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY",
    "BudgetLimit": { "Amount": "5", "Unit": "USD" }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{ "SubscriptionType": "EMAIL", "Address": "'"$EMAIL"'" }]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{ "SubscriptionType": "EMAIL", "Address": "'"$EMAIL"'" }]
    }
  ]'
```

O comando não imprime nada quando dá certo.

## Conferir

```bash
aws budgets describe-budget --account-id "$ACCOUNT_ID" --budget-name fiscaliza-mensal
aws budgets describe-notifications-for-budget --account-id "$ACCOUNT_ID" --budget-name fiscaliza-mensal
aws budgets describe-subscribers-for-notification --account-id "$ACCOUNT_ID" --budget-name fiscaliza-mensal \
  --notification '{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"}'
```

Esperado: o orçamento com limite de 5 USD mensal, duas notificações (80 e 100) e o seu e-mail como assinante. No console, o orçamento aparece em **Budgets**.

## Remover

Quando desmontar o ambiente:

```bash
aws budgets delete-budget --account-id "$ACCOUNT_ID" --budget-name fiscaliza-mensal
```

Pelo console: **Budgets**, selecione `fiscaliza-mensal`, **Actions**, **Delete**.

## Depois de criar

Marque o item "Alerta de orçamento criado na AWS" na seção 31 do `PROJETO.md`.
