'use client';

import { useEffect, useState } from 'react';

type Assinatura = {
  id?: string;
  description?: string;
  value?: number;
  status?: string;
  dateCreated?: string;
  nextDueDate?: string;
  billingType?: string;
  cycle?: string;
  paymentLink?: string;
  bankSlipUrl?: string;
  [key: string]: unknown;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

function getToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('firebaseToken') : null;
  } catch {
    return null;
  }
}

function mapCycle(cycle?: string) {
  switch ((cycle || '').toUpperCase()) {
    case 'MONTHLY':
      return 'Mensal';
    case 'ANNUAL':
      return 'Anual';
    default:
      return cycle || '-';
  }
}

function extractCpfFromToken(token: string): string | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = JSON.parse(atob(payloadB64));
    return (json?.user_id as string) || (json?.uid as string) || null;
  } catch {
    return null;
  }
}

export default function AssinaturasPage() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchAssinatura() {
      setLoading(true);
      setErro(null);

      const token = getToken();
      if (!token) {
        setErro('Não autenticado. Faça login novamente.');
        setLoading(false);
        return;
      }
      const cpf = extractCpfFromToken(token);
      if (!cpf) {
        setErro('Não foi possível obter o CPF do token.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/assinatura/status/${cpf}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setErro('Não foi possível carregar sua assinatura.');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAssinatura(data.assinatura || null);
      } catch {
        setErro('Erro ao buscar assinatura.');
      } finally {
        setLoading(false);
      }
    }
    fetchAssinatura();
  }, []);

  // URL do boleto (ajuste conforme seu backend)
  const boletoUrl: string | undefined =
    (assinatura?.boletoUrl as string | undefined) || assinatura?.bankSlipUrl || assinatura?.paymentLink;

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen bg-zinc-50 dark:bg-black">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Minhas Assinaturas</h1>
      {loading ? (
        <p className="text-zinc-500">Carregando...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : assinatura ? (
        <div className="rounded-xl border p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-lg">{assinatura.description || 'Assinatura'}</div>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              assinatura.status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : assinatura.status === 'OVERDUE'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-zinc-200 text-zinc-700'
            }`}>
              {assinatura.status || '-'}
            </span>
          </div>
          <ul className="text-sm space-y-1 mt-2">
            <li><b>Valor:</b> R$ {assinatura.value?.toFixed(2) || '-'}</li>
            <li><b>Início:</b> {assinatura.dateCreated ? new Date(assinatura.dateCreated).toLocaleDateString('pt-BR') : '-'}</li>
            <li><b>Próx. vencimento:</b> {assinatura.nextDueDate ? new Date(assinatura.nextDueDate).toLocaleDateString('pt-BR') : '-'}</li>
            <li><b>Tipo de pagamento:</b> {assinatura.billingType || '-'}</li>
            <li><b>Ciclo:</b> {mapCycle(assinatura.cycle)}</li>
            <li><b>ID:</b> {assinatura.id || '-'}</li>
          </ul>
          {boletoUrl && (
            <button
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              onClick={() => setShowModal(true)}
            >
              Ver Boleto do Próximo Vencimento
            </button>
          )}
        </div>
      ) : (
        <div className="text-zinc-500">Nenhuma assinatura ativa encontrada.</div>
      )}

      {/* Modal do Boleto */}
      {showModal && boletoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xl"
              onClick={() => setShowModal(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Boleto do Próximo Vencimento</h2>
            <iframe
              src={boletoUrl}
              title="Boleto"
              className="w-full h-96 border rounded"
            />
            <div className="mt-4 text-center">
              <a
                href={boletoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Abrir boleto em nova aba
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}