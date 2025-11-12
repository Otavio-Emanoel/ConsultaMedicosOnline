"use client"

import React, { useState } from "react"

export default function AreaDoCliente() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app we'd send this to a backend. Here we just show success.
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">Área do Cliente — Formulário Rápido</h1>

        {submitted ? (
          <div className="p-4 bg-emerald-50 rounded">
            <p className="text-emerald-700">Obrigado! Recebemos suas informações.</p>
            <p className="mt-2 text-sm text-slate-600">Em um sistema real, aqui encaminharíamos para a área privada ou login.</p>
            <div className="mt-4">
              <a href="/" className="text-emerald-600 hover:underline">Voltar à página inicial</a>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-200 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-200 shadow-sm px-3 py-2"
                required
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-full bg-emerald-600 text-white">Enviar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
