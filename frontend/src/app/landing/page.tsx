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
import PlansSection from "@/components/landing/plans-section"
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
      <PlansSection />
      <Parceiros onOpenTermos={() => setTermosPageOpen(true)} />
      <TermosSection onOpenTermos={() => setTermosPageOpen(true)} />
      <Footer />
      {termosPageOpen && <TermosPage onClose={() => setTermosPageOpen(false)} />}
    </main>
  )
}
