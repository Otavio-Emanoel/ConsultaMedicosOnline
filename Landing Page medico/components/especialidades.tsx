"use client"

import { useState, useRef, useEffect } from "react"

const especialidades = [
  { 
    nome: "Cardiologia", 
    imagem: "/cardiologistas.png",
    descricao: "Especializada em diagnóstico e tratamento de doenças do coração e sistema circulatório."
  },
  { 
    nome: "Dermatologia", 
    imagem: "/dermatologistas.png",
    descricao: "Cuidado especializado da pele, diagnóstico e tratamento de doenças dermatológicas."
  },
  { 
    nome: "Neurologia", 
    imagem: "/neurologista.png",
    descricao: "Especializada em diagnóstico e tratamento de doenças do sistema nervoso."
  },
  { 
    nome: "Nutrição", 
    imagem: "/nutricionista.png",
    descricao: "Orientação profissional em nutrição para melhora da saúde e qualidade de vida."
  },
  { 
    nome: "Psicologia", 
    imagem: "/psicologos.png",
    descricao: "Suporte emocional e psicológico para melhor bem-estar mental e qualidade de vida."
  },
  { 
    nome: "Pediatria", 
    imagem: "/pediatras.png",
    descricao: "Cuidado especializado da saúde de crianças desde o nascimento até a adolescência."
  },
  { 
    nome: "Ginecologia", 
    imagem: "/ginecologista.png",
    descricao: "Saúde reprodutiva e ginecológica da mulher com atendimento especializado."
  },
  { 
    nome: "Psiquiatria", 
    imagem: "/psiquiatras.png",
    descricao: "Diagnóstico e tratamento de transtornos mentais com abordagem clínica especializada."
  },
  { 
    nome: "Endocrinologia", 
    imagem: "/endocrinologistas.png",
    descricao: "Especializada em doenças do sistema endócrino e distúrbios metabólicos."
  },
  { 
    nome: "Urologia", 
    imagem: "/urologista.png",
    descricao: "Diagnóstico e tratamento de doenças do sistema urinário e reprodutor."
  },
]

export default function Especialidades() {
  const containerRef = useRef<HTMLDivElement>(null)
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [flipped, setFlipped] = useState<number | null>(null)

  return (
    <section id="especialidades" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-600">
            11+ especialidades <span className="text-emerald-600">ao seu alcance</span>
          </h2>
          <p className="mt-3 text-gray-600 text-lg">Conecte-se com especialistas qualificados em minutos, 24/7.</p>
        </div>

        <style>{`
          @keyframes especialidadesTrain {
            0% {
              transform: translateX(calc(-408px * 10));
            }
            100% {
              transform: translateX(0);
            }
          }

          .especialidades-carousel {
            animation: especialidadesTrain 120s linear infinite;
            animation-play-state: running;
            will-change: transform;
          }

          .especialidades-carousel:hover {
            animation-play-state: paused;
          }

          .card-flip {
            perspective: 1000px;
          }

          .card-flip-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s;
            transform-style: preserve-3d;
          }

          .card-flip-inner.flipped {
            transform: rotateY(180deg);
          }

          .card-flip-front, .card-flip-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }

          .card-flip-back {
            transform: rotateY(180deg);
          }

          .carousel-container {
            scrollbar-width: none;
            -ms-overflow-style: none;
            overflow: hidden;
          }

          .carousel-container::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="carousel-container overflow-hidden">
          <div
            ref={containerRef}
            className="especialidades-carousel flex gap-6 w-max pb-4"
            onMouseEnter={() => {
              if (containerRef.current) {
                containerRef.current.style.animationPlayState = "paused"
              }
            }}
            onMouseLeave={() => {
              if (containerRef.current) {
                containerRef.current.style.animationPlayState = "running"
              }
            }}
          >
            {Array.from({ length: 10 }).flatMap(() => especialidades).map((esp, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-96 h-80 card-flip"
                onMouseEnter={() => setFlipped(index)}
                onMouseLeave={() => setFlipped(null)}
              >
                <div className={`card-flip-inner ${flipped === index ? "flipped" : ""}`}>
                  {/* Frente - Imagem */}
                  <div className="card-flip-front rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
                    <div className="flex-1 flex items-center justify-center rounded-t-2xl overflow-hidden bg-emerald-50">
                      <img
                        src={esp.imagem}
                        alt={esp.nome}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4 text-center bg-white">
                      <span className="text-emerald-600 font-bold text-base">{esp.nome}</span>
                    </div>
                  </div>

                  {/* Verso - Descrição */}
                  <div className="card-flip-back rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 border border-gray-100 shadow-sm flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-white font-semibold text-sm leading-relaxed">
                      {esp.descricao}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="#planos"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 font-medium shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <i className="fas fa-heart" /> Ver planos recomendados
          </a>
        </div>
      </div>
    </section>
  )
}
