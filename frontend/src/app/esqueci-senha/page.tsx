"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sendPasswordResetEmail } from "firebase/auth"
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import { auth } from "@/lib/firebase"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export default function EsqueciSenhaPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    try {
      await sendPasswordResetEmail(auth, email)
      setStatus("success")
      setMessage("Enviamos um link de redefinição para o seu e-mail.")
    } catch (err: any) {
      setStatus("error")
      const code = err?.code || "auth/error"
      const friendly = code === "auth/user-not-found"
        ? "Não encontramos uma conta com esse e-mail."
        : "Não foi possível enviar o e-mail. Tente novamente."
      setMessage(friendly)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 md:p-8 border border-gray-100">
        <button
          onClick={() => router.push("/login")}
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para login
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Redefinir senha</h1>
          <p className="text-sm text-gray-600">Informe seu e-mail para receber o link de redefinição.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5" />}
            placeholder="voce@exemplo.com"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Enviando..." : "Enviar link"}
          </Button>
        </form>

        {status !== "idle" && message && (
          <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
            status === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
              : "bg-red-50 text-red-800 border border-red-100"
          }`}>
            {status === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            )}
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  )
}
