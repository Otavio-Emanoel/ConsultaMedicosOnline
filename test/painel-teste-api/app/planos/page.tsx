"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plano = {
  id: string;
  tipo: string;
  periodicidade: string;
  descricao: string;
  especialidades: string[];
  preco: number;
  criadoEm?: string;
};

export default function PlanosCadastroPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:3000/api/planos")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar planos");
        return res.json();
      })
      .then((data) => setPlanos(data))
      .catch(() => setErro("Não foi possível carregar os planos."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center py-16 px-4">
      <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-zinc-50">Escolha seu Plano</h1>
      <h2 className="text-xl font-semibold mb-6 text-zinc-700 dark:text-zinc-200">Selecione um plano para continuar o cadastro</h2>
      {loading ? (
        <p className="text-zinc-500">Carregando planos...</p>
      ) : erro ? (
        <p className="text-red-500">{erro}</p>
      ) : (
        <div className="flex flex-wrap gap-8 justify-center">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6 w-full max-w-xs flex flex-col items-center border border-zinc-200 dark:border-zinc-800"
            >
              <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-zinc-50">{plano.tipo}</h3>
              <span className="text-sm text-zinc-500 mb-1">{plano.periodicidade}</span>
              <p className="text-zinc-700 dark:text-zinc-200 text-center mb-2 text-sm">{plano.descricao}</p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-300 mb-3 list-disc list-inside">
                {plano.especialidades.map((esp) => (
                  <li key={esp}>{esp}</li>
                ))}
              </ul>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                R$ {plano.preco.toFixed(2)}
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full transition-colors"
                onClick={() => router.push(`/cadastro/${plano.id}`)}
              >
                Assinar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
