"use client"

import { UserPlus, Monitor, CalendarCheck, HeartPulse } from "lucide-react"

const steps = [
  {
    icon: UserPlus,
    title: "Cadastro seguro",
    description: "Preencha os dados essenciais, aceite os termos e escolha o plano ideal para você.",
  },
  {
    icon: Monitor,
    title: "Nossa Plataforma",
    description: "Depois de escolher seu plano, é só fazer login na nossa plataforma. Lá, você terá acesso a clínico geral, agendamentos e a tudo o que a telemedicina tem de melhor.",
  },
  {
    icon: CalendarCheck,
    title: "Agendamento",
    description: "Para agendar consultas (exceto Psicologia e Nutrição), é necessário ter um encaminhamento. Para obtê-lo, você precisa passar primeiro pelo clínico geral.",
  },
  {
    icon: HeartPulse,
    title: "Acompanhamento contínuo",
    description: "Histórico sempre acessível e revisões programadas para cuidar de você.",
  },
]

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-5 md:px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Como <span className="text-emerald-500">Funciona?</span>
          </h2>
          <div className="w-20 h-1 bg-emerald-500 mx-auto rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-6 mb-12 last:mb-0 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
            >
              {/* Icon Circle */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <step.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Passo {index + 1}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-xl md:text-2xl mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-2xl">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </section>
  )
}
