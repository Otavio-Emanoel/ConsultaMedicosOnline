"use client"

import { useEffect, useState } from "react"
import { Phone, Mail, Instagram, Linkedin, MessageCircle, ArrowUp } from "lucide-react"

export default function Footer() {
  const [year, setYear] = useState(2024)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-black text-gray-200 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 grid gap-8 sm:gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div className="col-span-full sm:col-span-2 lg:col-span-1">
          <img src="/logo.png" alt="Médicos Consultas Online" className="h-10 sm:h-12 object-contain mb-3" />
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            N. Pero Negócios Inovadores LTDA
            <br />
            CNPJ: 28.590.077/0001-88
          </p>
        </div>

        {/* Contact */}
        <div>
          <h5 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Contato</h5>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li>
              <a className="inline-flex items-center gap-2 hover:text-emerald-400 transition duration-300" href="tel:+5551995095554">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                (51) 99509-5554
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-2 hover:text-emerald-400 transition duration-300 break-all" href="mailto:atendimento@medicosconsultasonline.com.br">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                atendimento@medicosconsultasonline.com.br
              </a>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <h5 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Informações</h5>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li>
              <a className="hover:text-emerald-400 transition duration-300" href="#">
                Termos de Aceite
              </a>
            </li>
            <li>
              <a className="hover:text-emerald-400 transition duration-300" href="#">
                Política de Privacidade
              </a>
            </li>
            <li>
              <a className="hover:text-emerald-400 transition duration-300" href="#">
                FAQ
              </a>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h5 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Nos siga</h5>
          <div className="flex flex-wrap gap-2">
            <a
              href="#"
              aria-label="Instagram"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-700 hover:bg-emerald-600 hover:border-emerald-600 transition duration-300 group"
            >
              <Instagram className="w-4 h-4 group-hover:text-white" />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-700 hover:bg-emerald-600 hover:border-emerald-600 transition duration-300 group"
            >
              <Linkedin className="w-4 h-4 group-hover:text-white" />
            </a>
            <a
              href="https://wa.me/5551995095554"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-700 hover:bg-emerald-600 hover:border-emerald-600 transition duration-300 group"
            >
              <MessageCircle className="w-4 h-4 group-hover:text-white" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs sm:text-sm text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2022–{year}, Médicos Consultas Online. Todos os direitos reservados.</span>
          <button 
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 hover:text-emerald-400 transition duration-300 group"
          >
            Voltar ao topo
            <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-y-1 transition duration-300" />
          </button>
        </div>
      </div>
    </footer>
  )
}
