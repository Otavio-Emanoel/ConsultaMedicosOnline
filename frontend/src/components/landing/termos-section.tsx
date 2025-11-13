"use client"

export default function TermosSection({ onOpenTermos }: { onOpenTermos?: () => void }) {
  return (
    <section id="termos" className="bg-emerald-700 text-emerald-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/60 px-4 py-1 text-sm font-medium uppercase tracking-wide">
          Termos de aceite
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold">Transparência total sobre como cuidamos dos seus dados</h2>
        <p className="text-sm sm:text-base text-emerald-100">
          Este espaço receberá o conteúdo definitivo enviado pelo cliente. Utilize o botão abaixo para abrir a versão
          de exibição dos termos em um pop-up.
        </p>
        <button
          onClick={onOpenTermos}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/25 transition"
          type="button"
        >
          <i className="fas fa-file-contract" /> Ler termos completos
        </button>
      </div>
    </section>
  )
}
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={closeModal} />

          {/* Card modal */}
          <div className="relative max-w-3xl w-full mx-4 sm:mx-6 bg-white text-emerald-900 rounded-2xl shadow-lg p-6 z-10 max-h-[80vh] flex flex-col">
            <button
              onClick={closeModal}
              aria-label="Fechar"
              className="absolute top-3 right-3 text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              ✕
            </button>

            <div className="overflow-y-scroll pr-4 max-h-[64vh]">
              <h3 className="text-lg font-semibold mb-2">CONTRATO DE PARCERIA – TERMO DE ACEITE, MANUAL DE INSTRUÇÕES E OUTRAS PROVIDÊNCIAS</h3>
              <p className="text-sm text-emerald-800 mb-3">
                Atualizado em: 11 de outubro de 2025 · Versão: 1.0
              </p>

              <ul className="text-sm list-disc pl-5 space-y-2 text-emerald-700">
                <li>1. OBJETO E CONCEITOS</li>
                <li>2. DAS INSTRUÇÕES DE UTILIZAÇÃO</li>
                <li>3. DOS SERVIÇOS</li>
                <li>4. DO SIGILO, DA ÉTICA E DA LGPD</li>
                <li>5. DA MULTA POR RESCISÃO ANTECIPADA E CANCELAMENTO</li>
                <li>6. DO TERMO DE ACEITE</li>
                <li>7. DO CONTRATO EMPRESARIAL</li>
                <li>8. DAS CONSULTAS COM MÉDICOS ESPECIALISTAS
                Quadro Resumo — Principais Condições do Contrato</li>
              </ul>
              <br></br>
              <h3 className="text-bold text-emerald-900 mb-3">
                OBJETOS E CONCEITOS
              </h3>
              <p>O atendimento de telemedicina MÉDICOS CONSULTAS ONLINE, administrada pela empresa N. PERO NEGÓCIOS INOVADORES LTDA, tem como objeto orientar o beneficiário do plano na melhor conduta a ser tomada frente às descrições dos sintomas, inclusive, dos detalhes e especificidades do caso concreto, esclarecendo dúvidas gerais, fornecendo orientações educativas, bem como e principalmente na prevenção das doenças por meio do autocuidado, cujo procedimento será realizado por equipe especializada, composta por enfermeiros e supervisionado por médicos e, no caso da saúde emocional e orientação nutricional, por psicólogos e nutricionistas, conforme relação dos serviços a seguir:

              Telemedicina – Atendimento Médico;
              Psicólogo;
              Orientação Nutricional;
              Os serviços poderão ser usufruídos da seguinte forma:

              Orientação por videochamada – O beneficiário receberá um link de acesso via web </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
