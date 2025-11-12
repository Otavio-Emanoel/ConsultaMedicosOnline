'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

type Usuario = {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  dataNascimento?: string;
  primeiroAcesso?: boolean;
  [key: string]: unknown;
};

type RapidocPlan = {
  paymentType?: string;
  plan?: {
    uuid?: string;
    name?: string;
    description?: string;
    serviceType?: string;
    specialties?: string[];
  };
};

type Rapidoc = {
  name?: string;
  uuid?: string;
  cpf?: string;
  birthday?: string; // "10/10/2000"
  phone?: string;
  email?: string;
  zipCode?: string;
  paymentType?: string;
  serviceType?: string;
  holder?: string;
  isActive?: boolean;
  clientId?: string;
  plans?: RapidocPlan[];
  [key: string]: unknown;
};

type AsaasSubscription = {
  object?: string;
  id?: string;
  dateCreated?: string; // "2025-11-11"
  customer?: string; // "cus_..."
  paymentLink?: string | null;
  value?: number;
  nextDueDate?: string; // "2026-01-11"
  cycle?: 'MONTHLY' | 'ANNUAL' | string;
  description?: string;
  billingType?: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | string;
  deleted?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'SUSPENDED' | 'CANCELED' | string;
  fine?: { value?: number; type?: string };
  interest?: { value?: number; type?: string };
  [key: string]: unknown;
};

type Asaas = {
  assinaturaId?: string;
  assinatura?: AsaasSubscription;
};

function getToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('firebaseToken') : null;
  } catch {
    return null;
  }
}

function extractCpfFromToken(token: string): string | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = JSON.parse(atob(payloadB64));
    // Firebase: user_id é o UID. No seu backend, UID = CPF
    return (json?.user_id as string) || (json?.uid as string) || null;
  } catch {
    return null;
  }
}

