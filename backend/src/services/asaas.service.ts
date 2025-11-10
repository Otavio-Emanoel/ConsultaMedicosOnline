export async function verificarPrimeiroPagamentoAssinatura(assinaturaId: string): Promise<{ pago: boolean, pagamento?: any }> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const resp = await axios.get(`${ASAAS_API_URL}/payments`, {
        params: { subscription: assinaturaId },
        headers: { access_token: ASAAS_API_KEY },
    });
    const pagamentos = resp.data.data;
    // O primeiro pagamento é o mais antigo
    const primeiroPagamento = pagamentos.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    if (primeiroPagamento && primeiroPagamento.status === 'RECEIVED') {
        return { pago: true, pagamento: primeiroPagamento };
    }
    return { pago: false, pagamento: primeiroPagamento };
}
export async function criarAssinaturaAsaas({ customer, value, cycle = 'MONTHLY', description = 'Assinatura Consulta Médicos Online', billingType = 'BOLETO' }: { customer: string, value: number, cycle?: string, description?: string, billingType?: string }) {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const body: any = {
        customer,
        value,
        cycle,
        description,
        billingType,
    };
    const resp = await axios.post(`${ASAAS_API_URL}/subscriptions`, body, {
        headers: { access_token: ASAAS_API_KEY }
    });
    return resp.data;
}
import axios from 'axios';
import { configDotenv } from 'dotenv';
configDotenv();

const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export async function criarClienteAsaas({ nome, email, cpf, telefone }: { nome: string, email: string, cpf: string, telefone?: string }) {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const body: any = {
        name: nome,
        email,
        cpfCnpj: cpf,
        personType: 'FISICA',
    };
    if (telefone) body.phone = telefone;
    const resp = await axios.post(`${ASAAS_API_URL}/customers`, body, {
        headers: { access_token: ASAAS_API_KEY }
    });
    return resp.data;
}

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

// Detalhes do primeiro pagamento (boleto/pix) da assinatura
export async function obterDetalhesPagamentoAssinatura(assinaturaId: string): Promise<any> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    if (!assinaturaId) throw new Error('assinaturaId obrigatório');
    const resp = await axios.get(`${ASAAS_API_URL}/payments`, {
        params: { subscription: assinaturaId },
        headers: { access_token: ASAAS_API_KEY },
    });
    const pagamentos: any[] = resp.data.data || [];
    if (!pagamentos.length) return { assinaturaId, encontrado: false };
    const primeiroPagamento = pagamentos.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    if (!primeiroPagamento) return { assinaturaId, encontrado: false };
    const billingType = primeiroPagamento.billingType;
    const detalhes: Record<string, any> = {
        assinaturaId,
        paymentId: primeiroPagamento.id,
        billingType,
        status: primeiroPagamento.status,
        value: primeiroPagamento.value,
        dueDate: primeiroPagamento.dueDate,
        original: primeiroPagamento
    };
    // Campos específicos (boleto)
    if (primeiroPagamento.bankSlipUrl) detalhes.bankSlipUrl = primeiroPagamento.bankSlipUrl;
    if (primeiroPagamento.invoiceUrl) detalhes.invoiceUrl = primeiroPagamento.invoiceUrl;
    // Campos PIX (tentamos mapear nomes possíveis)
    if (primeiroPagamento.pixQrCode) detalhes.pixQrCode = primeiroPagamento.pixQrCode;
    if (primeiroPagamento.pixCode) detalhes.pixCode = primeiroPagamento.pixCode;
    if (primeiroPagamento.qrCode) detalhes.qrCode = primeiroPagamento.qrCode;
    if (primeiroPagamento.encodedImage) detalhes.encodedImage = primeiroPagamento.encodedImage;
    return { assinaturaId, encontrado: true, pagamento: detalhes };
}