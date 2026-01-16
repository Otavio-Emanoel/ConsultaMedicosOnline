"use client"

import { Heart, Sparkles, Activity, User, Flower2, Brain } from "lucide-react"

const especialidades = [
  { 
    nome: "Cardiologia",
    icon: Heart,
    gradient: "from-red-400 to-rose-500",
  },
  { 
    nome: "Dermatologia",
    icon: Sparkles,
    gradient: "from-pink-400 to-fuchsia-500",
  },
  { 
    nome: "Endocrinologia",
    icon: Activity,
    gradient: "from-teal-400 to-cyan-500",
  },
  { 
    nome: "Geriatria",
    icon: User,
    gradient: "from-amber-400 to-orange-500",
  },
  { 
    nome: "Ginecologia",
    icon: Flower2,
    gradient: "from-rose-400 to-pink-500",
  },
  { 
    nome: "Neurologia",
    icon: Brain,
    gradient: "from-violet-400 to-purple-500",
  },
]

export default function Especialidades() {
  return (
    <section id="especialidades" className="py-16 md:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-5 md:px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full mb-4">
            +10 Especialidades Disponíveis
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Encontre o{" "}
            <span className="text-emerald-600 relative">
              ESPECIALISTA ideal
              <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-emerald-600/60 via-emerald-600 to-emerald-600/60 rounded-full" />
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Conecte-se com médicos qualificados em diversas áreas da saúde
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 transition-all duration-500 ease-out">
          {especialidades.map((especialidade, index) => (
            <div
              key={index}
              className="group flex flex-col items-center bg-white rounded-2xl p-5 md:p-6 border border-gray-100 hover:border-emerald-300 hover:shadow-lg cursor-pointer hover:-translate-y-1 animate-fade-in transition-all duration-300"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: "backwards",
              }}
            >
              <div
                className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${especialidade.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                <especialidade.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base text-center transition-colors duration-200">
                {especialidade.nome}
              </h3>
            </div>
          ))}
        </div>

        {/* Ver mais button */}
        <div className="text-center mt-10">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors">
            Ver todas as especialidades
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
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