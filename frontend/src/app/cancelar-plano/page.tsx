'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  AlertCircle,
  XCircle,
  Heart,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
} from 'lucide-react';

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

const RETENTION_OFFERS = [
  {
    id: 1,
    icon: DollarSign,
    title: '3 Meses com 30% de Desconto',
    description: 'Aproveite nosso plano por apenas R$ 104,93/mês',
    highlight: 'Economia de R$ 134,91',
  },
  {
    id: 2,
    icon: Users,
    title: 'Inclua Mais Dependentes Grátis',
    description: 'Adicione até 2 dependentes sem custo adicional',
    highlight: 'Por tempo limitado',
  },
  {
    id: 3,
    icon: Calendar,
    title: 'Pausar Assinatura',
    description: 'Pause por até 3 meses sem perder seus benefícios',
    highlight: 'Volte quando quiser',
  },
];

export default function CancelarPlanoPage() {
  const [step, setStep] = useState<CancellationStep>('initial');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string>('');
  const [loadingCancel, setLoadingCancel] = useState(false);

  // Corrigido: handleReasonToggle estava com escopo e lógica quebrados
  const handleReasonToggle = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  // Corrigido: handleConfirmCancellation duplicado e escopo errado
  const handleConfirmCancellation = async () => {
    setCancelError('');
    setLoadingCancel(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Usuário não autenticado');
      // Verifica pagamento em dia
      const resp = await fetch(`${apiBase}/faturas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Erro ao consultar faturas');
      const data = await resp.json();
      const emDia = Array.isArray(data?.faturas)
        ? data.faturas.some((f: any) => f.status === 'RECEIVED' || f.status === 'PAID')
        : false;
      if (!emDia) {
        setCancelError('Não é possível cancelar: pagamento não está em dia. Regularize sua situação para prosseguir.');
        setLoadingCancel(false);
        return;
      }
      // Aqui faria a chamada à API de cancelamento de fato
      setStep('confirmation');
    } catch (e: any) {
      setCancelError(e.message || 'Erro ao cancelar plano');
    } finally {
      setLoadingCancel(false);
    }
  };

  const handleAcceptOffer = () => {
    // Aqui faria a chamada à API para aceitar oferta
    // Exemplo: setStep('confirmation');
    setStep('confirmation');
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Plano
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      Premium Familiar
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Valor Mensal
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      R$ 149,90
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Dependentes
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      3 ativos
                    </p>
                  </div>
                </div>

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

              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={() => setStep('initial')}>
                  Voltar
                </Button>
                <Button variant="primary" onClick={() => setStep('retention')}>
                  Continuar
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Retention Offers */}
        {step === 'retention' && (
          <>
            <div className="text-center mb-6">
              <Heart className="w-16 h-16 text-danger mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Não queremos que você vá!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Temos ofertas especiais apenas para você
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {RETENTION_OFFERS.map((offer) => {
                const Icon = offer.icon;
                return (
                  <button
                    key={offer.id}
                    onClick={() => setSelectedOffer(offer.id)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      selectedOffer === offer.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        selectedOffer === offer.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {offer.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {offer.description}
                    </p>
                    <div className="inline-block px-3 py-1 bg-success/10 text-success text-xs font-semibold rounded-full">
                      {offer.highlight}
                    </div>
                  </button>
                );
              })}
            </div>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setStep('reasons')}
                    >
                      Voltar
                    </Button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="primary"
                      onClick={handleAcceptOffer}
                      disabled={!selectedOffer}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Aceitar Oferta
                    </Button>
                    <Button variant="danger" onClick={handleConfirmCancellation} disabled={loadingCancel}>
                      {loadingCancel ? 'Cancelando...' : 'Cancelar Mesmo Assim'}
                    </Button>
                  </div>
                </div>
                {cancelError && (
                  <div className="mt-4 text-red-600 dark:text-red-400 text-sm">{cancelError}</div>
                )}
              </CardBody>
            </Card>
          </>
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
                <p className="text-sm text-gray-500 mb-8">
                  Você terá acesso aos serviços até o fim do período pago em{' '}
                  <strong>15/12/2025</strong>
                </p>

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