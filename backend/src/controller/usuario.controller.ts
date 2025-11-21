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
        const cpf = req.user?.cpf;
        if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

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
                    errorMessage: error?.message || 'Erro ao obter usuário autenticado.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao obter usuário.' });
        }
    }

    static async atualizarDados(req: Request, res: Response) {

        const { cpf } = req.params;
        const { nome, email, telefone } = req.body;
        if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });
        if (!nome && !email && !telefone) return res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });

        // Monta objeto apenas com campos definidos
        const updateData: Record<string, any> = {};
        if (nome !== undefined) updateData.nome = nome;
        if (email !== undefined) updateData.email = email;
        if (telefone !== undefined) updateData.telefone = telefone;

        try {
            // Atualiza no Firestore
            const usuarioRef = admin.firestore().collection('usuarios').doc(cpf);
            const usuarioDoc = await usuarioRef.get();
            if (!usuarioDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });
            await usuarioRef.set(updateData, { merge: true });

            // Atualiza no Rapidoc 
            if (process.env.RAPIDOC_BASE_URL && process.env.RAPIDOC_TOKEN) {
                try {
                    // Busca dados atuais do beneficiário
                    const getResp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpf}`,
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                                clientId: process.env.RAPIDOC_CLIENT_ID,
                                'Content-Type': 'application/vnd.rapidoc.tema-v2+json',
                            },
                        }
                    );
                    const atual = getResp.data && getResp.data.beneficiary ? getResp.data.beneficiary : {};
                    // Monta payload completo, mesclando alterações
                    const rapidocData: Record<string, any> = {
                        name: nome !== undefined ? nome : atual.name,
                        email: email !== undefined ? email : atual.email,
                        phone: telefone !== undefined ? telefone : atual.phone,
                        birthday: atual.birthday,
                        zipCode: atual.zipCode,
                        paymentType: atual.paymentType,
                        serviceType: atual.serviceType,
                        holder: atual.holder,
                        isActive: atual.isActive,
                        clientId: atual.clientId,
                    };
                    await axios.patch(
                        `${process.env.RAPIDOC_BASE_URL}/${cpf}`,
                        rapidocData,
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                                clientId: process.env.RAPIDOC_CLIENT_ID,
                                'Content-Type': 'application/vnd.rapidoc.tema-v2+json',
                            },
                        }
                    );
                } catch (e) {/* ignora erro do Rapidoc, segue fluxo */ }
            }

            // Atualiza no Asaas (se necessário)
            if (process.env.ASAAS_BASE_URL && process.env.ASAAS_API_KEY) {
                try {
                    // Buscar cliente Asaas pelo CPF
                    const clientesResp = await axios.get(`${process.env.ASAAS_BASE_URL}/customers`, {
                        params: { cpfCnpj: cpf },
                        headers: { access_token: process.env.ASAAS_API_KEY },
                    });
                    const clientes = clientesResp.data.data;
                    if (clientes && clientes.length > 0) {
                        const clienteId = clientes[0].id;
                        await axios.post(
                            `${process.env.ASAAS_BASE_URL}/customers/${clienteId}`,
                            { name: nome, email, phone: telefone },
                            { headers: { access_token: process.env.ASAAS_API_KEY } }
                        );
                    }
                } catch (e) {/* ignora erro do Asaas, segue fluxo */ }
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso.' });
        } catch (error: any) {
            try {
                await admin.firestore().collection('logsErros').add({
                    endpoint: 'atualizarDados',
                    cpf,
                    body: req.body,
                    errorMessage: error?.message || 'Erro ao atualizar dados.',
                    stack: error?.stack || null,
                    data: new Date().toISOString(),
                });
            } catch {}
            return res.status(500).json({ error: error.message || 'Erro ao atualizar dados.' });
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