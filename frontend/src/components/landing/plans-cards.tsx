"use client"
import { useEffect, useState } from "react"
import { Check, LinkIcon } from "lucide-react"
import Link from "next/link"

interface Plan {
  id: string
  category: string
  badge: string
  name: string
  subtitle?: string
  originalPrice?: string
  price: string
  priceInfo?: string
  fidelity?: string
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

// Busca planos reais do backend
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
        // Mapeia para o formato do card
        setPlanos(Array.isArray(data) ? data.map((p: any) => ({
          id: p.id,
          category: (p.categoria || p.tipo || "individual").toLowerCase(),
          badge: p.periodicidade ? `PLANO ${p.periodicidade.toUpperCase()}` : "PLANO DISPONÍVEL",
          name: p.tipo || p.nome || p.internalPlanKey || p.id,
          subtitle: p.maxBeneficiaries ? `até ${p.maxBeneficiaries} pessoas` : undefined,
          originalPrice: p.precoOriginal ? `De R$ ${Number(p.precoOriginal).toFixed(2).replace('.', ',')}` : undefined,
          price: p.preco ? `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}` : "",
          priceInfo: p.periodicidade ? `/mês` : "",
          fidelity: p.periodicidade ? `Fidelidade mínima de ${p.periodicidade.toLowerCase()}` : undefined,
          features: [
            { icon: "check", text: "Atendimentos ilimitados com médicos especializados e Clínico Geral" },
            { icon: "check", text: "Sem carência" },
            ...(Array.isArray(p.especialidades) ? p.especialidades.filter((e: string) => e && e.toLowerCase().includes("nutri")).map((e: string) => ({ icon: "check", text: `Consultas com ${e}` })) : []),
          ],
          buttonText: "Quero esse!",
          buttonHref: "/verificar-cpf",
          isRecommended: p.isRecommended || false,
          isSpecial: p.isSpecial || false,
        })) : []);
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

interface PlansCardsProps {
  filter?: string
}


export default function PlansCards() {
  const { planos, loading, erro } = usePlanosLanding();
  const [visibleCards, setVisibleCards] = useState<boolean[]>([])

  useEffect(() => {
    if (planos.length > 0) {
      setVisibleCards(planos.map(() => false))
      setTimeout(() => {
        setVisibleCards(planos.map(() => true))
      }, 100)
    }
  }, [planos.length])

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
      {loading ? (
        <div className="col-span-full text-center text-gray-500 py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-2">Carregando planos...</p>
        </div>
      ) : erro ? (
        <div className="col-span-full text-center text-red-500 py-8">{erro}</div>
      ) : planos.length === 0 ? (
        <div className="col-span-full text-center text-gray-500 py-8">Nenhum plano disponível</div>
      ) : planos.map((plan, idx) => (
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
            {!plan.isSpecial && (
              <div className="mt-5">
                <div className="text-xs line-through text-slate-400">{plan.originalPrice}</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">{plan.price}</div>
                <div className="text-slate-500 text-xs sm:text-sm">{plan.priceInfo}</div>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{plan.fidelity}</p>
              </div>
            )}

            {/* Special Plan Message */}
            {plan.isSpecial && <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">{plan.fidelity}</p>}
          </div>

          {/* Button at bottom */}
          <Link
            href={plan.buttonHref}
            className={`mt-6 sm:mt-7 inline-flex justify-center w-full px-4 py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 active:scale-95 ${
              plan.isSpecial
                ? "border-2 border-slate-300 text-slate-800 hover:bg-slate-50"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {plan.buttonText}
          </Link>
        </article>
      ))}
    </div>
  );
}
