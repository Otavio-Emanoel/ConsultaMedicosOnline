"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
  category: "geral" | "consultas" | "planos"
}

const faqData: FAQItem[] = [
  {
    question: "Como funciona a telemedicina?",
    answer: "A telemedicina permite que você realize consultas médicas online, por videochamada, diretamente do seu celular ou computador. Após a consulta, você recebe receitas e atestados digitais com validade legal.",
    category: "geral"
  },
  {
    question: "O atendimento é realmente 24 horas?",
    answer: "Sim! O clínico geral está disponível 24 horas por dia, 7 dias por semana. As demais especialidades funcionam em horários específicos, que podem ser consultados na plataforma.",
    category: "geral"
  },
  {
    question: "Como faço para agendar uma consulta?",
    answer: "Após fazer login na plataforma, você pode agendar consultas diretamente pelo app ou site. Basta escolher a especialidade, data e horário disponíveis.",
    category: "consultas"
  },
  {
    question: "Preciso de encaminhamento para consultar com especialistas?",
    answer: "Sim, para agendar consultas com especialistas (exceto Psicologia e Nutrição), é necessário passar primeiro pelo clínico geral, que avaliará seu caso e indicará a especialidade mais adequada.",
    category: "consultas"
  },
  {
    question: "Quais especialidades estão disponíveis?",
    answer: "Oferecemos mais de 10 especialidades, incluindo Clínico Geral, Cardiologia, Dermatologia, Endocrinologia, Ginecologia, Ortopedia, Pediatria, Psicologia, Nutrição, entre outras.",
    category: "consultas"
  },
  {
    question: "As receitas digitais têm validade legal?",
    answer: "Sim! Todas as receitas e atestados emitidos pelos nossos médicos são digitais e possuem validade legal em todo o território nacional, conforme regulamentação do CFM.",
    category: "consultas"
  },
  {
    question: "Posso cancelar meu plano a qualquer momento?",
    answer: "Os planos possuem fidelidade de 3 meses. Após esse período, você pode cancelar a qualquer momento sem multas ou taxas adicionais.",
    category: "planos"
  },
  {
    question: "Como adiciono dependentes ao meu plano?",
    answer: "Nos planos Casal e Familiar, você pode adicionar dependentes diretamente na plataforma. Cada dependente terá seu próprio perfil com histórico de consultas separado.",
    category: "planos"
  },
]

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<"geral" | "consultas" | "planos">("geral")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = faq.category === activeCategory
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <section id="faq" className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-5 md:px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Perguntas <span className="text-emerald-500">Frequentes</span>
          </h2>
          <div className="w-20 h-1 bg-emerald-500 mx-auto rounded-full mb-6" />
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Tire suas dúvidas sobre nossos serviços
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-base"
              placeholder="Buscar pergunta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-8 bg-white border border-gray-200 rounded-full p-1">
            <button
              onClick={() => setActiveCategory("geral")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === "geral"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => setActiveCategory("consultas")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === "consultas"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Consultas
            </button>
            <button
              onClick={() => setActiveCategory("planos")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === "planos"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Planos
            </button>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhuma pergunta encontrada para "{searchTerm}"
              </div>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-fade-in"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                        expandedIndex === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      expandedIndex === index ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </section>
  )
}
