import type { Request, Response } from 'express';

export class FirstAccessController {
  static async validateCpf(req: Request, res: Response) {
    const { cpf } = req.body;
    if (!cpf || typeof cpf !== 'string') {
      return res.status(400).json({ error: 'CPF é obrigatório e deve ser uma string.' });
    }

    try {
      // 1. Consultar Asaas por assinatura
      const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
        const resultado = await verificarAssinaturaPorCpf(cpf);
        if (!resultado.assinaturaOk) {
        return res.status(403).json({ error: 'Assinatura não encontrada ou inválida.' });
      }

      // 2. Validar/obter beneficiário Rapidoc
      // TODO: Implementar integração Rapidoc
      const beneficiario = { id: 'rapidoc-id', nome: 'Nome Exemplo' }; // Simulação

      // 3. Sincronizar mapeamentos e dados locais
      // TODO: Implementar sincronização de dados locais

      return res.status(200).json({
        message: 'CPF validado com sucesso.',
          usuario: resultado.cliente,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao validar CPF.' });
    }
  }
}