// Formatadores
const fmtCPF = (v?: string) => {
  if (!v) return '-';
  const s = v.replace(/\D/g, '').padStart(11, '0').slice(-11);
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const fmtPhone = (v?: string) => {
  if (!v) return '-';
  let s = v.replace(/\D/g, '');
  if (s.startsWith('55') && s.length > 11) s = s.slice(2);
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return v;
};

const fmtCEP = (v?: string) => {
  if (!v) return '-';
  const s = v.replace(/\D/g, '');
  if (s.length >= 8) return `${s.slice(0, 5)}-${s.slice(5, 8)}`;
  return v;
};

const fmtDate = (v?: string) => {
  if (!v) return '-';
  // Se vier "dd/mm/yyyy", retorna como está
  if (v.includes('/')) return v;
  // Se vier ISO yyyy-mm-dd
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR');
};

const fmtCurrency = (v?: number | null) => {
  if (v === undefined || v === null) return '-';
  try {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${v}`;
  }
};

const mapCycle = (c?: string) => {
  switch (c) {
    case 'MONTHLY': return 'Mensal';
    case 'ANNUAL': return 'Anual';
    default: return c || '-';
  }
};

const mapBilling = (b?: string) => {
  switch (b) {
    case 'BOLETO': return 'Boleto';
    case 'PIX': return 'Pix';
    case 'CREDIT_CARD': return 'Cartão de Crédito';
    default: return b || '-';
  }
};

const mapServiceType = (s?: string) => {
  switch (s) {
    case 'G': return 'Generalista';
    case 'S': return 'Especialidades';
    default: return s || '-';
  }
};

const StatusBadge = ({ value }: { value?: string }) => {
  const v = (value || '').toUpperCase();
  let cls = 'bg-zinc-100 text-zinc-700 border-zinc-200';
  if (v === 'ACTIVE') cls = 'bg-green-100 text-green-700 border-green-200';
  else if (v === 'OVERDUE') cls = 'bg-amber-100 text-amber-700 border-amber-200';
  else if (v === 'SUSPENDED') cls = 'bg-orange-100 text-orange-700 border-orange-200';
  else if (v === 'CANCELED' || v === 'INACTIVE') cls = 'bg-red-100 text-red-700 border-red-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>{value || '-'}</span>;
};

export default function UsuarioPage() {
  const [cpf, setCpf] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [rapidoc, setRapidoc] = useState<Rapidoc | null>(null);
  const [asaas, setAsaas] = useState<Asaas | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    async function fetchAll() {
      setLoading(true);
      setErro(null);

      const token = getToken();
      if (!token) {
        setErro('Não autenticado. Faça login novamente.');
        setLoading(false);
        return;
      }

      const cpfFromToken = extractCpfFromToken(token);
      if (!cpfFromToken) {
        setErro('Não foi possível obter o CPF do token.');
        setLoading(false);
        return;
      }
      setCpf(cpfFromToken);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      const fetchJSON = async (path: string) => {
        try {
          const res = await fetch(`${API}${path}`, { headers, cache: 'no-store' });
          if (!res.ok) {
            try {
              const data = await res.json();
              console.warn('Erro API', path, data);
            } catch { /* ignore */ }
            return null;
          }
          try {
            return await res.json();
          } catch {
            return null;
          }
        } catch (e) {
          console.warn('Falha de rede em', path, e);
          return null;
        }
      };

      try {
        const [usuarioData, rapidocData, asaasData] = await Promise.all([
          fetchJSON(`/usuario/${cpfFromToken}`),
          fetchJSON(`/rapidoc/beneficiario/${cpfFromToken}`),
          fetchJSON(`/assinatura/status/${cpfFromToken}`),
        ]);

        if (!cancel) {
          setUsuario(usuarioData);
          setRapidoc(rapidocData);
          setAsaas(asaasData);
        }
      } catch {
        if (!cancel) setErro('Erro ao carregar os dados.');
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancel = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
            <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
            <div className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 bg-zinc-50 dark:bg-black min-h-screen">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Minha Conta</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {usuario?.nome || rapidoc?.name ? `Bem-vindo, ${usuario?.nome || rapidoc?.name}` : 'Detalhes da sua conta'}
        </p>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900 dark:border-red-700 text-red-700 dark:text-red-200 text-sm">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Usuário */}
        <div className="rounded-xl border p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Usuário</div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Fonte: Firestore</span>
          </div>
          {usuario ? (
            <ul className="text-sm space-y-1 text-zinc-800 dark:text-zinc-200">
              <li><b>Nome:</b> {usuario.nome || '-'}</li>
              <li><b>CPF:</b> {fmtCPF(usuario.cpf || cpf || '')}</li>
              <li><b>E-mail:</b> {usuario.email || '-'}</li>
              <li><b>Telefone:</b> {fmtPhone(usuario.telefone)}</li>
              <li><b>Nasc.:</b> {fmtDate(usuario.dataNascimento)}</li>
              <li>
                <b>Primeiro acesso:</b>{' '}
                {usuario.primeiroAcesso ? (
                  <span className="text-green-700 dark:text-green-400 font-medium">Concluído</span>
                ) : (
                  <span className="text-orange-700 dark:text-orange-400 font-medium">Pendente</span>
                )}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Não encontrado.</p>
          )}
        </div>

        {/* Rapidoc */}
        <div className="rounded-xl border p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Rapidoc</div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Fonte: API Rapidoc</span>
          </div>
          {rapidoc ? (
            <div className="text-sm space-y-2 text-zinc-800 dark:text-zinc-200">
              <div className="flex items-center justify-between">
                <div className="font-medium">{rapidoc.name || '-'}</div>
                <StatusBadge value={rapidoc.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <ul className="space-y-1">
                <li><b>UUID:</b> {rapidoc.uuid || '-'}</li>
                <li><b>Client ID:</b> {rapidoc.clientId || '-'}</li>
                <li><b>CPF:</b> {fmtCPF(rapidoc.cpf || cpf || '')}</li>
                <li><b>Titular (holder):</b> {fmtCPF(rapidoc.holder)}</li>
                <li><b>Nasc.:</b> {fmtDate(rapidoc.birthday)}</li>
                <li><b>Telefone:</b> {fmtPhone(rapidoc.phone)}</li>
                <li><b>E-mail:</b> {rapidoc.email || '-'}</li>
                <li><b>CEP:</b> {fmtCEP(rapidoc.zipCode)}</li>
                <li><b>Tipo serviço:</b> {mapServiceType(rapidoc.serviceType)}</li>
                <li><b>Pagamento:</b> {rapidoc.paymentType || '-'}</li>
              </ul>

              {rapidoc.plans && rapidoc.plans.length > 0 && (
                <div className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                  <div className="text-xs font-semibold mb-1">Plano(s)</div>
                  <ul className="space-y-1">
                    {rapidoc.plans.map((p, idx) => (
                      <li key={p.plan?.uuid || `${idx}`} className="text-xs">
                        <div className="font-medium">{p.plan?.name || 'Plano'}</div>
                        {p.plan?.description && <div className="text-zinc-600 dark:text-zinc-400">{p.plan.description}</div>}
                        <div className="text-zinc-500 dark:text-zinc-400">
                          {mapServiceType(p.plan?.serviceType)} • pagamento: {p.paymentType || '-'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Não encontrado.</p>
          )}
        </div>

        {/* Asaas */}
        <div className="rounded-xl border p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Assinatura (Asaas)</div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Fonte: API Asaas</span>
          </div>
          {asaas?.assinatura ? (
            <div className="text-sm space-y-2 text-zinc-800 dark:text-zinc-200">
              <div className="flex items-center justify-between">
                <div className="font-medium">{asaas.assinatura.description || 'Assinatura'}</div>
                <StatusBadge value={asaas.assinatura.status} />
              </div>
              <ul className="space-y-1">
                <li><b>ID Assinatura:</b> {asaas.assinatura.id || asaas.assinaturaId || '-'}</li>
                <li><b>Cliente (customer):</b> {asaas.assinatura.customer || '-'}</li>
                <li><b>Início:</b> {fmtDate(asaas.assinatura.dateCreated)}</li>
                <li><b>Próx. vencimento:</b> {fmtDate(asaas.assinatura.nextDueDate)}</li>
                <li><b>Valor:</b> {fmtCurrency(asaas.assinatura.value)}</li>
                <li><b>Ciclo:</b> {mapCycle(asaas.assinatura.cycle)}</li>
                <li><b>Pagamento:</b> {mapBilling(asaas.assinatura.billingType)}</li>
                <li><b>Mora/Juros:</b> {asaas.assinatura.interest?.value ?? 0} ({asaas.assinatura.interest?.type || '-'})</li>
                <li><b>Multa:</b> {asaas.assinatura.fine?.value ?? 0} ({asaas.assinatura.fine?.type || '-'})</li>
                {asaas.assinatura.paymentLink && (
                  <li>
                    <a
                      href={asaas.assinatura.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Link de pagamento
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Não encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}