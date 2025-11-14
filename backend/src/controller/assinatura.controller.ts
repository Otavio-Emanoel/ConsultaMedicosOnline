import type { Request, Response } from 'express';
import { salvarAssinatura } from '../services/firestore.service.js';
import { verificarPrimeiroPagamentoAssinatura } from '../services/asaas.service.js';
import { verificarAssinaturaPorCpf } from '../services/asaas.service.js';
import axios from 'axios';
import { configDotenv } from 'dotenv';
configDotenv();

export class AssinaturaController {
    static async criarOuAtualizar(req: Request, res: Response) {
        try {
            const assinatura = req.body;
            if (!assinatura.idAssinatura) {
                return res.status(400).json({ error: 'idAssinatura é obrigatório.' });
            }
            if (!assinatura.cpfUsuario) {
                return res.status(400).json({ error: 'cpfUsuario é obrigatório.' });
            }
            if (!assinatura.planoId) {
                return res.status(400).json({ error: 'planoId é obrigatório.' });
            }

            // Buscar dados do plano
            const db = (await import('firebase-admin')).default.firestore();
            const planoDoc = await db.collection('planos').doc(assinatura.planoId).get();
            if (!planoDoc.exists) {
                return res.status(404).json({ error: 'Plano não encontrado.' });
            }
            const plano = planoDoc.data();

            // Verifica se existe assinatura no Asaas
            const assinaturaCheck = await verificarAssinaturaPorCpf(assinatura.cpfUsuario);
            if (!assinaturaCheck.assinaturaOk) {
                return res.status(404).json({ error: 'Assinatura não encontrada no Asaas para este CPF.' });
            }

            // Verifica se está paga
            const pagamentoCheck = await verificarPrimeiroPagamentoAssinatura(assinatura.idAssinatura);
            if (!pagamentoCheck.pago) {
                return res.status(402).json({ error: 'Assinatura não está paga.' });
            }

            // Verifica se tem conta no Rapidoc
            let rapidocContaExiste = false;
            try {
                const resp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/tema/api/beneficiaries/${assinatura.cpfUsuario}`, {
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

            // Salva assinatura incluindo snapshot do plano
            const assinaturaComPlano = {
                ...assinatura,
                planoTipo: plano?.tipo,
                planoPeriodicidade: plano?.periodicidade,
                planoDescricao: plano?.descricao,
                planoEspecialidades: plano?.especialidades,
                planoPreco: plano?.preco,
            };
            const result = await salvarAssinatura(assinaturaComPlano);
            return res.status(201).json({ message: 'Assinatura salva com sucesso.', id: result.id });
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao salvar assinatura.' });
        }
    }
    static async listar(req: Request, res: Response) {
        try {
            const admin = await import('firebase-admin');
            const snapshot = await admin.default.firestore().collection('assinaturas').get();
            const assinaturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json(assinaturas);
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Erro ao listar assinaturas.' });
        }
    }

    static async obterStatusAssinatura(req: Request, res: Response) {
        try {
            const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
            const cpf = req.params.cpf;
            if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });
            const resultado = await verificarAssinaturaPorCpf(cpf);
            if (!resultado.assinaturaOk || !resultado.cliente) {
                return res.status(404).json({ error: 'Assinatura não encontrada para este CPF.' });
            }
            // Buscar assinaturas do cliente
            const clienteId: string = resultado.cliente.id;
            const axios = (await import('axios')).default;
            const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
            const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
            const assinaturasResp = await axios.get(`${ASAAS_API_URL}/subscriptions`, {
                params: { customer: clienteId },
                headers: { access_token: ASAAS_API_KEY },
            });
            const assinaturas: any[] = assinaturasResp.data.data;
            const assinaturaAtiva = assinaturas.find((a: any) => a.status === 'ACTIVE');
            if (!assinaturaAtiva) {
                return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada para este CPF.' });
            }

            // Buscar pagamentos (faturas) da assinatura ativa
            const pagamentosResp = await axios.get(`${ASAAS_API_URL}/payments`, {
                params: { subscription: assinaturaAtiva.id },
                headers: { access_token: ASAAS_API_KEY },
            });
            const pagamentos: any[] = pagamentosResp.data.data || [];

            // Encontrar o próximo pagamento pendente (ou o mais próximo do vencimento futuro)
            const hoje = new Date();
            const proximaFatura = pagamentos
                .filter((p: any) => p.status === 'PENDING' && new Date(p.dueDate) >= hoje)
                .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

            // Se não achar, pode tentar pegar o último vencido não pago
            // const proximaFatura = pagamentos.find((p: any) => p.status === 'PENDING');

            // Monta resposta incluindo o link do boleto
            return res.status(200).json({
                assinaturaId: assinaturaAtiva.id,
                assinatura: {
                    ...assinaturaAtiva,
                    bankSlipUrl: proximaFatura?.bankSlipUrl || null,
                    paymentLink: proximaFatura?.invoiceUrl || null // se quiser garantir compatibilidade
                }
            });
        } catch (error: any) {
            return res.status(500).json({ error: error?.message || 'Erro ao buscar assinatura.' });
        }
    }
}
