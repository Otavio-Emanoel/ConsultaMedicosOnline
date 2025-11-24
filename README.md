<div align="center">

# Consulta Médicos Online

Painel do Assinante de Telemedicina • Orquestração Rapidoc + Asaas + Firebase

Status: 🚧 Em desenvolvimento ativo

</div>

---

## Visão Geral

Plataforma que centraliza a experiência do assinante: gerencia assinatura e pagamentos (Asaas), dados e consultas (Rapidoc), autenticação e dados de perfil (Firebase). O backend atua como BFF/Orquestrador, garantindo segurança das chaves e rastreabilidade via logs.

## Capturas de Tela

![Landing Page](./preview/front%201.PNG)

![Painel do Assinante – Consultas](./preview/front%202.PNG)

![Planos](./preview/front%203.png)

## Principais Recursos

- Assinatura: criação de cliente/assinatura no Asaas, checagem de pagamento e cancelamento condicionado a pendências.
- Beneficiário Rapidoc: criação após confirmação do pagamento, inativação por CPF, associação de especialidades.
- Consultas: agendamento tradicional e “Consulta Imediata” (fila/triagem com tentativa automática opcional).
- Dependentes: CRUD (local) vinculado ao titular; sincronizações essenciais com Rapidoc quando aplicável.
- Dashboard do assinante: dados do usuário, consultas (Rapidoc), faturas (Asaas), resumo do beneficiário.
- Dashboard admin: totais e faturamento, com autenticação de administradores.
- Auditoria: middleware de logs no Firestore (método, rota, uid/cpf, status, latência).

## Arquitetura (alto nível)

- Frontend: Next.js (pasta `frontend/` e landing dedicada)
- Backend: Express + TypeScript (pasta `backend/`)
- Banco de dados: Firebase Firestore
- Auth: Firebase Authentication (JWT no header Authorization)
- Integrações:
	- Rapidoc (beneficiários, planos, especialidades, consultas)
	- Asaas (clientes, assinaturas, pagamentos/faturas)

## Fluxos-Chave

1) Nova Assinatura (start → pagamento → beneficiário Rapidoc → usuário Firestore → acesso)
2) Primeiro Acesso (CPF → validações Asaas/Rapidoc → criação de login → dashboard)
3) Consulta Imediata (fila/triagem persistida + tentativa de agendamento imediato opcional)

Regras:
- Nunca criar beneficiário Rapidoc antes do pagamento confirmado (Asaas)
- Nunca cancelar plano com débito pendente
- Sempre logar eventos críticos de API

## Endpoints

- A documentação completa está em `backend/endpoints.md`.
- Exemplos: assinatura, beneficiário Rapidoc, consultas, dashboards, planos, especialidades e auditoria.

## Rodando Localmente

Requisitos: Node 18+, conta Firebase (Admin SDK), chaves Asaas e Rapidoc.

```sh
# Clonar
git clone https://github.com/Otavio-Emanoel/ConsultaMedicosOnline.git
cd ConsultaMedicosOnline

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

Variáveis de ambiente (backend/.env):

```env
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=xxxxx
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=xxxxx@xxxxx.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
PORT=3000
FIREBASE_WEB_API_KEY=xxxxx

# Rapidoc
RAPIDOC_BASE_URL=https://api.rapidoc.example
RAPIDOC_TOKEN=xxxxx
RAPIDOC_CLIENT_ID=xxxxx
RAPIDOC_IMMEDIATE_AUTO=false

# Asaas
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=xxxxx

# Auditoria
ENABLE_API_AUDIT_LOGS=true
```

Executando em desenvolvimento:

```sh
# Backend (em /backend)
npm run dev

# Frontend (em /frontend)
npm run dev
```

## Qualidade e Observabilidade

- Logs de API no Firestore (`logs_api`): método, URL, status, latência, uid/cpf, IP, user-agent.
- Healthcheck e speedtest: ver `GET /api/health` e `GET /api/speedtest`.
- Sem webhooks: endpoints de “refresh” manual podem ser adicionados para sincronismo (Asaas) quando necessário.

## Segurança

- Autenticação via Firebase (Bearer token) nas rotas protegidas.
- Rotas administrativas exigem presença do UID na coleção `administradores`.
- Cancelamento de assinatura condicionado a ausência de pendências no Asaas.

## Estrutura

```
ConsultaMedicosOnline/
├── backend/
│   ├── src/
│   │   ├── controller/   # Regras de negócio e orquestração
│   │   ├── routes/       # Rotas Express
│   │   ├── services/     # Rapidoc/Asaas/Firestore
│   │   ├── middlewares/  # Auth e auditoria
│   │   └── app.ts        # Montagem da API
│   └── endpoints.md      # Documentação da API
├── frontend/
│   └── ...               # App Next.js
└── preview/              # Coloque as imagens usadas neste README
```

## Roadmap (resumo)

- [x] Assinatura + Beneficiário Rapidoc + Dashboard
- [x] Consulta Imediata (fila)
- [x] Logs de auditoria no Firestore
- [ ] Endpoint(s) de “refresh” de status (sem webhooks)
- [ ] Paginação de faturamento admin (Asaas) + filtros por período
- [ ] Testes de integração de fluxos críticos

---

Licença: MIT
