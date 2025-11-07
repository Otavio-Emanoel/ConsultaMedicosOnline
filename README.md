# Consulta Medicos Online - Painel de Assinante de Telemedicina

Status: 🚧 Desenvolvimento 🚧

Painel web para assinantes de telemedicina. Esta plataforma atua como um intermediário para gerenciar consultas (via API Rapidoc) e assinaturas/pagamentos (via API Asaas), unificando a experiência do usuário.

## 🎯 Objetivo do Projeto

Criar um painel web robusto onde assinantes possam gerenciar sua assinatura e todo o atendimento de telemedicina. O sistema funcionará como o principal intermediador entre a API Rapidoc (provedor de telemedicina) e a API Asaas (provedor de pagamentos e assinaturas).

## 🧩 Arquitetura e Integrações

Este projeto é construído em torno da orquestração de serviços externos.

Frontend: React, Vue ou Next.js

Backend: Node.js (NestJS ou Express)

Banco de Dados: Firebase Firestore

Autenticação: Firebase Authentication

APIs Externas:

Rapidoc API: Para criação de beneficiários (pacientes), agendamento de consultas e atendimento imediato.

Asaas API: Para criação de clientes, gerenciamento de assinaturas, consulta de faturas e status de pagamento.

⚠️ Importante: Toda a comunicação com as APIs externas (Rapidoc, Asaas) deve ser feita através do backend (servidor intermediário) para garantir a segurança das chaves de API e o registro de logs.

## 🚀 Principais Funcionalidades

## 👤 Painel do Assinante

Cadastro/Primeiro Acesso: Validação de CPF contra a base do Asaas para localizar assinaturas ativas.

Login: Autenticação via Firebase.

Dashboard: Um resumo rápido do status da assinatura e botões de acesso rápido.

Atendimento Imediato: Chamada direta à API da Rapidoc para consulta instantânea.

Agendar Consulta: Formulário para agendamento futuro.

Cadastrar Dependentes: Criação de novos beneficiários vinculados à assinatura principal.

Ver Faturas: Consulta ao histórico de pagamentos e faturas via Asaas.

Atualizar Dados Cadastrais: Sincronização de dados entre Firebase, Rapidoc e Asaas.

Cancelar Plano: Permite o cancelamento apenas se não houver pendências financeiras (validado via Asaas).

## 👑 Painel do Administrador

Gestão de Planos: Cadastro de novos planos e geração de URLs únicas de assinatura.

Dashboard de Métricas: Visão geral de assinantes (ativos, pendentes, cancelados).

Logs de API: Registro de falhas e eventos críticos das integrações.

## 🧠 Fluxos Essenciais

## 1. Fluxo de Nova Assinatura

Usuário acessa uma URL específica do plano.

Preenche formulário único (com dados para Asaas + Rapidoc).

O sistema cria o Cliente no Asaas.

O sistema cria a Assinatura (cobrança) no Asaas.

Somente após a confirmação do pagamento:

O backend chama a API Rapidoc e cria o Beneficiário (paciente).

O sistema gera as credenciais de acesso ao painel (ou recebe da Rapidoc).

O usuário vê uma tela de sucesso com seus dados de acesso.

## 2. Fluxo de Primeiro Acesso (Para Assinantes Existentes)

Usuário informa o CPF na tela de "Primeiro Acesso".

Backend consulta o Asaas buscando por assinaturas ativas para aquele CPF.

Se uma assinatura for encontrada:

O sistema valida o status do beneficiário na Rapidoc.

Se tudo estiver correto, o sistema cria o login no painel (Firebase Auth).

O usuário é autenticado e direcionado ao dashboard.

### 🚨 Regras de Negócio Críticas

NUNCA criar um beneficiário na Rapidoc antes da confirmação de pagamento no Asaas.

NUNCA permitir o cancelamento do plano se existirem débitos pendentes no Asaas.

SEMPRE salvar logs de auditoria para todas as respostas críticas das APIs (criação de usuário, falha de pagamento, cancelamento).

SEMPRE registrar data, hora e status de cada etapa dos fluxos principais.

🛠️ Como Executar o Projeto (Placeholder)

## 1. Clone o repositório
git clone https://github.com/Otavio-Emanoel/ConsultaMedicosOnline.git

## 2. Instale as dependências (backend e frontend)
cd ConsultaMedicosOnline/backend
npm install

cd ../frontend
npm install

## 3. Configure suas variáveis de ambiente
### (Crie arquivos .env e adicione as chaves do Firebase, Asaas e Rapidoc)

## 4. Inicie os servidores
npm run dev # (Em ambas as pastas, backend e frontend)


📄 Licença

Este projeto está licenciado sob a Licença MIT.
