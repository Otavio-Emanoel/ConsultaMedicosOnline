import type React from "react"

import { useState } from "react"

const modelosParceria = [
  {
    title: "Clínicas e consultórios",
    description: "Amplie seu portfólio com telemedicina sem investir em tecnologia própria.",
    items: ["Suporte para agendamento 24/7", "Receitas e prontuário integrados"],
    background: "bg-emerald-50/70",
  },
  {
    title: "Empresas e RH",
    description: "Benefício corporativo com planos trimestrais e fidelidade de 3 meses.",
    items: ["Dashboard para acompanhar indicadores", "Acompanhamento nutricional e psicológico"],
    background: "bg-white",
  },
  {
    title: "Corretores e afiliados",
    description: "Receba materiais de venda, landing pages e suporte comercial.",
    items: ["Comissionamento recorrente", "Treinamentos periódicos"],
    background: "bg-white",
  },
  {
    title: "Influenciadores e criadores",
    description: "Monetize sua audiência oferecendo planos com acompanhamento médico.",
    items: ["Links rastreados e relatórios mensais", "Campanhas promocionais exclusivas"],
    background: "bg-emerald-50/70",
  },
]

const beneficiosPrincipais = [
  "White-label opcional e comunicação personalizada.",
  "Dashboard com relatórios de uso e indicadores de saúde.",
  "Equipe de onboarding para seus clientes.",
]

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
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-white via-emerald-50 to-emerald-100 mb-16 sm:mb-20 lg:mb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 text-emerald-700 px-4 py-1 text-sm font-medium">
                Programa de parcerias
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-600">
                Amplie seus serviços com a telemedicina da Médicos Consultas Online
              </h1>
              <p className="text-lg text-slate-600">
                Oferecemos soluções de telemedicina para clínicas, consultórios, empresas e infoprodutores que desejam
                oferecer consultas médicas 24h para seus clientes.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://api.whatsapp.com/send?phone=5551995095554"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <i className="fas fa-handshake mr-2" /> Quero ser parceiro
                </a>
                <a
                  href="#form-parceiro"
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  <i className="fas fa-envelope mr-2" /> Conversar com o time
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-white/95 shadow-md p-8 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Benefícios principais</h2>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                  <i className="fas fa-star" /> Destaque
                </span>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                {beneficiosPrincipais.map((beneficio, idx) => (
                  <li key={idx} className="flex gap-3">
                    <i className="fas fa-circle-check text-emerald-500 mt-1 text-sm" />
                    {beneficio}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modelos de Parceria */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 sm:mb-20 lg:mb-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] items-center">
          <div className="space-y-6 flex flex-col justify-center h-full">
            <h2 className="text-2xl font-bold text-emerald-900">Modelos de parceria</h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Diversos tipos de parceria para atender suas necessidades, desde clínicas até influenciadores. Cada modelo
              inclui suporte dedicado e ferramentas específicas para maximizar seus resultados e crescimento.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {modelosParceria.map((modelo, idx) => (
              <article key={idx} className={`rounded-2xl border border-emerald-100 ${modelo.background} p-6 shadow-sm`}>
                <h3 className="text-lg font-semibold text-emerald-800">{modelo.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{modelo.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {modelo.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex gap-2">
                      <i className="fas fa-circle text-emerald-500 mt-1 text-xs" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>

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

      {/* Formulário */}
      <div id="form-parceiro" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20 lg:mt-24">
          <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-8 sm:p-12 space-y-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Envie seus dados e receba o contato do nosso time</h2>
              
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-white/80">Nome completo</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-white/80">Empresa</label>
                <input
                  type="text"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  placeholder="Nome da empresa"
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-white/80">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contato@empresa.com"
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-white/80">Telefone</label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80">Mensagem</label>
                <textarea
                  name="mensagem"
                  value={formData.mensagem}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Conte um pouco sobre a sua demanda"
                  className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-white placeholder-white/60 focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={termosAceitos}
                    onChange={(e) => setTermosAceitos(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-emerald-500 focus:ring-2 focus:ring-white cursor-pointer"
                    required
                  />
                  <span>
                    Eu aceito os{" "}
                    <button
                      type="button"
                      onClick={onOpenTermos}
                      className="underline text-white hover:text-emerald-200 transition font-semibold"
                    >
                      Termos de Aceite
                    </button>
                  </span>
                </label>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={!termosAceitos}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all ${
                    termosAceitos
                      ? "bg-white text-emerald-700 hover:-translate-y-0.5 cursor-pointer"
                      : "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60"
                  }`}
                >
                  <i className="fas fa-paper-plane mr-2" /> Enviar formulário
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
