import type React from "react"

import { useState } from "react"

export default function Parceiros({ onOpenTermos }: { onOpenTermos: () => void }) {
  const [formData, setFormData] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    mensagem: "",
  })
  const [termosAceitos, setTermosAceitos] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!termosAceitos) {
      alert("Você precisa aceitar os Termos de Aceite para continuar.")
      return
    }
    console.log("[v0] Form submitted:", formData)
    alert("Formulário enviado! Você será contatado em breve.")
    setFormData({ nome: "", empresa: "", email: "", telefone: "", mensagem: "" })
    setTermosAceitos(false)
  }

  return (
    <section id="parceiros" className="py-16 sm:py-20 lg:py-24">
      {/* Seção de Parceiros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20 lg:mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-900 mb-4">Conheça nossos parceiros</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Empresas líderes que confiam em nossas soluções de telemedicina
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Regional Certificadora */}
          <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50">
            <div className="w-full flex justify-center mb-4">
              <img
                src="/REGIONAL.png"
                alt="Regional Certificadora Digital"
                className="h-24 object-contain"
              />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Regional Certificadora</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              <strong>Regional Certificadora</strong> - Autoridade de registro de certificados digitais; Emissão de certificados digitais para pessoas físicas e jurídicas nos modelos A1 e A3.
            </p>
          </div>

          {/* Salas & Negócios */}
          <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50">
            <div className="w-full flex justify-center mb-4">
              <img
                src="/SALAS.png"
                alt="Salas & Negócios Coworking"
                className="h-24 object-contain"
              />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Salas & Negócios</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              <strong>Salas & Negócios Coworking</strong> - Endereço fiscal para micro e pequenas empresas; Para abertura rápida de empresa. Ative seu endereço em Santa Catarina e desfrute dos benefícios fiscais.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}