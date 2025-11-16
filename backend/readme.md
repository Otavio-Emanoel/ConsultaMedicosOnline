# Documentação de Endpoints

Base URL: `http://localhost:3000/api`

## Saúde e Diagnóstico
### GET /health
Retorna status da API.

### GET /speedtest
Retorna informações de latência.

### POST /firestore-test
Cria registro de teste no Firestore.
Body: (nenhum)
Resposta 201:
```json
{ "id": "...", "createdAt": "ISO", "status": "ok" }
```

## Primeiro Acesso
### POST /first-access/validate-cpf
Valida CPF consultando Asaas. Deve haver assinatura ativa e paga para não permitir novo cadastro.
Body:
```json
{ "cpf": "63833776048" }
```
Respostas:
- 200 podeCadastrar true (não possui assinatura ativa)
- 200 usuario (dados cliente Asaas se assinatura ativa)

### POST /first-access
Marca primeiro acesso e cria usuário no Firebase Auth usando dados já existentes em `usuarios`.
Body:
```json
{ "cpf": "63833776048" }
```
Respostas:
- 201 senhaTemporaria gerada
- 404 usuário não encontrado no Firestore
- 409 já realizou primeiro acesso

## Assinaturas (Firestore + Asaas + Rapidoc)
### POST /assinaturas
Cria/atualiza registro de assinatura após validações (Asaas pago, Rapidoc conta existente) e inclui snapshot do plano.
Body:
```json
{
	"idAssinatura": "sub_asaas_id",
	"cpfUsuario": "63833776048",
	"planoId": "plano_doc_id",
	"outrosCamposOpcionais": "..."
}
```
Respostas:
- 201 id da assinatura no Firestore
- 400 campos obrigatórios ausentes
- 404 plano não encontrado / assinatura Asaas inexistente / Rapidoc inexistente
- 402 assinatura não está paga

### GET /assinaturas
Lista todas as assinaturas salvas no Firestore.

### GET /assinatura/status/:cpf
Busca assinatura ativa diretamente no Asaas para o CPF.
Respostas:
- 200 assinaturaId e objeto assinatura
- 404 não encontrada

### GET /subscription/check-payment/:assinaturaId
Verifica primeiro pagamento da assinatura no Asaas.
Respostas:
```json
{ "pago": true, "pagamento": { ... } }
```

### GET /subscription/payment-details/:assinaturaId
Retorna detalhes do primeiro pagamento (boleto ou PIX) para exibir instruções de pagamento ou comprovante.
Respostas:
```json
{
	"assinaturaId": "sub_xxx",
	"encontrado": true,
	"pagamento": {
		"paymentId": "pay_yyy",
		"billingType": "BOLETO",
		"status": "PENDING",
		"value": 79.9,
		"dueDate": "2025-01-10",
		"bankSlipUrl": "https://...",
		"invoiceUrl": "https://..."
	}
}
```
Ou para PIX:
```json
{
	"assinaturaId": "sub_xxx",
	"encontrado": true,
	"pagamento": {
		"paymentId": "pay_zzz",
		"billingType": "PIX",
		"status": "PENDING",
		"value": 79.9,
		"dueDate": "2025-01-10",
		"pixQrCode": "data:image/png;base64,...",
		"pixCode": "0002012658...",
		"qrCode": "000201..."
	}
}
```

### DELETE /subscription/cancel/:assinaturaId
Cancela uma assinatura no Asaas apenas se não houver pendências de pagamento (status PENDING/OVERDUE).
Respostas:
- 200 `{ cancelado: true }`
- 409 `{ mensagem: "Existem pendências de pagamento" }`
- 404 assinatura não encontrada

### GET /subscription/onboarding-status/:cpf
Retorna o status do onboarding para um CPF.
Resposta 200:
```json
{ "assinaturaAtiva": true, "rapidocAtivo": true, "usuarioExiste": true }
```

