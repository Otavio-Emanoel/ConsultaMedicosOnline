"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Page() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

  const [cpf, setCpf] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [podeCadastrar, setPodeCadastrar] = useState<null | boolean>(null);
  const [usuario, setUsuario] = useState<Record<string, unknown> | null>(null);
  const [onboardingMsg, setOnboardingMsg] = useState("");
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [overrides, setOverrides] = useState({
    nome: "",
    email: "",
    telefone: "",
    birthday: "", // YYYY-MM-DD
    zipCode: "",
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefill CPF vindo da URL (?cpf=123...)
  useEffect(() => {
    const paramCpf = searchParams.get("cpf");
    if (paramCpf && !cpf) {
      // normaliza para formato ###.###.###-## se vier só números
      const onlyNums = paramCpf.replace(/\D/g, "");
      if (onlyNums.length === 11) {
        const masked = `${onlyNums.slice(0,3)}.${onlyNums.slice(3,6)}.${onlyNums.slice(6,9)}-${onlyNums.slice(9,11)}`;
        setCpf(masked);
      } else {
        setCpf(paramCpf);
      }
    }
  }, [searchParams, cpf]);

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");
    setPodeCadastrar(null);
    setUsuario(null);
    setOnboardingMsg("");
    setMissing(null);
    setLoading(true);

    try {
  const response = await fetch(`${API_BASE}/first-access/validate-cpf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, "") }),
      });
      const data = await response.json();
      if (response.ok) {
        if (typeof data.podeCadastrar === "boolean") {
          setPodeCadastrar(data.podeCadastrar);
          setUsuario(null);
          setMensagem(data.podeCadastrar ? "CPF liberado para cadastro!" : "Já existe cadastro ativo para este CPF.");
        } else if (data.usuario) {
          setPodeCadastrar(false);
          setUsuario(data.usuario);
          setMensagem("Usuário já possui assinatura ativa.");
        } else {
          setMensagem("CPF verificado com sucesso!");
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

  const onlyDigitsCpf = () => cpf.replace(/\D/g, "");

  const handleCompleteOnboarding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOnboardingMsg("");
    setOnboardingLoading(true);
    // Não limpar missing aqui para permitir reenvio dos overrides
    try {
      const body: { cpf: string; overrides?: { nome?: string; email?: string; telefone?: string; birthday?: string; zipCode?: string } } = { cpf: onlyDigitsCpf() };
      // Se já sabemos que há campos faltantes, envie overrides
      if (missing && missing.length > 0) {
        body.overrides = { ...overrides };
      }
  const resp = await fetch(`${API_BASE}/subscription/complete-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (resp.status === 200 && data.ok) {
        setOnboardingMsg("Onboarding concluído com sucesso.");
        router.push(`/primeiro-acesso?cpf=${onlyDigitsCpf()}`);
        return;
      }
      if (resp.status === 400 && Array.isArray(data.missing)) {
        setMissing(data.missing as string[]);
        setOnboardingMsg("Precisamos de alguns dados para finalizar o cadastro.");
        // Pre-fill possíveis campos vindos do objeto usuario retornado anteriormente
        const u = (usuario || {}) as { name?: string; email?: string; phone?: string; zipCode?: string };
        setOverrides(prev => ({
          nome: prev.nome || u.name || "",
          email: prev.email || u.email || "",
          telefone: prev.telefone || u.phone || "",
          birthday: prev.birthday || "",
          zipCode: prev.zipCode || u.zipCode || "",
        }));
        return;
      }
      setOnboardingMsg(typeof data?.error === 'string' ? data.error : JSON.stringify(data));
    } catch (err) {
      setOnboardingMsg(err instanceof Error ? err.message : "Erro ao completar onboarding.");
    } finally {
      setOnboardingLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <form onSubmit={handleVerificar} className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md flex flex-col gap-4 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-2">Verificar CPF</h2>
        <input
          type="text"
          placeholder="Digite seu CPF"
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          className="border rounded px-4 py-2"
          maxLength={14}
          inputMode="numeric"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded py-2 font-semibold"
          disabled={loading}
        >
          {loading ? "Verificando..." : "Verificar"}
        </button>
        {mensagem && (
          <div className="mt-2 text-center text-sm text-zinc-700 dark:text-zinc-200">{mensagem}</div>
        )}
        {/* Botões de ação após validação */}
        {podeCadastrar === true && (
          <button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white rounded py-2 font-semibold mt-4"
            onClick={() => router.push("/planos")}
          >
            Cadastrar
          </button>
        )}
        {podeCadastrar === false && (
          <div className="flex flex-col gap-2 mt-4">
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-semibold"
              onClick={() => {
                const digits = cpf.replace(/\D/g, "");
                router.push(`/login?cpf=${digits}`);
              }}
            >
              Ir para Login
            </button>
            <button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded py-2 font-semibold"
              onClick={() => handleCompleteOnboarding()}
              disabled={onboardingLoading}
            >
              {onboardingLoading ? 'Verificando…' : 'Finalizar cadastro'}
            </button>
            {onboardingMsg && (
              <div className="text-center text-xs text-zinc-600 dark:text-zinc-300">{onboardingMsg}</div>
            )}
            {missing && missing.length > 0 && (
              <div className="mt-2 p-3 border rounded flex flex-col gap-2">
                <div className="text-xs text-zinc-700 dark:text-zinc-300">Preencha os campos necessários:</div>
                {missing.includes('nome') && (
                  <input
                    placeholder="Nome completo"
                    value={overrides.nome}
                    onChange={e => setOverrides({ ...overrides, nome: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                  />
                )}
                {missing.includes('email') && (
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={overrides.email}
                    onChange={e => setOverrides({ ...overrides, email: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                  />
                )}
                {missing.includes('telefone') && (
                  <input
                    placeholder="Telefone"
                    value={overrides.telefone}
                    onChange={e => setOverrides({ ...overrides, telefone: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                  />
                )}
                {missing.includes('birthday') && (
                  <input
                    type="date"
                    placeholder="Data de nascimento"
                    value={overrides.birthday}
                    onChange={e => setOverrides({ ...overrides, birthday: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                  />
                )}
                {/* zipCode é opcional no orquestrador atual, mas mostramos se o backend um dia solicitar */}
                {missing.includes('zipCode') && (
                  <input
                    placeholder="CEP"
                    value={overrides.zipCode}
                    onChange={e => setOverrides({ ...overrides, zipCode: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => handleCompleteOnboarding(e)}
                  className="bg-green-600 hover:bg-green-700 text-white rounded py-2 text-sm"
                  disabled={onboardingLoading}
                >
                  {onboardingLoading ? 'Enviando…' : 'Concluir agora'}
                </button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
