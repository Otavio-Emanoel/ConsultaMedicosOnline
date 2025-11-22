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
            endereco,
            cidade,
            estado,
            plans,
            planoId
        } = req.body;

        // Campos obrigatórios básicos
        const missing: string[] = [];
        if (!assinaturaId) missing.push('assinaturaId');
        if (!nome) missing.push('nome');
        if (!email) missing.push('email');
        if (!cpf) missing.push('cpf');
        if (!birthday) missing.push('birthday');
        if (!endereco) missing.push('endereco');
        if (!cidade) missing.push('cidade');
        if (!estado) missing.push('estado');
        if (!zipCode) missing.push('zipCode');
        // Não exigimos mais 'plans' se conseguirmos derivar pelo planoId/assinaturaId
        if (missing.length) {
            return res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
        }

        try {
            // 1. Verifica pagamento da assinatura no Asaas
            const { verificarPrimeiroPagamentoAssinatura } = await import('../services/asaas.service.js');
            const resultadoPagamento = await verificarPrimeiroPagamentoAssinatura(assinaturaId);
            if (!resultadoPagamento.pago) {
                return res.status(403).json({ error: 'Primeiro pagamento da assinatura não confirmado.' });
            }

            // 2. Validar planos contra Rapidoc (paymentType conforme GET /plans)
            const { listarRapidocPlanos, cadastrarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
            const { getFirestore } = await import('firebase-admin/firestore');
            const { firebaseApp } = await import('../config/firebase.js');
            const db = getFirestore(firebaseApp);
            let rapidocPlanos: any[] = [];
            try {
                rapidocPlanos = await listarRapidocPlanos();
            } catch {
                // Se falhar em listar planos, ainda tentamos prosseguir (pode ser problema temporário)
                console.warn('[createRapidocBeneficiary] Falha ao listar planos Rapidoc, prosseguindo sem validação estrita.');
            }
            const planosMap = new Map<string, any>();
            rapidocPlanos.forEach(p => planosMap.set(p.uuid, p));

            const normalizedPlans: any[] = [];
            if (Array.isArray(plans) && plans.length > 0) {
                for (const p of plans) {
                    const paymentTypeReq = String(p.paymentType || '').toUpperCase();
                    const planUuid = p?.plan?.uuid || p?.uuid; // permitir formatos flexíveis
                    if (!planUuid) {
                        return res.status(400).json({ error: 'Cada item em plans deve possuir plan.uuid.' });
                    }
                    const planoOriginal = planosMap.get(planUuid);
                    if (planoOriginal) {
                        const originalPaymentType = String(planoOriginal.paymentType || '').toUpperCase();
                        if (originalPaymentType === 'L') {
                            if (!['S', 'A'].includes(paymentTypeReq)) {
                                return res.status(400).json({ error: `paymentType inválido para plano flexível (uuid=${planUuid}). Use S ou A.` });
                            }
                        } else if (originalPaymentType && originalPaymentType !== paymentTypeReq) {
                            return res.status(400).json({ error: `paymentType (${paymentTypeReq}) não corresponde ao plano (${originalPaymentType}) uuid=${planUuid}.` });
                        }
                    } else {
                        // Se não encontrou plano para validar, ainda inclui (pode ser recém-criado ou falha na listagem)
                        console.warn(`[createRapidocBeneficiary] Plano uuid=${planUuid} não encontrado na listagem Rapidoc.`);
                    }
                    if (!paymentTypeReq) {
                        return res.status(400).json({ error: 'Cada plano deve possuir paymentType.' });
                    }
                    normalizedPlans.push({
                        paymentType: paymentTypeReq,
                        plan: { uuid: planUuid }
                    });
                }
            } else {
                // Derivar do plano local via planoId ou pelo vínculo na assinatura
                let planoDocId: string | undefined = planoId;
                if (!planoDocId && assinaturaId) {
                    try {
                        const assRef = db.collection('assinaturas').doc(assinaturaId);
                        const assDoc = await assRef.get();
                        const assData: any = assDoc.exists ? assDoc.data() : undefined;
                        if (assData && assData.planoId) planoDocId = String(assData.planoId);
                    } catch (e) {
                        console.warn('[createRapidocBeneficiary] Não foi possível obter planoId pela assinatura.', e);
                    }
                }
                if (!planoDocId) {
                    return res.status(400).json({ error: 'Não foi possível determinar o plano. Informe plans ou planoId.' });
                }
                const planoRef = db.collection('planos').doc(planoDocId);
                const planoSnap = await planoRef.get();
                if (!planoSnap.exists) {
                    return res.status(404).json({ error: 'Plano informado não encontrado.' });
                }
                const planoData: any = planoSnap.data();
                const planUuid = String(planoData.uuidRapidocPlano || '').trim();
                const paymentTypeReq = String(planoData.remotePaymentType || planoData.paymentType || '').toUpperCase();
                if (!planUuid) {
                    return res.status(400).json({ error: 'Plano local não possui uuidRapidocPlano.' });
                }
                if (!paymentTypeReq) {
                    return res.status(400).json({ error: 'Plano local não possui paymentType/remotePaymentType.' });
                }
                const planoOriginal = planosMap.get(planUuid);
                if (planoOriginal) {
                    const originalPaymentType = String(planoOriginal.paymentType || '').toUpperCase();
                    if (originalPaymentType === 'L') {
                        if (!['S', 'A'].includes(paymentTypeReq)) {
                            return res.status(400).json({ error: `paymentType inválido para plano flexível (uuid=${planUuid}). Use S ou A.` });
                        }
                    } else if (originalPaymentType && originalPaymentType !== paymentTypeReq) {
                        return res.status(400).json({ error: `paymentType (${paymentTypeReq}) não corresponde ao plano (${originalPaymentType}) uuid=${planUuid}.` });
                    }
                }
                normalizedPlans.push({ paymentType: paymentTypeReq, plan: { uuid: planUuid } });
            }

            // 3. Normalizar telefone (apenas dígitos) conforme exemplos; não enviamos country aqui.
            const digitsPhone = String(phone || '').replace(/\D/g, '');
            // 11 dígitos esperado (DDD + número). Não adicionamos DDI, exemplo documentação.
            // se não atender mínimo, omitimos o campo phone
            const normalizedPhone = digitsPhone.length >= 10 ? digitsPhone : undefined;
            
            // 4. Chamada Rapidoc
            // Regra: Rapidoc não permite holder == cpf do beneficiário.
            const holderFromBody: string | undefined = (req.body?.holder ? String(req.body.holder) : undefined);
            const docCpf = String(cpf).replace(/\D/g, '');
            const docHolder = holderFromBody ? holderFromBody.replace(/\D/g, '') : undefined;
            const shouldSendHolder = !!(docHolder && docHolder.length > 0 && docHolder !== docCpf);

            const payload: any = {
                nome,
                email,
                cpf,
                birthday,
                phone: normalizedPhone,
                zipCode,
                address: endereco,
                city: cidade,
                state: estado,
                plans: normalizedPlans
            };
            if (shouldSendHolder) payload.holder = docHolder;

            const beneficiario = await cadastrarBeneficiarioRapidoc(payload);

            // 5. Interpretar resposta (pode ser array ou objeto)
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

    static async cancelSubscription(req: Request, res: Response) {
        const { assinaturaId } = req.params as { assinaturaId?: string };
        if (!assinaturaId) return res.status(400).json({ error: 'assinaturaId é obrigatório.' });
        try {
            const { temPendenciasNaAssinatura, cancelarAssinaturaAsaas } = await import('../services/asaas.service.js');
            // 1) Verifica pendências
            const pend = await temPendenciasNaAssinatura(assinaturaId);
            if (pend.pendente) {
                return res.status(409).json({
                    error: 'Não é possível cancelar: existem pagamentos pendentes/atrasados.',
                    pendentes: pend.pendentes.map((p: any) => ({ id: p.id, status: p.status, value: p.value, dueDate: p.dueDate }))
                });
            }
            // 2) Cancela assinatura no Asaas
            const resp = await cancelarAssinaturaAsaas(assinaturaId);
            const ok = resp.status === 200 || resp.status === 204;
            if (!ok) return res.status(400).json({ error: 'Falha ao cancelar assinatura no Asaas.', detail: resp });
            return res.status(200).json({ cancelled: true, status: resp.status });
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 404) return res.status(404).json({ error: 'Assinatura não encontrada no Asaas.' });
            return res.status(500).json({ error: error?.response?.data || error.message || 'Erro ao cancelar assinatura.' });
        }
    }

    /**
     * Cancela o plano do usuário logado
     * Requisitos:
     * 1. Usuário deve ter pago os 3 primeiros meses
     * 2. Inativa beneficiário no Rapidoc
     * 3. Cancela assinatura no Asaas
     * 4. Marca assinatura como cancelada no Firestore
     */
    static async cancelarPlanoUsuario(req: Request, res: Response) {
        try {
            // 1. Obter CPF do usuário logado
            const uid = req.user?.uid || req.user?.sub;
            if (!uid) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            const { getFirestore } = await import('firebase-admin/firestore');
            const { firebaseApp } = await import('../config/firebase.js');
            const db = getFirestore(firebaseApp);
            
            // Buscar CPF do usuário no Firestore
            const usuarioRef = db.collection('usuarios').doc(uid);
            const usuarioDoc = await usuarioRef.get();
            let cpf: string | undefined;
            
            if (usuarioDoc.exists) {
                const usuarioData = usuarioDoc.data();
                cpf = usuarioData?.cpf;
            }
            
            // Fallback: usar UID como CPF (caso o UID seja o CPF)
            if (!cpf) {
                cpf = (req.user as any)?.cpf || uid;
            }
            
            if (!cpf) {
                return res.status(400).json({ error: 'CPF do usuário não encontrado.' });
            }

            // 2. Buscar assinatura ativa do usuário
            const assinaturasSnap = await db.collection('assinaturas')
                .where('cpfUsuario', '==', cpf)
                .where('status', '==', 'ATIVA')
                .get();
            
            if (assinaturasSnap.empty) {
                return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada para este usuário.' });
            }
            
            const assinaturaDoc = assinaturasSnap.docs[0];
            if (!assinaturaDoc) {
                return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada para este usuário.' });
            }
            const assinaturaData = assinaturaDoc.data();
            const assinaturaId = assinaturaData?.idAssinatura || assinaturaDoc.id;
            
            if (!assinaturaId) {
                return res.status(400).json({ error: 'ID da assinatura não encontrado.' });
            }

            // 3. Verificar se pagou os 3 primeiros meses
            const { verificarTresPrimeirosMesesPagos } = await import('../services/asaas.service.js');
            const verificacao = await verificarTresPrimeirosMesesPagos(assinaturaId);
            
            if (!verificacao.pagos) {
                return res.status(403).json({ 
                    error: verificacao.mensagem || 'É necessário ter pago os 3 primeiros meses para cancelar o plano.',
                    pagamentosPagos: verificacao.pagamentosPagos
                });
            }

            // 4. Buscar beneficiário no Rapidoc e inativar
            const { buscarBeneficiarioRapidocPorCpf, inativarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
            try {
                const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpf);
                const beneficiario = beneficiarioResp?.beneficiary;
                
                if (beneficiario && beneficiario.uuid) {
                    try {
                        await inativarBeneficiarioRapidoc(beneficiario.uuid);
                        console.log(`[cancelarPlanoUsuario] Beneficiário ${beneficiario.uuid} inativado no Rapidoc`);
                    } catch (rapidocError: any) {
                        console.error('[cancelarPlanoUsuario] Erro ao inativar no Rapidoc:', rapidocError);
                        // Continua mesmo se falhar no Rapidoc
                    }
                }
            } catch (rapidocError: any) {
                console.error('[cancelarPlanoUsuario] Erro ao buscar beneficiário no Rapidoc:', rapidocError);
                // Continua mesmo se não encontrar no Rapidoc
            }

            // 5. Cancelar assinatura no Asaas
            const { cancelarAssinaturaAsaas } = await import('../services/asaas.service.js');
            try {
                const respAsaas = await cancelarAssinaturaAsaas(assinaturaId);
                const ok = respAsaas.status === 200 || respAsaas.status === 204;
                if (!ok) {
                    console.error('[cancelarPlanoUsuario] Falha ao cancelar no Asaas:', respAsaas);
                }
            } catch (asaasError: any) {
                console.error('[cancelarPlanoUsuario] Erro ao cancelar no Asaas:', asaasError);
                // Continua mesmo se falhar no Asaas
            }

            // 6. Marcar assinatura como cancelada no Firestore
            if (assinaturaDoc) {
                await assinaturaDoc.ref.update({
                    status: 'CANCELADA',
                    dataCancelamento: new Date().toISOString(),
                    motivoCancelamento: req.body.reasons || [],
                    comentariosCancelamento: req.body.comments || ''
                });
            }

            return res.status(200).json({ 
                success: true,
                message: 'Plano cancelado com sucesso.',
                assinaturaId,
                dataCancelamento: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('[cancelarPlanoUsuario] Erro:', error);
            return res.status(500).json({ 
                error: error?.message || 'Erro ao cancelar plano.' 
            });
        }
    }

    /**
     * Verifica o status do plano do usuário logado
     * Retorna se o plano está cancelado
     */
    static async verificarStatusPlano(req: Request, res: Response) {
        try {
            // 1. Obter CPF do usuário logado
            const uid = req.user?.uid || req.user?.sub;
            if (!uid) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            const { getFirestore } = await import('firebase-admin/firestore');
            const { firebaseApp } = await import('../config/firebase.js');
            const db = getFirestore(firebaseApp);
            
            // Buscar CPF do usuário no Firestore
            const usuarioRef = db.collection('usuarios').doc(uid);
            const usuarioDoc = await usuarioRef.get();
            let cpf: string | undefined;
            
            if (usuarioDoc.exists) {
                const usuarioData = usuarioDoc.data();
                cpf = usuarioData?.cpf;
            }
            
            // Fallback: usar UID como CPF
            if (!cpf) {
                cpf = (req.user as any)?.cpf || uid;
            }
            
            if (!cpf) {
                return res.status(400).json({ error: 'CPF do usuário não encontrado.' });
            }

            // 2. Buscar assinaturas do usuário
            const assinaturasSnap = await db.collection('assinaturas')
                .where('cpfUsuario', '==', cpf)
                .get();
            
            if (assinaturasSnap.empty) {
                return res.status(200).json({ 
                    cancelado: false,
                    temAssinatura: false
                });
            }
            
            // Verificar se há assinatura cancelada
            const assinaturas = assinaturasSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Array<{
                id: string;
                status?: string;
                dataCancelamento?: string;
                motivoCancelamento?: any[];
                comentariosCancelamento?: string;
            }>;
            
            const assinaturaCancelada = assinaturas.find((a) => a.status === 'CANCELADA');
            
            if (assinaturaCancelada) {
                return res.status(200).json({
                    cancelado: true,
                    dataCancelamento: assinaturaCancelada.dataCancelamento || null,
                    motivoCancelamento: assinaturaCancelada.motivoCancelamento || [],
                    comentariosCancelamento: assinaturaCancelada.comentariosCancelamento || ''
                });
            }
            
            return res.status(200).json({
                cancelado: false,
                temAssinatura: true
            });
        } catch (error: any) {
            console.error('[verificarStatusPlano] Erro:', error);
            return res.status(500).json({ 
                error: error?.message || 'Erro ao verificar status do plano.' 
            });
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
            } catch {/* considera false */ }

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
                } as any);
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