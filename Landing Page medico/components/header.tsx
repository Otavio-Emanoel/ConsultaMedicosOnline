"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)

  const handlePlansClick = () => {
    const plansElement = document.getElementById("planos")
    if (plansElement) {
      plansElement.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  const handleParceirosClick = () => {
    const parceirosElement = document.getElementById("parceiros")
    if (parceirosElement) {
      parceirosElement.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  // abre modal de FAQ em vez de rolar
  const handleFAQClick = () => {
    setFaqOpen(true)
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFaqOpen(false)
    }
    if (faqOpen) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [faqOpen])

  return (
    <>
      {/* Topbar */}
      <div className="bg-emerald-600 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="hidden sm:flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <i className="fas fa-phone w-4 h-4" />
              (51) 99509-5554
            </span>
            <a
              href="mailto:contato@medicosconsultasonline.com.br"
              className="inline-flex items-center gap-2 hover:underline cursor-pointer"
            >
              <i className="fas fa-envelope w-4 h-4" />
              contato@medicosconsultasonline.com.br
            </a>
          </div>
            <div className="flex w-full sm:w-auto items-center justify-center sm:justify-end gap-3">
            <Link href="/area-do-cliente" className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 transition font-medium cursor-pointer">
              Área do Cliente
            </Link>
            <button onClick={handleParceirosClick} className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 transition font-medium cursor-pointer">
              Quero Virar Parceiro
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#inicio" className="flex items-center gap-2 cursor-pointer">
              <div className="w-20 h-20 relative flex items-center justify-center">
                <img
                  src="/consultas online logo.png"
                  alt="Médicos Consultas Online"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#inicio" className="text-slate-700 hover:text-emerald-700 transition font-medium cursor-pointer">
                Início
              </a>
              <a href="#como-funciona" className="text-slate-700 hover:text-emerald-700 transition font-medium cursor-pointer">
                Como Funciona
              </a>
              <a href="#especialidades" className="text-slate-700 hover:text-emerald-700 transition font-medium cursor-pointer">
                Especialidades
              </a>
              <button
                onClick={handlePlansClick}
                className="text-slate-700 hover:text-emerald-700 transition font-medium cursor-pointer"
              >
                Planos
              </button>
              <button
                onClick={handleParceirosClick}
                className="text-slate-700 hover:text-emerald-700 transition font-medium cursor-pointer"
              >
                Parceiros
              </button>
              {/* troquei o link por botão que rola suavemente */}
              <button
                onClick={handleFAQClick}
                className="text-slate-700 hover:text-emerald-700 transition font-medium cursor-pointer"
              >
                FAQ
              </button>
            </nav>

            <div className="hidden md:flex">
              <a
                href="#"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 font-medium shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                Contrate Agora
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 pt-2">
              <div className="grid gap-2">
                <Link
                  className="px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 w-full text-center font-medium cursor-pointer"
                  href="/area-do-cliente"
                >
                  Área do Cliente
                </Link>
                <button
                  onClick={handleParceirosClick}
                  className="px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 w-full text-center font-medium cursor-pointer"
                >
                  Quero Virar Parceiro
                </button>
                <button
                  onClick={handlePlansClick}
                  className="px-3 py-2 rounded-full bg-emerald-500 text-white w-full text-center font-medium cursor-pointer"
                >
                  Planos
                </button>
                <button
                  onClick={handleParceirosClick}
                  className="px-3 py-2 rounded-full bg-emerald-500 text-white w-full text-center font-medium cursor-pointer"
                >
                  Parceiros
                </button>
                {/* opcional: adicionar FAQ no menu mobile */}
                <button
                  onClick={handleFAQClick}
                  className="px-3 py-2 rounded-full bg-emerald-500 text-white w-full text-center font-medium cursor-pointer"
                >
                  FAQ
                </button>
                <a
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2.5 font-medium mt-2 shadow-md hover:shadow-lg transition cursor-pointer"
                  href="#"
                >
                  Contrate Agora
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modal-like FAQ card rendered when user clicks FAQ */}
      {faqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFaqOpen(false)} />

          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-2xl mx-4 sm:mx-6 bg-white rounded-2xl shadow-lg p-6 max-h-[80vh] overflow-y-auto"
          >
            <button
              onClick={() => setFaqOpen(false)}
              aria-label="Fechar FAQ"
              className="absolute top-3 right-3 text-slate-600 hover:text-slate-800"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-4">Perguntas Frequentes — Médicos Consultas Online</h3>

            <div className="space-y-3">
              <details className="p-3 bg-emerald-50 rounded-lg">
                <summary className="font-medium cursor-pointer">Como agendo uma consulta?</summary>
                <p className="mt-2 text-sm text-slate-700">Você pode agendar pelo aplicativo ou site, escolhendo especialidade, data e horário disponíveis. Também oferecemos atendimento instantâneo via videochamada para casos não agendados.</p>
              </details>

              <details className="p-3 bg-emerald-50 rounded-lg">
                <summary className="font-medium cursor-pointer">Quais formas de pagamento são aceitas?</summary>
                <p className="mt-2 text-sm text-slate-700">Aceitamos cartão de crédito, débito automático, boleto bancário e pagamentos via parceiros (Asaas). Consulte seu plano para benefícios e faturas.</p>
              </details>

              <details className="p-3 bg-emerald-50 rounded-lg">
                <summary className="font-medium cursor-pointer">Posso incluir dependentes no plano?</summary>
                <p className="mt-2 text-sm text-slate-700">Sim — acesse a área do cliente, vá em "Dependentes" e adicione as informações necessárias. Dependentes podem ter perfis e histórico separados.</p>
              </details>

              <details className="p-3 bg-emerald-50 rounded-lg">
                <summary className="font-medium cursor-pointer">Os atendimentos são sigilosos?</summary>
                <p className="mt-2 text-sm text-slate-700">Sim. Todos os atendimentos seguem a LGPD e o Código de Ética Médica; os dados são criptografados e acessíveis apenas por profissionais autorizados.</p>
              </details>

              <details className="p-3 bg-emerald-50 rounded-lg">
                <summary className="font-medium cursor-pointer">Como cancelar ou alterar meu plano?</summary>
                <p className="mt-2 text-sm text-slate-700">Você pode solicitar cancelamento ou alteração pela área do cliente ou pelo suporte. Cancelamentos antecipados podem ter cláusulas contratuais; verifique seu contrato.</p>
              </details>
            </div>

            <div className="mt-4 text-right">
              <button onClick={() => setFaqOpen(false)} className="px-4 py-2 rounded-full bg-emerald-600 text-white font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
