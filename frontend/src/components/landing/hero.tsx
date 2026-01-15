"use client"

import { useEffect, useState } from "react"

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleViewPlans = () => {
    const plansElement = document.getElementById("planos")
    if (plansElement) {
      plansElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section
      id="inicio"
      className="relative py-8 sm:py-16 lg:py-24 bg-white overflow-hidden"
    >
      {/* Animated background blobs */}
      <div className="absolute top-10 -left-20 w-40 h-40 sm:w-72 sm:h-72 bg-emerald-200/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-40 h-40 sm:w-80 sm:h-80 bg-emerald-100/8 rounded-full blur-3xl animate-pulse" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        <div className={`rounded-2xl sm:rounded-3xl border border-emerald-100/70 bg-white/90 shadow-lg p-6 sm:p-8 lg:p-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 items-center">
            {/* Text */}
            <div className={`text-center lg:text-left order-last lg:order-first transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-emerald-600 leading-tight">
                Tenha atendimento médico online agora!
              </h1>
              <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Cadastre-se e tenha acesso a mais de 11 especialidades médicas, 
                sem carência, ilimitado — tudo sem sair de casa.
                <br />
                <span className="block mt-2">Planos a partir de <span className="font-bold text-emerald-700">R$29,90!</span></span>
                <span className="block mt-2 text-emerald-600">Cuidar da sua saúde nunca foi tão fácil.</span>
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:justify-start items-center lg:items-start justify-center gap-3 sm:gap-4">
                <button
                  onClick={handleViewPlans}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 font-semibold shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-95"
                >
                  Ver planos
                </button>
                <a
                  href="#como-funciona"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border-2 border-emerald-200 bg-white px-6 sm:px-8 py-3 sm:py-4 font-semibold text-emerald-700 hover:bg-emerald-50 transition-all duration-300 hover:border-emerald-400"
                >
                  Como funciona?
                </a>
              </div>
            </div>

            {/* Illustration */}
            <div className={`order-first lg:order-none transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}>
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-100/30 to-emerald-50/20 p-3 sm:p-4">
                <div className="absolute top-0 right-0 w-40 h-40 sm:w-72 sm:h-72 bg-emerald-200/20 rounded-full blur-3xl -top-20 sm:-top-32 -right-20 sm:-right-36 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-40 h-40 sm:w-80 sm:h-80 bg-emerald-200/20 rounded-full blur-3xl -bottom-20 sm:-bottom-36 -left-20 sm:-left-32 animate-pulse" />
                <div className="relative z-10 overflow-hidden rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
                    <img
                      src="/friendly-black-doctor.jpg"
                      alt="Ilustração atendimento médico online"
                      className="w-full h-48 sm:h-64 lg:h-96 object-cover rounded-xl sm:rounded-2xl animate-in fade-in zoom-in-50 duration-1000"
                    />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
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
