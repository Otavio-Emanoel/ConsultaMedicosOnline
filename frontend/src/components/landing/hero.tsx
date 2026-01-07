"use client"

export default function Hero() {
  const handleViewPlans = () => {
    const plansElement = document.getElementById("planos")
    if (plansElement) {
      plansElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section
      id="inicio"
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40"
    >
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-emerald-100/70 bg-white/90 shadow-lg p-8 sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            {/* Text */}
            <div className="text-center lg:text-left order-last lg:order-first">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-emerald-600">
                Tenha atendimento médico online agora!
              </h1>
              <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Cadastrar-se e tenha acesso a mais de 11 especialidades médicas, 
                sem carência, ilimitado — tudo sem sair de casa..
                <br />
                Planos a partir de
                <span className="font-bold"> R$29,90!</span>
                <br />
                Cuidar da sua saúde nunca foi tão fácil.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row sm:justify-start items-center lg:items-start justify-center gap-4">
                <button
                  onClick={handleViewPlans}
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-4 font-semibold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Ver planos
                </button>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-8 py-4 font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  Entender como funciona
                </a>
              </div>
            </div>

            {/* Illustration */}
            <div className="order-first lg:order-none">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100/30 to-emerald-50/20 p-2 sm:p-4">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl -top-32 -right-36" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl -bottom-36 -left-32" />
                <div className="relative z-10 overflow-hidden rounded-xl">
                    <img
                      src="/friendly-black-doctor.jpg"
                      alt="Ilustração atendimento médico online"
                      className="w-full sm:w-[560px] lg:w-[840px] h-56 sm:h-72 lg:h-[480px] mx-auto object-cover rounded-xl"
                    />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
