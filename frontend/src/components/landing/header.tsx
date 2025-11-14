"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import FAQModal from "./faq-modal"
import TermosPage from "./termos-page"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqModalOpen, setFaqModalOpen] = useState(false)
  const [termosPageOpen, setTermosPageOpen] = useState(false)

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
            <a href="/login" className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 transition font-medium">
              Área do Cliente
            </a>
            <a href="#parceiros" className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 transition font-medium">
               Parcerias
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <header 
        className={`sticky top-0 border-b border-slate-100 shadow-sm transition-all duration-300 ${
          faqModalOpen 
            ? "bg-white/40 backdrop-blur-md" 
            : "bg-white/90 backdrop-blur"
        }`}
        style={{ zIndex: 45 }}
      >  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#inicio" className="flex items-center gap-2 cursor-pointer">
              <div className="w-20 h-20 relative flex items-center justify-center">
                <img
                  src="/logo.png"
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
                href="#planos"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 font-medium shadow-md hover:shadow-lg transition-all duration-300"
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
                <a
                  className="px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 w-full text-center font-medium"
                  href="/login"
                >
                  Área do Cliente
                </a>
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

      {/* FAQ Modal */}
      <FAQModal isOpen={faqModalOpen} onClose={() => setFaqModalOpen(false)} />

      {/* Termos Page */}
      {termosPageOpen && <TermosPage onClose={() => setTermosPageOpen(false)} />}
    </>
  )
}
