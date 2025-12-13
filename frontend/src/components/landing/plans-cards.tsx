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
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
      {loading ? (
        <div className="col-span-full text-center text-gray-500">Carregando planos...</div>
      ) : erro ? (
        <div className="col-span-full text-center text-red-500">{erro}</div>
      ) : planos.length === 0 ? (
        <div className="col-span-full text-center text-gray-500">Nenhum plano disponível</div>
      ) : planos.map((plan) => (
        <article
          key={plan.id}
          className={`rounded-2xl bg-white p-7 transition-transform duration-300 hover:shadow-lg flex flex-col justify-between ${
            plan.isRecommended ? "border-2 border-emerald-600 relative" : "border border-slate-200"
          } ${plan.isRecommended || plan.isSpecial ? "hover:scale-105" : "hover:-translate-y-1"}`}
        >
          <div>
            {/* Recommended Badge */}
            {plan.isRecommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] px-3 py-1 rounded-full font-semibold">
                Recomendado
              </div>
            )}

            {/* Badge */}
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold w-fit">
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
          </div>

          {/* Button at bottom */}
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
  );
}
