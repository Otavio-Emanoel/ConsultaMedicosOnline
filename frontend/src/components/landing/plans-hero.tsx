"use client"

import { useState } from "react"

interface FilterChip {
  id: string
  label: string
  filter: string
}

const chips: FilterChip[] = [
  { id: "all", label: "Todos os planos", filter: "all" },
  { id: "individual", label: "Individual", filter: "individual" },
  { id: "casal", label: "Casal", filter: "casal" },
  { id: "familiar", label: "Familiar", filter: "familiar" },
  { id: "empresarial", label: "Empresarial", filter: "empresarial" },
]

interface PlansHeroProps {
  onFilterChange?: (filter: string) => void
}

export default function PlansHero({ onFilterChange }: PlansHeroProps) {
  const [activeFilter, setActiveFilter] = useState("all")

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter)
    onFilterChange?.(filter)
  }

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-600">Escolha o plano ideal</h1>
          <p className="mt-3 text-slate-600">
            Plano trimestral • Pagamento via Cartão, Boleto ou PIX
            <br />
            <span className="text-xs">
              * Valores promocionais válidos até o vencimento. Após vencimento, volta ao valor sem desconto.
            </span>
          </p>

          {/* Filter Chips */}
          <div className="mt-6 inline-flex flex-wrap gap-2 justify-center">
            {chips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleFilterClick(chip.filter)}
                className={`px-4 py-2 rounded-full border text-sm transition-all duration-200 ${
                  activeFilter === chip.filter
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-slate-200 bg-white text-slate-800 hover:border-emerald-600"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
