"use client"

export default function TermosSection({ onOpenTermos }: { onOpenTermos?: () => void }) {
  return (
    <section id="termos" className="bg-gradient-to-b from-slate-800 to-slate-900 text-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-700/60 px-4 py-1 text-sm font-medium uppercase tracking-wide">
          Termos de aceite
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold">Transparência total sobre como cuidamos dos seus dados</h2>
        <p className="text-sm sm:text-base text-slate-300">
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
