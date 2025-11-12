import type { Request, Response } from 'express';

export class SubscriptionController {
    static async createRapidocBeneficiary(req: Request, res: Response) {
        const {
            assinaturaId,
            nome,
            email,
            cpf,
            birthday,
            phone,
            zipCode,
            paymentType,
            serviceType,
            holder,
            general,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            country
        } = req.body;

        // Validação dos campos obrigatórios
        if (
            !assinaturaId ||
            !nome ||
            !email ||
            !cpf ||
            !birthday
        ) {
            return res.status(400).json({ error: 'Campos obrigatórios: assinaturaId, nome, email, cpf, birthday.' });
        }

        try {
            // Validar pagamento da assinatura
            const { verificarPrimeiroPagamentoAssinatura } = await import('../services/asaas.service.js');
            const resultadoPagamento = await verificarPrimeiroPagamentoAssinatura(assinaturaId);
            if (!resultadoPagamento.pago) {
                return res.status(403).json({ error: 'Primeiro pagamento da assinatura não confirmado.' });
            }
            // Cadastrar beneficiário Rapidoc
            const { cadastrarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
            // Normaliza campos conforme contrato Rapidoc
            const allowedPayment = new Set(['S', 'A']);
            const allowedService = new Set(['G', 'P', 'GP', 'GS', 'GSP']);
            const normalizedPaymentType = allowedPayment.has(String(paymentType || '').toUpperCase())
                ? String(paymentType).toUpperCase()
                : 'S';
            const normalizedServiceType = allowedService.has(String(serviceType || '').toUpperCase())
                ? String(serviceType).toUpperCase()
                : 'G';
            // A API de cadastro aceita apenas as propriedades conhecidas; enviar somente as propriedades válidas.
            const beneficiario = await cadastrarBeneficiarioRapidoc({
                nome,
                email,
                cpf,
                birthday,
                phone,
                zipCode,
                paymentType: normalizedPaymentType,
                serviceType: normalizedServiceType,
                holder,
                general
            });
            // Alguns cenários do Rapidoc retornam 200 com success=false (ex: CPF já utilizado)
            const result = beneficiario as any;
            const success = (result && result.success === true) || (Array.isArray(result) && result[0]?.success === true);
            const rapidocMsg = (result && result.message) || (Array.isArray(result) && result[0]?.message) || undefined;
            if (!success) {
                const msg = typeof rapidocMsg === 'string' && rapidocMsg.trim().length > 0
                    ? rapidocMsg
                    : 'Falha ao cadastrar beneficiário Rapidoc.';
                const statusCode = String(msg).toLowerCase().includes('cpf') ? 409 : 400;
                return res.status(statusCode).json({ error: msg, result: beneficiario });
            }
            return res.status(201).json({ message: 'Beneficiário Rapidoc criado com sucesso.', beneficiario });
        } catch (error: any) {
            // Log detalhado para depuração
            console.error('Erro ao cadastrar beneficiário Rapidoc:', {
                message: error?.message,
                responseData: error?.response?.data,
                stack: error?.stack
            });
            return res.status(500).json({ error: error?.response?.data || error.message || 'Erro ao cadastrar beneficiário Rapidoc.' });
        }
    }

    static async startSubscription(req: Request, res: Response) {
        const {
            nome,
            email,
            cpf,
            telefone,
            valor,
            birthday,
            phone,
            zipCode,
            paymentType,
            serviceType,
            holder,
            general,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            country
        } = req.body;
        if (!nome || !email || !cpf || !birthday || !zipCode || !endereco || !numero || !bairro || !cidade || !estado || !country) {
            return res.status(400).json({ error: 'Campos obrigatórios: nome, email, cpf, birthday, zipCode, endereco, numero, bairro, cidade, estado, country.' });
        }
        if (typeof valor !== 'number' || isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'Valor da assinatura é obrigatório e deve ser um número válido.' });
        }

