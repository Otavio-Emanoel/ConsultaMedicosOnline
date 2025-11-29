"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';

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

export default function NovoAssinantePage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [modalSenha, setModalSenha] = useState<{ senha: string; usuario: any } | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    planoId: '',
    billingType: 'BOLETO' as 'BOLETO' | 'PIX' | 'CREDIT_CARD',
    ciclo: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  });

  useEffect(() => {
    const carregarPlanos = async () => {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' 
          ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) 
          : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const planosResp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/planos`, { headers });
        if (!planosResp.ok) {
          throw new Error('Erro ao buscar planos');
        }
        const planosData = await planosResp.json();
        setPlanos(Array.isArray(planosData) ? planosData : []);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar planos.');
      } finally {
        setLoading(false);
      }
    };

    carregarPlanos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.cpf || !formData.planoId) {
      setError('Preencha todos os campos obrigatórios.');
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

      // Buscar dados do plano selecionado
      const planoSelecionado = planos.find(p => p.id === formData.planoId);
      if (!planoSelecionado) {
        throw new Error('Plano não encontrado.');
      }

      // Criar usuário completo (o backend vai criar beneficiário no Rapidoc se necessário)
      const body = {
        cpf: formData.cpf.replace(/\D/g, ''),
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        dataNascimento: formData.dataNascimento,
        cep: formData.cep,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        planoId: formData.planoId,
        billingType: formData.billingType,
        ciclo: formData.ciclo,
      };

      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/criar-usuario-completo`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Erro ao criar assinante.');
      }

      setResultado(data);
      if (data.usuario?.senhaTemporaria) {
        setModalSenha({
          senha: data.usuario.senhaTemporaria,
          usuario: data.usuario,
        });
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao cadastrar assinante.');
    } finally {
      setCriando(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Cadastrar Novo Assinante">
        <Card>
          <CardBody>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando...</span>
            </div>
          </CardBody>
        </Card>
      </DashboardLayout>
    );
  }

  if (success && resultado) {
    return (
      <DashboardLayout title="Assinante Cadastrado">
        <Card className="border-green-300 dark:border-green-600">
          <CardBody>
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Assinante cadastrado com sucesso!
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
                  setFormData({
                    nome: '',
                    email: '',
                    cpf: '',
                    telefone: '',
                    dataNascimento: '',
                    cep: '',
                    endereco: '',
                    numero: '',
                    complemento: '',
                    bairro: '',
                    cidade: '',
                    estado: '',
                    planoId: '',
                    billingType: 'BOLETO',
                    ciclo: 'MONTHLY',
                  });
                }}>
                  Cadastrar Outro
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Modal de senha */}
        <Dialog open={!!modalSenha} onOpenChange={v => { if (!v) setModalSenha(null); }}>
          <Dialog.Content>
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-500 mr-2" />
                Senha Temporária Gerada
              </h2>
            </div>
            {modalSenha && (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Esta senha deve ser compartilhada com o cliente de forma segura. Recomenda-se que o cliente altere a senha após o primeiro login.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Senha Temporária:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={modalSenha.senha}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(modalSenha.senha);
                        alert('Senha copiada!');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => setModalSenha(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Cadastrar Novo Assinante">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/assinantes')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Cadastrar Novo Assinante
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Preencha os dados abaixo para cadastrar um novo assinante no sistema
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dados Pessoais */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <UserPlus className="w-5 h-5 text-primary mr-2" />
              Dados Pessoais
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CPF *</label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  required
                  maxLength={14}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <Input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
                <Input
                  type="date"
                  value={formData.dataNascimento}
                  onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Endereço */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <Package className="w-5 h-5 text-primary mr-2" />
              Endereço
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">CEP</label>
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  maxLength={9}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Endereço</label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número</label>
                <Input
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Complemento</label>
                <Input
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bairro</label>
                <Input
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cidade</label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  maxLength={2}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Plano e Pagamento */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-primary mr-2" />
              Plano e Pagamento
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plano *</label>
                <select
                  value={formData.planoId}
                  onChange={(e) => setFormData({ ...formData, planoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  required
                >
                  <option value="">Selecione um plano</option>
                  {planos.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.tipo || plano.descricao} - R$ {plano.preco?.toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Forma de Pagamento *</label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="billingType"
                      value="BOLETO"
                      checked={formData.billingType === 'BOLETO'}
                      onChange={() => setFormData({ ...formData, billingType: 'BOLETO' })}
                      className="mr-2"
                    />
                    <span>Boleto</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="billingType"
                      value="PIX"
                      checked={formData.billingType === 'PIX'}
                      onChange={() => setFormData({ ...formData, billingType: 'PIX' })}
                      className="mr-2"
                    />
                    <span>PIX</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="billingType"
                      value="CREDIT_CARD"
                      checked={formData.billingType === 'CREDIT_CARD'}
                      onChange={() => setFormData({ ...formData, billingType: 'CREDIT_CARD' })}
                      className="mr-2"
                    />
                    <span>Cartão de Crédito</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ciclo de Cobrança</label>
                <select
                  value={formData.ciclo}
                  onChange={(e) => setFormData({ ...formData, ciclo: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
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

        {/* Botões */}
        <Card>
          <CardBody>
            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => router.push('/admin/assinantes')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" isLoading={criando} disabled={criando}>
                <UserPlus className="w-5 h-5 mr-2" />
                {criando ? 'Cadastrando...' : 'Cadastrar Assinante'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </DashboardLayout>
  );
}

