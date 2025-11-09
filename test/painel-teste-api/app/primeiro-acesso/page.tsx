"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cpf, setCpf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [senhaTemp, setSenhaTemp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [podeCopiar, setPodeCopiar] = useState(false);

  // Prefill CPF da URL
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

  const handlePrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");
    setSenhaTemp(null);
    setPodeCopiar(false);
    setLoading(true);
    try {
      const resp = await fetch("http://localhost:3000/api/first-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, "") }),
      });
      const data = await resp.json();
      if (resp.status === 201 && data.senhaTemporaria) {
        setSenhaTemp(data.senhaTemporaria);
        setMensagem("Primeiro acesso realizado! Sua senha temporária foi gerada.");
        setPodeCopiar(true);
      } else if (resp.status === 409) {
        setMensagem("Você já realizou o primeiro acesso. Faça login normalmente.");
      } else if (resp.status === 404) {
        setMensagem("Usuário não encontrado. Verifique o CPF ou conclua o cadastro.");
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
        setMensagem("Senha copiada para a área de transferência!");
        setPodeCopiar(false);
      } catch {
        setMensagem("Não foi possível copiar a senha.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black py-10 px-4">
      <form onSubmit={handlePrimeiroAcesso} className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md flex flex-col gap-4 w-full max-w-sm">
        <h2 className="text-xl font-bold">Primeiro Acesso</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Digite seu CPF para gerar sua senha temporária.</p>

        <label className="text-xs font-medium">CPF</label>
        <input
          type="text"
          placeholder="Digite seu CPF"
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          className="border rounded px-4 py-2"
          maxLength={14}
          inputMode="numeric"
          disabled={!!senhaTemp}
        />

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-semibold" disabled={loading || !!senhaTemp}>
          {loading ? "Processando..." : "Gerar Senha"}
        </button>

        {mensagem && (
          <div className="mt-2 text-center text-sm text-zinc-700 dark:text-zinc-200">{mensagem}</div>
        )}

        {senhaTemp && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded font-mono text-lg tracking-widest select-all">
              {senhaTemp}
            </div>
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-1 text-sm"
              onClick={copiarSenha}
              disabled={!podeCopiar}
            >
              Copiar Senha
            </button>
            <button
              type="button"
              className="mt-2 underline text-blue-600 text-sm"
              onClick={() => router.push(`/login?cpf=${cpf.replace(/\D/g, "")}`)}
            >
              Voltar para Login
            </button>
          </div>
        )}
      </form>
    </div>
  );
}