'use client';

import { useEffect, useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import api from '@/lib/api';

interface PlanoCanceladoBlockerProps {
  children: React.ReactNode;
}

export function PlanoCanceladoBlocker({ children }: PlanoCanceladoBlockerProps) {
  const [planoCancelado, setPlanoCancelado] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataCancelamento, setDataCancelamento] = useState<string>('');

  useEffect(() => {
    // TEMPORARIAMENTE COMENTADO: Verificação de status do plano desabilitada para testar performance
    // TODO: Reativar após verificar se está causando lentidão
    /*
    const verificarStatusPlano = async () => {
      try {
        // Obter token atualizado
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          localStorage.setItem('auth_token', token);
        }

        // Buscar assinatura do usuário no Firestore via backend
        // Como não temos um endpoint específico, vamos verificar via dashboard ou criar um endpoint
        // Por enquanto, vamos verificar se há erro 402 (pagamento não em dia) ou verificar diretamente
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setLoading(false);
          return;
        }

        // Verificar status do plano via endpoint específico
        // OTIMIZAÇÃO: Adicionar timeout para não travar se o endpoint estiver lento
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000); // Timeout de 60s
          
          const response = await api.get('/subscription/status-plano', {
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          if (response.data.cancelado) {
            setPlanoCancelado(true);
            setDataCancelamento(response.data.dataCancelamento || '');
          } else {
            setPlanoCancelado(false);
          }
        } catch (err: any) {
          // Se der erro 401, usuário não está autenticado, não bloqueia
          if (err.response?.status === 401) {
            setPlanoCancelado(false);
          } else if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
            // Timeout - não bloqueia, permite acesso
            setPlanoCancelado(false);
          } else if (err.response?.status === 404) {
            // Endpoint não encontrado - não bloqueia (pode não estar implementado)
            console.warn('Endpoint /subscription/status-plano não encontrado (404)');
            setPlanoCancelado(false);
          } else {
            // Em caso de erro, não bloqueia (permite acesso)
            if (process.env.NODE_ENV === 'development') {
              console.error('Erro ao verificar status do plano:', err);
            }
            setPlanoCancelado(false);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do plano:', error);
        setPlanoCancelado(false);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) {
      verificarStatusPlano();
    } else {
      setLoading(false);
    }
    */
    
    // TEMPORÁRIO: Não verificar status do plano - permite acesso sempre
    setPlanoCancelado(false);
    setLoading(false);
  }, []);

  if (loading) {
    return <>{children}</>;
  }

  if (planoCancelado) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl p-8 md:p-12 text-center border-4 border-red-500">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Plano Cancelado
            </h1>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-6 mb-6">
              <div className="flex items-start justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-1" />
                <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                  Seu plano foi cancelado e o acesso aos serviços está bloqueado.
                </p>
              </div>
              
              {dataCancelamento && (
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                  Data do cancelamento: {new Date(dataCancelamento).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>

            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p className="text-base">
                Para reativar seu plano e voltar a utilizar nossos serviços, entre em contato com nosso suporte.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mt-6">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Importante:</strong> Seus dados ficarão salvos por 90 dias após o cancelamento.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => window.location.href = '/cancelar-plano'}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
              >
                Ver Detalhes do Cancelamento
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

