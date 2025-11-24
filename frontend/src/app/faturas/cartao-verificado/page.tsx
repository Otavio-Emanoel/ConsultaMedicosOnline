'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function CartaoVerificadoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando pagamento e atualizando forma de pagamento...');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyAndUpdate = async () => {
      try {
        const assinaturaId = searchParams.get('assinaturaId') || localStorage.getItem('cardVerificationAssinaturaId');
        const paymentId = searchParams.get('payment') || localStorage.getItem('cardVerificationPaymentId');

        if (!assinaturaId) {
          setError('ID da assinatura não encontrado.');
          setStatus('error');
          return;
        }

        if (!paymentId) {
          // Tentar obter do URL ou aguardar um pouco para o Asaas processar
          setMessage('Aguardando processamento do pagamento...');
          // Aguardar 3 segundos e tentar novamente
          setTimeout(async () => {
            await verifyAndUpdate();
          }, 3000);
          return;
        }

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (!token) {
          setError('Usuário não autenticado. Por favor, faça login novamente.');
          setStatus('error');
          return;
        }

        // Verificar pagamento e atualizar assinatura
        const response = await fetch(`${apiBase}/subscription/verify-and-update-card/${assinaturaId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao verificar e atualizar cartão');
        }

        // Limpar dados do localStorage
        localStorage.removeItem('cardVerificationPaymentId');
        localStorage.removeItem('cardVerificationAssinaturaId');

        setStatus('success');
        setMessage('Cartão verificado e forma de pagamento atualizada com sucesso!');
      } catch (err: any) {
        console.error('Erro ao verificar cartão:', err);
        setError(err.message || 'Erro ao verificar pagamento. Tente novamente.');
        setStatus('error');
      }
    };

    verifyAndUpdate();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <DashboardLayout title="Verificando Cartão">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  if (status === 'error') {
    return (
      <DashboardLayout title="Erro na Verificação">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                Erro na Verificação
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="primary"
                  onClick={() => router.push('/faturas')}
                >
                  Voltar para Faturas
                </Button>
                <Button
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Cartão Verificado">
      <Card>
        <CardBody>
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Cartão Verificado!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/faturas')}
            >
              Voltar para Faturas
            </Button>
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}

export default function CartaoVerificadoPage() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Verificando Cartão">
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="text-gray-600">Carregando...</div>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    }>
      <CartaoVerificadoContent />
    </Suspense>
  );
}

