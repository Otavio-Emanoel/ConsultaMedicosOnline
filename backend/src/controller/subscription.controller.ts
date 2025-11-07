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
            // A API de cadastro aceita apenas as propriedades conhecidas; enviar somente as propriedades válidas.
            const beneficiario = await cadastrarBeneficiarioRapidoc({
                nome,
                email,
                cpf,
                birthday,
                phone,
                zipCode,
                paymentType,
                serviceType,
                holder,
                general
            });
            return res.status(201).json({ message: 'Beneficiário Rapidoc criado com sucesso.', beneficiario });
        } catch (error: any) {
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
}