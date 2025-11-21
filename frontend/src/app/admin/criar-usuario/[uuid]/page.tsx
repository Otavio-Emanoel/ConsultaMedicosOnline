"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Package,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';

interface Beneficiario {
  uuid: string;
  nome: string;
  cpf: string;
  email: string;
  temUsuarioFirestore: boolean;
  temUsuarioAuth: boolean;
  temAssinaturaAsaas: boolean;
}

interface Plano {
  id: string;
  tipo: string;
  descricao: string;
  preco: number;
  periodicidade: string;
  especialidades?: string[];
  uuidRapidocPlano?: string;
  paymentType?: string;
}

export default function CriarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const uuid = params.uuid as string;

  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [billingType, setBillingType] = useState<'BOLETO' | 'PIX'>('BOLETO');
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      setError('');
      try {
        const token = typeof window !== 'undefined' 
          ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) 
          : null;

        if (!token) {
          setError('Token de autenticação não encontrado. Faça login novamente.');
          return;
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        // Buscar beneficiários sem conta
        const beneficiariosResp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/beneficiarios-sem-conta`, { headers });
        if (!beneficiariosResp.ok) {
          throw new Error('Erro ao buscar dados do beneficiário');
        }
        const beneficiariosData = await beneficiariosResp.json();
        const beneficiarioEncontrado = beneficiariosData.beneficiarios?.find((b: Beneficiario) => b.uuid === uuid);
        
        if (!beneficiarioEncontrado) {
          setError('Beneficiário não encontrado.');
          return;
        }
        setBeneficiario(beneficiarioEncontrado);

        // Buscar planos disponíveis
        const planosResp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/planos`);
        if (!planosResp.ok) {
          throw new Error('Erro ao buscar planos');
        }
        const planosData = await planosResp.json();
        setPlanos(Array.isArray(planosData) ? planosData : []);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

    if (uuid) {
      carregarDados();
    }
  }, [uuid]);

  const handleCriarUsuario = async () => {
    if (!beneficiario || !planoSelecionado) {
      setError('Selecione um plano para continuar.');
      return;
    }

    setCriando(true);
    setError('');
    setSuccess(false);

    try {
      const token = typeof window !== 'undefined' 
        ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) 
        : null;

      if (!token) {
        throw new Error('Token de autenticação não encontrado.');
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Determinar ciclo baseado na periodicidade
      const periodicidade = (planoSelecionado.periodicidade || '').toLowerCase();
      let ciclo: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY';
      if (periodicidade.includes('tri')) ciclo = 'QUARTERLY';
      if (periodicidade.includes('anu')) ciclo = 'YEARLY';

      const body = {
        beneficiarioUuid: beneficiario.uuid,
        cpf: beneficiario.cpf,
        nome: beneficiario.nome,
        email: beneficiario.email,
        planoId: planoSelecionado.id,
        billingType,
        ciclo,
      };

      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/criar-usuario-completo`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Erro ao criar usuário.');
      }

      setResultado(data);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar usuário.');
    } finally {
      setCriando(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Criar Usuário">
        <Card>
          <CardBody>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando dados...</span>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  if (error && !beneficiario) {
    return (
      <DashboardLayout title="Criar Usuário">
        <Card className="border-red-300 dark:border-red-600">
          <CardBody>
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button variant="outline" onClick={() => router.push('/admin/assinantes')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Assinantes
              </Button>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  if (success && resultado) {
    return (
      <DashboardLayout title="Usuário Criado">
        <Card className="border-green-300 dark:border-green-600">
          <CardBody>
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Usuário criado com sucesso!
              </h2>
              <div className="mt-6 space-y-2 text-left max-w-md mx-auto bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div><strong>Nome:</strong> {resultado.usuario?.nome}</div>
                <div><strong>Email:</strong> {resultado.usuario?.email}</div>
                <div><strong>CPF:</strong> {resultado.usuario?.cpf}</div>
                <div><strong>Plano:</strong> {resultado.plano?.tipo}</div>
                <div><strong>Valor:</strong> R$ {resultado.plano?.valor?.toFixed(2).replace('.', ',')}</div>
                <div><strong>Assinatura ID:</strong> {resultado.assinatura?.id}</div>
              </div>
              <div className="mt-6 flex gap-4 justify-center">
                <Button variant="primary" onClick={() => router.push('/admin/assinantes')}>
                  Voltar para Assinantes
                </Button>
                <Button variant="outline" onClick={() => {
                  setSuccess(false);
                  setResultado(null);
                }}>
                  Criar Outro Usuário
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Criar Usuário">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/assinantes')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Criar Usuário para Beneficiário
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Selecione um plano e confirme a criação do usuário
        </p>
      </div>

      {/* Dados do Beneficiário */}
      {beneficiario && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <UserPlus className="w-5 h-5 text-primary mr-2" />
              Dados do Beneficiário
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Nome</label>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{beneficiario.nome}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{beneficiario.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">CPF</label>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{beneficiario.cpf}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Status</label>
                <div className="flex gap-2 mt-1">
                  <Badge variant={beneficiario.temUsuarioFirestore ? 'success' : 'warning'}>
                    Firestore: {beneficiario.temUsuarioFirestore ? 'Sim' : 'Não'}
                  </Badge>
                  <Badge variant={beneficiario.temUsuarioAuth ? 'success' : 'warning'}>
                    Auth: {beneficiario.temUsuarioAuth ? 'Sim' : 'Não'}
                  </Badge>
                  <Badge variant={beneficiario.temAssinaturaAsaas ? 'success' : 'warning'}>
                    Asaas: {beneficiario.temAssinaturaAsaas ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Seleção de Plano */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center">
            <Package className="w-5 h-5 text-primary mr-2" />
            Selecionar Plano
          </div>
        </CardHeader>
        <CardBody>
          {planos.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">Nenhum plano disponível.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planos.map((plano) => (
                <Card
                  key={plano.id}
                  className={`cursor-pointer transition-all ${
                    planoSelecionado?.id === plano.id
                      ? 'border-primary border-2 bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setPlanoSelecionado(plano)}
                >
                  <CardBody>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plano.tipo}
                      </h3>
                      {planoSelecionado?.id === plano.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {plano.descricao}
                    </p>
                    <div className="flex items-baseline mb-3">
                      <span className="text-2xl font-bold text-primary">
                        R$ {plano.preco.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        /{plano.periodicidade?.toLowerCase() || 'mês'}
                      </span>
                    </div>
                    {plano.especialidades && plano.especialidades.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {plano.especialidades.length} especialidade(s)
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Forma de Pagamento */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-primary mr-2" />
            Forma de Pagamento
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="billingType"
                value="BOLETO"
                checked={billingType === 'BOLETO'}
                onChange={() => setBillingType('BOLETO')}
                className="mr-2"
              />
              <span>Boleto</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="billingType"
                value="PIX"
                checked={billingType === 'PIX'}
                onChange={() => setBillingType('PIX')}
                className="mr-2"
              />
              <span>PIX</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Erro */}
      {error && (
        <Card className="mb-6 border-red-300 dark:border-red-600">
          <CardBody>
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Botão de Confirmação */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              {planoSelecionado && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total a ser cobrado:</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {planoSelecionado.preco.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCriarUsuario}
              isLoading={criando}
              disabled={!planoSelecionado || criando}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {criando ? 'Criando Usuário...' : 'Confirmar e Criar Usuário'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}

