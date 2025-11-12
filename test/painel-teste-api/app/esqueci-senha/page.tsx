'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem('');
    setLoading(true);
    try {
      const resp = await fetch(`${API}/usuario/recuperar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setMensagem('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      } else {
        setMensagem(data.error || 'Erro ao enviar e-mail de recuperação.');
      }
    } catch {
      setMensagem('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black py-10 px-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md flex flex-col gap-4 w-full max-w-sm">
        <h2 className="text-xl font-bold">Recuperar Senha</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Digite seu e-mail cadastrado para receber o link de redefinição de senha.</p>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border rounded px-4 py-2"
          required
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-semibold" disabled={loading}>
          {loading ? "Enviando..." : "Enviar e-mail de recuperação"}
        </button>
        {mensagem && (
          <div className="mt-2 text-center text-sm text-zinc-700 dark:text-zinc-200">{mensagem}</div>
        )}
      </form>
    </div>
  );
}