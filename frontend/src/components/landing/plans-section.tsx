"use client"

import { useState } from "react"

const plans = {
  individual: [
    {
      name: "Individual Start",
      price: "29,90",
      features: ["Consultas ilimitadas", "11 especialidades", "Sem carência", "Acesso 24/7"],
    },
    {
      name: "Individual Plus",
      price: "49,90",
      features: ["Consultas ilimitadas", "11 especialidades", "Sem carência", "Acesso 24/7", "Suporte prioritário"],
      isRecommended: true,
    },
    {
      name: "Individual Premium",
      price: "69,90",
      features: [
        "Consultas ilimitadas",
        "11 especialidades",
        "Sem carência",
        "Acesso 24/7",
        "Suporte prioritário",
        "Descontos em medicamentos",
      ],
    },
  ],
  casal: [
    {
      name: "Casal Start",
      price: "49,90",
      features: ["2 usuários", "Consultas ilimitadas", "11 especialidades", "Sem carência"],
    },
    {
      name: "Casal Plus",
      price: "79,90",
      features: ["2 usuários", "Consultas ilimitadas", "11 especialidades", "Sem carência", "Suporte prioritário"],
      isRecommended: true,
    },
    {
      name: "Casal Premium",
      price: "109,90",
      features: [
        "2 usuários",
        "Consultas ilimitadas",
        "11 especialidades",
        "Sem carência",
        "Suporte prioritário",
        "Descontos em medicamentos",
      ],
    },
  ],
  familiar: [
    {
      name: "Familiar Start",
      price: "79,90",
      features: ["Até 4 usuários", "Consultas ilimitadas", "11 especialidades", "Sem carência"],
    },
    {
      name: "Familiar Plus",
      price: "129,90",
      features: ["Até 4 usuários", "Consultas ilimitadas", "11 especialidades", "Sem carência", "Suporte prioritário"],
      isRecommended: true,
    },
    {
      name: "Familiar Premium",
      price: "179,90",
      features: [
        "Até 4 usuários",
        "Consultas ilimitadas",
        "11 especialidades",
        "Sem carência",
        "Suporte prioritário",
        "Descontos em medicamentos",
      ],
    },
  ],
  empresarial: [
    {
      name: "Empresarial Start",
      price: "Por consultar",
      features: ["Múltiplos usuários", "Consultas ilimitadas", "11 especialidades", "Sem carência"],
    },
    {
      name: "Empresarial Plus",
      price: "Por consultar",
      features: [
        "Múltiplos usuários",
        "Consultas ilimitadas",
        "11 especialidades",
        "Sem carência",
        "Suporte prioritário",
      ],
      isRecommended: true,
    },
    {
      name: "Empresarial Premium",
      price: "Por consultar",
      features: [
        "Múltiplos usuários",
        "Consultas ilimitadas",
        "11 especialidades",
        "Sem carência",
        "Suporte prioritário",
        "Gestor dedicado",
      ],
    },
  ],
}

export default function PlansSection() {
  const [selectedCategory, setSelectedCategory] = useState("individual")

  const currentPlans = plans[selectedCategory as keyof typeof plans]

  return (
    <section id="planos" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-600 mb-4">Nossos Planos</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Escolha o plano ideal para você e sua família</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {["individual", "casal", "familiar", "empresarial"].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full font-semibold transition ${
                selectedCategory === category
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {currentPlans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-lg border-2 p-6 transition ${
                plan.isRecommended
                  ? "border-emerald-500 bg-emerald-50 shadow-lg transform md:scale-105"
                  : "border-gray-200 bg-white hover:border-emerald-300"
              }`}
            >
              {plan.isRecommended && (
                <div className="mb-4 inline-block bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Recomendado
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-emerald-600">R${plan.price}</span>
                <span className="text-gray-600 ml-2">/mês</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-center text-gray-700">
                    <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center mr-3 text-xs flex-shrink-0">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  plan.isRecommended
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border border-emerald-500 text-emerald-500 hover:bg-emerald-50"
                }`}
              >
                Escolher plano
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
