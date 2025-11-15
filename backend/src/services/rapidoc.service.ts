import axios from 'axios';
import { configDotenv } from 'dotenv';

const RAPIDOC_BASE_URL = process.env.RAPIDOC_BASE_URL;
const RAPIDOC_TOKEN = process.env.RAPIDOC_TOKEN;
const RAPIDOC_CLIENT_ID = process.env.RAPIDOC_CLIENT_ID;
configDotenv();

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
  const url = `${RAPIDOC_BASE_URL}/tema/api/plans`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data as RapidocPlan[];
}

// Obter detalhes de um plano específico (para extrair especialidades associadas)
export async function obterDetalhesPlanoRapidoc(uuid: string): Promise<any> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/plans/${uuid}`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
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
  const resp = await axios.put(url, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data;
}

// Lista especialidades disponíveis (formato da API presumido)
export async function listarRapidocEspecialidades(): Promise<any[]> {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/specialties`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  // Assume resp.data contém array ou objeto com campo specialties
  if (Array.isArray(resp.data)) return resp.data;
  if (Array.isArray(resp.data?.specialties)) return resp.data.specialties;
  return [];
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
  if (data.paymentType) body.paymentType = data.paymentType;
  if (data.serviceType) body.serviceType = data.serviceType;
  if (data.specialties) body.specialties = data.specialties;
  if (typeof (data as any).isActive === 'boolean') body.isActive = (data as any).isActive;

  const resp = await axios.put(url, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data;
}

export async function cadastrarBeneficiarioRapidoc({ nome, email, cpf, birthday, phone, zipCode, paymentType, serviceType, holder, general }: {
  nome: string,
  email: string,
  cpf: string,
  birthday: string,
  phone?: string,
  zipCode?: string,
  paymentType?: string,
  serviceType?: string,
  holder?: string,
  general?: string
}) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const body = [{
    name: nome,
    email,
    cpf,
    birthday,
    phone,
    zipCode,
    paymentType,
    serviceType,
    holder,
    general
  }];
  const resp = await axios.post(`${RAPIDOC_BASE_URL}/tema/api/beneficiaries`, body, {
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
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpf}`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data;
}

// Agendar consulta no Rapidoc (corpo flexível para acompanhar a API)
export async function agendarConsultaRapidoc(body: Record<string, any>) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments`;
  const resp = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data;
}

export async function lerAgendamentoRapidoc(uuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments/${uuid}`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return resp.data;
}

export async function cancelarAgendamentoRapidoc(uuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/appointments/${uuid}`;
  const resp = await axios.delete(url, {
    headers: {
      Authorization: `Bearer ${RAPIDOC_TOKEN}`,
      clientId: RAPIDOC_CLIENT_ID,
      'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
    }
  });
  return { status: resp.status };
}

// Inativa beneficiário no Rapidoc tentando chaves isActive/active
export async function inativarBeneficiarioRapidoc(uuid: string) {
  if (!RAPIDOC_BASE_URL || !RAPIDOC_TOKEN || !RAPIDOC_CLIENT_ID) throw new Error('Configuração Rapidoc ausente');
  const url = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${uuid}`;
  const headers = {
    Authorization: `Bearer ${RAPIDOC_TOKEN}`,
    clientId: RAPIDOC_CLIENT_ID,
    'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
  } as const;
  // 1) Tenta com isActive
  try {
    const resp = await axios.put(url, { uuid, isActive: false }, { headers });
    return resp.data;
  } catch (e1: any) {
    // 2) Fallback: tenta com active
    try {
      const resp2 = await axios.put(url, { uuid, active: false }, { headers });
      return resp2.data;
    } catch (e2: any) {
      throw e2 || e1;
    }
  }
}
