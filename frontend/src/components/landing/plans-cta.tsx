import { Calendar, HelpCircle } from "lucide-react"

export default function PlansCTA() {
  return (
    <section id="contratar" className="py-14 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold">Pronto para começar?</h2>
        <p className="mt-2 text-emerald-100">Atendimento 24h, sem carência, com receitas e atestados digitais.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href="#contratar"
            className="px-6 py-3 rounded-full bg-white text-emerald-700 font-semibold shadow-soft hover:bg-emerald-50 inline-flex items-center gap-2 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Contratar agora
          </a>
          <a
            href="/#faq"
            className="px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 inline-flex items-center gap-2 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Tirar dúvidas
          </a>
        </div>
      </div>
    </section>
  )
}
