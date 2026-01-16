"use client"

import { Smartphone, Clock, Heart } from "lucide-react"

export default function Hero() {
  const handleViewPlans = () => {
    const plansElement = document.getElementById("planos")
    if (plansElement) {
      plansElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section id="inicio" className="bg-white">
      {/* Mobile Version */}
      <div className="lg:hidden">
        {/* Image Section */}
        <div className="relative h-60 overflow-hidden">
          <img
            src="/hero-telemedicine-BGzOtNai.png"
            alt="Consulta médica online - telemedicina"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        {/* Content Section */}
        <div className="px-6 py-8 -mt-8 relative">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">
            Consultas médicas{" "}
            <span className="text-emerald-600">onde você estiver</span>
          </h1>
          
          <p className="text-gray-600 text-base mb-8 leading-relaxed">
            Fale com médicos de verdade pelo celular. Simples, rápido e sem sair de casa.
          </p>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-gray-700 text-sm">
                Atendimento direto pelo celular ou computador
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-gray-700 text-sm">
                Disponível 24 horas, todos os dias
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-gray-700 text-sm">
                Mais de 11 especialidades médicas
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <button
            onClick={handleViewPlans}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-3 text-base font-medium transition-colors"
          >
            Conhecer os planos
          </button>

          <a
            href="#como-funciona"
            className="block w-full text-center text-emerald-600 text-sm mt-4 py-2"
          >
            Como funciona?
          </a>
        </div>
      </div>

      {/* Desktop Version */}
      <div className="hidden lg:block py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="bg-white overflow-hidden shadow-xl rounded-2xl border border-gray-100">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Content */}
              <div className="p-12 flex flex-col justify-center">
                <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight mb-4">
                  Tenha atendimento médico online{" "}
                  <span className="text-emerald-600">agora!</span>
                </h1>

                <p className="text-gray-600 text-lg mb-6">
                  Acesso ilimitado a mais de 11 especialidades médicas, sem carência e sem burocracia. 
                  Consultas 24 horas por dia, 7 dias por semana, no conforto da sua casa.
                </p>

                {/* Price Highlight */}
                <div className="bg-gray-100 rounded-xl p-4 mb-6 inline-block">
                  <p className="text-sm text-gray-600 mb-1">Planos a partir de</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    R$ 29,90
                    <span className="text-lg font-normal text-gray-600">/mês</span>
                  </p>
                </div>

                <p className="text-gray-900 font-medium text-lg mb-8">
                  🩺 Cuidar da sua saúde nunca foi tão fácil
                </p>

                {/* CTA Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleViewPlans}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-3 text-base font-medium transition-colors"
                  >
                    Ver planos
                  </button>
                  <a
                    href="#como-funciona"
                    className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-full px-8 py-3 text-base font-medium transition-colors"
                  >
                    Entender como funciona
                  </a>
                </div>
              </div>

              {/* Image */}
              <div className="relative min-h-[500px]">
                <img
                  src="/hero-telemedicine-BGzOtNai.png"
                  alt="Consulta médica online - telemedicina"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
