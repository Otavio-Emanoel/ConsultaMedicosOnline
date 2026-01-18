"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PlansCards from "@/components/landing/plans-cards";

export default function PlanosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-green-50 via-white to-green-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push("/verificar-cpf")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-emerald-700 transition mb-8"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Escolha seu Plano
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Selecione o plano ideal para você e sua família
          </p>
        </div>

        <section id="planos" className="pb-4">
          <PlansCards hideAvulso redirectToCadastro />
        </section>
      </div>
    </div>
  );
}
