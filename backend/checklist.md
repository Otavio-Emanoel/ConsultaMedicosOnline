# Checklist Backend - ConsultaMedicosOnline

## ✅ Implementado

- [x] Cadastro de cliente e assinatura no Asaas
- [x] Validação de pagamento da assinatura (primeiro pagamento)
- [x] Cadastro de beneficiário Rapidoc (após pagamento confirmado)
- [x] Validação automática do pagamento antes de criar beneficiário
- [x] Coleta de todos os dados necessários para cadastro Rapidoc já no início do fluxo
- [x] Endpoints para:
  - Criar assinatura (`/api/subscription/start`)
  - Verificar pagamento (`/api/subscription/check-payment/:assinaturaId`)
  - Cadastrar beneficiário Rapidoc (`/api/subscription/rapidoc-beneficiary`)
- [x] Integração com Asaas (criação de cliente, assinatura, consulta de pagamento)
- [x] Integração com Rapidoc (cadastro de beneficiário)
- [x] Validação de campos obrigatórios em todos os fluxos

## 🚧 Faltando / Melhorias

- [ ] Persistência dos dados no banco (Firestore ou outro)
- [ ] Integração com Firebase Authentication (login, autenticação, recuperação)
- [ ] Sincronização e registro local da relação Assinante ↔ Rapidoc UID ↔ Asaas Customer ID
- [ ] Dashboard do assinante (resumo, atendimentos, faturas, dependentes)
- [ ] Cadastro e gestão de dependentes (beneficiários)
- [ ] Consulta e exibição de faturas (API Asaas)
- [ ] Atualização de dados do usuário (sincronizar Firebase, Rapidoc, Asaas)
- [ ] Cancelamento de plano (verificar pendências antes)
- [ ] Painel do administrador (cadastro de planos, dashboard, logs)
- [ ] Logs e auditoria centralizados
- [ ] Integração de envio de e-mail/SMS após criação de usuário
- [ ] Documentação da API interna
- [ ] Telas de suporte/FAQ
- [ ] Webhook Asaas para automação do cadastro Rapidoc após pagamento
- [ ] Registro de data/hora/status de cada etapa

## 🧩 Observações
- Todos os fluxos críticos já validam pagamento antes de criar beneficiário.
- O backend está pronto para evoluir para persistência, autenticação e dashboard.
- O escopo está sendo seguido conforme regras do projeto.

---

Atualize este checklist conforme novas entregas ou integrações!
