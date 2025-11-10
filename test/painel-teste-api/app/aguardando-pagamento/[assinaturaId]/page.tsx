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

type DraftDados = {
  nome: string;
  email: string;
  cpf: string;
  birthday?: string;
  dataNascimento?: string;
  telefone?: string;
  zipCode?: string;
  billingType?: BillingType;
  serviceType?: string;
  holder?: string;
  general?: string;
};

export default function AguardandoPagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const assinaturaId = Array.isArray(params?.assinaturaId) ? params.assinaturaId[0] : params?.assinaturaId;
  const [status, setStatus] = useState<{ pago: boolean; pagamento?: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [polling, setPolling] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // Carrega draft salvo
  useEffect(() => {
    try {
      const raw = localStorage.getItem("assinaturaDraft");
      if (raw) setDraft(JSON.parse(raw));
    } catch { }
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
          let msg = "Erro ao verificar pagamento.";
          if (typeof data.error === "string") msg = data.error;
          else if (typeof data.description === "string") msg = data.description;
          else if (typeof data === "object" && data !== null) msg = JSON.stringify(data);
          setErro(msg);
        }
      } catch (err) {
        setErro(err instanceof Error ? err.message : JSON.stringify(err));
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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Normalizadores para Rapidoc
  const normalizePaymentType = (raw?: string) => {
    const val = (raw || '').toUpperCase();
    return val === 'A' || val === 'S' ? val : 'S';
  };
  const normalizeServiceType = (raw?: string) => {
    const allowed = new Set(['G', 'P', 'GP', 'GS', 'GSP']);
    const val = (raw || '').toUpperCase();
    return allowed.has(val) ? val : 'G';
  };

  const finalizar = async () => {
    setFinalizando(true);
    setErro("");
    setMensagem("Aguardando confirmação do pagamento...");

    // Pequeno atraso para evitar condição de corrida com a confirmação do Asaas
    await sleep(4000);

    // 1. Cadastra beneficiário no Rapidoc com retry
    let rapidocOk = false;
    let rapidocFailMsg = "";
    try {
      const draftRaw = localStorage.getItem("assinaturaDraft");
      const draftObj = draftRaw ? JSON.parse(draftRaw) : null;
      const dados = (draftObj?.dados || {}) as Partial<DraftDados>;
      const assinIdToUse: string | undefined = draftObj?.assinaturaId || (typeof assinaturaId === "string" ? assinaturaId : undefined);
      const bodyRapidoc = {
        assinaturaId: assinIdToUse,
        nome: dados.nome,
        email: dados.email,
        cpf: dados.cpf,
        birthday: dados.birthday || dados.dataNascimento,
        phone: dados.telefone,
        zipCode: dados.zipCode,
  paymentType: normalizePaymentType((dados as unknown as Record<string, string>)?.paymentType),
        serviceType: normalizeServiceType(dados.serviceType),
        holder: dados.cpf,
        general: dados.general,
      };
      const camposOk = bodyRapidoc.assinaturaId && bodyRapidoc.nome && bodyRapidoc.email && bodyRapidoc.cpf && bodyRapidoc.birthday;
      if (!camposOk) {
        rapidocFailMsg = "Dados insuficientes para cadastrar no Rapidoc.";
      } else {
        const maxTentativas = 3;
        for (let tentativa = 1; tentativa <= maxTentativas && !rapidocOk; tentativa++) {
          setMensagem(`Cadastrando beneficiário no Rapidoc (tentativa ${tentativa}/${maxTentativas})...`);
          const resp = await fetch("http://localhost:3000/api/subscription/rapidoc-beneficiary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyRapidoc),
          });
          if (resp.ok) {
            // Validar corpo (pode vir success=false mesmo com 201)
            try {
              const dataRapidoc = await resp.clone().json();
              const successFlag = (dataRapidoc?.beneficiario?.success === true) || dataRapidoc?.success === true;
              if (successFlag) {
                rapidocOk = true;
              } else if (dataRapidoc?.error) {
                rapidocFailMsg = typeof dataRapidoc.error === 'string' ? dataRapidoc.error : JSON.stringify(dataRapidoc.error);
              } else if (dataRapidoc?.beneficiario?.message) {
                rapidocFailMsg = dataRapidoc.beneficiario.message;
              }
            } catch {}
            if (!rapidocOk && !rapidocFailMsg) {
              rapidocFailMsg = "Resposta inesperada do Rapidoc.";
            }
            if (!rapidocOk) {
              // Não considerar tentativa válida se sucesso não confirmado
              rapidocOk = false;
            }
            break;
          } else {
            let msg = `Falha ao cadastrar no Rapidoc (HTTP ${resp.status}).`;
            try {
              const data = await resp.json();
              if (typeof data?.error === "string") msg = data.error;
              else if (data?.error?.description) msg = data.error.description;
              else if (data?.description) msg = data.description;
              else msg = JSON.stringify(data);
            } catch { }
            rapidocFailMsg = msg;
            // Se for 403 (pagamento ainda não confirmado no Asaas), aguardar e tentar de novo
            if (resp.status === 403 && tentativa < maxTentativas) {
              setMensagem("Pagamento ainda não propagou. Tentando novamente em 3s...");
              await sleep(3000);
            }
          }
        }
      }
    } catch (e: unknown) {
      rapidocFailMsg = e instanceof Error ? e.message : String(e);
    }

    if (!rapidocOk) {
      setErro(rapidocFailMsg || "Não foi possível cadastrar no Rapidoc agora. Tente novamente em instantes.");
      setFinalizando(false);
      return;
    }

    // 2. Se Rapidoc OK, cria usuário no banco com retries (404 = conta Rapidoc ainda não propagou)
    try {
      const draftRaw = localStorage.getItem("assinaturaDraft");
      const draftObj = draftRaw ? JSON.parse(draftRaw) : null;
      const dados = (draftObj?.dados || {}) as Partial<DraftDados>;
      const body = {
        cpf: dados.cpf,
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        dataNascimento: dados.birthday || dados.dataNascimento,
      };
      if (body.cpf && body.nome && body.email && body.telefone && body.dataNascimento) {
        const maxUserTentativas = 5;
        for (let tentativa = 1; tentativa <= maxUserTentativas; tentativa++) {
          setMensagem(`Criando usuário (tentativa ${tentativa}/${maxUserTentativas})...`);
          const respUser = await fetch("http://localhost:3000/api/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (respUser.ok) {
            setMensagem("Usuário criado com sucesso.");
            break;
          }
          // Trata erro
          let msg = `Falha ao criar usuário (HTTP ${respUser.status}).`;
          try {
            const data = await respUser.json();
            if (typeof data?.error === "string") msg = data.error;
            else if (data?.description) msg = data.description;
            else msg = JSON.stringify(data);
          } catch { }
          // Se 404 Rapidoc ainda não propagou, espera e tenta de novo
          if (respUser.status === 404 && tentativa < maxUserTentativas) {
            setMensagem("Conta Rapidoc não encontrada ainda. Aguardando propagação (3s)...");
            await sleep(3000);
            continue;
          }
          // Outros erros ou última tentativa
          setErro(msg);
          setFinalizando(false);
          return;
        }
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao criar usuário no banco.");
      setFinalizando(false);
      return;
    }

    try { localStorage.removeItem("assinaturaDraft"); } catch { }
    // Ir para tela de Primeiro Acesso (usar CPF se disponível)
    const cpfField = draft?.dados && typeof draft.dados["cpf"] === "string" ? String(draft.dados["cpf"]) : undefined;
    const cpf = cpfField;
    setMensagem("");
    setFinalizando(false);
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
        {mensagem && !erro && (
          <div className="text-xs mb-3 text-blue-600 dark:text-blue-400">{mensagem}</div>
        )}
        {erro && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-4">
            {typeof erro === "string"
              ? erro
              : JSON.stringify(erro, Object.getOwnPropertyNames(erro))}
          </div>
        )}
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
              disabled={finalizando}
              className={`px-4 py-2 rounded text-white text-sm ${finalizando ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {finalizando ? 'Processando...' : 'Continuar'}
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
