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
