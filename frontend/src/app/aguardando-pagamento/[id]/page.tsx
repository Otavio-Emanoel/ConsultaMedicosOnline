"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Clock, AlertCircle, Copy, CheckCircle } from "lucide-react";

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
  pixQrCode?: string;
  encodedImage?: string;
  qrCode?: string;
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
  endereco?: string;
};

export default function AguardandoPagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  // Rota estilizada usa [id]
  const assinaturaId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<{ pago: boolean; pagamento?: unknown } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string>("");
  const [polling, setPolling] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [rapidocBeneficiaryUuid, setRapidocBeneficiaryUuid] = useState<string | undefined>(undefined);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("assinaturaDraft");
      if (stored) {
        const data = JSON.parse(stored);
        setDraft(data);
      }
    } catch {}
  }, []);

  // Polling de pagamento automático (mesma lógica do teste)
  useEffect(() => {
    if (!assinaturaId || !polling) return;
    const fetchStatus = async () => {
      try {
        const resp = await fetch(`${API_BASE}/subscription/check-payment/${assinaturaId}`);
        const data = await resp.json();
        if (resp.ok) {
          setStatus(data);
          if (data.pago) setPolling(false);
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
    const interval = setInterval(fetchStatus, 7000);
    fetchStatus();
    return () => clearInterval(interval);
  }, [assinaturaId, polling, API_BASE]);

  const copiarCodigo = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {}
  };

  const billingType = draft?.dados?.billingType as BillingType | undefined;
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
    const val = (raw || "").toUpperCase();
    return val === "A" || val === "S" ? val : "S";
  };
  const normalizeServiceType = (raw?: string) => {
    const allowed = new Set(["G", "P", "GP", "GS", "GSP"]);
    const val = (raw || "").toUpperCase();
    return allowed.has(val) ? val : "G";
  };

  const finalizar = async () => {
    setFinalizando(true);
    setErro("");
    setMensagem("Aguardando confirmação do pagamento...");

    await sleep(4000);

    // 1) Rapidoc (criar beneficiário)
    let rapidocOk = false;
    let rapidocFailMsg = "";
    try {
      const draftRaw = localStorage.getItem("assinaturaDraft");
      const draftObj = draftRaw ? JSON.parse(draftRaw) : null;
      const dados = (draftObj?.dados || {}) as Partial<DraftDados>;
      const assinIdToUse: string | undefined = draftObj?.assinaturaId || (typeof assinaturaId === "string" ? assinaturaId : undefined);
      const phoneNormalized = (dados.telefone || "").replace(/\D/g, "");
      if (phoneNormalized.length !== 11) {
        setErro("Telefone inválido. Informe DDD + celular com 11 dígitos.");
        setFinalizando(false);
        return;
      }
      const bodyRapidoc: Record<string, any> = {
        assinaturaId: assinIdToUse,
        nome: dados.nome,
        email: dados.email,
        cpf: (dados.cpf || "").replace(/\D/g, ""),
        birthday: dados.birthday || dados.dataNascimento,
        phone: phoneNormalized,
        serviceType: normalizeServiceType(dados.serviceType),
        zipCode: (dados.zipCode || "").replace(/\D/g, ""),
        endereco: dados.endereco,
        cidade: (dados as any)?.cidade,
        estado: (dados as any)?.estado,
        holder: (dados.cpf || "").replace(/\D/g, ""),
        planoId: draftObj?.plano?.id,
      };
      const camposOk = bodyRapidoc.assinaturaId && bodyRapidoc.nome && bodyRapidoc.email && bodyRapidoc.cpf && bodyRapidoc.birthday;
      if (!camposOk) {
        rapidocFailMsg = "Dados insuficientes para cadastrar no Rapidoc.";
      } else {
        const maxTentativas = 3;
        for (let tentativa = 1; tentativa <= maxTentativas && !rapidocOk; tentativa++) {
          setMensagem(`Cadastrando beneficiário no Rapidoc (tentativa ${tentativa}/${maxTentativas})...`);
          const resp = await fetch(`${API_BASE}/subscription/rapidoc-beneficiary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyRapidoc),
          });
          if (resp.ok) {
            try {
              const dataRapidoc = await resp.clone().json();
              const beneficiarioRaw = dataRapidoc?.beneficiario;
              const successFlag = (beneficiarioRaw && beneficiarioRaw.success === true) ||
                (Array.isArray(beneficiarioRaw) && beneficiarioRaw[0]?.success === true) ||
                dataRapidoc?.success === true;
              // Extrair UUID do beneficiário (flexível para vários formatos)
              let uuidExtraido: string | undefined;
              if (Array.isArray(beneficiarioRaw)) {
                uuidExtraido = beneficiarioRaw[0]?.uuid || beneficiarioRaw[0]?.beneficiary?.uuid;
              } else if (beneficiarioRaw && typeof beneficiarioRaw === 'object') {
                uuidExtraido = beneficiarioRaw.uuid || beneficiarioRaw?.beneficiary?.uuid;
              }
              if (!uuidExtraido && typeof dataRapidoc?.beneficiario?.uuid === 'string') {
                uuidExtraido = dataRapidoc.beneficiario.uuid;
              }
              if (!uuidExtraido && typeof dataRapidoc?.uuid === 'string') {
                uuidExtraido = dataRapidoc.uuid;
              }
              if (successFlag) {
                rapidocOk = true;
                setRapidocBeneficiaryUuid(uuidExtraido);
              } else if (dataRapidoc?.error) {
                rapidocFailMsg = typeof dataRapidoc.error === "string" ? dataRapidoc.error : JSON.stringify(dataRapidoc.error);
              } else if (dataRapidoc?.beneficiario?.message) {
                rapidocFailMsg = dataRapidoc.beneficiario.message;
              }
            } catch {}
            if (!rapidocOk && !rapidocFailMsg) {
              rapidocFailMsg = "Resposta inesperada do Rapidoc.";
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
            } catch {}
            rapidocFailMsg = msg;
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

    // 2) Usuário + assinatura
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
        idAssinatura: (Array.isArray(assinaturaId) ? assinaturaId[0] : assinaturaId) || draftObj?.assinaturaId,
        rapidocBeneficiaryUuid: rapidocBeneficiaryUuid,
      };
      const planoId = draftObj?.plano?.id;
      if (body.cpf && body.nome && body.email && body.telefone && body.dataNascimento) {
        const maxUserTentativas = 5;
        for (let tentativa = 1; tentativa <= maxUserTentativas; tentativa++) {
          setMensagem(`Criando usuário (tentativa ${tentativa}/${maxUserTentativas})...`);
          const respUser = await fetch(`${API_BASE}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (respUser.ok) {
            setMensagem("Usuário criado com sucesso.");
            try {
              const draftRawAss = localStorage.getItem("assinaturaDraft");
              const draftObjAss = draftRawAss ? JSON.parse(draftRawAss) : null;
              const idAss = (Array.isArray(assinaturaId) ? assinaturaId[0] : assinaturaId) || draftObjAss?.assinaturaId;
              if (!idAss || !body.cpf || !planoId) {
                setErro("Não foi possível salvar assinatura: assinaturaId/cpf/planoId ausentes.");
                setFinalizando(false);
                return;
              }
              const assinaturaBody = {
                idAssinatura: idAss,
                cpfUsuario: body.cpf,
                planoId: planoId,
              };
              const maxAssTentativas = 3;
              for (let t = 1; t <= maxAssTentativas; t++) {
                setMensagem(`Salvando assinatura no banco (tentativa ${t}/${maxAssTentativas})...`);
                const respAssin = await fetch(`${API_BASE}/assinaturas`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(assinaturaBody),
                });
                if (respAssin.ok) {
                  setMensagem("Assinatura salva com sucesso.");
                  break;
                }
                let msgA = `Falha ao salvar assinatura (HTTP ${respAssin.status}).`;
                try {
                  const dataAssin = await respAssin.json();
                  if (typeof dataAssin?.error === "string") msgA = dataAssin.error;
                  else if (dataAssin?.description) msgA = dataAssin.description;
                  else msgA = JSON.stringify(dataAssin);
                } catch {}
                if ((respAssin.status === 404 || respAssin.status === 402) && t < maxAssTentativas) {
                  setMensagem("Dependências ainda não disponíveis. Tentando novamente em 3s...");
                  await sleep(3000);
                  continue;
                }
                setErro(msgA);
                setFinalizando(false);
                return;
              }
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro ao salvar assinatura.");
              setFinalizando(false);
              return;
            }
            break;
          }
          let msg = `Falha ao criar usuário (HTTP ${respUser.status}).`;
          try {
            const data = await respUser.json();
            if (typeof data?.error === "string") msg = data.error;
            else if (data?.description) msg = data.description;
            else msg = JSON.stringify(data);
          } catch {}
          if (respUser.status === 404 && tentativa < maxUserTentativas) {
            setMensagem("Conta Rapidoc não encontrada ainda. Aguardando propagação (3s)...");
            await sleep(3000);
            continue;
          }
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

    try { localStorage.removeItem("assinaturaDraft"); } catch {}
    setFinalizado(true);
    setMensagem("Fluxo concluído. Gere seu acesso inicial.");
    setFinalizando(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${status?.pago ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
              {status?.pago ? (
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              ) : (
                <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Aguardando Pagamento</h1>
            <p className="text-gray-600 dark:text-gray-300">Sua assinatura foi criada com sucesso!</p>
          </div>

          {draft && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Detalhes da Assinatura</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Plano:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{draft.plano?.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Periodicidade:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{draft.plano?.periodicidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                    <span className="font-semibold text-primary text-lg">R$ {draft.plano?.preco?.toFixed(2)}/mês</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID da Assinatura:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-900 dark:text-white">{assinaturaId}</span>
                      <button onClick={() => copiarCodigo(assinaturaId || "")} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                        <Copy className={`w-4 h-4 ${copiado ? "text-green-600" : "text-gray-600"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">Próximos Passos</h4>
                    <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                      <li>• Realize o pagamento conforme a forma escolhida ({draft.dados?.billingType})</li>
                      <li>• Após a confirmação do pagamento, você receberá um email com instruções</li>
                      <li>• Use a funcionalidade "Primeiro Acesso" para gerar sua senha temporária</li>
                      <li>• Faça login e comece a usar os serviços imediatamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              {(billingType === "BOLETO" || billingType === "PIX") && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">{billingType === "BOLETO" ? "Pagamento via Boleto" : "Pagamento via PIX"}</h4>
                  {billingType === "BOLETO" ? (
                    <>
                      <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">O boleto foi enviado para seu email. Você também pode acessá-lo pelo painel após o login.</p>
                      {boletoUrl ? (
                        <a href={String(boletoUrl)} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs">Abrir Boleto</a>
                      ) : (
                        <p className="text-xs text-blue-700 dark:text-blue-400">Gerando link do boleto...</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">O código PIX foi enviado para seu email. Você também pode acessá-lo pelo painel após o login.</p>
                      {pixText ? (
                        <div className="text-xs break-all p-2 border rounded bg-white/70 dark:bg-zinc-800">{pixText}</div>
                      ) : (
                        <p className="text-xs text-blue-700 dark:text-blue-400">Gerando código PIX...</p>
                      )}
                      {pixImage && (
                        <Image alt="QR Code PIX" src={`data:image/png;base64,${pixImage}`} width={160} height={160} className="mt-3 mx-auto w-40 h-40 object-contain" unoptimized />
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {!status?.pago && (
                  <button disabled className="w-full bg-gradient-to-r from-primary to-green-600 text-white rounded-lg py-3 px-6 font-semibold shadow-md transition-all opacity-60 cursor-not-allowed">
                    {loading ? "Verificando..." : "Aguardando pagamento..."}
                  </button>
                )}
                {status?.pago && !finalizado && (
                  <button onClick={finalizar} disabled={finalizando} className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white rounded-lg py-3 px-6 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60">
                    {finalizando ? "Processando..." : "Continuar"}
                  </button>
                )}
                {finalizado && (
                  <button onClick={() => {
                    const cpfField = draft?.dados && typeof (draft as any).dados["cpf"] === "string" ? String((draft as any).dados["cpf"]) : undefined;
                    if (cpfField) router.push(`/primeiro-acesso?cpf=${encodeURIComponent(cpfField)}`);
                    else router.push("/primeiro-acesso");
                  }} className="w-full bg-gradient-to-r from-green-600 to-primary hover:from-primary hover:to-green-600 text-white rounded-lg py-3 px-6 font-semibold shadow-md hover:shadow-lg transition-all">
                    Primeiro Acesso
                  </button>
                )}
                {(mensagem || erro) && (
                  <div className="text-center text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg py-2 px-3">
                    {mensagem || erro}
                  </div>
                )}
              </div>
            </div>
          )}

          {!draft && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Não foi possível carregar os detalhes da assinatura.</p>
              <button onClick={() => router.push("/landing")} className="text-primary hover:underline">Voltar para página inicial</button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">Em caso de dúvidas, entre em contato: contato@medicosconsultasonline.com.br</p>
      </div>
    </div>
  );
}
