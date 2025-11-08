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

## Beneficiários
### POST /beneficiarios
Cria beneficiário vinculado a responsável (holder) já existente.
Body:
```json
{
	"cpf": "11122233344",
	"holder": "12345678901",
	"nome": "Maria Silva",
	"parentesco": "Filha"
}
```

### GET /beneficiarios
Lista beneficiários.

## Dashboard
### GET /dashboard (protegido - requer Bearer token Firebase)
Retorna `{ usuario, assinaturas, beneficiarios }` pelo UID/CPF autenticado.

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

