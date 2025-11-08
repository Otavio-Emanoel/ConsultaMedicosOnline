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
                const resp = await axios.get(`${process.env.RAPIDOC_BASE_URL}/${assinatura.cpfUsuario}`, {
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
}
