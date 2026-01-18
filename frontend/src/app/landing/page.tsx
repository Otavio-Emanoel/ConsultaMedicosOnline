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
import SectionDivider from "@/components/landing/section-divider"
import FAQSection from "@/components/landing/faq-section"
import ScrollReveal from "@/components/ui/scroll-reveal"
import NR1Section from "@/components/landing/nr1-section"
import "@/styles/landing-animations.css"

export default function LandingPage() {
  const [termosPageOpen, setTermosPageOpen] = useState(false)

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <SectionDivider />
      
      <ScrollReveal animation="fade-up">
        <Vantagens />
      </ScrollReveal>

      <ScrollReveal animation="fade-up">
        <NR1Section />
      </ScrollReveal>

      <SectionDivider />
      
      <ScrollReveal animation="fade-up">
        <Especialidades />
      </ScrollReveal>
      
      <SectionDivider />
      
      <ScrollReveal animation="fade-up">
        <ComoFunciona />
      </ScrollReveal>
      
      <SectionDivider />
      
      <ScrollReveal animation="scale-in">
        <section id="planos" className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-5 md:px-4">
            <div className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                Nossos <span className="text-emerald-600">Planos</span>
              </h2>
              <div className="w-20 h-1 bg-emerald-500 mx-auto rounded-full mb-6" />
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Escolha o plano ideal para você e sua família
              </p>
            </div>
            <PlansCards {...({ filter: "all" } as any)} />
          </div>
        </section>
      </ScrollReveal>
      
      <SectionDivider />
      
      <ScrollReveal animation="fade-up">
        <Parceiros onOpenTermos={() => setTermosPageOpen(true)} />
      </ScrollReveal>
      
      <SectionDivider />
      
      <ScrollReveal animation="fade-up">
        <FAQSection />
      </ScrollReveal>
      
      <SectionDivider />
      
      <TermosSection onOpenTermos={() => setTermosPageOpen(true)} />
      <Footer />
      {termosPageOpen && <TermosPage onClose={() => setTermosPageOpen(false)} />}
    </main>
  )
}
