"use client"

import { Clock, Home, Car, Shield, Tag, Users } from "lucide-react"

const vantagens = [
  {
    icon: Clock,
    title: "24 horas por dia",
    description: "Consultas médicas especializadas a qualquer momento, 7 dias por semana.",
  },
  {
    icon: Home,
    title: "No conforto de casa",
    description: "Atendimento com especialistas onde você estiver.",
  },
  {
    icon: Car,
    title: "Sem deslocamentos",
    description: "Economize tempo e dinheiro sem precisar se deslocar.",
  },
  {
    icon: Shield,
    title: "Sem carência",
    description: "Use imediatamente após a contratação.",
  },
  {
    icon: Tag,
    title: "Preço acessível",
    description: "Planos que cabem no seu orçamento.",
  },
  {
    icon: Users,
    title: "Toda a família",
    description: "Cobertura para dependentes com histórico centralizado.",
  },
]

export default function Vantagens() {
  return (
    <section className="py-24 sm:py-28 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-emerald-600">Vantagens do atendimento online</h2>
          <p className="mt-3 text-gray-600 text-lg">Cuidado médico especializado no conforto da sua casa</p>
        </div>

        {/* Carrossel horizontal tipo "trem" */}
        <div className="relative w-full overflow-visible py-8">
          <style>{`
            @keyframes train {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-380px * 6 - 1.5rem * 6));
              }
            }

            @keyframes cardHover {
              0%, 100% {
                transform: translateY(0) scale(1) rotateX(0deg);
              }
              50% {
                transform: translateY(-15px) scale(1.05) rotateX(5deg);
              }
            }

            @keyframes iconBounce {
              0%, 100% {
                transform: translateY(0) rotate(0deg);
              }
              50% {
                transform: translateY(-10px) rotate(5deg);
              }
            }

            @keyframes gradientShine {
              0% {
                background-position: -1000px 0;
              }
              100% {
                background-position: 1000px 0;
              }
            }
            
            .train-container {
              display: flex;
              gap: 1.5rem;
              animation: train 45s linear infinite;
              width: max-content;
            }
            
            .train-container:hover {
              animation-play-state: paused;
            }
            
            .train-item {
              flex-shrink: 0;
              width: 100%;
              max-width: 380px;
              perspective: 1000px;
            }

            .train-item:hover {
              animation: cardHover 0.6s ease-in-out;
            }

            .train-item:hover .card-icon {
              animation: iconBounce 0.6s ease-in-out;
              color: #059669;
              transform: scale(1.2);
            }

            .train-item:hover .card-background {
              background: linear-gradient(
                90deg,
                transparent,
                rgba(16, 185, 129, 0.1),
                transparent
              );
              background-size: 1000px 100%;
              animation: gradientShine 0.6s ease-in-out;
            }

            .card-icon {
              transition: all 0.3s ease;
            }

            .card-background {
              transition: all 0.3s ease;
            }
          `}</style>
          
          <div className="train-container">
            {[...vantagens, ...vantagens, ...vantagens].map((vantagem, index) => {
              const Icon = vantagem.icon
              return (
                <div
                  key={index}
                  className="train-item rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-2xl hover:border-emerald-300 transition-all duration-300 cursor-pointer"
                >
                  <div className="card-background w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 card-icon">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg text-emerald-900 transition-colors duration-300">{vantagem.title}</h3>
                  <p className="mt-2 text-gray-600 transition-colors duration-300">{vantagem.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dica visual */}
        <div className="text-center mt-8">
          
        </div>
      </div>
    </section>
  )
}
