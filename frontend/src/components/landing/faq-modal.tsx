"use client"

import React, { useState, useEffect } from "react"

interface FAQItem {
  id: string
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    id: "faq1",
    question: "O que é a plataforma Médicos Consultas Online?",
    answer:
      "É uma plataforma de telemedicina que conecta pacientes a profissionais de saúde (médicos, psicólogos e nutricionistas) para consultas e orientações à distância. Oferecemos videochamadas, emissão de receitas eletrônicas e suporte pós-consulta.",
  },
  {
    id: "faq2",
    question: "Como agendo uma consulta?",
    answer:
      "Você pode contratar um plano em nossos Planos ou, se já for cliente, acessar a área do cliente para agendar. Também oferecemos consultas por demanda quando houver disponibilidade.",
  },
  {
    id: "faq3",
    question: "Vocês emitem atestados e requisição de exames?",
    answer:
      "Sim. Nossos profissionais podem emitir atestados, requisições de exames e prescrições eletrônicas quando clinicamente apropriado.",
  },
  {
    id: "faq4",
    question: "Vocês prescrevem medicamentos?",
    answer:
      "Sim, quando indicado pelo profissional, a prescrição pode ser emitida eletronicamente através de receituário digital.",
  },
  {
    id: "faq5",
    question: "O atendimento é imediato?",
    answer:
      "Oferecemos plantões de clínicos gerais 24h; consultas com especialistas podem exigir agendamento dependendo da disponibilidade.",
  },
  {
    id: "faq6",
    question: "Como funciona a privacidade e a LGPD?",
    answer:
      "Trabalhamos com políticas de privacidade e armazenamento seguro de dados. Informações sensíveis são tratadas com confidencialidade e em conformidade com a LGPD. Consulte também nossos Termos de Aceite para detalhes.",
  },
]

interface FAQModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FAQModal({ isOpen, onClose }: FAQModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Previne scroll da página quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = "unset"
      }
    }
  }, [isOpen])

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        <div
          className="relative w-full max-w-3xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - STICKY */}
          <div className="flex-shrink-0 sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 sm:p-8 rounded-t-3xl flex items-center justify-between gap-4 shadow-lg">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold">Perguntas Frequentes</h2>
              <p className="mt-2 text-emerald-100 text-sm">Respostas rápidas às dúvidas mais comuns</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="#form-parceiro"
                onClick={() => {
                  onClose()
                  setTimeout(() => {
                    const formSection = document.getElementById('form-parceiro')
                    if (formSection) {
                      formSection.scrollIntoView({ behavior: 'smooth' })
                    }
                  }, 100)
                }}
                className="px-4 py-2 rounded-full bg-white text-emerald-600 font-semibold hover:bg-emerald-50 transition-all text-sm sm:text-base whitespace-nowrap cursor-pointer"
              >
                <i className="fas fa-comment mr-2" /> Quero Perguntar
              </a>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                aria-label="Fechar"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>
          </div>

          {/* Content - SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3">
            {faqItems.map((item) => (
              <div key={item.id} className="border border-emerald-100 rounded-xl overflow-hidden hover:border-emerald-300 transition-all">
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="w-full text-left p-4 sm:p-5 bg-white hover:bg-emerald-50/50 transition-colors flex items-center justify-between gap-3"
                  aria-expanded={expandedId === item.id}
                  aria-controls={`panel-${item.id}`}
                >
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">{item.question}</span>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 transition-transform duration-300 ${
                    expandedId === item.id ? "rotate-180" : ""
                  }`}>
                    <i className="fas fa-chevron-down text-xs" />
                  </div>
                </button>

                {expandedId === item.id && (
                  <div
                    id={`panel-${item.id}`}
                    className="px-4 sm:px-5 py-4 bg-emerald-50/30 border-t border-emerald-100 text-gray-600 text-sm sm:text-base leading-relaxed animate-in fade-in duration-300"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
