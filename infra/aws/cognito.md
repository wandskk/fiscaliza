# Cognito: User Pool do Fiscaliza

Passo a passo para criar o User Pool que a API valida com `AUTH_MODE=cognito`. Para rodar sem AWS, use `AUTH_MODE=local` (usuários de teste fixos, ver `apps/api/.env.example`).

Os comandos usam a AWS CLI v2 com um perfil que tenha permissão em `cognito-idp`. Rode tudo no mesmo terminal (bash), porque os ids ficam em variáveis.

```bash
export AWS_REGION=us-east-1
```

## 1. User Pool

Login por e-mail, sem cadastro pela tela: só o administrador cria usuários (seção 2 do `PROJETO.md`).

```bash
POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name fiscaliza \
  --username-attributes email \
  --auto-verified-attributes email \
  --admin-create-user-config AllowAdminCreateUserOnly=true \
  --query UserPool.Id --output text)
echo "$POOL_ID"
```

O id tem a forma `us-east-1_AbC123`. A região é o prefixo, por isso a API não tem variável de região.

## 2. Grupos

O perfil vem do grupo (`roleFromGroups`): `inspector` vira `INSPECTOR`, `manager` vira `MANAGER`. Quem estiver nos dois é gestor. Quem não estiver em nenhum recebe 403.

```bash
aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name inspector --description "Fiscal de obra"
aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name manager --description "Gestor"
```

## 3. App client

Cliente público (SPA), sem segredo, com SRP para o Amplify. O `ALLOW_ADMIN_USER_PASSWORD_AUTH` só serve para o teste da seção 6: ele exige credencial IAM, então o navegador não consegue usá-lo.

```bash
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name fiscaliza-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_ADMIN_USER_PASSWORD_AUTH \
  --prevent-user-existence-errors ENABLED \
  --query UserPoolClient.ClientId --output text)
echo "$CLIENT_ID"
```

## 4. Usuários de teste

Mesmos papéis do modo local: dois fiscais e um gestor. Troque os e-mails e a senha. A senha precisa seguir a política padrão (8 caracteres, maiúscula, minúscula, número e símbolo).

```bash
create_user() { # email nome grupo
  aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$1" \
    --user-attributes Name=email,Value="$1" Name=email_verified,Value=true Name=name,Value="$2" \
    --message-action SUPPRESS > /dev/null
  aws cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" --username "$1" \
    --password "$SENHA" --permanent
  aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$1" --group-name "$3"
}

read -rs -p "Senha dos usuários de teste: " SENHA; echo
create_user fiscal@seu-dominio.com "Fiscal de Teste" inspector
create_user fiscal2@seu-dominio.com "Fiscal de Teste 2" inspector
create_user gestor@seu-dominio.com "Gestor de Teste" manager
```

Cada usuário só aparece na API (por exemplo, no seletor de fiscais da obra) depois de entrar uma vez, porque o cadastro no banco é criado no primeiro `GET /me`.

## 5. Configurar a API

No `apps/api/.env` (nunca no `.env.example`):

```
AUTH_MODE=cognito
COGNITO_USER_POOL_ID=<valor de $POOL_ID>
COGNITO_CLIENT_ID=<valor de $CLIENT_ID>
```

A API baixa as chaves públicas (JWKS) do User Pool no primeiro token e guarda em cache. Ela não precisa de credencial AWS para validar tokens.

## 6. Teste real do login

Pega os tokens do gestor e chama o `/me` com o access token no `Authorization` e o ID token no `x-id-token`.

```bash
TOKENS=$(aws cognito-idp admin-initiate-auth --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=gestor@seu-dominio.com,PASSWORD="$SENHA" \
  --query AuthenticationResult)
ACCESS=$(echo "$TOKENS" | node -pe "JSON.parse(require('fs').readFileSync(0)).AccessToken")
ID=$(echo "$TOKENS" | node -pe "JSON.parse(require('fs').readFileSync(0)).IdToken")

curl -s localhost:3000/api/v1/me -H "Authorization: Bearer $ACCESS" -H "x-id-token: $ID"
```

Esperado: `200` com `{ "id": "<sub>", "name": "Gestor de Teste", "email": "gestor@seu-dominio.com", "role": "MANAGER" }`, e a linha criada na tabela `users`. Sem o `x-id-token`, ou com o token de outro User Pool, a resposta é `401 UNAUTHORIZED`.

### Registro

| Data     | Quem | Resultado |
| -------- | ---- | --------- |
| 2026-10-23 | Wanderson | `/me` com o gestor: `200`, `role: MANAGER`, linha criada em `users`. Sem `x-id-token`: `401`. Pool em us-east-1. |

## 7. Remover

```bash
aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID"
```
