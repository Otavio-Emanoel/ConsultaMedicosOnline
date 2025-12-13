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
  Users,
  Trash2
} from 'lucide-react';
import { auth } from '@/lib/firebase';

type CancellationStep = 'initial' | 'reasons' | 'retention' | 'confirmation';

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
}

interface Dependente {
  id: string; // ID do Firestore ou UUID
  nome: string;
  cpf: string;
  parentesco?: string;
}

export default function CancelarPlanoPage() {
  const [step, setStep] = useState<CancellationStep>('initial');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState('');
  
  // Estados de dados
  const [cancelError, setCancelError] = useState<string>('');
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [planoInfo, setPlanoInfo] = useState<PlanoInfo | null>(null);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [error, setError] = useState<string>('');
  const [dataCancelamento, setDataCancelamento] = useState<string | null>(null);
  const [loadingRemoverDep, setLoadingRemoverDep] = useState<string | null>(null); // ID do dependente sendo removido

  // Verificar pendências de pagamento
  const [pagamentoEmDia, setPagamentoEmDia] = useState<boolean>(true);

  // Carregar informações iniciais
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoadingData(true);
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          setError('Usuário não autenticado');
          setLoadingData(false);
          return;
        }

        // 1. Buscar Dashboard (Plano e Usuário)
        const dashboardResp = await fetch(`${apiBase}/dashboard`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });

        if (!dashboardResp.ok) throw new Error('Erro ao carregar dados do usuário');
        const dashboardData = await dashboardResp.json();
        
        // Define info do plano
        const assinatura = dashboardData.assinaturas?.[0] || dashboardData.usuario;
        
        if (assinatura?.planoId) {
           // Tenta buscar nome do plano se tiver ID
           try {
             const planosResp = await fetch(`${apiBase}/planos`, {
               headers: { 'ngrok-skip-browser-warning': 'true' }
             });
             if (planosResp.ok) {
                const planos = await planosResp.json();
                const planoDetalhe = Array.isArray(planos) ? planos.find((p: any) => p.id === assinatura.planoId) : null;
                setPlanoInfo({
                    nome: planoDetalhe?.tipo || planoDetalhe?.nome || 'Plano',
                    valor: planoDetalhe?.preco || 0
                });
             }
           } catch {
             setPlanoInfo({ nome: 'Plano Ativo', valor: 0 });
           }
        } else if (assinatura?.plano) {
            setPlanoInfo({
                nome: assinatura.plano.tipo || 'Plano',
                valor: assinatura.plano.preco || 0
            });
        }

        // 2. Buscar Dependentes (via endpoint específico ou dashboard)
        // Se o dashboard já retornar, usamos. Se não, buscamos pelo endpoint de dependentes.
        const userCpf = dashboardData.usuario?.cpf;
        if (userCpf) {
            const depsResp = await fetch(`${apiBase}/dependentes/${userCpf}`, {
              headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
            });
            if (depsResp.ok) {
                const depsData = await depsResp.json();
                // Filtra para não mostrar o próprio titular se ele vier na lista
                const listaFiltrada = (depsData.dependentes || []).filter((d: any) => d.cpf !== userCpf);
                setDependentes(listaFiltrada);
            }
        }

        // 3. Verificar Faturas (Pagamento em dia)
        const faturasResp = await fetch(`${apiBase}/faturas`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });
        if (faturasResp.ok) {
            const faturasData = await faturasResp.json();
            const faturas = faturasData?.faturas || [];
            // Verifica se tem alguma fatura vencida (OVERDUE)
            const temPendente = faturas.some((f: any) => f.status === 'OVERDUE');
            if (temPendente) {
                setPagamentoEmDia(false);
                setError('Você possui faturas em atraso. Regularize para cancelar.');
            }
        }

      } catch (err: any) {
        console.error('Erro inicial:', err);
        setError(err.message || 'Erro ao carregar informações.');
      } finally {
        setLoadingData(false);
      }
    };

    carregarDados();
  }, []);

  const handleReasonToggle = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleRemoveDependente = async (depCpf: string, depId: string) => {
    if (!confirm('Tem certeza que deseja remover este dependente? Esta ação é irreversível.')) return;

    setLoadingRemoverDep(depId);
    setError('');
    
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = localStorage.getItem('token');
        
        // Usar o endpoint de delete criado anteriormente ou genérico
        const resp = await fetch(`${apiBase}/beneficiarios/${depCpf}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        });

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Erro ao remover dependente');
        }

        // Atualizar lista localmente
        setDependentes(prev => prev.filter(d => d.cpf !== depCpf));

    } catch (e: any) {
        setError(e.message);
    } finally {
        setLoadingRemoverDep(null);
    }
  };

  const handleConfirmCancellation = async () => {
    setCancelError('');
    setError('');
    setLoadingCancel(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = localStorage.getItem('token');
      
      // Validação final de dependentes (redundância de segurança)
      if (dependentes.length > 0) {
        throw new Error('Ainda existem dependentes ativos. Remova-os antes de cancelar.');
      }

      if (!pagamentoEmDia) {
        throw new Error('Pagamento em atraso. Regularize sua situação.');
      }
      
      const cancelResponse = await fetch(`${apiBase}/subscription/cancelar-plano`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          reasons: selectedReasons,
          comments: additionalComments
        })
      });
      
      if (!cancelResponse.ok) {
        const errorData = await cancelResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao cancelar plano');
      }
      
      const result = await cancelResponse.json();
      setDataCancelamento(result.dataCancelamento || new Date().toISOString());
      setStep('confirmation');
    } catch (e: any) {
      setCancelError(e.message || 'Erro ao cancelar plano');
      // Se o erro for de dependentes vindo do backend, força recarregar a lista
      if (e.message?.includes('dependentes')) {
         // Opcional: recarregar lista aqui
      }
    } finally {
      setLoadingCancel(false);
    }
  };

  return (
    <DashboardLayout title="Cancelar Plano">
      <div className="max-w-4xl mx-auto">
        
        {/* Step 1: Info e Verificações (Initial) */}
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
                      Atenção ao cancelar
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Acesso imediato a consultas será interrompido.
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Histórico médico pode ficar inacessível.
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0 mt-0.5" />
                        Consultas agendadas serão canceladas.
                      </li>
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Informações do Plano</CardHeader>
              <CardBody>
                {loadingData ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                    <p>Verificando dados...</p>
                  </div>
                ) : (
                  <>
                    {/* Resumo do Plano */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-sm text-gray-500">Plano Atual</p>
                            <p className="text-lg font-bold">{planoInfo?.nome || '—'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-sm text-gray-500">Valor Mensal</p>
                            <p className="text-lg font-bold">R$ {planoInfo?.valor.toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>

                    {/* BLOQUEIO: Dependentes Ativos */}
                    {dependentes.length > 0 && (
                        <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 rounded-xl">
                            <div className="flex items-center gap-2 mb-3 text-red-700 dark:text-red-400">
                                <Users className="w-5 h-5" />
                                <h3 className="font-semibold">Dependentes Ativos Encontrados</h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                Para cancelar seu plano, você deve primeiro remover todos os dependentes vinculados à sua conta.
                            </p>
                            
                            <div className="space-y-2">
                                {dependentes.map(dep => (
                                    <div key={dep.id || dep.cpf} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{dep.nome}</p>
                                            <p className="text-xs text-gray-500">CPF: {dep.cpf}</p>
                                        </div>
                                        <Button 
                                            variant="danger" 
                                            size="sm"
                                            disabled={loadingRemoverDep === (dep.id || dep.cpf)}
                                            onClick={() => handleRemoveDependente(dep.cpf, dep.id || dep.cpf)}
                                        >
                                            {loadingRemoverDep === (dep.id || dep.cpf) ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Trash2 className="w-4 h-4 mr-1" /> Remover
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* BLOQUEIO: Pagamento Atrasado */}
                    {!pagamentoEmDia && (
                        <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl flex items-center gap-3">
                            <XCircle className="w-6 h-6 text-red-600" />
                            <div>
                                <h4 className="font-semibold text-red-700 dark:text-red-400">Pagamento Pendente</h4>
                                <p className="text-sm text-red-600 dark:text-red-300">
                                    Identificamos faturas em atraso. Regularize o pagamento para prosseguir com o cancelamento.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Erros Gerais */}
                    {error && (
                        <div className="mb-4 text-center text-red-600 bg-red-100 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                      <Button variant="outline" onClick={() => window.history.back()}>
                        Voltar
                      </Button>
                      
                      {/* Botão habilitado apenas se sem dependentes e sem dívidas */}
                      <Button 
                        variant="danger" 
                        onClick={() => setStep('reasons')}
                        disabled={dependentes.length > 0 || !pagamentoEmDia}
                        title={dependentes.length > 0 ? "Remova os dependentes primeiro" : ""}
                      >
                        Continuar Cancelamento
                      </Button>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </>
        )}

        {/* Step 2: Motivos (Reasons) */}
        {step === 'reasons' && (
          <Card>
            <CardHeader>Por que você quer cancelar?</CardHeader>
            <CardBody>
              <div className="space-y-3 mb-6">
                {CANCELLATION_REASONS.map((reason) => (
                  <label key={reason} className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedReasons.includes(reason)}
                      onChange={() => handleReasonToggle(reason)}
                      className="w-5 h-5 text-primary rounded"
                    />
                    <span className="ml-3 text-gray-900 dark:text-white">{reason}</span>
                  </label>
                ))}
              </div>

              <textarea
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl"
                placeholder="Comentários adicionais..."
              />

              <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={() => setStep('initial')}>Voltar</Button>
                <Button variant="danger" onClick={() => setStep('retention')}>Próximo</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 3: Retenção (Retention - Confirmação Final) */}
        {step === 'retention' && (
          <Card>
            <CardHeader>Tem certeza?</CardHeader>
            <CardBody>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Ao confirmar, seu plano será cancelado imediatamente e não haverá mais cobranças futuras. 
                Seus dados serão mantidos por um período conforme nossa política de privacidade.
              </p>

              {(error || cancelError) && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error || cancelError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep('reasons')}>Voltar</Button>
                <Button 
                    variant="danger" 
                    onClick={handleConfirmCancellation} 
                    disabled={loadingCancel}
                >
                    {loadingCancel ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Cancelando...</> : 'Confirmar Cancelamento'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 4: Sucesso (Confirmation) */}
        {step === 'confirmation' && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Plano Cancelado</h2>
                <p className="text-gray-600 mb-8">
                  Seu plano foi cancelado em <strong>{dataCancelamento ? new Date(dataCancelamento).toLocaleDateString('pt-BR') : 'hoje'}</strong>.
                </p>
                <Button variant="primary" onClick={() => window.location.href = '/'}>
                  Ir para Início
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}