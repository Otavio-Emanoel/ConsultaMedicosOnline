"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function VerificarCPFPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [podeCadastrar, setPodeCadastrar] = useState<null | boolean>(null);
  const [usuarioExistente, setUsuarioExistente] = useState(false);

  const formatarCPF = (value: string) => {
    const onlyNums = value.replace(/\D/g, "");
    if (onlyNums.length <= 11) {
      return onlyNums
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return cpf;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCPF(e.target.value);
    setCpf(formatted);
  };

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");
    setPodeCadastrar(null);
    setUsuarioExistente(false);
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${API_BASE}/first-access/validate-cpf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, "") }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (typeof data.podeCadastrar === "boolean") {
          setPodeCadastrar(data.podeCadastrar);
          if (data.podeCadastrar) {
            setMensagem("CPF liberado para cadastro!");
          } else {
            setUsuarioExistente(true);
            setMensagem("Já existe cadastro para este CPF.");
          }
        } else if (data.usuario) {
          setPodeCadastrar(false);
          setUsuarioExistente(true);
          setMensagem("Usuário já possui assinatura ativa.");
        }
      } else {
        setMensagem(data.error || "Erro ao verificar CPF.");
      }
    } catch {
      setMensagem("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push("/landing")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para planos
        </button>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="Médicos Consultas Online"
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verificar CPF
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Digite seu CPF para continuar com a assinatura
            </p>
          </div>

          <form onSubmit={handleVerificar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPF
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                maxLength={14}
                inputMode="numeric"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-green-600 text-white rounded-lg py-3 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || cpf.replace(/\D/g, "").length !== 11}
            >
              {loading ? "Verificando..." : "Verificar CPF"}
            </button>
          </form>

          {mensagem && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                podeCadastrar
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                  : usuarioExistente
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                  : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              }`}
            >
              {podeCadastrar ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{mensagem}</p>
            </div>
          )}

          {/* Botões de ação após validação */}
          {podeCadastrar === true && (
            <button
              type="button"
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-semibold transition-all"
              onClick={() => router.push("/planos")}
            >
              Continuar para Escolha de Plano
            </button>
          )}

          {usuarioExistente && (
            <div className="flex flex-col gap-3 mt-4">
              <button
                type="button"
                className="w-full bg-primary hover:bg-green-700 text-white rounded-lg py-3 font-semibold transition-all"
                onClick={() => router.push(`/login?cpf=${cpf.replace(/\D/g, "")}`)}
              >
                Ir para Login
              </button>
              <button
                type="button"
                className="w-full border-2 border-primary hover:bg-primary/10 text-primary rounded-lg py-3 font-semibold transition-all"
                onClick={() => router.push(`/primeiro-acesso?cpf=${cpf.replace(/\D/g, "")}`)}
              >
                Finalizar Cadastro / Gerar Senha
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          Seus dados estão seguros e protegidos
        </p>
      </div>
    </div>
  );
}
