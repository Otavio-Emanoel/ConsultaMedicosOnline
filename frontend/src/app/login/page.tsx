//Login Page
'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Stethoscope, Shield, CreditCard, Heart, Mail, Lock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type UserRole = 'admin' | 'subscriber' | 'dependent';

export default function HomePage() {
  const router = useRouter();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');

  const selectedRole: UserRole = isAdminMode ? 'admin' : 'subscriber';

  const [erro, setErro] = useState<string>("");
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!selectedRole) { setErro('Por favor, selecione um perfil'); return; }

    // 1. Verifica tipo do usuário no backend
    let tipoReal: string | null = null;
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
      const resp = await fetch(`${API_BASE}/auth/tipo-usuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      tipoReal = (data.tipo || null);
    } catch {
      setErro('Erro ao verificar tipo da conta.');
      return;
    }

    // Normaliza nomes possíveis
    const mapTipo: Record<string, UserRole> = {
      'admin': 'admin',
      'administrador': 'admin',
      'subscriber': 'subscriber',
      'assinante': 'subscriber',
      'dependent': 'dependent',
      'dependente': 'dependent',
    };
    const tipoNormalizado = tipoReal ? (mapTipo[String(tipoReal).toLowerCase()] || null) : null;

    if (!tipoNormalizado) {
      setErro('Conta não encontrada. Verifique o email digitado.');
      return;
    }
    if (tipoNormalizado !== selectedRole) {
      const nomes: Record<UserRole, string> = {
        admin: 'Administrador',
        subscriber: 'Assinante',
        dependent: 'Dependente',
      };
      setErro(`Este email pertence a uma conta do tipo "${nomes[tipoNormalizado]}". Selecione o perfil correto para continuar.`);
      return;
    }

    // 2. Login Firebase Auth
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      // Busca dados extras do Firestore
      let userDoc: any = null;
      try {
        const q = query(collection(db, 'usuarios'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) userDoc = snap.docs[0].data();
      } catch {}
      localStorage.setItem('token', await user.getIdToken());
      localStorage.setItem('user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: userDoc?.nome || user.displayName || '',
        role: userDoc?.tipo || selectedRole,
        ...userDoc
      }));
      const redirectMap = {
        admin: '/admin/dashboard',
        subscriber: '/dashboard',
        dependent: '/dependente/dashboard',
      };
      router.push(redirectMap[selectedRole]);
    } catch (err: any) {
      setErro('Email ou senha inválidos.');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${
      isAdminMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-green-50 via-white to-green-50'
    }`}>
      <div className="w-full max-w-md">
        {/* Botão Voltar */}
        <button
          onClick={() => isAdminMode ? setIsAdminMode(false) : router.push('/landing')}
          aria-label="Voltar para o início"
          className={`fixed top-4 left-4 z-50 inline-flex items-center gap-2 px-4 py-3 text-sm rounded-full shadow-lg transition ${
            isAdminMode
              ? 'text-white bg-slate-700 hover:bg-slate-600'
              : 'text-white bg-green-600 hover:bg-emerald-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="ml-2 text-sm font-medium">
            {isAdminMode ? 'Voltar para login' : 'Voltar para o início'}
          </span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          {!isAdminMode ? (
            <>
              <div className="mb-4">
                <img src="/logo.png" alt="Consultas Online" className="w-20 h-20 object-contain mx-auto" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Boas-vindas!</h1>
              <p className="text-lg text-gray-600">Sua saúde online em todo lugar.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-slate-300" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Área Administrativa</h1>
              <p className="text-slate-400">Acesso restrito para administradores</p>
            </>
          )}
        </div>

        {/* Card de Login */}
        <Card className={isAdminMode ? 'bg-slate-800 border-slate-700' : ''}>
          <CardBody>
            {isAdminMode && (
              <div className="mb-6 text-center">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain mx-auto" />
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              {isNewUser && !isAdminMode && (
                <>
                  <Input 
                    label="Nome completo" 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Seu nome" 
                    required 
                  />
                  <Input 
                    label="CPF" 
                    type="text" 
                    value={cpf} 
                    onChange={(e) => setCpf(e.target.value)} 
                    placeholder="000.000.000-00" 
                    required 
                  />
                </>
              )}
              
              <Input 
                label={isAdminMode ? "E-mail administrativo" : "E-mail"}
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                icon={<Mail className="w-5 h-5" />} 
                placeholder={isAdminMode ? "admin@medicosconsultas.com.br" : "seu@email.com"}
                required 
              />
              
              <Input 
                label="Senha" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                icon={<Lock className="w-5 h-5" />} 
                placeholder="••••••••" 
                required 
              />

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => router.push('/esqueci-senha')}
                  className={`text-sm hover:underline ${
                    isAdminMode ? 'text-slate-400 hover:text-slate-300' : 'text-primary hover:text-green-700'
                  }`}
                >
                  Esqueci minha senha
                </button>
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className={`w-full ${
                  isAdminMode 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary'
                }`}
              >
                {isAdminMode ? 'Acessar painel' : (isNewUser ? 'Criar conta' : 'Entrar')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              {!isAdminMode && (
                <div className="text-center">
                  {isNewUser ? (
                    <button
                      type="button"
                      onClick={() => setIsNewUser(false)}
                      className="text-sm text-primary hover:underline"
                    >
                      Já tem conta? Fazer login
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push('/planos')}
                      className="text-sm text-primary hover:underline"
                    >
                      Primeiro acesso? Criar conta
                    </button>
                  )}
                </div>
              )}
            </form>
            
            {erro && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-800 dark:text-red-200 text-center">{erro}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Link alternador Admin/Assinante */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            className={`text-sm transition-colors inline-flex items-center gap-1 ${
              isAdminMode 
                ? 'text-slate-400 hover:text-slate-300' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {isAdminMode ? '🔓 Conexão segura e criptografada' : '🔐 Acesso administrativo'}
          </button>
        </div>

        {/* Cards informativos - apenas para modo assinante */}
        {!isAdminMode && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">10+ Especialidades</h3>
              <p className="text-xs text-gray-600">Especialistas</p>
            </div>
            
            <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">100% Seguro</h3>
              <p className="text-xs text-gray-600">Atendimento</p>
            </div>
            
            <div className="text-center p-4 bg-white rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">24h</h3>
              <p className="text-xs text-gray-600">Atendimento</p>
            </div>
          </div>
        )}

        <p className={`text-center text-xs mt-8 ${isAdminMode ? 'text-slate-500' : 'text-gray-500'}`}>
          © 2025 Consultas Médicos Online. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
