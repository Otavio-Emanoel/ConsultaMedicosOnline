import type { Request, Response } from 'express';

export class FirstAccessController {
  static async validateCpf(req: Request, res: Response) {
    const { cpf } = req.body;
    if (!cpf || typeof cpf !== 'string') {
      return res.status(400).json({ error: 'CPF é obrigatório e deve ser uma string.' });
    }

    try {
      // Consultar Asaas por assinatura
      const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
        const resultado = await verificarAssinaturaPorCpf(cpf);
        if (!resultado.assinaturaOk) {
          return res.status(200).json({
            podeCadastrar: true,
            message: 'CPF não validado. Você pode se cadastrar para iniciar sua assinatura.'
          });
        }

      return res.status(200).json({
        message: 'CPF validado com sucesso.',
          usuario: resultado.cliente,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao validar CPF.' });
    }
  }
}