### POST /subscription/start
Inicia fluxo criando cliente e assinatura Asaas.
Body mínimo:
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "cpf": "12345678901",
  "birthday": "1990-05-15",
  "zipCode": "13040000",
  "endereco": "Rua Teste",
  "numero": "123",
  "bairro": "Centro",
  "cidade": "Campinas",
  "estado": "SP",
  "country": "BR",
  "valor": 79.9,
  "telefone": "19999998888"
  // opcionais: ciclo, billingType, description, phone, paymentType, serviceType, holder, general
}
```
Respostas:
- 201 assinaturaId e dados que serão usados depois no Rapidoc

### POST /subscription/rapidoc-beneficiary
Cria beneficiário no Rapidoc após confirmação de pagamento.
Body mínimos:
```json
{
	"assinaturaId": "sub_asaas_id",
	"nome": "João Silva",
	"email": "joao@email.com",
	"cpf": "12345678901",
	"birthday": "1990-05-15"
	// opcionais: phone, zipCode, paymentType, serviceType, holder, general
}
```

## Usuários
### POST /usuarios
Cria usuário no Firestore após validar Rapidoc e Asaas.
Body:
```json
{
	"cpf": "12345678901",
	"nome": "João Silva",
	"email": "joao@email.com",
	"telefone": "11999998888",
	"dataNascimento": "1990-05-15"
}
```

### GET /usuarios
Lista usuários cadastrados.

### PATCH /usuario/:cpf
Atualiza nome / email / telefone (sincroniza Rapidoc e Asaas quando possível).
Body (exemplo):
```json
{ "nome": "João Silva Junior" }
```

### GET /usuario/:cpf (protegido)
Obtém dados do usuário no Firestore pelo CPF.

### GET /usuario/me (protegido)
Obtém dados do usuário autenticado (usa CPF do token).

### PATCH /usuario/senha (protegido)
Altera a senha do usuário autenticado (valida a senha atual via Firebase REST API).

### POST /usuario/recuperar-senha
Envia e-mail de recuperação de senha via Firebase.

### GET /rapidoc/beneficiario/:cpf (protegido)
Obtém dados do beneficiário no Rapidoc pelo CPF.

## Dependentes (Beneficiários locais)
### POST /dependentes (protegido)
Cria dependente vinculado a um titular (holder) existente.

### PUT /dependentes/:cpf (protegido)
Atualiza dados do dependente identificado por CPF.

### GET /dependentes/:cpf (protegido)
Lista dependentes vinculados ao titular (holder = :cpf).

### POST /beneficiarios/:cpf/inativar-rapidoc (protegido)
Inativa o beneficiário correspondente no Rapidoc (marca isActive=false).

### DELETE /beneficiarios/:cpf (protegido)
Remove do banco local o titular e todos os dependentes relacionados (Firestore). Não remove no Rapidoc/Asaas.

### GET /beneficiarios/:cpf/especialidades (protegido)
Lista as especialidades efetivas do beneficiário (agregadas de plano + associações).

### PUT /beneficiarios/:cpf/especialidades (protegido)
Associa/atualiza especialidades do beneficiário no Rapidoc. Normaliza `paymentType` (S/A) e `serviceType` (G/P/GP/GS/GSP).

## Especialidades
### GET /especialidades (protegido)
Lista especialidades globais do Rapidoc.

## Dashboard
### GET /dashboard (protegido - requer Bearer token Firebase)
Retorna visão do assinante pelo UID/CPF autenticado:
```json
{
	"usuario": { ... },
	"assinaturas": [ ... ],
	"beneficiarios": [ ... ],
	"rapidoc": {
		"beneficiary": { ... },
		"appointments": [ ... ]
	},
	"faturas": [
		{ "paymentId": "...", "status": "...", "value": 79.9, "dueDate": "...", "invoiceUrl": "..." }
	]
}
```

## Onboarding (Orquestrador)
### POST /subscription/complete-onboarding
Completa o onboarding por CPF sem depender de localStorage.
Body:
```json
{
	"cpf": "12345678901",
	"overrides": {
		"nome": "(opcional)",
		"email": "(opcional)",
		"telefone": "(opcional)",
		"birthday": "(opcional, YYYY-MM-DD)",
		"zipCode": "(opcional)",
		"assinaturaId": "(opcional)",
		"planoId": "(opcional)"
	}
}
```
Respostas:
- 200 `{ ok: true, assinaturaId, created: { rapidoc, usuario, assinatura } }`
- 400 `{ ok: false, missing: ["birthday", ...], assinaturaId }` (solicitar campos em falta e reenviar como overrides)
- 402 assinatura encontrada porém ainda não paga
- 404 nenhuma assinatura ativa encontrada
- 500 erro interno

## Administração
### POST /admin/cadastrar
Cadastro de administrador.
Body:
```json
{ "nome": "Otavio", "email": "otavio.admin@dominio.com", "senha": "SenhaForte@2025" }
```

### POST /admin/cadastrar-plano (protegido - autenticarAdministrador)
Body:
```json
{
	"tipo": "Casal",
	"periodicidade": "TRIMESTRAL",
	"descricao": "Atendimentos ilimitados com médicos especializados e Clínico Geral. Sem carência.",
	"especialidades": [
		"Cardiologia",
		"Dermatologia",
		"Endocrinologia",
		"Geriatria",
		"Ginecologia",
		"Neurologia",
		"Pediatria",
		"Urologia",
		"Psiquiatria"
	],
	"preco": 249.90
}
```

### GET /admin/dashboard (protegido - autenticarAdministrador)
Métricas administrativas com totais e faturamento:
```json
{
	"totais": {
		"usuarios": 100,
		"assinaturas": { "ativas": 80, "pendentes": 10, "canceladas": 10 }
	},
	"faturamento": {
		"mesAtual": 12345.67,
		"ultimos30dias": 23456.78,
		"pendencias": 5
	}
}
```

## Planos
### GET /planos
Lista todos os planos disponíveis cadastrados no sistema.

**Exemplo de resposta:**
```json
[
  {
    "id": "plano_doc_id",
    "tipo": "Casal",
    "periodicidade": "TRIMESTRAL",
    "descricao": "Atendimentos ilimitados com médicos especializados e Clínico Geral. Sem carência.",
    "especialidades": [
      "Cardiologia",
      "Dermatologia",
      "Endocrinologia"
    ],
    "preco": 249.9,
    "criadoEm": "2024-06-01T12:00:00.000Z"
  }
]
```

**Observações:**
- Não requer autenticação.
- Retorna todos os campos do plano cadastrados no Firestore.
- O campo `id` corresponde ao ID do documento do plano no Firestore.

### GET /planos/:id
Retorna os detalhes de um plano específico salvo no Firestore.

Respostas:
- 200 objeto do plano `{ id, ... }`
- 404 quando não encontrado

### GET /planos/rapidoc
Lista planos do Rapidoc diretamente pela API externa.

### GET /planos/rapidoc/:uuid
Retorna os detalhes de um plano específico no Rapidoc (por UUID).
- 200 objeto do plano Rapidoc
- 404 quando não encontrado

### PUT /planos/rapidoc/:uuid/especialidades
Atualiza as especialidades associadas a um plano Rapidoc (admin). Envie `specialtyUuid` (string) ou `specialtyUuids` (array de strings).

## Agendamentos
### POST /agendamentos (protegido)
Agenda consulta no Rapidoc. Requer especialidade explicitamente informada via `specialtyUuid` quando não houver associações prévias no beneficiário.
Body (exemplo mínimo):
```json
{
	"cpf": "12345678901",
	"date": "2025-01-15",
	"time": "14:00",
	"specialtyUuid": "uuid-especialidade"
}
```
Respostas:
- 201 objeto do agendamento
- 422 quando não houver especialidade associada e `specialtyUuid` não for enviado (retorna sugestões)

### GET /agendamentos (protegido)
Lista agendamentos do beneficiário. Usa `cpf` do token por padrão, ou aceite `?cpf=`/`?beneficiaryUuid=`/`?status=`/`?date=`.

### GET /agendamentos/:uuid (protegido)
Lê detalhes de um agendamento no Rapidoc.

### GET /agendamentos/:uuid/join (protegido)
Retorna informações para entrar na consulta (ex.: `joinUrl`). Se a API não retornar link, responde com mensagem informativa.

### DELETE /agendamentos/:uuid (protegido)
Cancela um agendamento no Rapidoc.

### POST /agendamentos/imediato (protegido)
Cria uma solicitação de Consulta Imediata (fila/triagem). A API registra a solicitação e, opcionalmente, tenta agendar automaticamente um slot imediato se `RAPIDOC_IMMEDIATE_AUTO=true` e `specialtyUuid` for informado.

Body (exemplo):
```json
{ "cpf": "12345678901", "specialtyUuid": "uuid-especialidade", "notes": "triagem" }
```
Respostas:
- 201 quando já agendado (status "scheduled")
- 202 quando aceito em fila (status "pending")
- 400/422 se faltarem dados ou não houver especialidades associadas

### GET /agendamentos/imediato/:id (protegido)
Retorna o status da solicitação de consulta imediata. Possíveis `status`: `pending`, `scheduled`, `canceled`, `failed`.

### DELETE /agendamentos/imediato/:id (protegido)
Cancela a solicitação e, se já houver agendamento Rapidoc vinculado, tenta cancelá-lo também.

### GET /agendamentos/imediato/:id/join (protegido)
Quando a solicitação estiver `scheduled`, retorna o link/credenciais para entrar na consulta (busca pelo agendamento associado).

## Faturas
### GET /faturas (protegido)
Lista faturas do usuário autenticado (via CPF no token ou parâmetros auxiliares).

## Autenticação / Tokens
Rotas protegidas exigem header:
```
Authorization: Bearer <TOKEN_JWT_FIREBASE>
```

## Ordem Recomendada de Fluxo
1. /subscription/start (cria cliente + assinatura Asaas)
2. Confirmar pagamento (poll /subscription/check-payment/:id ou webhook futuro)
3. /subscription/rapidoc-beneficiary (cria beneficiário Rapidoc)
4. /usuarios (cria usuário no Firestore)
5. /first-access (marca primeiro acesso e gera senha)
6. /dashboard (após login Firebase) 

## Observações
- Campos opcionais não devem ser enviados como `undefined`.
- Erros do Rapidoc/Asaas são retornados encapsulados quando possível.
- Snapshot do plano é salvo dentro da assinatura para histórico.

### Auditoria de API
- Todas as requisições passam por um middleware de auditoria que registra em `logs_api` (Firestore): método, URL, status, latência, `uid`/`cpf` (quando disponível), IP e user-agent.
- Para desativar logs, defina `ENABLE_API_AUDIT_LOGS=false` no ambiente.

