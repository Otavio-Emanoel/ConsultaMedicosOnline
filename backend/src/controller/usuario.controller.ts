import type { Request, Response } from 'express';
import { salvarUsuario } from '../services/firestore.service.js';
import { verificarAssinaturaPorCpf } from '../services/asaas.service.js';
import axios from 'axios';
import admin from 'firebase-admin';
import { configDotenv } from 'dotenv';
configDotenv();

export class UsuarioController {
    static async criarOuAtualizar(req: Request, res: Response) {
        try {
            const usuario = req.body;
            if (!usuario.cpf) {
                return res.status(400).json({ error: 'CPF é obrigatório.' });
            }

            // Verifica se usuário já está cadastrado no Firestore
            const usuarioRef = admin.firestore().collection('usuarios').doc(usuario.cpf);
            const usuarioDoc = await usuarioRef.get();
            if (usuarioDoc.exists) {
                return res.status(409).json({ error: 'Usuário já cadastrado no banco de dados.' });
            }

            // Verifica se usuário existe no Rapidoc
            let rapidocContaExiste = false;
            let rapidocBeneficiaryUuid: string | undefined;
            try {
                const resp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/tema/api/beneficiaries/${usuario.cpf}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                        clientId: process.env.RAPIDOC_CLIENT_ID,
                        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                    }
                });
                const data = resp.data && resp.data.beneficiary;
                rapidocContaExiste = !!data && !!data.uuid && data.isActive === true;
                if (rapidocContaExiste) {
                    rapidocBeneficiaryUuid = data.uuid;
                }
            } catch (err) {
                rapidocContaExiste = false;
            }
            if (!rapidocContaExiste) {
                return res.status(404).json({ error: 'Usuário não possui conta no Rapidoc.' });
            }

            // Verifica Asaas: se idAssinatura foi enviado, usa verificação direta da assinatura; senão, usa verificação por CPF
            const { verificarPrimeiroPagamentoAssinatura: _verificarPrimeiroPagamentoAssinatura } = await import('../services/asaas.service.js');
            const assinaturaIdBody: string | undefined = (usuario as any).idAssinatura;
            if (assinaturaIdBody && typeof assinaturaIdBody === 'string') {
                const status = await _verificarPrimeiroPagamentoAssinatura(assinaturaIdBody);
                if (!status.pago) {
                    return res.status(402).json({ error: 'Assinatura informada não está com o primeiro pagamento confirmado.' });
                }
                // anota assinatura atual no objeto salvo
                (usuario as any).idAssinaturaAtual = assinaturaIdBody;
            } else {
                const asaasCheck = await verificarAssinaturaPorCpf(usuario.cpf);
                if (!asaasCheck.assinaturaOk || !asaasCheck.cliente?.pagamentoEmDia) {
                    return res.status(402).json({ error: 'Usuário não possui assinatura ativa e paga no Asaas.' });
                }
                (usuario as any).idAssinaturaAtual = (usuario as any).idAssinaturaAtual || undefined;
            }

            // Acrescenta rapidocBeneficiaryUuid ao objeto salvo, sem exigir que venha no body
            if (rapidocBeneficiaryUuid) {
                (usuario as any).rapidocBeneficiaryUuid = rapidocBeneficiaryUuid;
            }
            // Adiciona data de criação
            (usuario as any).criadoEm = new Date().toISOString();
            const result = await salvarUsuario(usuario);
            return res.status(201).json({ message: 'Usuário salvo com sucesso.', id: result.id });
        } catch (error: any) {
            // Salva log detalhado do erro no Firestore
            try {
                const usuario = req.body || {};
                const logData = {
                    cpf: usuario.cpf || null,
                    body: usuario,
                    errorMessage: error?.message || 'Erro ao salvar usuário.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                };
                await admin.firestore().collection('logsErros').add(logData);
            } catch (logErr) {
                // Se falhar o log, apenas ignora
            }
            return res.status(500).json({ error: error.message || 'Erro ao salvar usuário.' });
        }
    }

    static async listar(req: Request, res: Response) {
        try {
            const snapshot = await admin.firestore().collection('usuarios').get();
            const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json(usuarios);
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'listarUsuarios',
                    errorMessage: error?.message || 'Erro ao listar usuários.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao listar usuários.' });
        }
    }

    static async obterDados(req: Request, res: Response) {
        const { cpf } = req.params;
        if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

        try {
            const usuarioRef = admin.firestore().collection('usuarios').doc(cpf);
            const usuarioDoc = await usuarioRef.get();
            if (!usuarioDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });
            return res.status(200).json(usuarioDoc.data());
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'obterDadosUsuario',
                    cpf,
                    errorMessage: error?.message || 'Erro ao obter usuário.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao obter usuário.' });
        }
    }

    static async atualizarSenha(req: Request, res: Response) {
        try {
            const { senhaAtual, novaSenha } = req.body;
            const uid = req.user?.uid;
            let email = req.user?.email as string | undefined;
            // Fallback: obter email via UID no Firebase Auth se não presente no token
            if (!email && uid) {
                try {
                    const userRecord = await admin.auth().getUser(uid);
                    email = userRecord.email || undefined;
                } catch {}
            }
            if (!uid || !email || !senhaAtual || !novaSenha) {
                return res.status(400).json({ error: 'Dados obrigatórios não informados (uid, email, senhaAtual, novaSenha).' });
            }

            // 1. Valida senha atual via Firebase REST API
            const apiKey = process.env.FIREBASE_WEB_API_KEY;
            if (!apiKey) {
                return res.status(500).json({ error: 'FIREBASE_WEB_API_KEY não configurada.' });
            }

            try {
                await axios.post(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                    {
                        email,
                        password: senhaAtual,
                        returnSecureToken: false,
                    }
                );
            } catch (err: any) {
                return res.status(401).json({ error: 'Senha atual incorreta.' });
            }

            // 2. Troca a senha no Firebase Auth
            await admin.auth().updateUser(uid, { password: novaSenha });

            return res.status(200).json({ ok: true, message: 'Senha alterada com sucesso.' });
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'atualizarSenha',
                    uid: req.user?.uid || null,
                    email: req.user?.email || null,
                    errorMessage: error?.message || 'Erro ao alterar senha.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao alterar senha.' });
        }
    }

    static async recuperarSenha(req: Request, res: Response) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

        const apiKey = process.env.FIREBASE_WEB_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'FIREBASE_WEB_API_KEY não configurada.' });

        // Chama a API REST do Firebase para enviar o e-mail de reset
        await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
            {
                requestType: "PASSWORD_RESET",
                email,
            }
        );

        return res.status(200).json({ ok: true, message: 'E-mail de recuperação enviado com sucesso.' });
    } catch (error: any) {
        try {
            await admin.firestore().collection('logsErros').add({
                endpoint: 'recuperarSenha',
                email: req.body?.email || null,
                errorMessage: error?.message || 'Erro ao enviar e-mail de recuperação.',
                stack: error?.stack || null,
                data: new Date().toISOString(),
            });
        } catch {}
        return res.status(500).json({ error: error.message || 'Erro ao enviar e-mail de recuperação.' });
    }
}

    static async obterDadosAutenticado(req: Request, res: Response) {
        // Tenta obter CPF do token primeiro
        let cpf = req.user?.cpf as string | undefined;
        
        // Fallback 1: Se não tiver CPF no token, tenta usar o UID (que pode ser o CPF)
        if (!cpf && req.user?.uid) {
            // Verifica se o UID é um CPF válido (11 dígitos)
            const uid = req.user.uid;
            if (/^\d{11}$/.test(uid)) {
                cpf = uid;
            } else {
                // Se UID não é CPF, busca no Firestore pelo UID
                try {
                    const usuarioRef = admin.firestore().collection('usuarios').doc(uid);
                    const usuarioDoc = await usuarioRef.get();
                    if (usuarioDoc.exists) {
                        const usuarioData = usuarioDoc.data();
                        cpf = usuarioData?.cpf || uid;
                    }
                } catch {}
            }
        }
        
        // Fallback 2: Busca pelo email no Firestore
        if (!cpf && req.user?.email) {
            try {
                const snap = await admin.firestore().collection('usuarios')
                    .where('email', '==', req.user.email)
                    .limit(1)
                    .get();
                if (!snap.empty) {
                    const first = snap.docs[0];
                    if (first) {
                        cpf = (first.data().cpf as string) || first.id;
                    }
                }
            } catch {}
        }
        
        if (!cpf) {
            return res.status(400).json({ error: 'CPF não encontrado. Não foi possível identificar o usuário.' });
        }

        try {
            const usuarioRef = admin.firestore().collection('usuarios').doc(cpf);
            const usuarioDoc = await usuarioRef.get();
            if (!usuarioDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });
            return res.status(200).json(usuarioDoc.data());
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'obterDadosAutenticado',
                    cpf,
                    uid: req.user?.uid || null,
                    email: req.user?.email || null,
                    errorMessage: error?.message || 'Erro ao obter usuário autenticado.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao obter usuário.' });
        }
    }

    static async atualizarDadosLocal(req: Request, res: Response) {

        const { cpf } = req.params;
        const { nome, email, telefone, dataNascimento, genero, endereco } = req.body;
        const cleanCpf = String(cpf || '').replace(/\D/g, '');
        if (!cleanCpf || cleanCpf.length !== 11) return res.status(400).json({ error: 'CPF é obrigatório e deve ter 11 dígitos.' });
        if (!nome && !email && !telefone && !dataNascimento && !genero && !endereco) return res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });

        // Monta objeto apenas com campos definidos
        const updateData: Record<string, any> = {};
        if (nome !== undefined) updateData.nome = nome;
        if (email !== undefined) updateData.email = email;
        if (telefone !== undefined) updateData.telefone = telefone ? telefone.replace(/\D/g, '') : telefone;
        if (dataNascimento !== undefined) updateData.dataNascimento = dataNascimento;
        if (genero !== undefined) updateData.genero = genero;
        if (endereco !== undefined) updateData.endereco = endereco;

        try {
            // Atualiza no Firestore
            const usuarioRef = admin.firestore().collection('usuarios').doc(cleanCpf);
            const usuarioDoc = await usuarioRef.get();
            if (!usuarioDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });

            const before = usuarioDoc.data() || {};
            await usuarioRef.set(updateData, { merge: true });

            // Se email mudou, sincroniza com Firebase Auth
            if (email && email !== before.email) {
                try {
                    let uid = req.user?.uid as string | undefined;
                    if (!uid) {
                        // tenta achar pelo email anterior ou pelo CPF como uid
                        if (before.email) {
                            try {
                                const record = await admin.auth().getUserByEmail(before.email);
                                uid = record.uid;
                            } catch {}
                        }
                        if (!uid) {
                            try {
                                const record = await admin.auth().getUser(cleanCpf);
                                uid = record.uid;
                            } catch {}
                        }
                    }
                    if (!uid) {
                        throw new Error('Não foi possível localizar o usuário no Firebase Auth para atualizar o e-mail.');
                    }
                    await admin.auth().updateUser(uid, { email });
                } catch (authErr: any) {
                    // se falhar, reverte e informa
                    await usuarioRef.set({ email: before.email }, { merge: true });
                    return res.status(400).json({ error: authErr?.message || 'Falha ao atualizar e-mail no Firebase Auth.' });
                }
            }

            // Atualiza no Asaas (se necessário)
            if (process.env.ASAAS_BASE_URL && process.env.ASAAS_API_KEY) {
                try {
                    // Buscar cliente Asaas pelo CPF
                    const clientesResp = await axios.get(`${process.env.ASAAS_BASE_URL}/customers`, {
                        params: { cpfCnpj: cleanCpf },
                        headers: { access_token: process.env.ASAAS_API_KEY },
                    });
                    const clientes = clientesResp.data.data;
                    if (clientes && clientes.length > 0) {
                        const clienteId = clientes[0].id;
                        const body: Record<string, any> = {};
                        if (nome) body.name = nome;
                        if (email) body.email = email;
                        if (telefone) body.phone = telefone.replace(/\D/g, '');
                        await axios.post(
                            `${process.env.ASAAS_BASE_URL}/customers/${clienteId}`,
                            body,
                            { headers: { access_token: process.env.ASAAS_API_KEY } }
                        );
                    }
                } catch (e) {/* ignora erro do Asaas, segue fluxo */ }
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso.' });
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'atualizarDadosLocal',
                    cpf: cleanCpf,
                    body: req.body,
                    errorMessage: error?.message || 'Erro ao atualizar dados.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao atualizar dados.' });
        }
    }

    static async atualizarDadosRapidoc(req: Request, res: Response) {
        const cpfParam = (req.params as any).cpf;
        const cleanCpf = String(cpfParam || '').replace(/\D/g, '');
        const { nome, dataNascimento, email, telefone, zipCode, address, city, state, cpf, plans, paymentType, serviceType } = req.body || {};

        const hasAnyUpdateField = (
            (typeof nome === 'string' && nome.trim().length > 0) ||
            (typeof dataNascimento === 'string' && dataNascimento.trim().length > 0) ||
            (typeof email === 'string' && email.trim().length > 0) ||
            (typeof telefone === 'string' && telefone.trim().length > 0) ||
            (typeof zipCode === 'string' && zipCode.trim().length > 0) ||
            (typeof address === 'string' && address.trim().length > 0) ||
            (typeof city === 'string' && city.trim().length > 0) ||
            (typeof state === 'string' && state.trim().length > 0) ||
            (typeof cpf === 'string' && cpf.trim().length > 0) ||
            (Array.isArray(plans) && plans.length > 0) ||
            (typeof paymentType === 'string' && paymentType.trim().length > 0) ||
            (typeof serviceType === 'string' && serviceType.trim().length > 0)
        );

        if (!cleanCpf || cleanCpf.length !== 11) return res.status(400).json({ error: 'CPF é obrigatório e deve ter 11 dígitos.' });
        if (!hasAnyUpdateField) return res.status(400).json({ error: 'Nenhum campo para atualizar informado.' });

        try {
            const { RAPIDOC_BASE_URL, RAPIDOC_TOKEN, RAPIDOC_CLIENT_ID } = process.env as Record<string, string | undefined>;
            if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) {
                return res.status(500).json({ error: 'Configuração Rapidoc ausente.' });
            }

            // Busca dados atuais no Rapidoc por CPF
            let atualRapidoc: any;
            try {
                const resp = await axios.get(`${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cleanCpf}`, {
                    headers: {
                        Authorization: `Bearer ${RAPIDOC_TOKEN}`,
                        clientId: RAPIDOC_CLIENT_ID,
                        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                    }
                });
                if (resp.data && (resp.data.beneficiary || resp.data.data?.beneficiary)) {
                    atualRapidoc = resp.data.beneficiary || resp.data.data?.beneficiary;
                } else if (resp.data && resp.data.data) {
                    atualRapidoc = resp.data.data;
                }
            } catch (e: any) {
                return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
            }

            if (!atualRapidoc || !atualRapidoc.uuid) {
                return res.status(400).json({ error: 'UUID do beneficiário não encontrado no Rapidoc.' });
            }

            // Monta body apenas com campos enviados
            const bodyRapidoc: any = { uuid: atualRapidoc?.uuid };
            if (typeof nome === 'string' && nome.trim()) bodyRapidoc.name = nome.trim();
            if (typeof dataNascimento === 'string' && dataNascimento.trim()) {
                let birthday = dataNascimento.trim();
                // dd/MM/yyyy -> yyyy-MM-dd
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
                    const [d, m, y] = birthday.split('/');
                    birthday = `${y}-${m}-${d}`;
                }
                // ISO or other string -> tentar normalizar para yyyy-MM-dd
                if (/^\d{4}-\d{2}-\d{2}$/.test(birthday) === false) {
                    const parsed = new Date(birthday);
                    if (!isNaN(parsed.getTime())) {
                        const yyyy = parsed.getFullYear();
                        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                        const dd = String(parsed.getDate()).padStart(2, '0');
                        birthday = `${yyyy}-${mm}-${dd}`;
                    }
                }
                bodyRapidoc.birthday = birthday;
            }
            if (typeof email === 'string' && email.trim()) bodyRapidoc.email = email.trim();
            if (typeof telefone === 'string' && telefone.trim()) {
                const digits = telefone.replace(/\D/g, '');
                if (digits.length === 11) bodyRapidoc.phone = digits;
            }
            if (typeof zipCode === 'string' && zipCode.trim()) bodyRapidoc.zipCode = zipCode.trim();
            if (typeof address === 'string' && address.trim()) bodyRapidoc.address = address.trim();
            if (typeof city === 'string' && city.trim()) bodyRapidoc.city = city.trim();
            if (typeof state === 'string' && state.trim()) bodyRapidoc.state = state.trim();
            if (typeof cpf === 'string' && cpf.trim()) bodyRapidoc.cpf = cpf.trim();

            if (Array.isArray(plans) && plans.length > 0) {
                bodyRapidoc.plans = plans
                    .filter((p: any) => p && p.plan && typeof p.plan.uuid === 'string' && p.plan.uuid.trim().length > 0)
                    .map((p: any) => {
                        const out: any = { plan: { uuid: String(p.plan.uuid).trim() } };
                        const pt = String(p.paymentType || '').trim().toUpperCase();
                        if (pt === 'S' || pt === 'A') out.paymentType = pt;
                        return out;
                    });
            } else if (typeof serviceType === 'string' && serviceType.trim()) {
                const planEntry: any = { plan: { uuid: serviceType.trim() } };
                if (typeof paymentType === 'string' && paymentType.trim()) {
                    const pt = paymentType.trim().toUpperCase();
                    if (pt === 'S' || pt === 'A') planEntry.paymentType = pt;
                }
                bodyRapidoc.plans = [planEntry];
            }

            // Se não vier plano no payload, mas o Rapidoc tiver planos, envia-os normalizados (paymentType S/A)
            if (!bodyRapidoc.plans && Array.isArray(atualRapidoc?.plans) && atualRapidoc.plans.length > 0) {
                const normalizedPlans = atualRapidoc.plans
                    .map((p: any) => {
                        const uuid = p?.plan?.uuid || p?.planUuid || p?.uuid || p?.id;
                        if (!uuid || typeof uuid !== 'string') return null;
                        const rawPt = String(p?.paymentType || '').trim().toUpperCase();
                        const paymentTypeNormalized = rawPt === 'A' ? 'A' : 'S';
                        return { plan: { uuid: uuid.trim() }, paymentType: paymentTypeNormalized };
                    })
                    .filter(Boolean);
                if (normalizedPlans.length > 0) {
                    bodyRapidoc.plans = normalizedPlans;
                }
            }

            // Remove campos vazios
            Object.keys(bodyRapidoc).forEach((k) => {
                if (bodyRapidoc[k] === undefined) delete bodyRapidoc[k];
            });

            const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${bodyRapidoc.uuid}`;

            const doUpdate = async (payload: any) => axios.put(url, payload, {
                headers: {
                    Authorization: `Bearer ${RAPIDOC_TOKEN}`,
                    clientId: RAPIDOC_CLIENT_ID,
                    'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                }
            });

            try {
                const rapidocResp = await doUpdate(bodyRapidoc);
                return res.status(200).json({ ok: true, rapidoc: rapidocResp.data });
            } catch (rapidocError: any) {
                // Se o erro for "Email address already in use.", tenta novamente sem atualizar o email
                const detail = rapidocError?.response?.data || rapidocError?.message;
                const errors = (detail as any)?.errors;
                const emailInUse = Array.isArray(errors) && errors.some((e: any) => typeof e?.description === 'string' && e.description.toLowerCase().includes('email address already in use'));

                if (emailInUse && bodyRapidoc.email) {
                    const retryPayload = { ...bodyRapidoc };
                    delete retryPayload.email;
                    try {
                        const retryResp = await doUpdate(retryPayload);
                        return res.status(200).json({ ok: true, rapidoc: retryResp.data, warning: 'Email não alterado no Rapidoc pois já está em uso.' });
                    } catch (retryError: any) {
                        const retryDetail = retryError?.response?.data || retryError?.message;
                        return res.status(400).json({ error: 'Falha ao atualizar no Rapidoc (mesmo sem alterar email).', detail: retryDetail });
                    }
                }

                return res.status(400).json({ error: 'Falha ao atualizar no Rapidoc.', detail });
            }
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'atualizarDadosRapidoc',
                    cpf: cleanCpf,
                    body: req.body,
                    errorMessage: error?.message || 'Erro ao atualizar dados Rapidoc.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao atualizar dados Rapidoc.' });
        }
    }

    static async obterBeneficiarioRapidoc(req: Request, res: Response) {
        const { cpf } = req.params;
        if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

        try {
            const resp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpf}`, {
                headers: {
                    Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                    clientId: process.env.RAPIDOC_CLIENT_ID,
                    'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                }
            });
            const data = resp.data && resp.data.beneficiary;
            if (!data) return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
            return res.status(200).json(data);
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'obterBeneficiarioRapidoc',
                    cpf,
                    errorMessage: error?.message || 'Erro ao obter beneficiário no Rapidoc.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao obter beneficiário no Rapidoc.' });
        }
    }
}