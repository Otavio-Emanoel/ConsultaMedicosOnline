import axios from 'axios';
import { configDotenv } from 'dotenv';
configDotenv();

const ASAAS_API_URL = process.env.ASAAS_BASE_URL;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export async function verificarAssinaturaPorCpf(cpf: string): Promise<{ assinaturaOk: boolean, cliente?: { id: string, nome: string, ativo: boolean, pagamentoEmDia: boolean } }> {
  if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');

  // Buscar cliente pelo CPF
  const clientesResp = await axios.get(`${ASAAS_API_URL}/customers`, {
    params: { cpfCnpj: cpf },
    headers: { access_token: ASAAS_API_KEY },
  });
  const clientes = clientesResp.data.data;
    if (!clientes || clientes.length === 0) return { assinaturaOk: false };

  // Buscar assinaturas do cliente
  const clienteId = clientes[0].id;
  const assinaturasResp = await axios.get(`${ASAAS_API_URL}/subscriptions`, {
    params: { customer: clienteId },
    headers: { access_token: ASAAS_API_KEY },
  });
  const assinaturas = assinaturasResp.data.data;
  // Verifica se existe assinatura ativa
    const assinaturaAtiva = assinaturas.find((a: any) => a.status === 'ACTIVE');
    if (!assinaturaAtiva) return { assinaturaOk: false };

    // Buscar cobranças (payments) da assinatura ativa
    const pagamentosResp = await axios.get(`${ASAAS_API_URL}/payments`, {
      params: { subscription: assinaturaAtiva.id },
      headers: { access_token: ASAAS_API_KEY },
    });
    const pagamentos = pagamentosResp.data.data;
    // Verifica se existe pagamento quitado e dentro do mês atual
    const hoje = new Date();
    const pagamentoEmDia = pagamentos.some((p: any) => {
      if (p.status !== 'RECEIVED') return false;
      const dataRecebimento = new Date(p.paymentDate || p.receivedDate || p.dueDate);
      return dataRecebimento.getMonth() === hoje.getMonth() && dataRecebimento.getFullYear() === hoje.getFullYear();
    });

    return {
      assinaturaOk: true,
      cliente: {
        id: clientes[0].id,
        nome: clientes[0].name,
        ativo: true,
        pagamentoEmDia
      }
    };
}
