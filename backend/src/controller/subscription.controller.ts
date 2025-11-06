import type { Request, Response } from 'express';

export class SubscriptionController {
	static async startSubscription(req: Request, res: Response) {
		const { nome, email, cpf, telefone } = req.body;
		if (!nome || !email || !cpf) {
			return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios.' });
		}

		try {
			// 1. Criar cliente no Asaas
			const { criarClienteAsaas } = await import('../services/asaas.service.js');
			const cliente = await criarClienteAsaas({ nome, email, cpf, telefone });

			// 2. Criar assinatura no Asaas (TODO)
			// Simulação:
			const assinaturaId = 'assinatura-id-simulado';

			return res.status(201).json({
				message: 'Assinatura iniciada. Aguarde confirmação do pagamento.',
				clienteId: cliente.id,
				assinaturaId
			});
		} catch (error: any) {
			return res.status(500).json({ error: error?.response?.data?.errors || error.message || 'Erro ao iniciar assinatura.' });
		}
	}
}
