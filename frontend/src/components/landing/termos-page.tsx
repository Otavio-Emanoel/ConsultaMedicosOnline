"use client"

import { X } from "lucide-react"

interface TermosPageProps {
  onClose: () => void
}

export default function TermosPage({ onClose }: TermosPageProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header Sticky */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 sm:p-6 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Termos de Aceite</h1>
          <p className="mt-1 text-emerald-100 text-sm">Leia cuidadosamente nossos termos e condições</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-emerald-600 mb-2">CONTRATO DE PARCERIA – TERMO DE ACEITE</h2>
          <p className="text-sm text-gray-600">Atualizado em: 11 de outubro de 2025 · Versão: 1.0</p>
        </header>

        {/* TOC */}
        <aside className="mb-8 bg-white border-2 border-emerald-300 rounded-xl p-6 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-emerald-900 flex items-center gap-2">
            <i className="fas fa-list text-emerald-600" /> Índice de Tópicos
          </h3>
          <ol className="space-y-2">
            <li><a href="#objeto" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Objeto e Conceitos</a></li>
            <li><a href="#instrucoes" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Instruções de Utilização</a></li>
            <li><a href="#servicos" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Dos Serviços</a></li>
            <li><a href="#sigilo" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Sigilo, Ética e LGPD</a></li>
            <li><a href="#multa" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Multa por Rescisão Antecipada</a></li>
            <li><a href="#termo-aceite" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Termo de Aceite</a></li>
            <li><a href="#contrato" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Contrato Empresarial</a></li>
            <li><a href="#especialistas" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:underline font-medium transition-all group"><i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform" /> Consultas com Especialistas</a></li>
          </ol>
        </aside>

        {/* Sections */}
        <div className="space-y-8">
          {/* Objeto */}
          <section id="objeto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Objeto e Conceitos</h3>
            <p className="text-gray-700 mb-3">
              O atendimento de telemedicina MÉDICOS CONSULTAS ONLINE, administrada pela empresa N. PERO NEGÓCIOS INOVADORES LTDA, tem como objeto orientar o beneficiário do plano na melhor conduta a ser tomada frente às descrições dos sintomas, inclusive, dos detalhes e especificidades do caso concreto, esclarecendo dúvidas gerais, fornecendo orientações educativas, bem como e principalmente na prevenção das doenças por meio do autocuidado.
            </p>
            <p className="text-gray-700 mb-3">Os serviços incluem:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
              <li>Telemedicina – Atendimento Médico</li>
              <li>Psicólogo</li>
              <li>Orientação Nutricional</li>
            </ul>
            <p className="text-gray-700 mt-4">
              A MÉDICOS CONSULTAS ONLINE é uma plataforma que atua como intermediária na conexão de pacientes e médicos. A plataforma não se responsabiliza por ações, omissões ou negligências dos médicos ou pacientes durante o atendimento.
            </p>
          </section>

          {/* Instruções */}
          <section id="instrucoes">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Instruções de Utilização</h3>
            <p className="text-gray-700 mb-3">
              A efetividade do atendimento ocorrerá desde que o beneficiário apresente informações cadastrais corretas, mantendo seus dados sempre atualizados, com pagamentos em dia de acordo com o plano contratado.
            </p>
            <p className="text-gray-700 mb-3">
              O beneficiário deverá apresentar todos os sintomas sem omitir qualquer informação, para que a equipe especializada possa orientar os procedimentos necessários. Após o diagnóstico, o caso terá 3 possíveis desfechos:
            </p>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-2">
              <li>Receberá orientações de autocuidado e prevenção</li>
              <li>Será direcionado a buscar atendimento ambulatorial ou hospitalar</li>
              <li>Será convidado a participar de uma consulta eletiva</li>
            </ol>
          </section>

          {/* Serviços */}
          <section id="servicos">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Dos Serviços</h3>
            
            <h4 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.1 – Telemedicina</h4>
            <p className="text-gray-700 mb-3">
              A telemedicina é a realização de atendimentos e orientações médicas a distância por plataformas online. O objetivo é orientar na melhor conduta frente aos sintomas, esclarecendo dúvidas e fornecendo orientações educativas.
            </p>

            <h4 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.2 – Consulta Psicológica</h4>
            <p className="text-gray-700 mb-3">
              Serviço de orientação psicológica preliminar, básico e preventivo por profissionais qualificados. Não substitui consulta médica ou psicológica presencial, nem fornece diagnóstico.
            </p>

            <h4 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3.3 – Orientação Nutricional</h4>
            <p className="text-gray-700 mb-3">
              Orientação nutricional realizada por nutricionistas com protocolos científicos. Atendimentos pontuais que não incluem acompanhamento contínuo.
            </p>
          </section>

          {/* Sigilo */}
          <section id="sigilo">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Sigilo, Ética e LGPD</h3>
            <p className="text-gray-700 mb-3">
              As informações fornecidas são legalmente confidenciais, acessadas apenas pela equipe de saúde envolvida no atendimento. A MÉDICOS CONSULTAS ONLINE cumpre as leis federais de privacidade e segurança de saúde.
            </p>
            <p className="text-gray-700">
              Os dados são armazenados em servidores seguros e criptografados, em conformidade com a Lei de Proteção de Dados (LGPD) e Código de Ética Médica.
            </p>
          </section>

          {/* Multa */}
          <section id="multa">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Multa por Rescisão Antecipada e Cancelamento</h3>
            <p className="text-gray-700 mb-3">
              Em caso de rescisão antecipada antes de completar o período contratado, o beneficiário pagará multa de 50% sobre os valores remanescentes.
            </p>
            <p className="text-gray-700 mb-3 font-semibold">Cancelamento:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
              <li>O plano é renovado automaticamente mensalmente</li>
              <li>Para cancelar, contate com 30 dias de antecedência à data de vencimento</li>
              <li>O cancelamento deve ser solicitado via WhatsApp ou e-mail</li>
            </ul>
          </section>

          {/* Termo de Aceite */}
          <section id="termo-aceite">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Termo de Aceite</h3>
            <p className="text-gray-700 mb-3">
              Ao utilizar nossos serviços, você declara estar ciente de:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
              <li>Telemedicina apresenta limitações por não possibilitar exame presencial</li>
              <li>Pode haver falhas de conexão que exigem cancelamento e remarcação</li>
              <li>Deve testar seu equipamento 15 minutos antes da consulta</li>
              <li>Deve preservar confidencialidade das informações compartilhadas</li>
              <li>Receitas e atestados eletrônicos são válidos conforme Portaria MS nº 467</li>
            </ul>
          </section>

          {/* Contrato Empresarial */}
          <section id="contrato">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Contrato Empresarial</h3>
            <p className="text-gray-700 mb-3">O contrato de parceria empresarial exige:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2">
              <li>Mínimo de 5 vidas por CNPJ</li>
              <li>Contrato mínimo de 3 meses por vida</li>
              <li>Pagamento pré-pago para liberação de acesso</li>
            </ul>
          </section>

          {/* Especialistas */}
          <section id="especialistas">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">8. Consultas com Médicos Especialistas</h3>
            <p className="text-gray-700 mb-3">
              Consultas com especialistas acontecem apenas por encaminhamento do clínico geral, exceto para psicólogos. Sem encaminhamento, a consulta será cobrada com taxa de R$ 150,00.
            </p>
            <p className="text-gray-700 mb-3 font-semibold">Cancelamento e Reagendamento:</p>
            <p className="text-gray-700 mb-3">
              Consultas só podem ser canceladas ou reagendadas com no mínimo 48 horas de antecedência.
            </p>
            <p className="text-gray-700 mb-3 font-semibold">Consultas Excedentes:</p>
            <p className="text-gray-700">
              Consultas além do limite contratado serão cobradas em R$ 150,00 por consulta excedente.
            </p>
          </section>
        </div>

        {/* Acceptance Statement */}
        <div className="mt-12 p-6 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
          <p className="text-gray-900 font-semibold mb-2">ACEITE E CONSENTIMENTO</p>
          <p className="text-gray-700 text-sm">
            Por se encontrar plenamente ciente e esclarecido, DECLARO estar totalmente informado de todos os fatores de risco acima mencionados, dando meu aceite para que os procedimentos e tratamentos propostos sejam levados a termo, na forma indicada, no intuito do restabelecimento de minha saúde.
          </p>
        </div>
      </main>
    </div>
  )
}
