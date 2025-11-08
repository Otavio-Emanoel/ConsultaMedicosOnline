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
            try {
                const resp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/${usuario.cpf}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.RAPIDOC_TOKEN}`,
                        clientId: process.env.RAPIDOC_CLIENT_ID,
                        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
                    }
                });
                const data = resp.data && resp.data.beneficiary;
                rapidocContaExiste = !!data && !!data.uuid && data.isActive === true;
            } catch (err) {
                rapidocContaExiste = false;
            }
            if (!rapidocContaExiste) {
                return res.status(404).json({ error: 'Usuário não possui conta no Rapidoc.' });
            }

            // Verifica se usuário existe no Asaas e pagamento está em dia
            const asaasCheck = await verificarAssinaturaPorCpf(usuario.cpf);
            if (!asaasCheck.assinaturaOk || !asaasCheck.cliente?.pagamentoEmDia) {
                return res.status(402).json({ error: 'Usuário não possui assinatura ativa e paga no Asaas.' });
            }

            const result = await salvarUsuario(usuario);
            return res.status(201).json({ message: 'Usuário salvo com sucesso.', id: result.id });
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao salvar usuário.' });
        }
    }

    static async listar(req: Request, res: Response) {
        try {
            const snapshot = await admin.firestore().collection('usuarios').get();
            const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json(usuarios);
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao listar usuários.' });
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
                    const getResp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/${cpf}`,
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
                } catch (e) {/* ignora erro do Rapidoc, segue fluxo */}
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
                } catch (e) {/* ignora erro do Asaas, segue fluxo */}
            }

            return res.status(200).json({ message: 'Dados atualizados com sucesso.' });
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao atualizar dados.' });
        }
    }
}