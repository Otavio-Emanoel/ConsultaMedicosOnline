"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Phone, Mail } from "lucide-react"
import FAQModal from "./faq-modal"
import TermosPage from "./termos-page"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqModalOpen, setFaqModalOpen] = useState(false)
  const [termosPageOpen, setTermosPageOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  const handleFAQClick = () => {
    setFaqModalOpen(true)
    setMobileMenuOpen(false)
  }

  return (
    <>
      {/* Topbar - Hidden on mobile, visible on sm+ */}
      <div className="hidden sm:block bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs sm:text-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <a href="tel:+5151995095554" className="inline-flex items-center gap-1 hover:text-emerald-100 transition duration-300">
              <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>(51) 99509-5554</span>
            </a>
            <a
              href="mailto:contato@medicosconsultasonline.com.br"
              className="inline-flex items-center gap-1 hover:text-emerald-100 transition duration-300"
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">contato@medicosconsultasonline.com.br</span>
              <span className="sm:hidden">E-mail</span>
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/login" className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/20 hover:bg-white/30 transition font-medium text-xs sm:text-sm">
              Área do Cliente
            </a>
            <button onClick={handleParceirosClick} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/20 hover:bg-white/30 transition font-medium text-xs sm:text-sm">
              Parcerias
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <header 
        className={`sticky top-0 border-b transition-all duration-300 ${
          scrolled 
            ? "bg-white/95 border-emerald-100 shadow-md backdrop-blur-sm" 
            : "bg-white/90 border-slate-100 shadow-sm backdrop-blur"
        }`}
        style={{ zIndex: 45 }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-16">
            {/* Logo */}
            <a href="#inicio" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition duration-300 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Médicos Consultas Online 24h"
                className="h-20 md:h-24 w-auto"
              />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#inicio" className="text-slate-700 hover:text-emerald-700 transition font-medium text-sm lg:text-base">
                Início
              </a>
              <a href="#como-funciona" className="text-slate-700 hover:text-emerald-700 transition font-medium text-sm lg:text-base">
                Como Funciona
              </a>
              <a href="#especialidades" className="text-slate-700 hover:text-emerald-700 transition font-medium text-sm lg:text-base">
                Especialidades
              </a>
              <button
                onClick={handlePlansClick}
                className="text-slate-700 hover:text-emerald-700 transition font-medium text-sm lg:text-base"
              >
                Planos
              </button>
              <button
                onClick={handleFAQClick}
                className="text-slate-700 hover:text-emerald-700 transition font-medium text-sm lg:text-base"
              >
                FAQ
              </button>
            </nav>

            <div className="hidden md:flex gap-3">
              <button
                onClick={handlePlansClick}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-sm lg:text-base"
              >
                Contratar
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center w-12 h-12 sm:w-11 sm:h-11 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer hover:scale-110 active:scale-95 flex-shrink-0"
            >
              {mobileMenuOpen ? (
                <X className="w-7 h-7 sm:w-6 sm:h-6 text-slate-700" />
              ) : (
                <Menu className="w-7 h-7 sm:w-6 sm:h-6 text-slate-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <style>{`
                @keyframes slideDownSmooth {
                  from {
                    opacity: 0;
                    transform: translateY(-12px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                
                .menu-item {
                  animation: slideDownSmooth 0.4s ease-out forwards;
                }
                
                .menu-item:nth-child(1) { animation-delay: 0.05s; }
                .menu-item:nth-child(2) { animation-delay: 0.1s; }
                .menu-item:nth-child(3) { animation-delay: 0.15s; }
                .menu-item:nth-child(4) { animation-delay: 0.2s; }
                .menu-item:nth-child(5) { animation-delay: 0.25s; }
                
                .menu-bottom {
                  animation: slideDownSmooth 0.4s ease-out forwards;
                  animation-delay: 0.3s;
                }
              `}</style>
              
              <nav className="flex flex-col gap-1 mb-4">
                <a
                  href="#inicio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="menu-item px-4 py-3 rounded-lg text-slate-700 hover:bg-emerald-50 font-medium transition text-sm"
                >
                  Início
                </a>
                <a
                  href="#como-funciona"
                  onClick={() => setMobileMenuOpen(false)}
                  className="menu-item px-4 py-3 rounded-lg text-slate-700 hover:bg-emerald-50 font-medium transition text-sm"
                >
                  Como Funciona
                </a>
                <a
                  href="#especialidades"
                  onClick={() => setMobileMenuOpen(false)}
                  className="menu-item px-4 py-3 rounded-lg text-slate-700 hover:bg-emerald-50 font-medium transition text-sm"
                >
                  Especialidades
                </a>
                <button
                  onClick={handlePlansClick}
                  className="menu-item px-4 py-3 rounded-lg text-slate-700 hover:bg-emerald-50 font-medium transition text-sm text-left"
                >
                  Planos
                </button>
                <button
                  onClick={handleFAQClick}
                  className="menu-item px-4 py-3 rounded-lg text-slate-700 hover:bg-emerald-50 font-medium transition text-sm text-left"
                >
                  FAQ
                </button>
              </nav>
              
              <div className="menu-bottom border-t border-slate-100 pt-4 flex flex-col gap-2">
                <a
                  href="/login"
                  className="px-4 py-2.5 rounded-full border-2 border-emerald-300 text-emerald-700 font-medium text-center hover:bg-emerald-50 transition text-sm"
                >
                  Área do Cliente
                </a>
                <button
                  onClick={handlePlansClick}
                  className="px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-center shadow-md hover:shadow-lg transition text-sm"
                >
                  Contratar Agora
                </button>
                <button
                  onClick={handleParceirosClick}
                  className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-700 font-medium text-center hover:bg-slate-200 transition text-sm"
                >
                  Virar Parceiro
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* FAQ Modal */}
      <FAQModal isOpen={faqModalOpen} onClose={() => setFaqModalOpen(false)} />

      {/* Termos Page */}
      {termosPageOpen && <TermosPage onClose={() => setTermosPageOpen(false)} />}
    </>
  )
}
