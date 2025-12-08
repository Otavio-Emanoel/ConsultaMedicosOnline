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

            // 3. Se for cartão de crédito, gerar URL de checkout do Asaas
            let checkoutUrl: string | undefined;
            if (billingType === 'CREDIT_CARD') {
                try {
                    const axios = (await import('axios')).default;
                    const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
                    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

                    if (ASAAS_API_KEY) {
                        // Criar pagamento de checkout para cartão de crédito
                        const paymentBody: any = {
                            customer: cliente.id,
                            billingType: 'CREDIT_CARD',
                            value: valor,
                            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Amanhã
                            description: description,
                            subscription: assinaturaId
                        };

                        // URL de callback para redirecionar após pagamento
                        // Tenta usar FRONTEND_BASE_URL, se não tiver, tenta inferir de NEXT_PUBLIC_API_BASE_URL removendo /api
                        let baseUrl = process.env.FRONTEND_BASE_URL;
                        if (!baseUrl && process.env.NEXT_PUBLIC_API_BASE_URL) {
                            // Remove /api do final se existir
                            baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, '');
                        }
                        if (!baseUrl) {
                            baseUrl = 'http://localhost:3000';
                        }
                        const callbackUrl = `${baseUrl}/aguardando-pagamento/${assinaturaId}`;
                        paymentBody.callback = {
                            successUrl: callbackUrl,
                            autoRedirect: true
                        };

                        const paymentResp = await axios.post(`${ASAAS_API_URL}/payments`, paymentBody, {
                            headers: { access_token: ASAAS_API_KEY }
                        });
                        const payment = paymentResp.data;
                        checkoutUrl = payment.invoiceUrl || payment.bankSlipUrl;
                        console.log('[startSubscription] URL de checkout gerada para cartão de crédito:', checkoutUrl);
                    }
                } catch (checkoutError: any) {
                    console.error('[startSubscription] Erro ao gerar URL de checkout:', {
                        message: checkoutError?.message,
                        responseData: checkoutError?.response?.data
                    });
                    // Não falha o cadastro se não conseguir gerar a URL, apenas não retorna ela
                }
            }

            // 4. Salvar dados completos para cadastro automático no Rapidoc após pagamento

            return res.status(201).json({
                message: 'Assinatura iniciada. Aguarde confirmação do pagamento.',
                clienteId: cliente.id,
                assinaturaId,
                checkoutUrl, // URL do checkout do Asaas (apenas para cartão de crédito)
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
     * Requisitos ATUALIZADOS:
     * 1. Usuário deve ter pago os períodos necessários
     * 2. NÃO deve possuir dependentes ativos (Verificação nova)
     * 3. Inativa beneficiário no Rapidoc
     * 4. Cancela assinatura no Asaas
     * 5. Marca assinatura como cancelada no Firestore
     */
   static async cancelarPlanoUsuario(req: Request, res: Response) {
        try {
            // 1. Identificação do Usuário
            const uid = req.user?.uid || req.user?.sub;
            if (!uid) return res.status(401).json({ error: 'Usuário não autenticado.' });

            const { getFirestore } = await import('firebase-admin/firestore');
            const { firebaseApp } = await import('../config/firebase.js');
            const db = getFirestore(firebaseApp);
            
            // Buscar CPF e Referência do Usuário
            const usuarioRef = db.collection('usuarios').doc(uid);
            const usuarioDoc = await usuarioRef.get();
            let cpf: string | undefined = usuarioDoc.exists ? usuarioDoc.data()?.cpf : undefined;
            
            if (!cpf) cpf = (req.user as any)?.cpf || uid;
            
            if (!cpf) return res.status(400).json({ error: 'CPF do usuário não encontrado.' });

            const cpfClean = String(cpf).replace(/\D/g, '');
            const cpfFormatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

            console.log(`[cancelarPlanoUsuario] 1. Usuário: ${cpfClean} (UID: ${uid})`);

            // 2. Busca Assinaturas Locais
            const assinaturasSnap = await db.collection('assinaturas')
                .where('cpfUsuario', 'in', [cpfClean, cpfFormatted])
                .get();
            
            if (assinaturasSnap.empty) {
                console.warn(`[cancelarPlanoUsuario] Nenhuma assinatura local encontrada.`);
                return res.status(404).json({ error: 'Nenhuma assinatura vinculada ao seu usuário.' });
            }

            // 3. Verifica no ASAAS qual está ATIVA
            let assinaturaAtivaId: string | undefined;
            let assinaturaDocLocal: any;
            let periodicidade: string | undefined;

            const axios = (await import('axios')).default;
            const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
            const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

            console.log(`[cancelarPlanoUsuario] 2. Verificando ${assinaturasSnap.size} assinaturas no Asaas...`);

            for (const doc of assinaturasSnap.docs) {
                const data = doc.data();
                const asaasId = data.idAssinatura || doc.id;
                
                try {
                    const resp = await axios.get(`${ASAAS_API_URL}/subscriptions/${asaasId}`, {
                        headers: { access_token: ASAAS_API_KEY }
                    });
                    
                    const statusReal = resp.data?.status;
                    console.log(` -> Local: ${asaasId} | Status Asaas: ${statusReal}`);

                    if (statusReal === 'ACTIVE') {
                        assinaturaAtivaId = asaasId;
                        assinaturaDocLocal = doc;
                        periodicidade = data.planoPeriodicidade || resp.data?.cycle;
                        break; 
                    }
                } catch (e: any) {
                    // Ignora assinaturas não encontradas no Asaas
                }
            }

            if (!assinaturaAtivaId || !assinaturaDocLocal) {
                return res.status(404).json({ error: 'Nenhuma assinatura ATIVA encontrada no sistema de pagamentos.' });
            }

            // 4. Verificação de Dependentes (Bloqueio)
            const dependentesSnapshot = await db.collection('beneficiarios')
                .where('holder', 'in', [cpfClean, cpfFormatted])
                .get();

            // Filtra o próprio titular da contagem
            const dependentesReais = dependentesSnapshot.docs.filter(doc => {
                const d = doc.data();
                const dCpf = String(d.cpf || '').replace(/\D/g, '');
                // Considera dependente se o CPF for diferente do titular E se ainda estiver ativo (opcional, mas seguro)
                return dCpf !== cpfClean; 
            });

            if (dependentesReais.length > 0) {
                return res.status(400).json({ 
                    error: `Você possui ${dependentesReais.length} dependente(s). Remova-os antes de excluir sua conta.`,
                    dependentesCount: dependentesReais.length
                });
            }

            // 5. Verificar Fidelidade
            if (!periodicidade && assinaturaDocLocal.data()?.planoId) {
                try {
                    const pDoc = await db.collection('planos').doc(assinaturaDocLocal.data().planoId).get();
                    if (pDoc.exists) periodicidade = pDoc.data()?.periodicidade;
                } catch (e) {}
            }

            const { verificarTresPrimeirosMesesPagos, obterPeriodosNecessariosParaCancelamento } = await import('../services/asaas.service.js');
            const periodosNecessarios = obterPeriodosNecessariosParaCancelamento(periodicidade);
            const verificacao = await verificarTresPrimeirosMesesPagos(assinaturaAtivaId, periodosNecessarios);
            
            if (!verificacao.pagos) {
                return res.status(403).json({ 
                    error: verificacao.mensagem || `Fidelidade: É necessário ter pago ${periodosNecessarios} mensalidades para cancelar.`,
                    pagamentosPagos: verificacao.pagamentosPagos,
                    periodosNecessarios: verificacao.periodosNecessarios
                });
            }

            // 6. RAPIDOC: Apagar conta (DELETE)
            const { buscarBeneficiarioRapidocPorCpf, inativarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
            try {
                const beneficiarioResp = await buscarBeneficiarioRapidocPorCpf(cpfClean);
                const beneficiario = beneficiarioResp?.beneficiary;
                
                if (beneficiario && beneficiario.uuid) {
                    console.log(`[cancelarPlanoUsuario] 4. Apagando no Rapidoc: ${beneficiario.uuid}`);
                    const rapidocResult = await inativarBeneficiarioRapidoc(beneficiario.uuid);
                    
                    if (rapidocResult && rapidocResult.success === false) {
                        throw new Error(rapidocResult.message || 'Erro na resposta do Rapidoc');
                    }
                }
            } catch (rapidocError: any) {
                console.error('[cancelarPlanoUsuario] ERRO CRÍTICO RAPIDOC:', rapidocError?.message);
                return res.status(500).json({ 
                    error: 'Falha ao remover conta no parceiro médico (Rapidoc). Processo abortado.',
                    detail: rapidocError?.response?.data || rapidocError?.message
                });
            }

            // 7. ASAAS: Cancelar Assinatura
            const { cancelarAssinaturaAsaas } = await import('../services/asaas.service.js');
            try {
                console.log(`[cancelarPlanoUsuario] 5. Cancelando no Asaas: ${assinaturaAtivaId}`);
                await cancelarAssinaturaAsaas(assinaturaAtivaId);
            } catch (asaasError: any) {
                console.error('[cancelarPlanoUsuario] Erro Asaas (prosseguindo):', asaasError.message);
            }

            // 8. EXCLUSÃO TOTAL DOS DADOS (Firestore & Auth)
            console.log(`[cancelarPlanoUsuario] 6. Excluindo dados do banco e autenticação...`);
            
            const batch = db.batch();

            // A) Deleta documento da assinatura
            batch.delete(assinaturaDocLocal.ref);

            // B) Deleta documento do beneficiário titular
            const titSnap = await db.collection('beneficiarios').where('cpf', '==', cpfClean).get();
            titSnap.forEach(d => batch.delete(d.ref));

            // C) Deleta documento do usuário (Perfil)
            batch.delete(usuarioRef);

            // Executa exclusões no Firestore
            await batch.commit();

            // D) Deleta usuário do Firebase Authentication
            try {
                const admin = (await import('firebase-admin')).default;
                await admin.auth().deleteUser(uid);
                console.log(`[cancelarPlanoUsuario] Usuário ${uid} deletado do Firebase Auth.`);
            } catch (authError: any) {
                console.error('[cancelarPlanoUsuario] Erro ao deletar do Auth:', authError);
                // Não retorna erro aqui para não travar o sucesso da operação, pois o banco já foi limpo
            }

            console.log('[cancelarPlanoUsuario] 7. Sucesso! Conta excluída.');
            return res.status(200).json({ 
                success: true,
                message: 'Conta e plano excluídos com sucesso.',
                dataCancelamento: new Date().toISOString()
            });

        } catch (error: any) {
            console.error('[cancelarPlanoUsuario] Erro Geral:', error);
            return res.status(500).json({ 
                error: error?.message || 'Erro interno ao cancelar plano.' 
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

    /**
     * Atualiza a forma de pagamento de uma assinatura existente
     * Permite alterar entre BOLETO, PIX e CREDIT_CARD
     * Regras de negócio:
     * 1. Verifica se há cobranças pendentes/atrasadas antes de permitir alteração
     * 2. Atualiza a assinatura com o novo billingType
     * 3. Se for CREDIT_CARD, atualiza também os dados do cartão
     */
    static async updatePaymentMethod(req: Request, res: Response) {
        try {
            const { assinaturaId } = req.params;
            const { 
                billingType, 
                nextDueDate, 
                creditCard, 
                creditCardHolderInfo, 
                creditCardToken 
            } = req.body;

            // Log para debug
            console.log('[updatePaymentMethod] Recebido:', {
                assinaturaId,
                billingType,
                temCreditCard: !!creditCard,
                temCreditCardToken: !!creditCardToken,
                temCreditCardHolderInfo: !!creditCardHolderInfo,
                creditCardHolderInfoKeys: creditCardHolderInfo ? Object.keys(creditCardHolderInfo) : []
            });

            // Validações básicas
            if (!assinaturaId) {
                return res.status(400).json({ error: 'assinaturaId é obrigatório.' });
            }

            if (!billingType) {
                return res.status(400).json({ error: 'billingType é obrigatório. Use: BOLETO, PIX ou CREDIT_CARD.' });
            }

            const tiposPermitidos: Array<'BOLETO' | 'PIX' | 'CREDIT_CARD'> = ['BOLETO', 'PIX', 'CREDIT_CARD'];
            if (!tiposPermitidos.includes(billingType)) {
                return res.status(400).json({ 
                    error: `billingType inválido. Use um dos seguintes: ${tiposPermitidos.join(', ')}.` 
                });
            }

            // Importar serviços
            const { 
                listarCobrancasAssinaturaAsaas, 
                atualizarAssinaturaAsaas, 
                atualizarCartaoAssinaturaAsaas 
            } = await import('../services/asaas.service.js');

            // 1. Verificar se há cobranças pendentes/atrasadas
            try {
                const cobrancas = await listarCobrancasAssinaturaAsaas(assinaturaId);
                const STATUS_PENDENTES = new Set(['PENDING', 'OVERDUE']);
                const cobrancasPendentes = cobrancas.filter((c: any) => 
                    STATUS_PENDENTES.has(String(c?.status || '').toUpperCase())
                );

                if (cobrancasPendentes.length > 0) {
                    return res.status(409).json({
                        error: 'Não é possível alterar a forma de pagamento: existem cobranças pendentes ou atrasadas.',
                        cobrancasPendentes: cobrancasPendentes.map((c: any) => ({
                            id: c.id,
                            status: c.status,
                            value: c.value,
                            dueDate: c.dueDate
                        }))
                    });
                }
            } catch (errorVerificacao: any) {
                // Se não conseguir listar cobranças, loga mas continua (pode ser assinatura sem cobranças ainda)
                console.warn('[updatePaymentMethod] Erro ao verificar cobranças:', errorVerificacao?.message);
            }

            // 2. Obter IP do cliente (para segurança ao atualizar cartão)
            const remoteIp = req.ip || 
                           (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                           req.socket.remoteAddress || 
                           undefined;

            // 3. Atualizar assinatura com novo billingType
            try {
                const updateParams: {
                    subscriptionId: string;
                    billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
                    updatePendingPayments: boolean;
                    nextDueDate?: string;
                } = {
                    subscriptionId: assinaturaId,
                    billingType: billingType as 'BOLETO' | 'PIX' | 'CREDIT_CARD',
                    updatePendingPayments: true
                };
                
                if (nextDueDate) {
                    updateParams.nextDueDate = String(nextDueDate).substring(0, 10);
                }
                
                await atualizarAssinaturaAsaas(updateParams);
            } catch (errorAtualizacao: any) {
                console.error('[updatePaymentMethod] Erro ao atualizar assinatura:', {
                    message: errorAtualizacao?.message,
                    responseData: errorAtualizacao?.response?.data,
                    status: errorAtualizacao?.response?.status
                });

                const statusCode = errorAtualizacao?.response?.status || 500;
                const errorMessage = errorAtualizacao?.response?.data?.errors || 
                                   errorAtualizacao?.response?.data?.message || 
                                   errorAtualizacao?.message || 
                                   'Erro ao atualizar assinatura no Asaas.';

                return res.status(statusCode).json({ 
                    error: errorMessage,
                    details: errorAtualizacao?.response?.data 
                });
            }

            // 4. Se for CREDIT_CARD, atualizar dados do cartão
            if (billingType === 'CREDIT_CARD') {
                // Validação: precisa ter creditCardToken ou dados completos do cartão
                if (!creditCardToken && (!creditCard || !creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv)) {
                    return res.status(400).json({ 
                        error: 'Para CREDIT_CARD, é necessário fornecer creditCardToken ou dados completos do cartão (holderName, number, expiryMonth, expiryYear, ccv).' 
                    });
                }

                // Validação: precisa ter creditCardHolderInfo
                if (!creditCardHolderInfo) {
                    console.error('[updatePaymentMethod] creditCardHolderInfo não fornecido');
                    return res.status(400).json({ 
                        error: 'Para CREDIT_CARD, é necessário fornecer creditCardHolderInfo completo (name, email, cpfCnpj, postalCode, addressNumber).' 
                    });
                }
                
                // Validar campos obrigatórios individualmente para mensagem mais clara
                const camposFaltantes: string[] = [];
                if (!creditCardHolderInfo.name || !String(creditCardHolderInfo.name).trim()) camposFaltantes.push('name');
                if (!creditCardHolderInfo.email || !String(creditCardHolderInfo.email).trim()) camposFaltantes.push('email');
                if (!creditCardHolderInfo.cpfCnpj || !String(creditCardHolderInfo.cpfCnpj).trim()) camposFaltantes.push('cpfCnpj');
                if (!creditCardHolderInfo.postalCode || !String(creditCardHolderInfo.postalCode).trim()) camposFaltantes.push('postalCode');
                if (!creditCardHolderInfo.addressNumber || !String(creditCardHolderInfo.addressNumber).trim()) camposFaltantes.push('addressNumber');
                
                if (camposFaltantes.length > 0) {
                    console.error('[updatePaymentMethod] Campos faltantes no creditCardHolderInfo:', camposFaltantes);
                    return res.status(400).json({ 
                        error: `Para CREDIT_CARD, é necessário fornecer creditCardHolderInfo completo. Campos faltantes: ${camposFaltantes.join(', ')}.` 
                    });
                }

                try {
                    const cartaoParams: {
                        subscriptionId: string;
                        creditCardToken?: string;
                        creditCard?: {
                            holderName: string;
                            number: string;
                            expiryMonth: string;
                            expiryYear: string;
                            ccv: string;
                        };
                        creditCardHolderInfo: {
                            name: string;
                            email: string;
                            cpfCnpj: string;
                            postalCode: string;
                            addressNumber: string;
                            addressComplement?: string;
                            phone?: string;
                        };
                        remoteIp?: string;
                    } = {
                        subscriptionId: assinaturaId,
                        creditCardHolderInfo: {
                            name: creditCardHolderInfo.name,
                            email: creditCardHolderInfo.email,
                            cpfCnpj: creditCardHolderInfo.cpfCnpj,
                            postalCode: creditCardHolderInfo.postalCode,
                            addressNumber: creditCardHolderInfo.addressNumber
                        }
                    };
                    
                    if (creditCardToken) {
                        cartaoParams.creditCardToken = creditCardToken;
                    } else if (creditCard) {
                        cartaoParams.creditCard = {
                            holderName: creditCard.holderName,
                            number: creditCard.number,
                            expiryMonth: creditCard.expiryMonth,
                            expiryYear: creditCard.expiryYear,
                            ccv: creditCard.ccv
                        };
                    }
                    
                    if (creditCardHolderInfo.addressComplement) {
                        cartaoParams.creditCardHolderInfo.addressComplement = creditCardHolderInfo.addressComplement;
                    }
                    
                    if (creditCardHolderInfo.phone) {
                        cartaoParams.creditCardHolderInfo.phone = creditCardHolderInfo.phone;
                    }
                    
                    if (remoteIp) {
                        cartaoParams.remoteIp = remoteIp;
                    }
                    
                    await atualizarCartaoAssinaturaAsaas(cartaoParams);
                } catch (errorCartao: any) {
                    console.error('[updatePaymentMethod] Erro ao atualizar cartão:', {
                        message: errorCartao?.message,
                        responseData: errorCartao?.response?.data,
                        status: errorCartao?.response?.status
                    });

                    const statusCode = errorCartao?.response?.status || 500;
                    const errorMessage = errorCartao?.response?.data?.errors || 
                                       errorCartao?.response?.data?.message || 
                                       errorCartao?.message || 
                                       'Erro ao atualizar dados do cartão no Asaas.';

                    return res.status(statusCode).json({ 
                        error: errorMessage,
                        details: errorCartao?.response?.data,
                        note: 'A assinatura foi atualizada, mas falhou ao atualizar o cartão. Verifique os dados do cartão e tente novamente.'
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Forma de pagamento atualizada com sucesso.',
                assinaturaId,
                billingType,
                nextDueDate: nextDueDate ? String(nextDueDate).substring(0, 10) : undefined
            });
        } catch (error: any) {
            console.error('[updatePaymentMethod] Erro inesperado:', {
                message: error?.message,
                stack: error?.stack,
                responseData: error?.response?.data
            });

            return res.status(500).json({ 
                error: error?.message || 'Erro ao atualizar forma de pagamento.',
                details: error?.response?.data 
            });
        }
    }

    /**
     * Verifica o pagamento de verificação e atualiza a assinatura com o token do cartão
     * POST /subscription/verify-and-update-card/:assinaturaId
     */
    static async verifyAndUpdateCard(req: Request, res: Response) {
        try {
            const { assinaturaId } = req.params;
            const { paymentId } = req.body;

            if (!assinaturaId) {
                return res.status(400).json({ error: 'assinaturaId é obrigatório.' });
            }

            if (!paymentId) {
                return res.status(400).json({ error: 'paymentId é obrigatório.' });
            }

            const axios = (await import('axios')).default;
            const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
            const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

            if (!ASAAS_API_KEY) {
                return res.status(500).json({ error: 'Chave da API Asaas não configurada.' });
            }

            // Buscar o pagamento
            const paymentResp = await axios.get(`${ASAAS_API_URL}/payments/${paymentId}`, {
                headers: { access_token: ASAAS_API_KEY }
            });

            const payment = paymentResp.data;

            // Verificar se o pagamento foi concluído
            if (payment.status !== 'RECEIVED' && payment.status !== 'CONFIRMED') {
                return res.status(400).json({ 
                    error: 'Pagamento ainda não foi confirmado.',
                    status: payment.status
                });
            }

            // Obter o token do cartão (se disponível)
            const creditCardToken = payment.creditCard?.creditCardToken || payment.creditCardToken;

            if (!creditCardToken) {
                return res.status(400).json({ error: 'Token do cartão não encontrado no pagamento.' });
            }

            // Buscar dados do portador do cartão
            const customerResp = await axios.get(`${ASAAS_API_URL}/customers/${payment.customer}`, {
                headers: { access_token: ASAAS_API_KEY }
            });

            const customer = customerResp.data;

            // Atualizar a assinatura para CREDIT_CARD
            const { atualizarAssinaturaAsaas, atualizarCartaoAssinaturaAsaas } = await import('../services/asaas.service.js');

            // 1. Atualizar billingType
            await atualizarAssinaturaAsaas({
                subscriptionId: assinaturaId,
                billingType: 'CREDIT_CARD',
                updatePendingPayments: true
            });

            // 2. Atualizar cartão com o token
            const remoteIp = req.ip || 
                           (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                           req.socket.remoteAddress || 
                           undefined;

            const cartaoParams: {
                subscriptionId: string;
                creditCardToken: string;
                creditCardHolderInfo: {
                    name: string;
                    email: string;
                    cpfCnpj: string;
                    postalCode: string;
                    addressNumber: string;
                    addressComplement?: string;
                    phone?: string;
                };
                remoteIp?: string;
            } = {
                subscriptionId: assinaturaId,
                creditCardToken: creditCardToken,
                creditCardHolderInfo: {
                    name: customer.name || '',
                    email: customer.email || '',
                    cpfCnpj: customer.cpfCnpj || '',
                    postalCode: customer.postalCode || '',
                    addressNumber: customer.addressNumber || ''
                }
            };

            if (customer.addressComplement) {
                cartaoParams.creditCardHolderInfo.addressComplement = customer.addressComplement;
            }

            if (customer.phone || customer.mobilePhone) {
                cartaoParams.creditCardHolderInfo.phone = customer.phone || customer.mobilePhone;
            }

            if (remoteIp) {
                cartaoParams.remoteIp = remoteIp;
            }

            await atualizarCartaoAssinaturaAsaas(cartaoParams);

            return res.status(200).json({
                success: true,
                message: 'Cartão verificado e assinatura atualizada com sucesso.',
                assinaturaId
            });
        } catch (error: any) {
            console.error('[verifyAndUpdateCard] Erro:', {
                message: error?.message,
                responseData: error?.response?.data,
                status: error?.response?.status
            });

            const statusCode = error?.response?.status || 500;
            const errorMessage = error?.response?.data?.errors || 
                               error?.response?.data?.message || 
                               error?.message || 
                               'Erro ao verificar e atualizar cartão.';

            return res.status(statusCode).json({ 
                error: errorMessage,
                details: error?.response?.data 
            });
        }
    }

    /**
     * Cria uma cobrança de verificação de cartão no Asaas
     * e retorna a URL de pagamento segura para o usuário inserir os dados do cartão
     * POST /subscription/generate-card-verification-url/:assinaturaId
     */
    static async generateCardVerificationUrl(req: Request, res: Response) {
        try {
            const { assinaturaId } = req.params;
            const { callbackUrl } = req.body;

            console.log('[generateCardVerificationUrl] Iniciando:', { assinaturaId, callbackUrl });

            if (!assinaturaId) {
                return res.status(400).json({ error: 'assinaturaId é obrigatório.' });
            }

            const axios = (await import('axios')).default;
            const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
            const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

            if (!ASAAS_API_KEY) {
                return res.status(500).json({ error: 'Chave da API Asaas não configurada.' });
            }

            // Buscar dados da assinatura para obter o customer ID
            let subscription;
            let customerId;
            try {
                const subscriptionResp = await axios.get(`${ASAAS_API_URL}/subscriptions/${assinaturaId}`, {
                    headers: { access_token: ASAAS_API_KEY }
                });
                subscription = subscriptionResp.data;
                customerId = subscription.customer;
                console.log('[generateCardVerificationUrl] Assinatura encontrada:', { subscriptionId: subscription.id, customerId });
            } catch (error: any) {
                console.error('[generateCardVerificationUrl] Erro ao buscar assinatura:', {
                    message: error?.message,
                    responseData: error?.response?.data,
                    status: error?.response?.status
                });
                
                if (error?.response?.status === 404) {
                    return res.status(404).json({ error: 'Assinatura não encontrada no Asaas.' });
                }
                throw error;
            }

            if (!customerId) {
                return res.status(400).json({ error: 'Customer ID não encontrado na assinatura.' });
            }

            // Criar cobrança de verificação (valor mínimo de R$ 5,00 para cartão de crédito)
            // Esta cobrança será usada apenas para cadastrar o cartão
            // NOTA: O valor será estornado ou pode ser usado como crédito na assinatura
            const paymentBody: any = {
                customer: customerId,
                billingType: 'CREDIT_CARD',
                value: 5.00, // Valor mínimo para cartão de crédito no Asaas
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Amanhã
                description: 'Verificação de cartão - Atualização de forma de pagamento'
            };

            // Adicionar callback apenas se fornecido
            if (callbackUrl && typeof callbackUrl === 'string' && callbackUrl.trim()) {
                paymentBody.callback = {
                    successUrl: callbackUrl.trim(),
                    autoRedirect: true
                };
            }

            console.log('[generateCardVerificationUrl] Criando pagamento:', { paymentBody });

            let payment;
            try {
                const paymentResp = await axios.post(`${ASAAS_API_URL}/payments`, paymentBody, {
                    headers: { access_token: ASAAS_API_KEY }
                });
                payment = paymentResp.data;
                console.log('[generateCardVerificationUrl] Pagamento criado:', { paymentId: payment.id, invoiceUrl: payment.invoiceUrl });
            } catch (error: any) {
                console.error('[generateCardVerificationUrl] Erro ao criar pagamento:', {
                    message: error?.message,
                    responseData: error?.response?.data,
                    status: error?.response?.status,
                    requestBody: paymentBody
                });

                const statusCode = error?.response?.status || 500;
                const errorData = error?.response?.data;

                // Se o erro vier do Asaas, retornar os detalhes
                if (errorData) {
                    const errorMessage = Array.isArray(errorData.errors) 
                        ? errorData.errors.map((e: any) => e.description || e.message || e).join(', ')
                        : errorData.message || errorData.description || 'Erro ao criar pagamento no Asaas.';

                    return res.status(statusCode).json({ 
                        error: errorMessage,
                        details: errorData 
                    });
                }

                throw error;
            }

            if (!payment.invoiceUrl && !payment.bankSlipUrl) {
                console.warn('[generateCardVerificationUrl] URL de pagamento não encontrada:', payment);
                return res.status(500).json({ 
                    error: 'URL de pagamento não foi gerada pelo Asaas.',
                    details: payment 
                });
            }

            // Usar invoiceUrl ou bankSlipUrl (pode variar)
            const paymentUrl = payment.invoiceUrl || payment.bankSlipUrl;

            return res.status(200).json({
                paymentId: payment.id,
                invoiceUrl: paymentUrl,
                message: 'URL de pagamento gerada com sucesso. Redirecione o usuário para esta URL.'
            });
        } catch (error: any) {
            console.error('[generateCardVerificationUrl] Erro não tratado:', {
                message: error?.message,
                stack: error?.stack,
                responseData: error?.response?.data,
                status: error?.response?.status
            });

            const statusCode = error?.response?.status || 500;
            const errorMessage = error?.response?.data?.errors || 
                               (Array.isArray(error?.response?.data?.errors) 
                                   ? error?.response?.data?.errors.map((e: any) => e.description || e.message || e).join(', ')
                                   : error?.response?.data?.message) ||
                               error?.message || 
                               'Erro ao gerar URL de verificação de cartão.';

            return res.status(statusCode).json({ 
                error: errorMessage,
                details: error?.response?.data 
            });
        }
    }
}