"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DashboardUsuario = {
  cpf: string;
  nome: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;
  primeiroAcesso?: boolean;
};

type DashboardAssinatura = {
  idAssinatura: string;
  cpfUsuario: string;
  plano?: string;
  dataInicio?: string;
  status?: string; // ativa, cancelada, etc.
};

type DashboardBeneficiario = {
  cpf: string;
  holder: string;
  dataNascimento?: string;
  parentesco?: string;
  nome?: string;
  email?: string;
};

type DashboardResponse = {
  usuario?: DashboardUsuario;
  assinaturas?: DashboardAssinatura[];
  beneficiarios?: DashboardBeneficiario[];
};

export default function DashboardPage() {
  // Função de logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('firebaseToken');
    } catch {}
    router.push('/');
  };
  const search = useSearchParams();
  const router = useRouter();
  const [cpf, setCpf] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string>("");

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [msgAcao, setMsgAcao] = useState<string>("");

  // Determina o CPF a usar: query ?cpf=, depois draft localStorage
  useEffect(() => {
    const cpfQuery = (search?.get("cpf") || "").trim();
    if (cpfQuery) {
      setCpf(cpfQuery);
      return;
    }
    try {
      const raw = localStorage.getItem("assinaturaDraft");
      if (raw) {
        const draft = JSON.parse(raw);
        const dcpf = draft?.dados?.cpf as string | undefined;
        const dnome = draft?.dados?.nome as string | undefined;
        if (dcpf) setCpf(String(dcpf));
        if (dnome) setNome(String(dnome));
      }
    } catch {}
  }, [search]);

  // Carrega dados agregados do backend (/api/dashboard) usando token se existir
  useEffect(() => {
    // Se ainda não temos CPF, podemos tentar mesmo assim: backend pode usar token para identificar.
    let cancel = false;
    async function load() {
      setLoading(true);
      setErro("");
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('firebaseToken') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch('http://localhost:3000/api/dashboard', { headers });
        const data = await resp.json();
        if (!resp.ok) {
          const msg = typeof data?.error === 'string' ? data.error : JSON.stringify(data);
          if (!cancel) setErro(msg);
        } else if (!cancel) {
          setDashboard(data as DashboardResponse);
          // Se não tínhamos CPF definido, extraí-lo do usuário retornado
          if (!cpf && data?.usuario?.cpf) setCpf(String(data.usuario.cpf));
          if (!nome && data?.usuario?.nome) setNome(String(data.usuario.nome));
        }
      } catch (e) {
        if (!cancel) setErro(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, [cpf, nome]);

  const handlePrimeiroAcesso = async () => {
    if (!cpf || dashboard?.usuario?.primeiroAcesso) return;
    setMsgAcao("Gerando senha temporária...");
    setErro("");
    try {
      const resp = await fetch("http://localhost:3000/api/first-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setMsgAcao(`Senha temporária: ${data.senhaTemporaria}`);
        // Atualiza flag primeiroAcesso local
        setDashboard((old) => old ? { ...old, usuario: { ...old.usuario!, primeiroAcesso: true } } : old);
      } else {
        const msg = typeof data?.error === "string" ? data.error : JSON.stringify(data);
        setErro(msg);
        setMsgAcao("");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setMsgAcao("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-10 px-4 flex justify-center">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {cpf && <p className="text-xs text-zinc-500">CPF: {cpf}</p>}
            {nome && <p className="text-xs text-zinc-500">Nome: {nome}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/")}
              className="px-3 py-2 text-sm rounded bg-zinc-800 text-white hover:bg-zinc-700"
            >
              Início
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm rounded border border-red-500 text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>

        {loading && <div className="text-sm">Carregando dados...</div>}
        {erro && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-4">
            {typeof erro === "string" ? erro : JSON.stringify(erro)}
          </div>
        )}

        {!loading && dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Usuário */}
            <div className="rounded-xl border p-4">
              <div className="font-semibold mb-1">Usuário</div>
              {dashboard.usuario ? (
                <div className="text-sm space-y-1">
                  <div className="font-medium">{dashboard.usuario.nome}</div>
                  <div className="text-xs text-zinc-500">CPF: {dashboard.usuario.cpf}</div>
                  {dashboard.usuario.email && <div className="text-xs text-zinc-500">{dashboard.usuario.email}</div>}
                  {dashboard.usuario.telefone && <div className="text-xs text-zinc-500">{dashboard.usuario.telefone}</div>}
                  {dashboard.usuario.dataNascimento && <div className="text-xs text-zinc-500">Nasc.: {dashboard.usuario.dataNascimento}</div>}
                  <div className={`text-xs font-semibold ${dashboard.usuario.primeiroAcesso ? 'text-green-600' : 'text-orange-600'}`}>Primeiro Acesso: {dashboard.usuario.primeiroAcesso ? 'Concluído' : 'Pendente'}</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Não retornado</div>
              )}
            </div>
            {/* Assinaturas */}
            <div className="rounded-xl border p-4">
              <div className="font-semibold mb-1">Assinaturas</div>
              {dashboard.assinaturas && dashboard.assinaturas.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {dashboard.assinaturas.map(a => (
                    <li key={a.idAssinatura} className="text-xs">
                      <span className="font-medium">{a.plano || 'Plano'}</span> • {a.status || 'status'}
                      {a.dataInicio && <span className="text-zinc-500"> • início {a.dataInicio}</span>}
                    </li>
                  ))}
                </ul>
              ) : <div className="text-sm text-zinc-500">Nenhuma assinatura</div>}
            </div>
            {/* Beneficiários */}
            <div className="rounded-xl border p-4">
              <div className="font-semibold mb-1">Beneficiários</div>
              {dashboard.beneficiarios && dashboard.beneficiarios.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {dashboard.beneficiarios.map(b => (
                    <li key={b.cpf} className="text-xs">
                      <span className="font-medium">{b.nome || b.cpf}</span>{b.parentesco ? ` - ${b.parentesco}` : ''}
                      {b.dataNascimento && <span className="text-zinc-500"> • {b.dataNascimento}</span>}
                    </li>
                  ))}
                </ul>
              ) : <div className="text-sm text-zinc-500">Nenhum beneficiário</div>}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 rounded-xl border">
          <div className="font-semibold mb-2">Ações</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrimeiroAcesso}
              disabled={!cpf || (dashboard?.usuario?.primeiroAcesso ?? false)}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
            >
              {dashboard?.usuario?.primeiroAcesso ? 'Primeiro acesso concluído' : 'Gerar senha (primeiro acesso)'}
            </button>
            {msgAcao && <div className="text-xs text-blue-600">{msgAcao}</div>}
          </div>
          {!cpf && (
            <div className="text-xs text-zinc-500 mt-2">
              Informe um CPF via query (?cpf=) ou finalize uma assinatura para popular automaticamente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
