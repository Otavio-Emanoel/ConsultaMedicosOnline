"use client"

const steps = [
  {
    number: 1,
    title: "Cadastro seguro",
    description: "Preencha os dados essenciais, aceite os termos e escolha o plano ideal.",
  },
  {
    number: 2,
    title: "Triagem inteligente",
    description: "Analisamos sintomas e histórico para indicar a especialidade certa.",
  },
  {
    number: 3,
    title: "Consulta online",
    description: "Videochamada com envio de orientações, receitas e atestados digitais.",
  },
  {
    number: 4,
    title: "Acompanhamento contínuo",
    description: "Revisões programadas, histórico acessível e suporte sempre ativo.",
  },
]

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-emerald-600">Como Funciona</h2>
            <p className="text-lg text-gray-600">
              Conteúdo provisório: descreva com mais detalhes cada etapa do serviço, tempo de resposta, canais de
              atendimento e diferenciais operacionais. Quando receber o texto final, basta substituir este parágrafo
              mantendo a estrutura alinhada à esquerda para dar leitura confortável mesmo com blocos maiores.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                <h3 className="text-base font-semibold text-emerald-700">Guia completo</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Acesse a página dedicada com o passo a passo detalhado, FAQs e materiais de apoio.
                </p>
                
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Atendimento humanizado</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Profissionais disponíveis 24h e acompanhamento ativo pós-consulta.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Steps */}
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-semibold">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
