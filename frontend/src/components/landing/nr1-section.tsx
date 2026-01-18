"use client"

import { ShieldCheck, ClipboardCheck, Users, Lock } from "lucide-react"

export default function NR1Section() {
  const handleScrollToPlanos = () => {
    const planosSection = document.getElementById("planos")
    if (planosSection) {
      planosSection.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <section id="nr1" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-5 md:px-4">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="w-4 h-4" />
            Conformidade Trabalhista
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-4 mb-3">
            NR-1 <span className="text-emerald-600">(Solução Psicossocial do PGR)</span>
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-base md:text-lg">
            A NR-1 é obrigatória para empresas com CLT e exige que o PGR seja executado, com evidências — inclusive na parte de riscos psicossociais. Nós atuamos como a solução prática dessa etapa.
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 md:p-10 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <ClipboardCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-gray-900 font-semibold text-sm md:text-base">Execução contínua das ações psicossociais do PGR</p>
                <p className="text-gray-600 text-sm mt-1">Transformamos o plano em execução com acesso real dos colaboradores.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <ClipboardCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-gray-900 font-semibold text-sm md:text-base">Evidências gerenciais prontas para auditoria</p>
                <p className="text-gray-600 text-sm mt-1">Dados agregados e rastreáveis para inspeções e compliance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <Users className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-gray-900 font-semibold text-sm md:text-base">Implantação simples e suporte ao RH/SST</p>
                <p className="text-gray-600 text-sm mt-1">Onboarding rápido, comunicação e acompanhamento contínuo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <Lock className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-gray-900 font-semibold text-sm md:text-base">Conformidade com sigilo médico e LGPD</p>
                <p className="text-gray-600 text-sm mt-1">Segurança e privacidade em todos os fluxos de cuidado.</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={handleScrollToPlanos}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 transition"
            >
              Falar com um especialista
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
