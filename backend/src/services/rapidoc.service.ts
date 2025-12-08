import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { configDotenv } from 'dotenv';
import http from 'http';
import https from 'https';

const RAPIDOC_BASE_URL = process.env.RAPIDOC_BASE_URL;
const RAPIDOC_TOKEN = process.env.RAPIDOC_TOKEN;
const RAPIDOC_CLIENT_ID = process.env.RAPIDOC_CLIENT_ID;
configDotenv();

// Configurar HTTP Agent com keep-alive para reutilizar conexões TCP/TLS
// Isso reduz significativamente a latência ao fazer múltiplas requisições
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo' as any, // Last In First Out para melhor performance
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo' as any,
});

// Criar instância do Axios com HTTP Agent reutilizável
// Isso evita criar novas conexões TCP/TLS para cada requisição
const rapidocAxios: AxiosInstance = axios.create({
  timeout: 60000,
  httpAgent,
  httpsAgent,
});

// Variável para controlar logs (pode ser desabilitada em produção)
const DEBUG_MODE = process.env.DEBUG_HMAC === '1' || process.env.NODE_ENV === 'development';

// Cache simples em memória para dados que mudam pouco
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttl: number = 60000): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

function logDebug(message: string, ...args: any[]): void {
  if (DEBUG_MODE) {
    // Usar console.log de forma não bloqueante (método assíncrono nativo do Node)
    if (typeof process.stdout.write === 'function') {
      const logMessage = `[Rapidoc] ${message}${args.length ? ' ' + JSON.stringify(args) : ''}\n`;
      process.stdout.write(logMessage);
    } else {
      console.log(`[Rapidoc] ${message}`, ...args);
    }
  }
}

export interface RapidocPlan {
  uuid: string;
  name?: string;
  description?: string;
  paymentType?: string;
  serviceType?: string;
  [key: string]: any;
}

export async function listarRapidocPlanos(): Promise<RapidocPlan[]> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 5 minutos para planos (não mudam frequentemente)
  const cacheKey = 'rapidoc:plans';
  const cached = getCached<RapidocPlan[]>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/plans`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  const data = resp.data as RapidocPlan[];
  setCached(cacheKey, data, 300000); // 5 minutos
  return data;
}

// Obter detalhes de um plano específico (para extrair especialidades associadas)
export async function obterDetalhesPlanoRapidoc(uuid: string): Promise<any> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 5 minutos para detalhes do plano
  const cacheKey = `rapidoc:plan:${uuid}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/plans/${uuid}`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  setCached(cacheKey, resp.data, 300000); // 5 minutos
  return resp.data;
}

// Atualizar plano Rapidoc (ex: adicionar specialties)
export async function atualizarPlanoRapidoc(uuid: string, data: {
  name?: string,
  description?: string,
  serviceType?: string,
  specialties?: Array<{ uuid: string }>
}) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/plans/${uuid}`;
  const body: any = { uuid };
  if (data.name) body.name = data.name;
  if (data.description) body.description = data.description;
  if (data.serviceType) body.serviceType = data.serviceType;
  if (data.specialties) body.specialties = data.specialties;
  const resp = await rapidocAxios.put(url, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Invalidar cache do plano após atualização
  cache.delete(`rapidoc:plan:${uuid}`);
  cache.delete('rapidoc:plans');
  return resp.data;
}

