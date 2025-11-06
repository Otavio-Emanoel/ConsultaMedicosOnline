import type { Request, Response } from 'express';

export class SubscriptionController {
	static async startSubscription(req: Request, res: Response) {
		const { nome, email, cpf } = req.body;
		if (!nome || !email || !cpf) {
			return res.status(400).json({ error: 'Nome, email e CPF são obrigatórios.' });
		}

		try {
			// 1. Criar cliente no Asaas
			// 2. Criar assinatura no Asaas
			// TODO: Implementar integração real
			// Simulação:
			const clienteId = 'asaas-id-simulado';
			const assinaturaId = 'assinatura-id-simulado';

			return res.status(201).json({
				message: 'Assinatura iniciada. Aguarde confirmação do pagamento.',
				clienteId,
				assinaturaId
			});
		} catch (error) {
			return res.status(500).json({ error: 'Erro ao iniciar assinatura.' });
		}
	}
}
