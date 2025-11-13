"use client"
import { useState } from "react"
import { Check, LinkIcon } from "lucide-react"
import Link from "next/link"

interface Plan {
  id: string
  category: string
  badge: string
  name: string
  subtitle?: string
  originalPrice: string
  price: string
  priceInfo: string
  fidelity: string
  features: Array<{
    icon: "check" | "link"
    text: string
    href?: string
  }>
  buttonText: string
  buttonHref: string
  isRecommended?: boolean
  isSpecial?: boolean
}

const plans: Plan[] = [
  {
    id: "individual",
    category: "individual",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Individual",
    originalPrice: "De R$ 69,90",
    price: "R$ 29,90",
    priceInfo: "/mês",
    fidelity: "Fidelidade mínima de 3 meses",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      {
        icon: "link",
        text: "Clique aqui e veja todas especialidades",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Quero esse!",
    buttonHref: "/verificar-cpf",
  },
  {
    id: "individual-plus",
    category: "individual",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Individual Plus",
    originalPrice: "De R$ 69,90",
    price: "R$ 39,90",
    priceInfo: "/mês",
    fidelity: "Fidelidade mínima de 3 meses",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      { icon: "check", text: "Consultas com Nutricionista" },
      { icon: "check", text: "Consultas com Psicólogo" },
      {
        icon: "link",
        text: "Clique aqui e veja todas especialidades",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Quero esse!",
    buttonHref: "/verificar-cpf",
  },
  {
    id: "casal",
    category: "casal",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Casal",
    subtitle: "para 2 pessoas",
    originalPrice: "De R$ 69,90",
    price: "R$ 39,90",
    priceInfo: "/mês — por casal",
    fidelity: "Fidelidade mínima de 3 meses",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      {
        icon: "link",
        text: "Clique aqui e veja todas especialidades",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Quero esse!",
    buttonHref: "/verificar-cpf",
  },
  {
    id: "casal-plus",
    category: "casal",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Casal Plus",
    subtitle: "para 2 pessoas",
    originalPrice: "De R$ 79,90",
    price: "R$ 49,90",
    priceInfo: "/mês — por casal",
    fidelity: "Fidelidade mínima de 3 meses",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      { icon: "check", text: "Consultas com Nutricionista" },
      { icon: "check", text: "Consultas com Psicólogo" },
      {
        icon: "link",
        text: "Clique aqui e veja todas especialidades",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Quero esse!",
    buttonHref: "/verificar-cpf",
    isRecommended: true,
  },
  {
    id: "familiar",
    category: "familiar",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Familiar",
    subtitle: "até 4 pessoas",
    originalPrice: "De R$ 89,90",
    price: "R$ 59,90",
    priceInfo: "/mês — até 4 pessoas",
    fidelity: "Fidelidade mínima de 3 meses",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      {
        icon: "link",
        text: "Clique aqui e veja todas Especialidades",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Quero esse!",
    buttonHref: "/verificar-cpf",
  },
  {
    id: "familiar-plus",
    category: "familiar",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Familiar Plus",
    subtitle: "até 4 pessoas",
    originalPrice: "De R$ 99,90",
    price: "R$ 69,90",
    priceInfo: "/mês — até 4 pessoas",
    fidelity: "Fidelidade mínima de 3 meses",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      { icon: "check", text: "Consultas com Nutricionista" },
      { icon: "check", text: "Consultas com Psicólogo" },
      {
        icon: "link",
        text: "Clique aqui e veja todas Especialidades para a Família",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Quero esse!",
    buttonHref: "/verificar-cpf",
  },
  {
    id: "empresarial",
    category: "empresarial",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Empresarial",
    subtitle: "mínimo de 6 funcionários",
    originalPrice: "",
    price: "",
    priceInfo: "",
    fidelity: "Fidelidade mínima de 3 meses por colaborador incluído",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      {
        icon: "link",
        text: "Clique aqui e veja todas Especialidades para seus Colaboradores",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Falar com vendas",
    buttonHref: "mailto:contato@medicosconsultasonline.com.br",
    isSpecial: true,
  },
  {
    id: "empresarial-plus",
    category: "empresarial",
    badge: "PLANO TRIMESTRAL · 3 MESES DE FIDELIDADE",
    name: "Empresarial Plus",
    subtitle: "mínimo de 6 funcionários",
    originalPrice: "",
    price: "",
    priceInfo: "",
    fidelity: "Fidelidade mínima de 3 meses por colaborador incluído",
    features: [
      {
        icon: "check",
        text: "Atendimentos ilimitados com médicos especializados e Clínico Geral",
      },
      { icon: "check", text: "Sem carência" },
      { icon: "check", text: "Consultas com Nutricionista" },
      { icon: "check", text: "Consultas com Psicólogo" },
      {
        icon: "link",
        text: "Clique aqui e veja todas Especialidades para seus Colaboradores",
        href: "/index#especialidades",
      },
    ],
    buttonText: "Falar com vendas",
    buttonHref: "mailto:contato@medicosconsultasonline.com.br",
    isSpecial: true,
  },
]

interface PlansCardsProps {
  filter?: string
}

export default function PlansCards({ filter: initialFilter = "individual" }: PlansCardsProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialFilter)
  const visiblePlans = selectedCategory === "all" ? plans : plans.filter((p) => p.category === selectedCategory)

  return (
    <section className="pb-16">
      {/* Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {[
          { id: "individual", label: "Individual" },
          { id: "casal", label: "Casal" },
          { id: "familiar", label: "Familiar" },
          { id: "empresarial", label: "Empresarial" }
        ].map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
              selectedCategory === category.id
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-2xl bg-white p-7 transition-transform duration-300 hover:shadow-lg ${
              plan.isRecommended ? "border-2 border-emerald-600 relative" : "border border-slate-200"
            } ${plan.isRecommended || plan.isSpecial ? "hover:scale-105" : "hover:-translate-y-1"}`}
          >
            {/* Recommended Badge */}
            {plan.isRecommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] px-3 py-1 rounded-full font-semibold">
                Recomendado
              </div>
            )}

            {/* Badge */}
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
              {plan.badge}
            </div>

            {/* Name */}
            <h3 className="mt-2 font-semibold text-xl text-slate-900">{plan.name}</h3>
            {plan.subtitle && <p className="text-slate-500 text-sm">{plan.subtitle}</p>}

            {/* Features */}
            <ul className="mt-4 space-y-2 text-slate-700 text-sm">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex gap-2">
                  {feature.icon === "check" ? (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <LinkIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                  {feature.href ? (
                    <a href={feature.href} className="underline hover:no-underline">
                      {feature.text}
                    </a>
                  ) : (
                    feature.text
                  )}
                </li>
              ))}
            </ul>

            {/* Price Section */}
            {!plan.isSpecial && (
              <div className="mt-5">
                <div className="text-xs line-through text-slate-400">{plan.originalPrice}</div>
                <div className="text-4xl font-extrabold text-slate-900">{plan.price}</div>
                <div className="text-slate-500 text-sm">{plan.priceInfo}</div>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{plan.fidelity}</p>
              </div>
            )}

            {/* Special Plan Message */}
            {plan.isSpecial && <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">{plan.fidelity}</p>}

            {/* Button */}
            <Link
              href={plan.buttonHref}
              className={`mt-7 inline-flex justify-center w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                plan.isSpecial
                  ? "border border-slate-300 text-slate-800 hover:bg-slate-50"
                  : "bg-emerald-600 text-white shadow-soft hover:bg-emerald-700 hover:-translate-y-0.5"
              }`}
            >
              {plan.buttonText}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
