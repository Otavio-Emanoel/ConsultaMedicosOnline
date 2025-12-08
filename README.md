<div align="center">

# 🩺 Consulta Médicos Online

**Plataforma SaaS de Telemedicina & Gestão de Assinaturas**

Integrando **Rapidoc**, **Asaas** e **Firebase** em uma experiência unificada.

[Visão Geral](#-visão-geral) • [Recursos](#-principais-recursos) • [Tecnologias](#-tech-stack) • [Instalação](#-rodando-localmente) • [Documentação](#-documentação-da-api)

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## 📖 Visão Geral

O **Consulta Médicos Online** é uma solução Fullstack projetada para gerenciar o ciclo de vida completo de assinantes de um plano de telemedicina.

O sistema atua como um orquestrador central (BFF - Backend for Frontend), garantindo a consistência de dados entre três fontes de verdade distintas:
1.  **Firebase (Firestore & Auth):** Identidade, perfis e regras de negócio locais.
2.  **Asaas (Gateway de Pagamento):** Assinaturas recorrentes, faturas e status financeiro.
3.  **Rapidoc (Parceiro Médico):** Gestão de vidas, agendamentos e prontuários.

Diferente de um CRUD simples, este projeto foca em **fluxos transacionais complexos**, como o cancelamento em cascata e a sincronização de dependentes em tempo real.

---

## 📸 Capturas de Tela

### Landing Page & Conversão
![Landing Page](./preview/front%201.PNG)

### Área do Assinante
![Painel do Assinante – Consultas](./preview/front%202.PNG)

### Gestão de Planos
![Planos](./preview/front%203.png)

---

## 🚀 Principais Recursos

### 👤 Para o Assinante
- **Onboarding Automatizado:** Criação de conta vinculada ao pagamento da primeira fatura.
- **Gestão de Dependentes:** Adição e remoção de beneficiários com sincronização automática na API médica.
- **Consultas:** Agendamento tradicional e fila de "Consulta Imediata" com triagem.
- **Financeiro:** Visualização de faturas, status da assinatura e alteração de forma de pagamento.
- **Cancelamento Inteligente:** Fluxo de auto-atendimento que valida fidelidade e pendências antes de processar o cancelamento.

### 🛡️ Para a Administração
- **Dashboard Analítico:** Métricas de novos assinantes e receita recorrente.
- **Auditoria Completa:** Middleware de logs que rastreia todas as operações críticas (quem fez, quando e o resultado).
- **Gestão de Planos:** Criação dinâmica de planos e preços refletidos no frontend.

---

## 🛠 Tech Stack

O projeto utiliza uma arquitetura moderna e tipada para garantir escalabilidade e manutenibilidade.

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **Estilização:** Tailwind CSS
- **Componentes:** Shadcn/ui (Radix UI) + Lucide Icons
- **Linguagem:** TypeScript

### **Backend**
- **Runtime:** Node.js + Express
- **Linguagem:** TypeScript
- **Banco de Dados:** Firebase Firestore (NoSQL)
- **Autenticação:** Firebase Authentication (JWT)
- **Documentação:** Swagger/OpenAPI (`swagger.yaml`)

### **Integrações (Services)**
- **Asaas SDK:** Gestão financeira e webhooks.
- **Rapidoc API:** Integração de serviços de saúde.

---

## ⚙️ Arquitetura e Fluxos

O Backend foi desenhado seguindo o padrão *Controller-Service*, isolando as regras de negócio das rotas da API.

### Exemplo: Fluxo de Cancelamento Seguro
Para garantir a integridade dos dados, o cancelamento de um plano segue uma validação estrita:

1.  **Validação Financeira:** Verifica no Asaas se há faturas em atraso ou fidelidade não cumprida.
2.  **Validação de Vidas:** Impede o cancelamento se houver dependentes ativos no banco local.
3.  **Hard Delete (Rapidoc):** Remove a conta no parceiro médico.
4.  **Cancelamento (Asaas):** Interrompe a cobrança recorrente.
5.  **Limpeza (Firestore/Auth):** Atualiza status local e remove credenciais de acesso.

---

## ⚡ Rodando Localmente

### Pré-requisitos
- Node.js 18+
- Conta no Firebase (com `serviceAccountKey.json`)
- Chaves de API (Sandbox) do Asaas e Rapidoc

### 1. Instalação

```bash
# Clone o repositório
git clone [https://github.com/Otavio-Emanoel/ConsultaMedicosOnline.git](https://github.com/Otavio-Emanoel/ConsultaMedicosOnline.git)
cd ConsultaMedicosOnline

# Instalar dependências do Backend
cd backend
npm install

# Instalar dependências do Frontend
cd ../frontend
npm install
```

### 2. Configuração do Ambiente
Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

```bash
PORT=3000
# Credenciais Firebase
FIREBASE_CREDENTIALS_FILE=./seu-arquivo-de-credenciais.json
FIREBASE_WEB_API_KEY=sua_web_api_key

# Integração Rapidoc
RAPIDOC_BASE_URL=[https://api.rapidoc.example](https://api.rapidoc.example)
RAPIDOC_TOKEN=seu_token_rapidoc
RAPIDOC_CLIENT_ID=seu_client_id
RAPIDOC_IMMEDIATE_AUTO=false

# Integração Asaas
ASAAS_BASE_URL=[https://sandbox.asaas.com/api/v3](https://sandbox.asaas.com/api/v3)
ASAAS_API_KEY=sua_chave_asaas

# Configurações Gerais
ENABLE_API_AUDIT_LOGS=true
DEBUG_HMAC=1
```

### 3. Executando o Projeto
Abra dois terminais diferentes

### Terminal 1 (Backend):
```bash
cd backend
npm run dev
# O servidor rodará em http://localhost:3000
```

### Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# A aplicação estará disponível em http://localhost:3001
```

### Documentação da API
A API possui documentação via Swagger. Após iniciar o backend, acesse:

- *Swagger UI*: `http://localhost:3000/api-docs` (se configurado)

Ou consulte o arquivo `backend/endpoints.md`  para uma lista detalhada de rotas.

### 🧪 Qualidade e Observabilidade
- *Logs Estruturados*: Todas as requisições são registradas no Firestore na coleção `logs_api`, permitindo rastreabilidade de erros e performance.

- *Segurança*: Middlewares dedicados para validação de Token (Firebase) e Auditoria.

- *Tratamento de Erros*: Respostas padronizadas para erros de validação (400), autenticação (401) e integrações externas (500).

### 📝 Licença
Este projeto está sob a licença MIT.

<div align="center"> <sub>Desenvolvido por Otávio, Gustavo, Maykon e Marcos</sub> </div>