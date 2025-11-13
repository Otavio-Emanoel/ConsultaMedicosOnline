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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-100/70 bg-white/90 shadow-lg p-8 sm:p-12 lg:p-16">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            {/* Text */}
            <div className="text-center lg:text-left order-last lg:order-first">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-600">
                Tenha atendimento médico online agora!
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0">
                Basta cadastrar-se e tenha acesso a mais de 11 especialidades médicas
                <br />
                sem carência, ilimitado e sem custos com deslocamentos.
                <br />
                Planos a partir de R$29,90!
                <br />
                Invista na sua saúde e da sua família!
              </p>
              <div className="mt-6 flex flex-col sm:flex-row sm:justify-start items-center lg:items-start justify-center gap-3">
                <button
                  onClick={handleViewPlans}
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Ver planos
                </button>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  Entender como funciona
                </a>
              </div>
            </div>

            {/* Illustration */}
            <div className="order-first lg:order-none">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100/30 to-emerald-50/20 p-1 sm:p-2">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl -top-20 -right-20" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-200/20 rounded-full blur-3xl -bottom-24 -left-20" />
                <div className="relative z-10 overflow-hidden rounded-xl">
                  <img
                    src="/friendly-black-doctor.jpg"
                    alt="Ilustração atendimento médico online"
                    className="w-full h-auto mx-auto object-cover max-h-screen"
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
