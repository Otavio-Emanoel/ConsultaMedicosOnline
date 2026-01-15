"use client"

import { Clock, Home, Car, Shield, Tag, Users } from "lucide-react"
import { useEffect, useState } from "react"

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
  const [visibleCards, setVisibleCards] = useState<boolean[]>([])

  useEffect(() => {
    setVisibleCards(vantagens.map(() => false))
    setTimeout(() => {
      setVisibleCards(vantagens.map(() => true))
    }, 100)
  }, [])

  return (
    <section className="relative py-12 sm:py-16 lg:py-24 bg-white overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-20 right-0 w-40 h-40 sm:w-72 sm:h-72 bg-emerald-100/8 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-64 sm:h-64 bg-emerald-100/8 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 lg:mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-600">Vantagens do atendimento online</h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base lg:text-lg text-gray-600">Cuidado médico especializado no conforto da sua casa</p>
        </div>

        {/* Grid responsivo para mobile, carrossel para desktop */}
        <div className="hidden lg:block">
          {/* Carrossel horizontal tipo "trem" - Desktop */}
          <div className="relative w-full overflow-hidden py-6 sm:py-8">
            <style>{`
              @keyframes train {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(calc(-360px * 6 - 1.5rem * 6));
                }
              }

              @keyframes cardHover {
                0%, 100% {
                  transform: translateY(0) scale(1);
                }
                50% {
                  transform: translateY(-12px) scale(1.02);
                }
              }

              @keyframes iconBounce {
                0%, 100% {
                  transform: translateY(0) rotate(0deg);
                }
                50% {
                  transform: translateY(-8px) rotate(5deg);
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
                animation: train 50s linear infinite;
                width: max-content;
              }
              
              .train-container:hover {
                animation-play-state: paused;
              }
              
              .train-item {
                flex-shrink: 0;
                width: 100%;
                max-width: 360px;
              }

              .train-item:hover {
                animation: cardHover 0.6s ease-in-out;
              }

              .train-item:hover .card-icon {
                animation: iconBounce 0.6s ease-in-out;
              }

              .train-item:hover .card-bg {
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
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              }

              .card-bg {
                transition: all 0.3s ease;
              }
            `}</style>
            
            <div className="train-container">
              {[...vantagens, ...vantagens, ...vantagens].map((vantagem, index) => {
                const Icon = vantagem.icon
                return (
                  <div
                    key={index}
                    className="train-item rounded-2xl bg-white border border-gray-100 p-5 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all duration-300 cursor-pointer"
                  >
                    <div className="card-bg card-icon w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="mt-4 font-semibold text-base text-emerald-900">{vantagem.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{vantagem.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Grid para mobile e tablet */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {vantagens.map((vantagem, index) => {
            const Icon = vantagem.icon
            return (
              <div
                key={index}
                className={`rounded-xl sm:rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-500 cursor-pointer transform ${
                  visibleCards[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                } hover:scale-105 hover:-translate-y-1`}
                style={{
                  transitionDelay: `${index * 75}ms`
                }}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="mt-3 font-semibold text-sm sm:text-base text-emerald-900">{vantagem.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">{vantagem.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
