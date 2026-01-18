import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { configDotenv } from 'dotenv';
configDotenv();

const ASAAS_API_URL = process.env.ASAAS_BASE_URL;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// Criar instância do Axios com timeout de 60 segundos
const asaasAxios: AxiosInstance = axios.create({
  timeout: 60000,
});

export async function verificarPrimeiroPagamentoAssinatura(assinaturaId: string): Promise<{ pago: boolean, pagamento?: any }> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const resp = await asaasAxios.get(`${ASAAS_API_URL}/payments`, {
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

export async function listarPagamentosDaAssinatura(assinaturaId: string): Promise<any[]> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const resp = await asaasAxios.get(`${ASAAS_API_URL}/payments`, {
        params: { subscription: assinaturaId },
        headers: { access_token: ASAAS_API_KEY },
    });
    return resp.data?.data || [];
}

export async function temPendenciasNaAssinatura(assinaturaId: string): Promise<{ pendente: boolean, pendentes: any[] }> {
    const pagamentos = await listarPagamentosDaAssinatura(assinaturaId);
    const PENDENTES = new Set(['PENDING', 'OVERDUE']);
    const pendentes = pagamentos.filter((p: any) => PENDENTES.has(String(p?.status || '').toUpperCase()));
    return { pendente: pendentes.length > 0, pendentes };
}

export async function cancelarAssinaturaAsaas(assinaturaId: string): Promise<{ status: number, data?: any }> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const resp = await asaasAxios.delete(`${ASAAS_API_URL}/subscriptions/${assinaturaId}`, {
        headers: { access_token: ASAAS_API_KEY }
    });
    return { status: resp.status, data: resp.data };
}
export async function criarAssinaturaAsaas({ 
    customer, 
    value, 
    cycle = 'MONTHLY', 
    description = 'Assinatura Consulta Médicos Online', 
    billingType = 'BOLETO',
    externalReference
}: { 
    customer: string, 
    value: number, 
    cycle?: string, 
    description?: string, 
    billingType?: string,
    externalReference?: string
}) {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    
    // Texto padrão de aviso que aparece no boleto
    const avisoInadimplencia = `
Aviso: Inadimplência poderá resultar em protesto e negativação (SERASA/SPC), conforme arts. 42 e 43 do CDC.
    `.trim();
    
    const body: any = {
        customer,
        value,
        cycle,
        description, // Descrição que aparece na fatura
        observations: avisoInadimplencia, // Observações que aparecem no boleto
        billingType,
        nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Próximo vencimento: amanhã
    };
    
    if (externalReference) {
        body.externalReference = externalReference;
    }
    
    const resp = await asaasAxios.post(`${ASAAS_API_URL}/subscriptions`, body, {
        headers: { access_token: ASAAS_API_KEY }
    });
    return resp.data;
}

/**
 * Verifica se um cliente possui faturas vencidas (status OVERDUE)
 * @param customerId ID do cliente no Asaas
 * @returns true se houver faturas vencidas, false caso contrário
 */
export async function verificarFaturasVencidas(customerId: string): Promise<boolean> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    if (!customerId) return false;
    
    try {
        // Busca cobranças com status 'OVERDUE' (Vencida) para este cliente
        const response = await asaasAxios.get(`${ASAAS_API_URL}/payments`, {
            params: {
                customer: customerId,
                status: 'OVERDUE',
                limit: 1
            },
            headers: { access_token: ASAAS_API_KEY }
        });
        
        // Se a lista tem dados, tem boleto vencido
        return response.data.data && response.data.data.length > 0;
    } catch (error) {
        console.error('Erro ao verificar faturas vencidas:', error);
        return false; // Na dúvida, não bloqueia
    }
}

export async function criarClienteAsaas({ nome, email, cpf, telefone }: { nome: string, email: string, cpf: string, telefone?: string }) {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    const body: any = {
        name: nome,
        email,
        cpfCnpj: cpf,
        personType: 'FISICA',
    };
    if (telefone) body.phone = telefone;
    const resp = await asaasAxios.post(`${ASAAS_API_URL}/customers`, body, {
        headers: { access_token: ASAAS_API_KEY }
    });
    return resp.data;
}