// Lista especialidades disponíveis (formato da API presumido)
export async function listarRapidocEspecialidades(): Promise<any[]> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 10 minutos para especialidades (mudam muito raramente)
  const cacheKey = 'rapidoc:specialties';
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/specialties`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Assume resp.data contém array ou objeto com campo specialties
  let data: any[] = [];
  if (Array.isArray(resp.data)) data = resp.data;
  else if (Array.isArray(resp.data?.specialties)) data = resp.data.specialties;
  
  setCached(cacheKey, data, 600000); // 10 minutos
  return data;
}

// Atualiza beneficiário no Rapidoc
export async function atualizarBeneficiarioRapidoc(uuid: string, data: {
  name?: string,
  cpf?: string,
  birthday?: string,
  email?: string,
  phone?: string,
  zipCode?: string,
  address?: string,
  city?: string,
  state?: string,
  plans?: any[],
  paymentType?: string,
  serviceType?: string,
  specialties?: Array<{ uuid: string }>,
  isActive?: boolean,
}) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${uuid}`;

  // Normalizar birthday para yyyy-MM-dd se vier em dd/MM/yyyy
  const body: any = { uuid };
  if (data.name) body.name = data.name;
  if (data.cpf) body.cpf = data.cpf;
  if (typeof data.birthday === 'string' && data.birthday) {
    let birthday = data.birthday.trim();
    // dd/MM/yyyy -> yyyy-MM-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
      const [d, m, y] = birthday.split('/');
      birthday = `${y}-${m}-${d}`;
    }
    // se já está em yyyy-MM-dd, mantem
    body.birthday = birthday;
  }
  if (data.email) body.email = data.email;
  if (data.phone) body.phone = data.phone;
  if (data.zipCode) body.zipCode = data.zipCode;
  if (data.address) body.address = data.address;
  if (data.city) body.city = data.city;
  if (data.state) body.state = data.state;
  if (data.plans) body.plans = data.plans;
  // Não enviar paymentType/serviceType no topo; usar somente dentro de plans
  if (data.specialties) body.specialties = data.specialties;
  if (typeof (data as any).isActive === 'boolean') body.isActive = (data as any).isActive;

  const resp = await rapidocAxios.put(url, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  
  // Invalidar cache do beneficiário após atualização
  if (data.cpf) {
    cache.delete(`rapidoc:beneficiary:cpf:${data.cpf}`);
  }
  cache.delete(`rapidoc:beneficiary:uuid:${uuid}`);
  
  return resp.data;
}

export async function cadastrarBeneficiarioRapidoc({ nome, email, cpf, birthday, phone, zipCode, address, city, state, holder, plans }: {
  nome: string,
  email: string,
  cpf: string,
  birthday: string,
  phone?: string,
  zipCode?: string,
  address?: string,
  city?: string,
  state?: string,
  holder?: string,
  plans?: Array<{ paymentType: string; plan: { uuid: string } }>
}) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
    const rawBody: Record<string, any> = {
      name: nome,
      email,
      cpf,
      birthday,
      phone,
      zipCode,
      address,
      city,
      state,
    };
    if (holder) rawBody.holder = holder;
    if (Array.isArray(plans) && plans.length > 0) {
      rawBody.plans = plans.map(p => ({
        paymentType: String(p.paymentType || '').toUpperCase(),
        plan: { uuid: p.plan.uuid }
      }));
    }
    // Remove campos undefined ou null
    const cleanBody: Record<string, any> = {};
    Object.keys(rawBody).forEach((k) => {
      if ((rawBody as any)[k] !== undefined && (rawBody as any)[k] !== null) {
        cleanBody[k] = (rawBody as any)[k];
      }
    });
    const body = [cleanBody];
    logDebug('Body enviado para cadastrar beneficiário:', body);
  const resp = await rapidocAxios.post(`${RAPIDOC_BASE_URL}/tema/api/beneficiaries`, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data;
}

// Buscar beneficiário Rapidoc por CPF
export async function buscarBeneficiarioRapidocPorCpf(cpf: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 2 minutos para dados do beneficiário (mudam ocasionalmente)
  const cacheKey = `rapidoc:beneficiary:cpf:${cpf}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpf}`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  
  const data = resp.data;
  setCached(cacheKey, data, 120000); // 2 minutos
  // Também cachear por UUID se disponível
  if (data?.beneficiary?.uuid) {
    setCached(`rapidoc:beneficiary:uuid:${data.beneficiary.uuid}`, data, 120000);
  }
  
  return data;
}

