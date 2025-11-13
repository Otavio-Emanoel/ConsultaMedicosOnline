"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Clock, AlertCircle, Copy, ExternalLink } from "lucide-react";

export default function AguardandoPagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const assinaturaId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [draft, setDraft] = useState<any>(null);
  const [statusPagamento, setStatusPagamento] = useState<"pending" | "confirmed" | "error">("pending");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("assinaturaDraft");
      if (stored) {
        const data = JSON.parse(stored);
        if (data.assinaturaId === assinaturaId) {
          setDraft(data);
        }
      }
    } catch {}
  }, [assinaturaId]);

  const copiarCodigo = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Aguardando Pagamento
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Sua assinatura foi criada com sucesso!
            </p>
          </div>

          {draft && (
            <div className="space-y-6">
              {/* Informações da Assinatura */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
                  Detalhes da Assinatura
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Plano:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {draft.plano?.tipo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Periodicidade:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {draft.plano?.periodicidade}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                    <span className="font-semibold text-primary text-lg">
                      R$ {draft.plano?.preco?.toFixed(2)}/mês
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID da Assinatura:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-900 dark:text-white">
                        {assinaturaId}
                      </span>
                      <button
                        onClick={() => copiarCodigo(assinaturaId || "")}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <Copy className={`w-4 h-4 ${copiado ? "text-green-600" : "text-gray-600"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instruções de Pagamento */}
              <div className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                      Próximos Passos
                    </h4>
                    <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                      <li>• Realize o pagamento conforme a forma escolhida ({draft.dados?.billingType})</li>
                      <li>• Após a confirmação do pagamento, você receberá um email com instruções</li>
                      <li>• Use a funcionalidade "Primeiro Acesso" para gerar sua senha temporária</li>
                      <li>• Faça login e comece a usar os serviços imediatamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Informação sobre Boleto/PIX */}
              {(draft.dados?.billingType === "BOLETO" || draft.dados?.billingType === "PIX") && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                    {draft.dados?.billingType === "BOLETO" ? "Pagamento via Boleto" : "Pagamento via PIX"}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                    {draft.dados?.billingType === "BOLETO"
                      ? "O boleto foi enviado para seu email. Você também pode acessá-lo pelo painel após o login."
                      : "O código PIX foi enviado para seu email. Você também pode acessá-lo pelo painel após o login."}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Verifique sua caixa de entrada e spam.
                  </p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/primeiro-acesso?cpf=${draft.dados?.cpf}`)}
                  className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white rounded-lg py-3 px-6 font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Gerar Senha de Acesso
                </button>
                
                <button
                  onClick={() => router.push("/login")}
                  className="w-full border-2 border-primary text-primary hover:bg-primary/10 rounded-lg py-3 px-6 font-semibold transition-all"
                >
                  Ir para Login
                </button>
                
                <button
                  onClick={() => router.push("/landing")}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-primary transition"
                >
                  Voltar para página inicial
                </button>
              </div>
            </div>
          )}

          {!draft && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Não foi possível carregar os detalhes da assinatura.
              </p>
              <button
                onClick={() => router.push("/landing")}
                className="text-primary hover:underline"
              >
                Voltar para página inicial
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          Em caso de dúvidas, entre em contato: contato@medicosconsultasonline.com.br
        </p>
      </div>
    </div>
  );
}
