"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseApp } from "firebase/app";

declare global {
  interface Window {
    __cmologin_app?: FirebaseApp;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem("");
    setLoading(true);
    try {
      // Firebase Auth login por e-mail/senha
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        setMensagem("Firebase não configurado no frontend. Configure as variáveis NEXT_PUBLIC_FIREBASE_*.");
        setLoading(false);
        return;
      }

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
        setMensagem("Variáveis NEXT_PUBLIC_FIREBASE_* incompletas no frontend.");
        setLoading(false);
        return;
      }

      const [appModule, authModule] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
      ]);

      // Evita reinit em Fast Refresh armazenando em window
      const w = typeof window !== "undefined" ? window : undefined;
      const existingApp = w?.__cmologin_app;
      const app = existingApp || appModule.initializeApp(firebaseConfig);
      if (!existingApp && w) w.__cmologin_app = app;

      const auth = authModule.getAuth(app);
      const cred = await authModule.signInWithEmailAndPassword(auth, email, senha);
      const token = await cred.user.getIdToken();
      try { localStorage.setItem("firebaseToken", token); } catch {}
      setMensagem("Login realizado com sucesso!");
      router.push("/dashboard");
    } catch (err: unknown) {
      setMensagem(err instanceof Error ? err.message : "Falha ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black py-10 px-4">
      <form onSubmit={handleLogin} className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md flex flex-col gap-4 w-full max-w-sm">
        <h2 className="text-xl font-bold">Login</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Use seu e-mail e senha cadastrada no primeiro acesso.</p>

        <label className="text-xs font-medium">E-mail</label>
        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border rounded px-4 py-2"
          autoComplete="username"
        />

        <label className="text-xs font-medium">Senha</label>
        <input
          type="password"
          placeholder="Sua senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          className="border rounded px-4 py-2"
          autoComplete="current-password"
        />

        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-semibold" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {mensagem && (
          <div className="mt-2 text-center text-sm text-zinc-700 dark:text-zinc-200">{mensagem}</div>
        )}

        <div className="flex justify-between items-center mt-2">
          <button
            type="button"
            className="text-sm underline"
            onClick={() => router.push(`/primeiro-acesso${email ? `?cpf=${email}` : ""}`)}
          >
            Primeiro acesso
          </button>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => router.push("/esqueci-senha")}
          >
            Esqueci a senha
          </button>
          <button type="button" className="text-sm underline" onClick={() => router.push("/")}>Voltar ao início</button>
        </div>
      </form>
    </div>
  );
}