// Listar beneficiários Rapidoc com filtros opcionais (ex.: { holder })
export async function listarBeneficiariosRapidocPorHolder(holderCpf: string): Promise<any[]> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) {
    throw new Error('Configuração Rapidoc ausente');
  }
  const cacheKey = `rapidoc:beneficiaries:holder:${holderCpf}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries`;
  try {
    const resp = await rapidocAxios.get(url, {
      params: { holder: holderCpf },
      headers: {
        Authorization: `Bearer ${RAPIDOC_TOKEN}`,
        clientId: RAPIDOC_CLIENT_ID,
        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
      }
    });
    let data: any[] = [];
    if (Array.isArray(resp.data)) data = resp.data;
    else if (Array.isArray(resp.data?.beneficiaries)) data = resp.data.beneficiaries;
    else if (Array.isArray(resp.data?.data)) data = resp.data.data;
    // Garantir filtro por holder no client-side caso a API ignore o parâmetro
    const holderKeyCandidates = ['holder', 'cpfTitular', 'responsavelCpf'];
    data = data.filter((b: any) => {
      if (!b || typeof b !== 'object') return false;
      // campo padrão 'holder'
      if (typeof b.holder === 'string' && b.holder.replace(/\D/g, '') === holderCpf) return true;
      // tentar outras chaves conhecidas
      for (const k of holderKeyCandidates) {
        const v = (b as any)[k];
        if (typeof v === 'string' && v.replace(/\D/g, '') === holderCpf) return true;
      }
      return false;
    });
    setCached(cacheKey, data, 60000);
    return data;
  } catch (error: any) {
    throw new Error(`Erro ao listar beneficiários por holder: ${error?.message || 'Erro desconhecido'}`);
  }
}

// Agendar consulta no Rapidoc (corpo flexível para acompanhar a API)
export async function agendarConsultaRapidoc(body: Record<string, any>) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments`;
  const resp = await rapidocAxios.post(url, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Invalidar cache de agendamentos do beneficiário
  const beneficiaryUuid = body?.beneficiaryUuid || body?.beneficiary?.uuid;
  if (beneficiaryUuid) {
    cache.delete(`rapidoc:appointments:${beneficiaryUuid}`);
    cache.delete(`rapidoc:appointments:beneficiary:${beneficiaryUuid}`);
  }
  return resp.data;
}

export async function lerAgendamentoRapidoc(uuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 30 segundos para detalhes do agendamento (dados podem mudar durante a consulta)
  const cacheKey = `rapidoc:appointment:${uuid}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments/${uuid}`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  setCached(cacheKey, resp.data, 30000); // 30 segundos
  return resp.data;
}

export async function cancelarAgendamentoRapidoc(uuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments/${uuid}`;
  const resp = await rapidocAxios.delete(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Invalidar cache do agendamento e lista de agendamentos
  cache.delete(`rapidoc:appointment:${uuid}`);
  // Limpar todos os caches de lista de agendamentos (será recriado na próxima busca)
  for (const key of cache.keys()) {
    if (key.startsWith('rapidoc:appointments:')) {
      cache.delete(key);
    }
  }
  return { status: resp.status };
}

