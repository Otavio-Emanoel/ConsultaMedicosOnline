"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

type BillingType = "BOLETO" | "PIX" | "CREDIT_CARD";

type Dados = {
  billingType?: BillingType;
  ciclo?: string;
  [key: string]: unknown;
};

type Draft = {
  createdAt: number;
  assinaturaId: string;
  clienteId?: string;
  plano?: { id?: string; tipo?: string; preco?: number; periodicidade?: string };
  dados?: Dados;
};

type PaymentDetails = {
  bankSlipUrl?: string;
  invoiceUrl?: string;
  dueDate?: string;
  value?: number;
  pixQrCode?: string; // texto copia e cola
  encodedImage?: string; // base64 image
  qrCode?: string; // fallback
  [k: string]: unknown;
};

export default function AguardandoPagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const assinaturaId = Array.isArray(params?.assinaturaId) ? params.assinaturaId[0] : params?.assinaturaId;
  const [status, setStatus] = useState<{ pago: boolean; pagamento?: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [polling, setPolling] = useState(true);

  // Carrega draft salvo
  useEffect(() => {
    try {
      const raw = localStorage.getItem("assinaturaDraft");
      if (raw) setDraft(JSON.parse(raw));
    } catch {}
  }, []);

  // Polling do status de pagamento
  useEffect(() => {
    if (!assinaturaId || !polling) return;
    const fetchStatus = async () => {
      try {
        const resp = await fetch(`http://localhost:3000/api/subscription/check-payment/${assinaturaId}`);
        const data = await resp.json();
        if (resp.ok) {
          setStatus(data);
          if (data.pago) {
            setPolling(false);
          }
        } else {
          setErro(data.error || "Erro ao verificar pagamento.");
        }
      } catch {
        setErro("Falha de conexão ao verificar pagamento.");
      } finally {
        setLoading(false);
      }
    };
    const interval = setInterval(fetchStatus, 7000); // a cada 7s
    fetchStatus(); // chamada inicial
    return () => clearInterval(interval);
  }, [assinaturaId, polling]);

  const billingType = draft?.dados?.billingType;
  const pagamento = (status?.pagamento as PaymentDetails) || undefined;
  const boletoUrl = pagamento?.bankSlipUrl || pagamento?.invoiceUrl;
  const pixText = pagamento?.pixQrCode || pagamento?.qrCode;
  const pixImage = pagamento?.encodedImage as string | undefined;

  const instrucoes = () => {
    if (!billingType) return null;
    if (billingType === "BOLETO") {
      return "Seu boleto está sendo gerado. Assim que o pagamento for confirmado, sua conta será ativada automaticamente.";
    }
    if (billingType === "PIX") {
      return "Use o QR Code ou copia e cola gerado para pagar via PIX. A confirmação costuma ser imediata.";
    }
    if (billingType === "CREDIT_CARD") {
      return "Transação em processamento no cartão. Pode levar alguns instantes para confirmar.";
    }
    return null;
  };

  const finalizar = async () => {
    // Cria usuário no banco após pagamento confirmado
    try {
      const draftRaw = localStorage.getItem("assinaturaDraft");
      if (draftRaw) {
        const draftObj = JSON.parse(draftRaw);
        const dados = draftObj?.dados || {};
        const body = {
          cpf: dados.cpf,
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          dataNascimento: dados.birthday || dados.dataNascimento,
        };
        // Só envia se tiver todos os campos obrigatórios
        if (body.cpf && body.nome && body.email && body.telefone && body.dataNascimento) {
          await fetch("http://localhost:3000/api/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      }
    } catch {}
    try { localStorage.removeItem("assinaturaDraft"); } catch {}
    // Ir para tela de Primeiro Acesso (usar CPF se disponível)
    const cpfField = draft?.dados && typeof draft.dados["cpf"] === "string" ? String(draft.dados["cpf"]) : undefined;
    const cpf = cpfField;
    if (cpf) {
      router.push(`/verificar-cpf?cpf=${encodeURIComponent(cpf)}`);
    } else {
      router.push("/verificar-cpf");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black py-10 px-4">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-2">Aguardando Pagamento</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">Assinatura ID: {assinaturaId}</p>
        {draft?.plano && (
          <div className="mb-6 p-4 border rounded bg-zinc-50 dark:bg-zinc-800">
            <div className="font-semibold">Plano: {draft.plano.tipo}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">{draft.plano.periodicidade}</div>
            <div className="mt-1 text-blue-600 dark:text-blue-400 font-bold">R$ {draft.plano.preco?.toFixed(2)}</div>
            <div className="text-xs mt-2">Forma de Pagamento: {billingType}</div>
            <div className="text-xs">Ciclo: {draft.dados?.ciclo}</div>
          </div>
        )}
        {loading && <div className="text-sm">Verificando status do pagamento...</div>}
        {erro && <div className="text-sm text-red-600 dark:text-red-400 mb-4">{erro}</div>}
        {status && !status.pago && (
          <div className="text-sm mb-4">
            <div className="font-medium mb-2">Status: pagamento pendente</div>
            <p className="text-zinc-700 dark:text-zinc-200">{instrucoes()}</p>
            {/* Detalhes de pagamento conforme método */}
            {billingType === "BOLETO" && (
              <div className="mt-3 space-y-2">
                {boletoUrl ? (
                  <a
                    href={String(boletoUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Abrir Boleto
                  </a>
                ) : (
                  <div className="text-xs text-zinc-600">Gerando link do boleto...</div>
                )}
                {pagamento?.dueDate && (
                  <div className="text-xs">Vencimento: {new Date(pagamento.dueDate).toLocaleDateString()}</div>
                )}
                {typeof pagamento?.value === 'number' && (
                  <div className="text-xs">Valor: R$ {pagamento.value.toFixed(2)}</div>
                )}
              </div>
            )}
            {billingType === "PIX" && (
              <div className="mt-3 space-y-2">
                {pixText ? (
                  <div className="text-xs break-all p-2 border rounded bg-zinc-50 dark:bg-zinc-800">
                    {pixText}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600">Gerando código PIX...</div>
                )}
                {pixImage && (
                  <Image
                    alt="QR Code PIX"
                    src={`data:image/png;base64,${pixImage}`}
                    width={160}
                    height={160}
                    className="mt-2 mx-auto w-40 h-40 object-contain"
                    unoptimized
                  />
                )}
                {typeof pagamento?.value === 'number' && (
                  <div className="text-xs">Valor: R$ {pagamento.value.toFixed(2)}</div>
                )}
              </div>
            )}
          </div>
        )}
        {status?.pago && (
          <div className="text-sm mb-6">
            <div className="font-medium text-green-600 dark:text-green-400 mb-2">Pagamento confirmado!</div>
            <p className="text-zinc-700 dark:text-zinc-200">Estamos ativando sua conta. Você já pode prosseguir.</p>
          </div>
        )}
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded border text-sm"
          >
            Voltar
          </button>
          {status?.pago ? (
            <button
              type="button"
              onClick={finalizar}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded bg-zinc-400 text-white text-sm opacity-70 cursor-not-allowed"
            >
              Aguardando...
            </button>
          )}
        </div>
        <div className="mt-6 text-xs text-center text-zinc-500 dark:text-zinc-400">
          A página atualiza automaticamente. Última verificação não exibida explicitamente.
        </div>
      </div>
    </div>
  );
}
