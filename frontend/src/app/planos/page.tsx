"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

type Plano = {
  id: string;
  tipo: string;
  periodicidade: string;
  descricao: string;
  especialidades: string[];
  preco: number;
};

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const router = useRouter();

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    fetch(`${API_BASE}/planos`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar planos");
        return res.json();
      })
      .then((data) => setPlanos(data))
      .catch(() => setErro("Não foi possível carregar os planos."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push("/verificar-cpf")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="text-center mb-12">
          <img
            src="/logo.png"
            alt="Médicos Consultas Online"
            className="h-16 w-auto mx-auto mb-6 object-contain"
          />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Selecione o plano ideal para você
          </p>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando planos...</p>
          </div>
        ) : erro ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-800 dark:text-red-200">{erro}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col min-w-0 w-full max-w-full border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex-1">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
                    {plano.periodicidade}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plano.tipo}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 break-words">
                    {plano.descricao}
                  </p>

                  {plano.especialidades && plano.especialidades.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Especialidades incluídas:
                      </p>
                      <ul className="space-y-1 break-words">
                        {plano.especialidades.slice(0, 5).map((esp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{esp}</span>
                          </li>
                        ))}
                        {plano.especialidades.length > 5 && (
                          <li className="text-xs text-primary font-medium">
                            +{plano.especialidades.length - 5} especialidades
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex flex-col xs:flex-row items-center xs:items-baseline justify-center gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      R$ {plano.preco.toFixed(2)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-0 xs:ml-2">/mês</span>
                  </div>
                  <button
                    className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all mt-2 xs:mt-0"
                    onClick={() => router.push(`/cadastro/${plano.id}`)}
                  >
                    Quero esse!
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
