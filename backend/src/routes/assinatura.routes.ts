import { Router } from 'express';
import { AssinaturaController } from '../controller/assinatura.controller.js';

const router = Router();

// GET /api/assinatura/status/:cpf - retorna o id da assinatura ativa do usuário no Asaas
router.get('/assinatura/status/:cpf', async (req, res) => {
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
    return res.status(200).json({ assinaturaId: assinaturaAtiva.id, assinatura: assinaturaAtiva });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro ao buscar assinatura.' });
  }
});

export default router;
