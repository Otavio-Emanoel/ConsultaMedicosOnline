"use client"

import { useEffect, useState } from "react"

export default function Footer() {
  const [year, setYear] = useState(2024)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="bg-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h4 className="text-lg font-semibold">Médicos Consultas Online</h4>
          <p className="mt-2 text-gray-400 text-sm">
            N. Pero Negócios Inovadores LTDA
            <br />
            CNPJ: 28.590.077/0001-88
          </p>
        </div>
        <div>
          <h5 className="font-semibold">Contato</h5>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="hover:text-emerald-400 transition" href="tel:+5551995095554">
                (51) 99509-5554
              </a>
            </li>
            <li>
              <a className="hover:text-emerald-400 transition" href="mailto:atendimento@medicosconsultasonline.com.br">
                atendimento@medicosconsultasonline.com.br
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-semibold">Informações</h5>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="hover:text-emerald-400 transition text-lg font-bold" href="#">
                Termos de Aceite
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-semibold">Redes sociais</h5>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href="#"
              aria-label="Instagram"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800 transition"
            >
              <i className="fab fa-instagram" />
              <span className="text-sm">Instagram</span>
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800 transition"
            >
              <i className="fab fa-linkedin" />
              <span className="text-sm">LinkedIn</span>
            </a>
            <a
              href="#"
              aria-label="WhatsApp"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800 transition"
            >
              <i className="fab fa-whatsapp" />
              <span className="text-sm">WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="mt-4 lg:mt-0">
          <img src="/logo.png" alt="Médicos Consultas Online" className="h-10 object-contain" />
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2022–{year}, Médicos Consultas Online. Todos os direitos reservados.</span>
          <a href="#inicio" className="hover:text-emerald-400 transition inline-flex items-center gap-2">
            Voltar ao topo <i className="fas fa-arrow-up text-xs" />
          </a>
        </div>
      </div>
    </footer>
  )
}
