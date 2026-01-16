"use client"

import { Clock, Home, Car, Zap, Wallet, Users } from "lucide-react"

const vantagens = [
  {
    icon: Clock,
    title: "24 horas por dia",
    description: "Consultas médicas especializadas a qualquer momento, 7 dias por semana.",
  },
  {
    icon: Home,
    title: "No conforto de casa",
    description: "Atendimento com especialistas onde você estiver, sem sair de casa.",
  },
  {
    icon: Car,
    title: "Sem deslocamentos",
    description: "Economize tempo e dinheiro sem precisar se deslocar até uma clínica.",
  },
  {
    icon: Zap,
    title: "Sem carência",
    description: "Use imediatamente após a contratação, sem esperar.",
  },
  {
    icon: Wallet,
    title: "Preço acessível",
    description: "Planos que cabem no seu orçamento com excelente custo-benefício.",
  },
  {
    icon: Users,
    title: "Toda a família",
    description: "Cobertura para dependentes com histórico médico centralizado.",
  },
]

export default function Vantagens() {
  return (
    <section className="py-10 md:py-16 bg-gray-50">
      <div className="container mx-auto px-5 md:px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Vantagens da <span className="text-emerald-600">Telemedicina</span>
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Cuidado médico especializado no conforto da sua casa
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vantagens.map((vantagem, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              style={{
                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
              }}
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <vantagem.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {vantagem.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {vantagem.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  )
}

