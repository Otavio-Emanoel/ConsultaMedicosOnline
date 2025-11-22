'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  AlertCircle,
  XCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { auth } from '@/lib/firebase';

type CancellationStep = 'initial' | 'reasons' | 'confirmation';

const CANCELLATION_REASONS = [
  'Preço muito alto',
  'Não estou usando o serviço',
  'Encontrei uma alternativa melhor',
  'Atendimento insatisfatório',
  'Dificuldade de agendamento',
  'Mudança de plano de saúde',
  'Outro motivo',
];

interface PlanoInfo {
  nome: string;
  valor: number;
  dependentes: number;
}

export default function CancelarPlanoPage() {
  const [step, setStep] = useState<CancellationStep>('initial');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataCancelamento, setDataCancelamento] = useState<string>('');
  const [planoInfo, setPlanoInfo] = useState<PlanoInfo | null>(null);
  const [loadingPlano, setLoadingPlano] = useState(true);

  useEffect(() => {
    // Obter token do Firebase para usar nas requisições
    const setupAuth = async () => {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token', token);
      }
    };
    setupAuth();
  }, []);

  useEffect(() => {
    // Buscar dados do plano do usuário
    const buscarDadosPlano = async () => {
      try {
        setLoadingPlano(true);
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('auth_token') : null;
        
        if (!token) {
          setLoadingPlano(false);
          return;
        }

        // Buscar dados do dashboard que contém informações da assinatura
        const response = await fetch(`${apiBase}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setLoadingPlano(false);
          return;
        }

        const data = await response.json();
        
        // Buscar assinatura ativa
        const assinaturas = data.assinaturas || [];
        const assinaturaAtiva = assinaturas.find((a: any) => a.status === 'ATIVA') || assinaturas[0];
        
        if (!assinaturaAtiva) {
          setLoadingPlano(false);
          return;
        }

        // Buscar dados do plano
        let nomePlano = 'Plano não identificado';
        let valorPlano = 0;
        
        // Primeiro, tentar usar dados do snapshot (mais rápido e confiável)
        if (assinaturaAtiva.planoSnapshot) {
          nomePlano = assinaturaAtiva.planoSnapshot.tipo || assinaturaAtiva.planoSnapshot.nome || nomePlano;
          valorPlano = assinaturaAtiva.planoSnapshot.preco || assinaturaAtiva.planoSnapshot.valor || assinaturaAtiva.planoSnapshot.precoMensal || 0;
        }
        
        // Se não tiver snapshot ou dados incompletos, buscar do Firestore
        if ((!nomePlano || nomePlano === 'Plano não identificado' || valorPlano === 0) && assinaturaAtiva.planoId) {
          try {
            const planoResponse = await fetch(`${apiBase}/planos/${assinaturaAtiva.planoId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (planoResponse.ok) {
              const planoData = await planoResponse.json();
              if (!nomePlano || nomePlano === 'Plano não identificado') {
                nomePlano = planoData.tipo || planoData.nome || nomePlano;
              }
              if (valorPlano === 0) {
                valorPlano = planoData.preco || planoData.valor || planoData.precoMensal || 0;
              }
            }
          } catch (err) {
            console.error('Erro ao buscar dados do plano:', err);
          }
        }
        
        // Se ainda não tiver valor, tentar buscar do Asaas via assinatura
        if (valorPlano === 0 && assinaturaAtiva.idAssinatura) {
          try {
            const asaasResponse = await fetch(`${apiBase}/subscription/payment-details/${assinaturaAtiva.idAssinatura}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            if (asaasResponse.ok) {
              const asaasData = await asaasResponse.json();
              if (asaasData.pagamento?.value) {
                valorPlano = asaasData.pagamento.value;
              }
            }
          } catch (err) {
            console.error('Erro ao buscar valor do Asaas:', err);
          }
        }

        // Contar dependentes
        const dependentes = data.beneficiarios?.length || data.numeroDependentes || 0;

        setPlanoInfo({
          nome: nomePlano,
          valor: valorPlano,
          dependentes: dependentes,
        });
      } catch (error) {
        console.error('Erro ao buscar dados do plano:', error);
      } finally {
        setLoadingPlano(false);
      }
    };

    buscarDadosPlano();
  }, []);

  const handleReasonToggle = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleConfirmCancellation = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Obter token atualizado
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        localStorage.setItem('auth_token', token);
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || localStorage.getItem('token') : null;
      
      if (!token) {
        setError('Sessão expirada. Por favor, faça login novamente.');
        setLoading(false);
        return;
      }

      if (!apiBase) {
        setError('Configuração da API não encontrada. Por favor, entre em contato com o suporte.');
        setLoading(false);
        return;
      }

      // Garantir que a URL termina sem barra e adicionar /api se necessário
      let baseUrl = apiBase.trim();
      if (!baseUrl.endsWith('/api')) {
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
        }
        if (!baseUrl.endsWith('/api')) {
          baseUrl = `${baseUrl}/api`;
        }
      }

      const response = await fetch(`${baseUrl}/subscription/cancelar-plano`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reasons: selectedReasons,
          comments: additionalComments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao processar resposta do servidor.' }));
        setError(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setDataCancelamento(data.dataCancelamento);
        setStep('confirmation');
      } else {
        setError(data.error || 'Erro ao cancelar plano.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao cancelar plano. Tente novamente.';
      setError(errorMessage);
      
      // Se o erro for sobre não ter pago os 3 meses, mostrar mensagem específica
      if (err.response?.status === 403) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Cancelar Plano">
      <div className="max-w-4xl mx-auto">
        {/* Initial Warning */}
        {step === 'initial' && (
          <>
            <Card className="mb-6 border-2 border-yellow-400 dark:border-yellow-600">
              <CardBody>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Antes de cancelar, considere:
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Você perderá acesso imediato a consultas com especialistas
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Seu histórico médico ficará inacessível
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Dependentes cadastrados serão removidos
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Consultas agendadas serão canceladas automaticamente
                      </li>
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Seu Plano Atual</CardHeader>
              <CardBody>
                {loadingPlano ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Carregando informações do plano...</p>
                  </div>
                ) : planoInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Plano
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {planoInfo.nome}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Valor Mensal
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        R$ {planoInfo.valor.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Dependentes
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {planoInfo.dependentes} {planoInfo.dependentes === 1 ? 'ativo' : 'ativos'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">Não foi possível carregar as informações do plano.</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={() => window.history.back()}>
                    Voltar ao Dashboard
                  </Button>
                  <Button variant="danger" onClick={() => setStep('reasons')}>
                    <XCircle className="w-5 h-5 mr-2" />
                    Continuar com Cancelamento
                  </Button>
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {/* Cancellation Reasons */}
        {step === 'reasons' && (
          <Card>
            <CardHeader>Por que você quer cancelar?</CardHeader>
            <CardBody>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Selecione um ou mais motivos (opcional)
              </p>

              <div className="space-y-3 mb-6">
                {CANCELLATION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedReasons.includes(reason)}
                      onChange={() => handleReasonToggle(reason)}
                      className="w-5 h-5 text-primary focus:ring-primary rounded"
                    />
                    <span className="ml-3 text-gray-900 dark:text-white">
                      {reason}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comentários Adicionais (opcional)
                </label>
                <textarea
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Conte-nos mais sobre sua decisão..."
                />
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={() => setStep('initial')}>
                  Voltar
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleConfirmCancellation}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      Confirmar Cancelamento
                    </>
                  )}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Confirmation */}
        {step === 'confirmation' && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-danger" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Plano Cancelado
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Seu plano foi cancelado com sucesso.
                </p>
                {dataCancelamento && (
                  <p className="text-sm text-gray-500 mb-8">
                    Seu plano foi cancelado em{' '}
                    <strong>{new Date(dataCancelamento).toLocaleDateString('pt-BR')}</strong>
                  </p>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl mb-8">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Sentiremos sua falta!</strong> Você pode reativar
                    sua assinatura a qualquer momento. Seus dados ficarão
                    salvos por 90 dias.
                  </p>
                </div>

                <Button variant="primary" onClick={() => window.location.href = '/'}>
                  Ir para Página Inicial
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
