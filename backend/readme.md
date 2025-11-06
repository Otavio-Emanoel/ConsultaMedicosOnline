# Backend — Consulta Médicos Online (Painel do Assinante)

> API intermediadora entre Rapidoc (telemedicina) e Asaas (pagamentos), com autenticação e base de dados (ex.: Firebase). Este README documenta setup, variáveis de ambiente e TODOS os endpoints previstos com responsabilidades e contratos resumidos.

---

## Visão geral
- Painel do Assinante: gestão de assinatura e acesso à telemedicina.
- Painel/Admin: gestão de planos, métricas e auditoria.
- Backend integra e orquestra: Auth + Banco + Asaas + Rapidoc.

Regras críticas
- Nunca criar beneficiário (Rapidoc) sem pagamento confirmado (Asaas).
- Cancelar assinatura somente se não houver débitos pendentes (validação Asaas).
- Toda resposta crítica de APIs externas deve ser registrada para auditoria (logs persistentes com data/hora e status de cada etapa).

---

## Tecnologias
- Node.js + TypeScript (ESM)
- Express
- Firebase (Auth e Firestore) — ou serviço equivalente
- Integrações externas: Asaas API, Rapidoc API

---

## Requisitos e execução

Pré-requisitos
- Node 18+ (recomendado 20/22)
- NPM 9+

Instalação
```sh
cd backend
npm install
```

Desenvolvimento (watch + reload)
```sh
# compila TS e reinicia o Node quando dist/ mudar
npm run dev
```

Build e produção
```sh
npm run build
npm start
```

Atalho (execução direta com ts-node – sem reload)
```sh
npm run dev:tsnode
```

---

## Variáveis de ambiente (.env)
Crie um arquivo `.env` na pasta `backend/` com as chaves abaixo (nomes sugestivos; ajuste conforme o provedor de Auth/Banco usado):

```env
# App
PORT=3000
APP_BASE_URL=http://localhost:3000
NODE_ENV=development

# Firebase (exemplo)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
# Asaas
ASAAS_BASE_URL=https://www.asaas.com/api/v3
ASAAS_API_KEY=your_asaas_key
ASAAS_WEBHOOK_SECRET=replace_with_random_secret

# Rapidoc
RAPIDOC_BASE_URL=https://api.rapidoc.example
RAPIDOC_API_KEY=your_rapidoc_key
```

Observações
- `ASAAS_WEBHOOK_SECRET` assina/valida chamadas do webhook.
- As credenciais do Firebase podem ser injetadas via variáveis ou arquivo de credenciais.

---

## Modelagem (alto nível)
Coleções (Firestore ou equivalente)
- users: perfil do assinante/admin, mapeamento `userId`, CPF, e-mail.
- plans: metadados de planos ofertados (admin).
- subscriptions: dados da assinatura, status, datas, relação com Asaas (customerId, subscriptionId).
- dependents: lista de beneficiários do assinante (Rapidoc patientId).
- mappings: relação `userId ↔ rapidocUid ↔ asaasCustomerId`.
- logs: auditoria de chamadas críticas (request/response das integrações e status).

---

## Autenticação
- Preferencial: Firebase Auth (Bearer token no header `Authorization: Bearer <token>`).
- Middleware valida token e injeta `req.user` (id, email, roles, cpf...).
- Perfis: `admin`, `subscriber` (assinante), `dependent` (acesso restrito aos recursos do titular).

---

## Endpoints da API
Base URL: `/api`

Padrão de resposta de erro
```json
{
	"error": {
		"code": "string",
		"message": "string",
		"details": { }
	}
}
```

### Health
- GET `/api/health` — healthcheck (200 OK)

### Auth (painel)
- POST `/api/auth/login` — delega ao provedor (ex.: Firebase ou outro). Se usar Firebase no frontend, o backend apenas valida tokens em middlewares; esse endpoint pode não ser necessário.
- GET `/api/auth/me` — retorna perfil do usuário autenticado.

### Primeiro acesso / validações iniciais
- POST `/api/first-access/validate-cpf`
	- Body: `{ "cpf": "string" }`
	- Ações: consulta Asaas por assinatura; se existir e estiver ok, valida/obtém beneficiário Rapidoc; sincroniza mapeamentos e dados locais.

### Assinaturas (Asaas)
- POST `/api/subscriptions/initiate`
	- Body: dados do cliente + plano (campos compatíveis com Asaas e requisitos do Rapidoc).
	- Cria customer no Asaas, inicia assinatura/cobrança, registra localmente em `subscriptions`.
- GET `/api/subscription/status`
	- Retorna status atual (consulta Asaas e cache/banco local).
- POST `/api/subscription/cancel`
	- Regras: só cancela se Asaas indicar que não há débitos pendentes.

### Webhooks (Asaas)
- POST `/api/webhooks/asaas`
	- Recebe eventos de pagamento/assinatura. Valida assinatura do webhook via `ASAAS_WEBHOOK_SECRET`.
	- Ao confirmar pagamento: cria beneficiário (Rapidoc) se não existir; grava logs e atualiza `subscriptions`.

### Telemedicina (Rapidoc)
- POST `/api/telemed/patients`
	- Cria beneficiário/paciente no Rapidoc (normalmente disparado pós-pagamento ou via painel admin).
- GET `/api/telemed/me`
	- Retorna dados do paciente/usuário no Rapidoc vinculado ao `userId`.
