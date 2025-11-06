import axios from 'axios';
import { configDotenv } from 'dotenv';
configDotenv();

const ASAAS_API_URL = process.env.ASAAS_BASE_URL;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export async function verificarAssinaturaPorCpf(cpf: string): Promise<{ assinaturaOk: boolean, cliente?: { id: string, nome: string } }> {
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
    const assinaturaOk = assinaturas.some((a: any) => a.status === 'ACTIVE');
    if (!assinaturaOk) return { assinaturaOk: false };
    return {
      assinaturaOk: true,
      cliente: {
        id: clientes[0].id,
        nome: clientes[0].name
      }
    };
}
