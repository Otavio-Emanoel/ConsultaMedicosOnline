"use client"
import { useEffect, useState } from "react"
import { Check, LinkIcon } from "lucide-react"
import Link from "next/link"

interface Plan {
  id: string
  tipo: string // INDIVIDUAL, FAMILIAR, PSICOLOGIA, AVULSO
  badge: string
  name: string
  subtitle?: string
  originalPrice?: string
  price: string
  priceInfo?: string
  fidelity?: string
  maxBeneficiaries?: number
  especialidades?: string[]
  features: Array<{
    icon: "check" | "link"
    text: string
    href?: string
  }>
  buttonText: string
  buttonHref: string
  isRecommended?: boolean
  isSpecial?: boolean
  whatsappNumber?: string // Para planos avulsos
}

function usePlanosLanding() {
  const [planos, setPlanos] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const fetchPlanos = async () => {
      setLoading(true);
      setErro("");
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        const res = await fetch(`${API_BASE}/planos`, {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (!res.ok) throw new Error('Erro ao buscar planos');
        const data = await res.json();
        setPlanos(Array.isArray(data) ? data.map((p: any) => {
          // Extrair tipo de filtro (INDIVIDUAL, FAMILIAR, PSICOLOGIA, AVULSO)
          let tipoFiltro = "INDIVIDUAL";
          if (p.tipo) {
            const tipoUpper = String(p.tipo).toUpperCase();
            // Se o tipo é um dos padrões, usa direto
            if (['INDIVIDUAL', 'FAMILIAR', 'PSICOLOGIA', 'AVULSO'].includes(tipoUpper)) {
              tipoFiltro = tipoUpper;
            } else {
              // Caso contrário, tenta fazer uma busca inteligente no nome descritivo
              const nomeDesc = String(p.tipo).toLowerCase();
              if (nomeDesc.includes('familiar') || nomeDesc.includes('família') || nomeDesc.includes('premium')) tipoFiltro = 'FAMILIAR';
              else if (nomeDesc.includes('psicolog')) tipoFiltro = 'PSICOLOGIA';
              else if (nomeDesc.includes('avulso') || nomeDesc.includes('consulta avulsa')) tipoFiltro = 'AVULSO';
              else tipoFiltro = 'INDIVIDUAL';
            }
          }
          
          const isAvulso = tipoFiltro === "AVULSO" || p.isSpecial;
          return {
            id: p.id,
            tipo: tipoFiltro,
            badge: p.periodicidade ? `PLANO ${p.periodicidade.toUpperCase()}` : "PLANO DISPONÍVEL",
            name: p.nome || p.name || String(p.tipo) || p.internalPlanKey || p.id,
            subtitle: p.maxBeneficiaries && !isAvulso ? `até ${p.maxBeneficiaries} pessoas` : undefined,
            originalPrice: p.precoOriginal ? `De R$ ${Number(p.precoOriginal).toFixed(2).replace('.', ',')}` : undefined,
            price: isAvulso ? "Por agendamento" : (p.preco ? `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}` : ""),
            priceInfo: p.periodicidade && !isAvulso ? `/mês` : "",
            fidelity: isAvulso ? "Agende pelo WhatsApp" : (p.periodicidade ? `Fidelidade mínima de ${p.periodicidade.toLowerCase()}` : undefined),
            maxBeneficiaries: p.maxBeneficiaries || 1,
            especialidades: p.especialidades || [],
            features: isAvulso
              ? [
                  { icon: "check", text: "Consultas sob demanda" },
                  { icon: "check", text: "Atendimento rápido" },
                  { icon: "check", text: "Agende via WhatsApp" },
                ]
              : [
                  { icon: "check", text: "Atendimentos ilimitados com médicos especializados e Clínico Geral" },
                  { icon: "check", text: "Sem carência" },
                  ...(Array.isArray(p.especialidades) ? p.especialidades.filter((e: string) => e && e.toLowerCase().includes("nutri")).map((e: string) => ({ icon: "check" as const, text: `Consultas com ${e}` })) : []),
                ],
            buttonText: isAvulso ? "Agendar no WhatsApp" : "Quero esse!",
            buttonHref: isAvulso ? "#" : "/verificar-cpf",
            isRecommended: p.isRecommended || false,
            isSpecial: p.isSpecial || false,
            whatsappNumber: p.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
          };
        }) : []);
      } catch (e) {
        setErro("Erro ao carregar planos.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlanos();
  }, []);
  return { planos, loading, erro };
}

export default function PlansCards() {
  const [activeTab, setActiveTab] = useState<string>("individual")
  const [visibleCards, setVisibleCards] = useState<boolean[]>([])
  const { planos, loading, erro } = usePlanosLanding()

  const filterPlans = (plans: Plan[]): Plan[] => {
    switch (activeTab) {
      case "individual":
        return plans.filter(p => p.tipo === "INDIVIDUAL")
      case "familiar":
        return plans.filter(p => p.tipo === "FAMILIAR")
      case "psicologia":
        return plans.filter(p => p.tipo === "PSICOLOGIA")
      case "avulso":
        return plans.filter(p => p.tipo === "AVULSO")
      default:
        return plans
    }
  }

  const filteredPlanos = filterPlans(planos)

  useEffect(() => {
    if (filteredPlanos.length > 0) {
      setVisibleCards(filteredPlanos.map(() => false))
      setTimeout(() => {
        setVisibleCards(filteredPlanos.map(() => true))
      }, 100)
    }
  }, [filteredPlanos.length, activeTab])

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-4 bg-gray-100 p-1.5 rounded-full">
          {[
            { id: "individual", label: "Individual" },
            { id: "familiar", label: "Familiar" },
            { id: "psicologia", label: "Psicologia" },
            { id: "avulso", label: "Avulso" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-sm md:text-base font-semibold rounded-full transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="mt-2">Carregando planos...</p>
          </div>
        ) : erro ? (
          <div className="col-span-full text-center text-red-500 py-8">{erro}</div>
        ) : filteredPlanos.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            <p className="text-lg font-medium mb-2">Nenhum plano disponível nesta categoria</p>
            <p className="text-sm">Tente selecionar outra aba</p>
          </div>
        ) : (
          filteredPlanos.map((plan, idx) => (
            <article
              key={plan.id}
              className={`rounded-xl sm:rounded-2xl bg-white p-5 sm:p-7 transition-all duration-500 flex flex-col justify-between transform ${
                plan.isRecommended ? "border-2 border-emerald-600 shadow-lg" : "border border-slate-200 shadow-sm"
              } ${
                plan.isRecommended || plan.isSpecial ? "hover:shadow-xl hover:scale-105" : "hover:shadow-md hover:-translate-y-1"
              } ${
                visibleCards[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${idx * 100}ms`
              }}
            >
              <div>
                {/* Recommended Badge */}
                {plan.isRecommended && (
                  <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-[10px] sm:text-[11px] px-3 py-1 rounded-full font-semibold shadow-md animate-pulse">
                    ⭐ Recomendado
                  </div>
                )}

                {/* Badge */}
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold w-fit">
                  {plan.badge}
                </div>

                {/* Name */}
                <h3 className="mt-2 font-bold text-lg sm:text-xl text-slate-900">{plan.name}</h3>
                {plan.subtitle && <p className="text-slate-500 text-xs sm:text-sm">{plan.subtitle}</p>}

                {/* Features */}
                <ul className="mt-4 space-y-2 text-slate-700 text-xs sm:text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                      {feature.icon === "check" ? (
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <LinkIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span>
                        {feature.href ? (
                          <a href={feature.href} className="underline hover:no-underline text-emerald-600">
                            {feature.text}
                          </a>
                        ) : (
                          feature.text
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Price Section */}
                {plan.tipo !== "AVULSO" && (
                  <div className="mt-5">
                    <div className="text-xs line-through text-slate-400">{plan.originalPrice}</div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">{plan.price}</div>
                    <div className="text-slate-500 text-xs sm:text-sm">{plan.priceInfo}</div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{plan.fidelity}</p>
                  </div>
                )}

                {/* Avulso Plan Message */}
                {plan.tipo === "AVULSO" && <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">{plan.fidelity}</p>}
              </div>

              {/* Button at bottom */}
              {plan.tipo === "AVULSO" && plan.whatsappNumber ? (
                <a
                  href={`https://wa.me/${plan.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 sm:mt-7 inline-flex justify-center w-full px-4 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 active:scale-95 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                >
                  {plan.buttonText}
                </a>
              ) : (
                <Link
                  href={plan.buttonHref}
                  className="mt-6 sm:mt-7 inline-flex justify-center w-full px-4 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 active:scale-95 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  {plan.buttonText}
                </Link>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}