export async function verificarAssinaturaPorCpf(cpf: string): Promise<{ assinaturaOk: boolean, cliente?: { id: string, nome: string, ativo: boolean, pagamentoEmDia: boolean } }> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');

    // Buscar cliente pelo CPF
    const clientesResp = await asaasAxios.get(`${ASAAS_API_URL}/customers`, {
        params: { cpfCnpj: cpf },
        headers: { access_token: ASAAS_API_KEY },
    });
    const clientes = clientesResp.data.data;
    if (!clientes || clientes.length === 0) return { assinaturaOk: false };

    // Buscar assinaturas do cliente
    const clienteId = clientes[0].id;
    const assinaturasResp = await asaasAxios.get(`${ASAAS_API_URL}/subscriptions`, {
        params: { customer: clienteId },
        headers: { access_token: ASAAS_API_KEY },
    });
    const assinaturas = assinaturasResp.data.data;
    // Verifica se existe assinatura ativa
    const assinaturaAtiva = assinaturas.find((a: any) => a.status === 'ACTIVE');
    if (!assinaturaAtiva) return { assinaturaOk: false };

    // Buscar cobranças (payments) da assinatura ativa
    const pagamentosResp = await asaasAxios.get(`${ASAAS_API_URL}/payments`, {
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
    const resp = await asaasAxios.get(`${ASAAS_API_URL}/payments`, {
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

/**
 * Converte a periodicidade do plano em número de períodos necessários para cancelamento
 * @param periodicidade Periodicidade do plano (Mensal, Bimestral, Trimestral, Semestral, Anual)
 * @returns Número de períodos necessários (padrão: 1 se não reconhecido)
 */
export function obterPeriodosNecessariosParaCancelamento(periodicidade: string | null | undefined): number {
    if (!periodicidade) return 1; // Padrão: 1 período se não especificado
    
    const periodicidadeLower = periodicidade.toLowerCase().trim();
    
    if (periodicidadeLower.includes('mensal')) return 1;
    if (periodicidadeLower.includes('bimestral')) return 2;
    if (periodicidadeLower.includes('trimestral')) return 3;
    if (periodicidadeLower.includes('semestral')) return 6;
    if (periodicidadeLower.includes('anual')) return 12;
    
    // Se não reconhecer, assume mensal (1 período)
    return 1;
}

/**
 * Verifica se o usuário pagou os períodos necessários da assinatura conforme a periodicidade do plano
 * @param assinaturaId ID da assinatura no Asaas
 * @param periodosNecessarios Número de períodos necessários (padrão: 3 para manter compatibilidade)
 * @returns Objeto com status de pagamento e mensagem
 */
export async function verificarTresPrimeirosMesesPagos(assinaturaId: string, periodosNecessarios: number = 3): Promise<{ pagos: boolean; pagamentosPagos: number; periodosNecessarios: number; mensagem?: string }> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    if (!assinaturaId) throw new Error('assinaturaId obrigatório');
    
    const pagamentos = await listarPagamentosDaAssinatura(assinaturaId);
    if (!pagamentos.length) {
        return { pagos: false, pagamentosPagos: 0, periodosNecessarios, mensagem: 'Nenhum pagamento encontrado para esta assinatura.' };
    }
    
    // Ordena pagamentos por data de vencimento (mais antigo primeiro)
    const pagamentosOrdenados = pagamentos.sort((a: any, b: any) => {
        const dataA = new Date(a.dueDate || a.dateCreated || 0);
        const dataB = new Date(b.dueDate || b.dateCreated || 0);
        return dataA.getTime() - dataB.getTime();
    });
    
    // Pega os N primeiros pagamentos conforme a periodicidade
    const primeirosPagamentos = pagamentosOrdenados.slice(0, periodosNecessarios);
    
    // Verifica quantos estão pagos (status RECEIVED)
    const pagos = primeirosPagamentos.filter((p: any) => String(p.status || '').toUpperCase() === 'RECEIVED');
    const pagamentosPagos = pagos.length;
    
    // Determina o texto da unidade de tempo baseado na periodicidade
    let unidadeTempo = 'períodos';
    if (periodosNecessarios === 1) unidadeTempo = 'período';
    else if (periodosNecessarios === 2) unidadeTempo = 'períodos (bimestres)';
    else if (periodosNecessarios === 3) unidadeTempo = 'períodos (trimestres)';
    else if (periodosNecessarios === 6) unidadeTempo = 'períodos (semestres)';
    else if (periodosNecessarios === 12) unidadeTempo = 'períodos (anual)';
    
    if (pagamentosPagos >= periodosNecessarios) {
        return { pagos: true, pagamentosPagos, periodosNecessarios };
    } else {
        return { 
            pagos: false, 
            pagamentosPagos, 
            periodosNecessarios,
            mensagem: `É necessário ter pago os ${periodosNecessarios} primeiro${periodosNecessarios > 1 ? 's' : ''} ${unidadeTempo} para cancelar. Você pagou ${pagamentosPagos} de ${periodosNecessarios}.` 
        };
    }
}

// Tipos para formas de pagamento
export type BillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD';

// Interface para dados do cartão de crédito
export interface CreditCardData {
    holderName?: string;
    number?: string;
    expiryMonth?: string;
    expiryYear?: string;
    ccv?: string;
}

export interface CreditCardHolderInfo {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone?: string;
}

/**
 * Lista cobranças (payments) de uma assinatura específica via endpoint dedicado
 * GET /subscriptions/{id}/payments
 * @param subscriptionId ID da assinatura no Asaas
 * @returns Array de cobranças/pagamentos da assinatura
 */
export async function listarCobrancasAssinaturaAsaas(subscriptionId: string): Promise<any[]> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    if (!subscriptionId) throw new Error('subscriptionId obrigatório');
    
    const resp = await asaasAxios.get(`${ASAAS_API_URL}/subscriptions/${subscriptionId}/payments`, {
        headers: { access_token: ASAAS_API_KEY }
    });
    
    return resp.data?.data || [];
}

/**
 * Atualiza uma assinatura existente no Asaas
 * PUT /subscriptions/{id}
 * Permite alterar a forma de pagamento (billingType) e outras configurações
 * @param subscriptionId ID da assinatura no Asaas
 * @param billingType Nova forma de pagamento (BOLETO, PIX ou CREDIT_CARD)
 * @param nextDueDate Data de vencimento da próxima cobrança (opcional, formato YYYY-MM-DD)
 * @param updatePendingPayments Se true, atualiza também as faturas pendentes (padrão: true)
 * @returns Dados da assinatura atualizada
 */
export async function atualizarAssinaturaAsaas({
    subscriptionId,
    billingType,
    nextDueDate,
    updatePendingPayments = true
}: {
    subscriptionId: string;
    billingType: BillingType;
    nextDueDate?: string;
    updatePendingPayments?: boolean;
}): Promise<any> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    if (!subscriptionId) throw new Error('subscriptionId obrigatório');
    if (!billingType) throw new Error('billingType obrigatório');
    
    const body: any = {
        billingType,
        updatePendingPayments
    };
    
    if (nextDueDate) {
        body.nextDueDate = nextDueDate;
    }
    
    const resp = await asaasAxios.put(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, body, {
        headers: { access_token: ASAAS_API_KEY }
    });
    
    return resp.data;
}

/**
 * Atualiza os dados do cartão de crédito de uma assinatura no Asaas
 * PUT /subscriptions/{id}/creditCard
 * @param subscriptionId ID da assinatura no Asaas
 * @param creditCard Dados completos do cartão (opcional, se creditCardToken não for fornecido)
 * @param creditCardToken Token do cartão já tokenizado (opcional, alternativa ao creditCard)
 * @param creditCardHolderInfo Dados do portador do cartão
 * @param remoteIp IP do cliente (obrigatório para segurança)
 * @returns Resposta da API Asaas
 */
export async function atualizarCartaoAssinaturaAsaas({
    subscriptionId,
    creditCard,
    creditCardToken,
    creditCardHolderInfo,
    remoteIp
}: {
    subscriptionId: string;
    creditCard?: CreditCardData;
    creditCardToken?: string;
    creditCardHolderInfo?: CreditCardHolderInfo;
    remoteIp?: string;
}): Promise<any> {
    if (!ASAAS_API_KEY) throw new Error('Chave da API Asaas não configurada');
    if (!subscriptionId) throw new Error('subscriptionId obrigatório');
    
    // Validação: precisa ter ou creditCardToken ou creditCard completo
    if (!creditCardToken && (!creditCard || !creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv)) {
        throw new Error('É necessário fornecer creditCardToken ou dados completos do cartão (holderName, number, expiryMonth, expiryYear, ccv)');
    }
    
    const body: any = {};
    
    // Se tem token, usa o token
    if (creditCardToken) {
        body.creditCardToken = creditCardToken;
    } else if (creditCard) {
        // Caso contrário, usa os dados do cartão
        body.creditCard = {
            holderName: creditCard.holderName,
            number: creditCard.number,
            expiryMonth: creditCard.expiryMonth,
            expiryYear: creditCard.expiryYear,
            ccv: creditCard.ccv
        };
    }
    
    // Dados do portador do cartão
    if (creditCardHolderInfo) {
        body.creditCardHolderInfo = {
            name: creditCardHolderInfo.name,
            email: creditCardHolderInfo.email,
            cpfCnpj: creditCardHolderInfo.cpfCnpj,
            postalCode: creditCardHolderInfo.postalCode,
            addressNumber: creditCardHolderInfo.addressNumber,
            addressComplement: creditCardHolderInfo.addressComplement,
            phone: creditCardHolderInfo.phone
        };
    }
    
    // IP remoto para segurança
    if (remoteIp) {
        body.remoteIp = remoteIp;
    }
    
    const resp = await asaasAxios.put(`${ASAAS_API_URL}/subscriptions/${subscriptionId}/creditCard`, body, {
        headers: { access_token: ASAAS_API_KEY }
    });
    
    return resp.data;
}