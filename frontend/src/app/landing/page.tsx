"use client"
import { useState } from "react"
import Header from "@/components/landing/header"
import Hero from "@/components/landing/hero"
import Vantagens from "@/components/landing/vantagens"
import Especialidades from "@/components/landing/especialidades"
import ComoFunciona from "@/components/landing/como-funciona"
import Parceiros from "@/components/landing/parceiros"
import TermosSection from "@/components/landing/termos-section"
import Footer from "@/components/landing/footer"
import PlansCards from "@/components/landing/plans-cards"
import TermosPage from "@/components/landing/termos-page"

export default function LandingPage() {
  const [termosPageOpen, setTermosPageOpen] = useState(false)

  return (
    <main className="min-h-screen landing-page-bg">
      <Header />
      <Hero />
      <Vantagens />
      <Especialidades />
      <ComoFunciona />
      <section id="planos" className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-emerald-600 mb-4">Nossos Planos</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Escolha o plano ideal para você e sua família</p>
          </div>
          <PlansCards />
        </div>
      </section>
      <Parceiros onOpenTermos={() => setTermosPageOpen(true)} />
      <TermosSection onOpenTermos={() => setTermosPageOpen(true)} />
      <Footer />
      {termosPageOpen && <TermosPage onClose={() => setTermosPageOpen(false)} />}
    </main>
  )
}