// Lista agendamentos no Rapidoc com filtros opcionais (ex.: { beneficiary: uuid } ou { cpf })
export async function listarAgendamentosRapidoc(params: Record<string, any>) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 30 segundos para lista de agendamentos
  const cacheKey = `rapidoc:appointments:${JSON.stringify(params)}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments`;
  const resp = await rapidocAxios.get(url, {
    params,
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Algumas implementações retornam { data: [...]} ou diretamente array
  let data: any[] = [];
  if (Array.isArray(resp.data)) data = resp.data;
  else if (Array.isArray(resp.data?.data)) data = resp.data.data;
  else if (Array.isArray(resp.data?.appointments)) data = resp.data.appointments;
  
  setCached(cacheKey, data, 30000); // 30 segundos
  return data;
}
// Inativa beneficiário no Rapidoc tentando chaves isActive/active
export async function inativarBeneficiarioRapidoc(uuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Config Rapidoc ausente');

  try {
    // A rota para REMOVER é DELETE /beneficiaries/{uuid}
    const resp = await rapidocAxios.delete(`${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${uuid}`, {
      headers: {
        Authorization: `Bearer ${RAPIDOC_TOKEN}`,
        clientId: RAPIDOC_CLIENT_ID,
        'Content-Type': 'application/vnd.rapidoc.tema-v2+json' // Importante para v2
      }
    });
    return resp.data;
  } catch (error: any) {
    console.error('Erro ao deletar beneficiario Rapidoc:', error.response?.data || error.message);
    throw error; // Repassa erro para o controller tratar
  }
}

// Remover beneficiário (DELETE) por UUID — alias semântica
export async function removerBeneficiarioRapidoc(uuid: string) {
  return inativarBeneficiarioRapidoc(uuid);
}

// Busca disponibilidade de especialidades para um beneficiário
export async function buscarDisponibilidadeEspecialidade(params: {
  specialtyUuid: string;
  beneficiaryUuid: string;
  dateInitial: string; // formato dd/MM/yyyy
  dateFinal: string; // formato dd/MM/yyyy
}) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 1 minuto para disponibilidade (muda frequentemente)
  const cacheKey = `rapidoc:availability:${params.specialtyUuid}:${params.beneficiaryUuid}:${params.dateInitial}:${params.dateFinal}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/specialty-availability`;
  const resp = await rapidocAxios.get(url, {
    params: {
      specialtyUuid: params.specialtyUuid,
      beneficiaryUuid: params.beneficiaryUuid,
      dateInitial: params.dateInitial,
      dateFinal: params.dateFinal,
    },
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  setCached(cacheKey, resp.data, 60000); // 1 minuto
  return resp.data;
}

// Solicita consulta imediata para um beneficiário (GET request-appointment)
export async function solicitarConsultaImediataRapidoc(beneficiaryUuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${beneficiaryUuid}/request-appointment`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Invalidar cache de agendamentos
  cache.delete(`rapidoc:appointments:${beneficiaryUuid}`);
  return resp.data;
}

// Buscar encaminhamentos médicos do beneficiário
export async function buscarEncaminhamentosBeneficiarioRapidoc(beneficiaryUuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 2 minutos para encaminhamentos
  const cacheKey = `rapidoc:referrals:${beneficiaryUuid}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${beneficiaryUuid}/medical-referrals`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  setCached(cacheKey, resp.data, 120000); // 2 minutos
  return resp.data;
}

// Listar agendamentos do beneficiário por UUID (endpoint específico)
export async function listarAgendamentosBeneficiarioRapidoc(beneficiaryUuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  
  // Cache de 30 segundos para agendamentos do beneficiário
  const cacheKey = `rapidoc:appointments:beneficiary:${beneficiaryUuid}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${beneficiaryUuid}/appointments`;
  const resp = await rapidocAxios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // A resposta pode vir como array ou objeto com array
  let data: any[] = [];
  if (Array.isArray(resp.data)) data = resp.data;
  else if (Array.isArray(resp.data?.appointments)) data = resp.data.appointments;
  else if (Array.isArray(resp.data?.data)) data = resp.data.data;
  
  setCached(cacheKey, data, 30000); // 30 segundos
  return data;
}

// Listar todos os beneficiários do Rapidoc
export async function listarBeneficiariosRapidoc(): Promise<any[]> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) {
    throw new Error('Configuração Rapidoc ausente');
  }
  
  // Cache de 1 minuto para lista completa de beneficiários
  const cacheKey = 'rapidoc:beneficiaries:all';
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;
  
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries`;
  logDebug('Buscando beneficiários em:', url);
  try {
    const resp = await rapidocAxios.get(url, {
      headers: {
        Authorization: `Bearer ${RAPIDOC_TOKEN}`,
        clientId: RAPIDOC_CLIENT_ID,
        'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
      }
    });
    logDebug('Resposta recebida, estrutura:', {
      isArray: Array.isArray(resp.data),
      hasBeneficiaries: !!resp.data?.beneficiaries,
      hasData: !!resp.data?.data,
      keys: resp.data ? Object.keys(resp.data) : []
    });
    
    // A resposta pode vir como array ou objeto com array
    let data: any[] = [];
    if (Array.isArray(resp.data)) {
      data = resp.data;
      logDebug(`Retornando array direto com ${data.length} itens`);
    } else if (Array.isArray(resp.data?.beneficiaries)) {
      data = resp.data.beneficiaries;
      logDebug(`Retornando array de beneficiaries com ${data.length} itens`);
    } else if (Array.isArray(resp.data?.data)) {
      data = resp.data.data;
      logDebug(`Retornando array de data com ${data.length} itens`);
    } else {
      logDebug('Estrutura de resposta não reconhecida, retornando array vazio');
    }
    
    setCached(cacheKey, data, 60000); // 1 minuto
    return data;
  } catch (error: any) {
    logDebug('Erro ao listar beneficiários:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data
    });
    throw new Error(`Erro ao buscar beneficiários do Rapidoc: ${error?.message || 'Erro desconhecido'}`);
  }
}