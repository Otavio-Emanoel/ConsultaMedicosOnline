"use client"

import { useState } from "react"

const especialidades = [
  "Cardiologia",
  "Dermatologia",
  "Neurologia",
  "Nutrição",
  "Psicologia",
  "Pediatria",
  "Ortopedia",
  "Ginecologia",
  "Psiquiatria",
  "Endocrinologia",
  "Oftalmologia",
  "Urologia",
]

export default function Especialidades() {
  const handlePlansClick = () => {
    const plansElement = document.getElementById("planos")
    if (plansElement) {
      plansElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section id="especialidades" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            11+ especialidades <span className="text-emerald-600">ao seu alcance</span>
          </h2>
          <p className="mt-3 text-gray-600 text-lg">Conecte-se com especialistas qualificados em minutos, 24/7.</p>
        </div>

        <div className="mt-12 grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {especialidades.map((esp, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm text-center font-medium hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              {esp}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={handlePlansClick}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 font-medium shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <i className="fas fa-heart" /> Ver planos recomendados
          </button>
        </div>
      </div>
    </section>
  )
}
