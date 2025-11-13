"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function PrimeiroAcessoPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [cpf, setCpf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [senhaTemp, setSenhaTemp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const paramCpf = searchParams.get("cpf");
    if (paramCpf && !cpf) {
      const onlyNums = paramCpf.replace(/\D/g, "");
      if (onlyNums.length === 11) {
        const masked = `${onlyNums.slice(0, 3)}.${onlyNums.slice(3, 6)}.${onlyNums.slice(6, 9)}-${onlyNums.slice(9, 11)}`;
        setCpf(masked);
      } else {
        setCpf(paramCpf);
      }
    }
  }, [searchParams, cpf]);

  const formatarCPF = (value: string) => {
    const onlyNums = value.replace(/\D/g, "");
    return onlyNums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCPF(e.target.value);
    setCpf(formatted);
  };

  const handlePrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");
    setSenhaTemp(null);
    setCopiado(false);
    setLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/first-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, "") }),
      });
      
      const data = await resp.json();
      
      if (resp.status === 201 && data.senhaTemporaria) {
        setSenhaTemp(data.senhaTemporaria);
        setMensagem("Primeiro acesso realizado com sucesso!");
      } else if (resp.status === 409) {
        setMensagem("Você já realizou o primeiro acesso. Faça login normalmente.");
      } else if (resp.status === 404) {
        setMensagem("Usuário não encontrado. Verifique o CPF.");
      } else {
        setMensagem(data.error || "Erro ao processar primeiro acesso.");
      }
    } catch {
      setMensagem("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const copiarSenha = async () => {
    if (senhaTemp) {
      try {
        await navigator.clipboard.writeText(senhaTemp);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      } catch {
        setMensagem("Não foi possível copiar a senha.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push("/verificar-cpf")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Primeiro Acesso</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Digite seu CPF para gerar sua senha temporária</p>
          </div>

          <form onSubmit={handlePrimeiroAcesso} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CPF</label>
              <input type="text" placeholder="000.000.000-00" value={cpf} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white" maxLength={14} disabled={loading || !!senhaTemp} />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-primary to-green-600 text-white rounded-lg py-3 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50" disabled={loading || !!senhaTemp || cpf.replace(/\D/g, "").length !== 11}>
              {loading ? "Gerando..." : "Gerar Senha Temporária"}
            </button>
          </form>

          {mensagem && !senhaTemp && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${mensagem.includes("sucesso") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {mensagem.includes("sucesso") ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm">{mensagem}</p>
            </div>
          )}

          {senhaTemp && (
            <div className="mt-6 space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-green-800 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Senha gerada!</span>
                </div>
                <div className="bg-white rounded-lg p-4 border">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Sua senha temporária:</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 px-4 py-3 rounded-lg font-mono text-lg tracking-widest">
                      {mostrarSenha ? senhaTemp : ""}
                    </div>
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="p-3 rounded-lg border hover:bg-gray-50">
                      {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button type="button" onClick={copiarSenha} className="p-3 rounded-lg border hover:bg-gray-50">
                      <Copy className={`w-5 h-5 ${copiado ? "text-green-600" : ""}`} />
                    </button>
                  </div>
                  {copiado && <p className="text-xs text-green-600 mt-2 text-center"> Copiado!</p>}
                </div>
              </div>
              <button type="button" className="w-full bg-primary hover:bg-green-700 text-white rounded-lg py-3 font-semibold" onClick={() => router.push(`/login?cpf=${cpf.replace(/\D/g, "")}`)}>
                Ir para Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