        try {
            // 1. Criar cliente no Asaas
            const { criarClienteAsaas } = await import('../services/asaas.service.js');
            const cliente = await criarClienteAsaas({ nome, email, cpf, telefone });

            // 2. Criar assinatura no Asaas
            const { criarAssinaturaAsaas } = await import('../services/asaas.service.js');
            const ciclo = req.body.ciclo;
            const billingType = req.body.billingType || 'BOLETO';
            const description = req.body.description || 'Assinatura Consulta Médicos Online';
            const assinatura = await criarAssinaturaAsaas({ customer: cliente.id, value: valor, cycle: ciclo, billingType, description });
            const assinaturaId = assinatura.id;

            // 3. Salvar dados completos para cadastro automático no Rapidoc após pagamento

            return res.status(201).json({
                message: 'Assinatura iniciada. Aguarde confirmação do pagamento.',
                clienteId: cliente.id,
                assinaturaId,
                rapidocData: {
                    nome,
                    email,
                    cpf,
                    birthday,
                    phone,
                    zipCode,
                    paymentType,
                    serviceType,
                    holder,
                    general,
                    endereco,
                    numero,
                    complemento,
                    bairro,
                    cidade,
                    estado,
                    country
                }
            });
        } catch (error: any) {
            return res.status(500).json({ error: error?.response?.data?.errors || error.message || 'Erro ao iniciar assinatura.' });
        }
    }

    static async checkFirstPayment(req: Request, res: Response) {
        const { assinaturaId } = req.params;
        if (!assinaturaId) {
            return res.status(400).json({ error: 'assinaturaId é obrigatório.' });
        }
        try {
            const { verificarPrimeiroPagamentoAssinatura } = await import('../services/asaas.service.js');
            const resultado = await verificarPrimeiroPagamentoAssinatura(assinaturaId);
            return res.status(200).json(resultado);
        } catch (error: any) {
            return res.status(500).json({ error: error?.response?.data?.errors || error.message || 'Erro ao verificar pagamento.' });
        }
    }

    static async paymentDetails(req: Request, res: Response) {
        const { assinaturaId } = req.params;
        if (!assinaturaId) return res.status(400).json({ error: 'assinaturaId é obrigatório.' });
        try {
            const { obterDetalhesPagamentoAssinatura } = await import('../services/asaas.service.js');
            const detalhes = await obterDetalhesPagamentoAssinatura(assinaturaId);
            if (!detalhes.encontrado) return res.status(404).json({ error: 'Nenhum pagamento encontrado para esta assinatura.' });
            return res.status(200).json(detalhes);
        } catch (error: any) {
            return res.status(500).json({ error: error?.response?.data?.errors || error.message || 'Erro ao obter detalhes do pagamento.' });
        }
    }

    static async onboardingStatus(req: Request, res: Response) {
        const { cpf } = req.params as { cpf?: string };
        if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });
        try {
            const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
            const axios = (await import('axios')).default;
            const admin = (await import('firebase-admin')).default;

            // Assinatura (Asaas)
            const asaas = await verificarAssinaturaPorCpf(cpf);
            const assinaturaAtiva = !!asaas.assinaturaOk;

            // Rapidoc (beneficiário ativo)
            let rapidocAtivo = false;
            try {
                const r = await axios.get(`${process.env.RAPIDOC_BASE_URL}/beneficiaries/${cpf}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                        clientId: process.env.RAPIDOC_CLIENT_ID,
                        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                    }
                });
                const b = r.data && r.data.beneficiary;
                rapidocAtivo = !!b && b.isActive === true && !!b.uuid;
            } catch {/* considera false */}

            // Firestore (usuario existe)
            const usuarioDoc = await admin.firestore().collection('usuarios').doc(cpf).get();
            const usuarioExiste = usuarioDoc.exists;

            return res.status(200).json({ assinaturaAtiva, rapidocAtivo, usuarioExiste });
        } catch (error: any) {
            return res.status(500).json({ error: error?.message || 'Erro ao consultar status de onboarding.' });
        }
    }

    /**
     * Orquestrador: completa onboarding por CPF sem depender de localStorage.
     * 1) Busca assinatura ativa e pagamento recebido no Asaas
     * 2) Recolhe dados do cliente
     * 3) Garante beneficiário Rapidoc
     * 4) Garante usuário Firestore
     * 5) Garante assinatura Firestore
     */
    static async completeOnboarding(req: Request, res: Response) {
        const { cpf, overrides } = req.body || {};
        if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

        try {
            const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
            const { verificarPrimeiroPagamentoAssinatura } = await import('../services/asaas.service.js');
            const { cadastrarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
            const admin = (await import('firebase-admin')).default;
            const axios = (await import('axios')).default;

            // 1) Assinatura ativa no Asaas
            const asaas = await verificarAssinaturaPorCpf(cpf);
            if (!asaas.assinaturaOk) {
                return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada no Asaas para este CPF.' });
            }

            // Buscar assinaturaId mais recente do cliente no Asaas
            const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
            const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string;
            const assinaturasResp = await axios.get(`${ASAAS_API_URL}/subscriptions`, {
                params: { customer: asaas.cliente?.id },
                headers: { access_token: ASAAS_API_KEY },
            });
            const assinaturas = assinaturasResp.data?.data || [];
            // prioriza ACTIVE mais recente
            const assinaturaAtiva = assinaturas.filter((a: any) => a.status === 'ACTIVE')
                .sort((a: any, b: any) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())[0];
            if (!assinaturaAtiva) return res.status(404).json({ error: 'Assinatura ativa não encontrada para este CPF.' });

            // 2) Confirmar primeiro pagamento
            const pagamento = await verificarPrimeiroPagamentoAssinatura(assinaturaAtiva.id);
            if (!pagamento.pago) return res.status(402).json({ error: 'Assinatura ainda não está paga.' });

            // 3) Dados do cliente Asaas
            const clientesResp = await axios.get(`${ASAAS_API_URL}/customers/${asaas.cliente?.id}`, {
                headers: { access_token: ASAAS_API_KEY },
            });
            const cliente = clientesResp.data || {};
            // Compor dados mínimos
            const nome = overrides?.nome || cliente?.name;
            const email = overrides?.email || cliente?.email;
            const telefone = overrides?.telefone || cliente?.phone || cliente?.mobilePhone;
            const birthday = overrides?.birthday; // Asaas cliente não traz nativamente DOB
            const zipCode = overrides?.zipCode || cliente?.postalCode;
            const assinaturaId = overrides?.assinaturaId || assinaturaAtiva.id;

            const missing: string[] = [];
            if (!nome) missing.push('nome');
            if (!email) missing.push('email');
            // telefone agora opcional (não bloqueia onboarding)
            if (!birthday) missing.push('birthday');
            console.log('[complete-onboarding] dados compilados', { nome, email, telefone, birthday, zipCode, assinaturaId, missing });
            if (missing.length > 0) {
                return res.status(400).json({ ok: false, missing, assinaturaId });
            }

            // 4) Garantir beneficiário Rapidoc (idempotente)
            let createdRapidoc = false;
            try {
                // Verifica se já existe no Rapidoc
                const getResp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/${cpf}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                        clientId: process.env.RAPIDOC_CLIENT_ID,
                        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                    }
                });
                const beneficiario = getResp.data?.beneficiary;
                if (!beneficiario || !beneficiario.uuid || beneficiario.isActive !== true) {
                    throw new Error('NAO_EXISTE');
                }
            } catch {
                // criar
                console.log('[complete-onboarding] criando beneficiario Rapidoc');
                const allowedPayment = new Set(['S', 'A']);
                const allowedService = new Set(['G', 'P', 'GP', 'GS', 'GSP']);
                const normalizedPaymentType = allowedPayment.has(String(overrides?.paymentType || 'S').toUpperCase())
                    ? String(overrides?.paymentType || 'S').toUpperCase()
                    : 'S';
                const normalizedServiceType = allowedService.has(String(overrides?.serviceType || 'G').toUpperCase())
                    ? String(overrides?.serviceType || 'G').toUpperCase()
                    : 'G';
                const respRapidoc = await cadastrarBeneficiarioRapidoc({
                    nome,
                    email,
                    cpf,
                    birthday,
                    phone: telefone,
                    zipCode,
                    paymentType: normalizedPaymentType,
                    serviceType: normalizedServiceType,
                    holder: cpf,
                    general: overrides?.general,
                });
                const success = (respRapidoc && respRapidoc.success === true) || (Array.isArray(respRapidoc) && respRapidoc[0]?.success === true);
                console.log('[complete-onboarding] resposta Rapidoc', respRapidoc);
                if (!success) {
                    const msg = (respRapidoc && respRapidoc.message) || (Array.isArray(respRapidoc) && respRapidoc[0]?.message) || 'Falha ao criar beneficiário Rapidoc';
                    // Se mensagem indicar duplicidade/CPF utilizado, considerar idempotente
                    if (String(msg).toLowerCase().includes('cpf')) {
                        // segue fluxo
                    } else {
                        return res.status(400).json({ error: msg, result: respRapidoc });
                    }
                } else {
                    createdRapidoc = true;
                }
            }

            // 5) Garantir usuário Firestore (idempotente)
            const usuarioRef = admin.firestore().collection('usuarios').doc(cpf);
            const usuarioDoc = await usuarioRef.get();
            let createdUsuario = false;
            if (!usuarioDoc.exists) {
                console.log('[complete-onboarding] criando usuario Firestore');
                const userData: Record<string, any> = {
                    cpf,
                    nome,
                    email,
                    dataNascimento: birthday,
                    criadoEm: new Date().toISOString(),
                };
                if (telefone !== undefined && telefone !== null && telefone !== '') {
                    userData.telefone = telefone;
                }
                await usuarioRef.set(userData, { merge: true });
                createdUsuario = true;
            }

            // 6) Garantir assinatura Firestore (idempotente)
            const assinaturaRef = admin.firestore().collection('assinaturas').doc(assinaturaId);
            const assinaturaDoc = await assinaturaRef.get();
            let createdAssinatura = false;
            if (!assinaturaDoc.exists) {
                console.log('[complete-onboarding] criando assinatura Firestore');
                // tentar obter planoId (opcional) pelo Firestore mapping assinatura anterior ou por overrides
                const planoId = overrides?.planoId;
                const assinaturaData: Record<string, any> = {
                    idAssinatura: assinaturaId,
                    cpfUsuario: cpf,
                    status: 'ATIVA',
                    dataInicio: (pagamento.pagamento?.paymentDate || pagamento.pagamento?.receivedDate || new Date().toISOString()).substring(0, 10),
                    criadoEm: new Date().toISOString(),
                };
                if (planoId !== undefined && planoId !== null && planoId !== '') {
                    assinaturaData.planoId = planoId;
                }
                await assinaturaRef.set(assinaturaData, { merge: true });
                createdAssinatura = true;
            }

            return res.status(200).json({ ok: true, assinaturaId, created: { rapidoc: createdRapidoc, usuario: createdUsuario, assinatura: createdAssinatura } });
        } catch (error: any) {
            console.error('Erro completeOnboarding:', { message: error?.message, stack: error?.stack, data: error?.response?.data });
            return res.status(500).json({ error: error?.response?.data || error.message || 'Erro ao completar onboarding.' });
        }
    }
}