- POST `/api/telemed/consult-now`
	- Chama consulta imediata (immediate care) na Rapidoc.
- POST `/api/telemed/appointments`
	- Agenda atendimento. Body traz data/horário e campos obrigatórios do Rapidoc.

### Dependentes (beneficiários)
- GET `/api/dependents`
	- Lista dependentes do assinante autenticado.
- POST `/api/dependents`
	- Cria dependente: registra no Rapidoc e persiste local; aplica regras de limite por plano (se houver).
- DELETE `/api/dependents/:id`
	- Remove dependente (se permitido pelas regras do plano e da Rapidoc).

### Faturas (Asaas)
- GET `/api/invoices`
	- Lista faturas do assinante (consulta Asaas e/ou cache/banco).
- GET `/api/invoices/:id`
	- Detalhe de fatura.

### Meus dados (assinante)
- GET `/api/me`
	- Dados do perfil no painel (e mapeamentos com Asaas/Rapidoc).
- PUT `/api/me`
	- Atualiza dados básicos: sincroniza Firebase + Rapidoc + Asaas quando aplicável.

### Admin — Planos e gestão
- POST `/api/admin/plans`
	- Cria/atualiza plano (registra no banco + vincula UID Rapidoc, se necessário).
- GET `/api/admin/plans`
	- Lista planos.
- GET `/api/admin/dashboard`
	- Métricas: total de assinantes / pendentes / cancelados.
- GET `/api/admin/logs`
	- Retorna registros de auditoria filtráveis por período, usuário, integração.

---

## Contratos resumidos (exemplos)

Criar assinatura
```http
POST /api/subscriptions/initiate
Content-Type: application/json
Authorization: Bearer <token>

{
	"planId": "string",
	"customer": {
		"name": "string",
		"cpf": "string",
		"email": "string",
		"phone": "string"
	},
	"address": { "zip": "string", "street": "string", "number": "string", "city": "string", "state": "string" }
}
```

Resposta (200)
```json
{
	"subscriptionId": "asaas_sub_id",
	"customerId": "asaas_cus_id",
	"status": "PENDING" | "ACTIVE",
	"nextInvoice": { "id": "...", "dueDate": "...", "value": 0 }
}
```

Webhook Asaas (pagamento confirmado)
```http
POST /api/webhooks/asaas
X-Signature: <hmac>

{ /* payload do Asaas */ }
```
Ação: valida assinatura, atualiza `subscriptions`, chama Rapidoc para criar/garantir beneficiário, grava logs.

Agendar consulta
```http
POST /api/telemed/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
	"patientId": "rapidoc_patient_id",
	"datetime": "2025-11-06T14:00:00-03:00",
	"reason": "string"
}
```

---

## Logs e Auditoria
- Todas as chamadas críticas às APIs externas têm request/response e status registrados em `logs`.
- Cada etapa do fluxo (assinatura, pagamento, criação de beneficiário, agendamento) registra data/hora, usuário e resultado.

---

## Tratamento de erros
- Respostas padronizadas (vide estrutura acima).
- Mapeamento de códigos de erro relevantes (ex.: `ASAAS_PAYMENT_PENDING`, `ASAAS_OVERDUE`, `RAPIDOC_VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`).

---

## Segurança
- Autorização por perfis/escopos nos endpoints admin e recursos sensíveis.
- Validação do webhook Asaas via HMAC/segredo (`ASAAS_WEBHOOK_SECRET`).
- Sanitização/validação de entrada (CPF, e-mail, datas). 
- Não expor chaves de API no frontend; chamadas às integrações sempre via backend.

---

## Roadmap de implementação (resumo)
1) Autenticação (middleware + `GET /api/auth/me`).
2) Integração Asaas: create customer + assinatura; webhook pagamento.
3) Integração Rapidoc: criação de beneficiário + agendamentos + consulta imediata.
4) Modelos e persistência (users, plans, subscriptions, dependents, mappings, logs).
5) Painel Admin: planos, dashboard, logs.
6) Auditoria e robustez (retries, idempotência no webhook).

---

## Dicas de desenvolvimento
- Use `npm run dev` para hot-reload (TS → dist → Node).
- Cubra integrações externas com mocks nos testes.
- Mantenha os schemas de requests/responses atualizados conforme Asaas/Rapidoc.

---

## Endpoints — resumo por área
- Health: `GET /api/health`
- Speedtest: `GET /api/speedtest`
- Auth: `GET /api/auth/me`
- Primeiro acesso: `POST /api/first-access/validate-cpf`
- Assinatura: `POST /api/subscriptions/initiate`, `GET /api/subscription/status`, `POST /api/subscription/cancel`
- Webhook Asaas: `POST /api/webhooks/asaas`
- Telemedicina: `POST /api/telemed/patients`, `GET /api/telemed/me`, `POST /api/telemed/consult-now`, `POST /api/telemed/appointments`
- Dependentes: `GET /api/dependents`, `POST /api/dependents`, `DELETE /api/dependents/:id`
- Faturas: `GET /api/invoices`, `GET /api/invoices/:id`
- Meus dados: `GET /api/me`, `PUT /api/me`
- Admin: `POST /api/admin/plans`, `GET /api/admin/plans`, `GET /api/admin/dashboard`, `GET /api/admin/logs`

---

Qualquer ajuste de nomenclatura/rotas conforme seus contratos de Rapidoc/Asaas, me avise que atualizo este README.