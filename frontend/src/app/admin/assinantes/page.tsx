"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Users,
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  UserPlus,
  Package,
  AlertCircle,
  RefreshCw,
  Key,
  Copy,
  EyeOff,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { auth } from '@/lib/firebase';

// Corrigido: definição da interface AssinanteItem estava fora do lugar e sem o "interface"
interface AssinanteItem {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  plano: string;
  planoId?: string; // Adicionado para corresponder ao uso no código
  status: string;
  dataAdesao: string;
  ultimoPagamento: string;
  dependentes: number;
  valorMensal: number;
  faturas?: any[];
}

interface AssinaturaDoc {
  id: string;
  cpfUsuario: string;
  planoId?: string;
  planoTipo?: string;
  planoDescricao?: string;
  planoPreco?: number;
  dataInicio?: string; // YYYY-MM-DD
  ciclo?: string;
  formaPagamento?: string;
}

interface UsuarioDoc {
  planoId?: string;
  planoRapidocUuid?: string;
  paymentType?: string;
  cpf: string;
  nome?: string;
  email?: string;
}

interface BeneficiarioSemConta {
  uuid: string;
  nome: string;
  cpf: string;
  email: string;
  temUsuarioFirestore: boolean;
  temUsuarioAuth: boolean;
  uuidRapidocPlano?: string;
  temAssinaturaAsaas: boolean;
}

function formatarDataBR(dataISO: string | null | undefined) {
  if (!dataISO) return '—';
  return dataISO.split('-').reverse().join('/');
}

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [d, m, y] = value.split('/');
    return `${y}-${m}-${d}`;
  }
  return value;
};

export default function AdminAssinantesPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [searchTerm, setSearchTerm] = useState('');
  const [assinantes, setAssinantes] = useState<AssinanteItem[]>([]);
  const [assinantesPagamentos, setAssinantesPagamentos] = useState<Record<string, string>>({});
  const [modalAssinante, setModalAssinante] = useState<AssinanteItem | null>(null);
  const [modalFaturas, setModalFaturas] = useState<any[] | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [beneficiariosSemConta, setBeneficiariosSemConta] = useState<BeneficiarioSemConta[]>([]);
  const [loadingBeneficiarios, setLoadingBeneficiarios] = useState<boolean>(false);
  const [mostrarBeneficiariosSemConta, setMostrarBeneficiariosSemConta] = useState<boolean>(false);
  const [modalSenha, setModalSenha] = useState<{ cpf: string; nome: string; email: string; senha: string } | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);
  const [gerandoSenha, setGerandoSenha] = useState<boolean>(false);
  const [modalEditar, setModalEditar] = useState<AssinanteItem | null>(null);
  const [modalCadastrarVida, setModalCadastrarVida] = useState<{ cpfTitular: string; nomeTitular: string } | null>(null);
  const [dependentes, setDependentes] = useState<any[]>([]);
  const [loadingDependentes, setLoadingDependentes] = useState<boolean>(false);
  const [dependentesError, setDependentesError] = useState<string>('');
  const [planos, setPlanos] = useState<any[]>([]);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroPlano, setFiltroPlano] = useState<string>('');
  const [dependenteEmEdicao, setDependenteEmEdicao] = useState<any | null>(null);
  const [dependenteLocalForm, setDependenteLocalForm] = useState({
    nome: '',
    cpf: '',
    birthDate: '',
    parentesco: '',
    email: '',
    phone: '',
    zipCode: '',
    address: '',
    city: '',
    state: '',
  });
  const [dependenteRapidocForm, setDependenteRapidocForm] = useState({
    serviceType: '',
    paymentType: '',
    email: '',
    phone: '',
    zipCode: '',
    address: '',
    city: '',
    state: '',
    cpf: '',
  });
  const [salvandoDependenteLocal, setSalvandoDependenteLocal] = useState(false);
  const [salvandoDependenteRapidoc, setSalvandoDependenteRapidoc] = useState(false);

  const getAuthToken = async () => {
    try {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(true);
      }
    } catch {
      // ignore and fallback to storage
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    }
    return null;
  };

  const buildAuthHeaders = async () => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    } as HeadersInit;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Pega token do localStorage se existir (tenta ambos os nomes possíveis)
        const token = typeof window !== 'undefined' 
          ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) 
          : null;
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [assinaturasResp, usuariosResp] = await Promise.all([
          fetch(`${API_BASE}/assinaturas`, { headers }),
          fetch(`${API_BASE}/usuarios`, { headers }),
        ]);
        if (!assinaturasResp.ok) throw new Error('Erro ao buscar assinaturas');
        if (!usuariosResp.ok) throw new Error('Erro ao buscar usuários');
        const assinaturasData: AssinaturaDoc[] = await assinaturasResp.json();
        const usuariosData: UsuarioDoc[] = await usuariosResp.json();

        const usuarioPorCpf = new Map<string, UsuarioDoc>();
        usuariosData.forEach(u => { if (u.cpf) usuarioPorCpf.set(u.cpf, u); });

        const itens: AssinanteItem[] = assinaturasData.map(a => {
          const usuario = usuarioPorCpf.get(a.cpfUsuario);
          const nome = usuario?.nome || '—';
          const email = usuario?.email || '—';
          const cpf = a.cpfUsuario;
          const plano = a.planoDescricao || a.planoTipo || a.planoId || 'Plano';
          const valorMensal = typeof a.planoPreco === 'number' ? a.planoPreco : 0;
          const dataAdesaoISO = a.dataInicio || '';
          const dataAdesao = dataAdesaoISO
            ? dataAdesaoISO.split('-').reverse().join('/')
            : '—';
          let status = 'pendente';
          if (a.formaPagamento && a.dataInicio) status = 'ativo';
          const ultimoPagamento = '—';
          return {
            id: a.id,
            nome,
            email,
            cpf,
            plano,
            status,
            dataAdesao,
            ultimoPagamento,
            dependentes: 0,
            valorMensal,
            planoId: a.planoId,
            planoRapidocUuid: (a as any).uuidRapidocPlano || (a as any).planoUuidRapidoc,
            paymentType: (a as any).paymentType,
          };
        });
        setAssinantes(itens);

        // Buscar último pagamento para cada assinante (paralelo, mas limitado)
        const pagamentos: Record<string, string> = {};
        await Promise.all(itens.map(async (a) => {
          try {
            const resp = await fetch(`${API_BASE}/faturas?cpf=${a.cpf}`, { headers });
            if (!resp.ok) throw new Error('Erro ao buscar faturas');
            const data = await resp.json();
            const faturas = data.faturas || [];
            const pagas = faturas.filter((f: any) => f.status === 'RECEIVED');
            if (pagas.length > 0) {
              // Pega a mais recente
              pagas.sort((a: any, b: any) => new Date(b.paymentDate || b.dueDate).getTime() - new Date(a.paymentDate || a.dueDate).getTime());
              pagamentos[a.cpf] = formatarDataBR(pagas[0].paymentDate || pagas[0].dueDate);
            } else {
              pagamentos[a.cpf] = '—';
            }
          } catch {
            pagamentos[a.cpf] = '—';
          }
        }));
        setAssinantesPagamentos(pagamentos);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Falha ao carregar assinantes.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const buscarBeneficiariosSemConta = async () => {
    setLoadingBeneficiarios(true);
    setError('');
    try {
      const headers = await buildAuthHeaders();

      const resp = await fetch(`${API_BASE}/admin/beneficiarios-sem-conta`, { headers });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro ${resp.status}: ${resp.statusText}`);
      }
      
      const data = await resp.json();
      setBeneficiariosSemConta(data.beneficiarios || []);
      setMostrarBeneficiariosSemConta(true);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar beneficiários sem conta.');
    } finally {
      setLoadingBeneficiarios(false);
    }
  };

  const gerarNovaSenha = async (cpf: string, nome: string, email: string) => {
    setGerandoSenha(true);
    try {
      const headers = await buildAuthHeaders();

      const resp = await fetch(`${API_BASE}/admin/gerar-nova-senha`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cpf }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Erro ao gerar nova senha.');
      }

      setModalSenha({
        cpf: data.usuario?.cpf || cpf,
        nome: data.usuario?.nome || nome,
        email: data.usuario?.email || email,
        senha: data.senhaTemporaria,
      });
      setMostrarSenha(false);
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar nova senha.');
    } finally {
      setGerandoSenha(false);
    }
  };

  const copiarSenha = () => {
    if (modalSenha?.senha) {
      navigator.clipboard.writeText(modalSenha.senha);
      // Feedback visual pode ser adicionado aqui
    }
  };

  const buscarDependentes = async (cpf: string) => {
    setLoadingDependentes(true);
    setDependentesError('');
    try {
      const headers = await buildAuthHeaders();
      const resp = await fetch(`${API_BASE}/dependentes/${cpf}`, { headers });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao buscar dependentes (${resp.status})`);
      }
      const data = await resp.json();
      setDependentes(data.dependentes || []);
    } catch (e: any) {
      setDependentesError(e?.message || 'Erro ao buscar dependentes');
      setDependentes([]);
    } finally {
      setLoadingDependentes(false);
    }
  };

  const ativarVida = async (cpf: string) => {
    try {
      const headers = await buildAuthHeaders();
      
      const resp = await fetch(`${API_BASE}/admin/beneficiarios/${cpf}/ativar-rapidoc`, {
        method: 'POST',
        headers,
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao ativar vida');
      }
      // Atualiza estado local: status ativo
      setAssinantes(prev => prev.map(a => a.cpf === cpf ? { ...a, status: 'ativo' } : a));
      if (modalAssinante && modalAssinante.cpf === cpf) {
        setModalAssinante({ ...modalAssinante, status: 'ativo' });
      }
      if (modalAssinante) buscarDependentes(modalAssinante.cpf);
    } catch (e: any) {
      setError(e?.message || 'Erro ao ativar vida');
    }
  };

  const inativarVida = async (cpf: string) => {
    if (!confirm('Tem certeza que deseja inativar esta vida?')) return;
    try {
      const headers = await buildAuthHeaders();
      
      const resp = await fetch(`${API_BASE}/admin/beneficiarios/${cpf}/inativar-rapidoc`, {
        method: 'POST',
        headers,
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao inativar vida');
      }
      // Atualiza estado local: status suspenso
      setAssinantes(prev => prev.map(a => a.cpf === cpf ? { ...a, status: 'suspenso' } : a));
      if (modalAssinante && modalAssinante.cpf === cpf) {
        setModalAssinante({ ...modalAssinante, status: 'suspenso' });
      }
      if (modalAssinante) buscarDependentes(modalAssinante.cpf);
    } catch (e: any) {
      setError(e?.message || 'Erro ao inativar vida');
    }
  };

  const removerDependente = async (cpf: string) => {
    if (!confirm('Tem certeza que deseja remover este dependente? Esta ação não pode ser desfeita.')) return;
    try {
      const headers = await buildAuthHeaders();
      
      const resp = await fetch(`${API_BASE}/beneficiarios/${cpf}`, {
        method: 'DELETE',
        headers,
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao remover dependente');
      }
      // Recarregar lista de dependentes
      if (modalAssinante) {
        buscarDependentes(modalAssinante.cpf);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao remover dependente');
    }
  };

  const buscarPlanos = async () => {
    try {
      const headers = await buildAuthHeaders().catch(() => ({ 'Content-Type': 'application/json' } as HeadersInit));
      const resp = await fetch(`${API_BASE}/planos`, { headers });
      if (!resp.ok) throw new Error('Erro ao buscar planos');
      const data = await resp.json();
      setPlanos(data || []);
    } catch (e: any) {
      console.error('Erro ao buscar planos:', e);
    }
  };

  const abrirEdicaoDependente = (dep: any) => {
    setDependenteEmEdicao(dep);
    setDependenteLocalForm({
      nome: dep.nome || '',
      cpf: dep.cpf || '',
      birthDate: toDateInputValue(dep.birthDate),
      parentesco: dep.parentesco || '',
      email: dep.email || '',
      phone: dep.phone || '',
      zipCode: dep.zipCode || '',
      address: dep.address || '',
      city: dep.city || '',
      state: dep.state || '',
    });
    setDependenteRapidocForm({
      serviceType: dep.serviceType || '',
      paymentType: dep.paymentType || '',
      email: dep.email || '',
      phone: dep.phone || '',
      zipCode: dep.zipCode || '',
      address: dep.address || '',
      city: dep.city || '',
      state: dep.state || '',
      cpf: dep.cpf || '',
    });
  };

  const fecharEdicaoDependente = () => {
    setDependenteEmEdicao(null);
    setSalvandoDependenteLocal(false);
    setSalvandoDependenteRapidoc(false);
    setDependenteLocalForm({
      nome: '',
      cpf: '',
      birthDate: '',
      parentesco: '',
      email: '',
      phone: '',
      zipCode: '',
      address: '',
      city: '',
      state: '',
    });
    setDependenteRapidocForm({
      serviceType: '',
      paymentType: '',
      email: '',
      phone: '',
      zipCode: '',
      address: '',
      city: '',
      state: '',
      cpf: '',
    });
  };

  const salvarDependenteLocal = async (e: FormEvent) => {
    e.preventDefault();
    if (!dependenteEmEdicao) return;
    setSalvandoDependenteLocal(true);
    setDependentesError('');
    try {
      const headers = await buildAuthHeaders();
      const body: any = {};
      ['nome', 'birthDate', 'parentesco', 'email', 'phone', 'zipCode', 'address', 'city', 'state'].forEach((key) => {
        const val = (dependenteLocalForm as any)[key];
        if (val) body[key] = val;
      });
      if (dependenteLocalForm.cpf && dependenteLocalForm.cpf !== dependenteEmEdicao.cpf) {
        body.cpf = dependenteLocalForm.cpf;
      }
      body.holder = modalAssinante?.cpf || dependenteEmEdicao.holder;

      const resp = await fetch(`${API_BASE}/dependentes/${dependenteEmEdicao.cpf}/local`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao atualizar dependente local (${resp.status})`);
      }
      const data = await resp.json();
      setDependentes(data.dependentes || []);
      if (data.warning) {
        alert(data.warning);
      }
      fecharEdicaoDependente();
    } catch (e: any) {
      setDependentesError(e?.message || 'Erro ao atualizar dependente (local)');
    } finally {
      setSalvandoDependenteLocal(false);
    }
  };

  const salvarDependenteRapidoc = async (e: FormEvent) => {
    e.preventDefault();
    if (!dependenteEmEdicao) return;
    setSalvandoDependenteRapidoc(true);
    setDependentesError('');
    try {
      const headers = await buildAuthHeaders();
      const body: any = {};
      ['serviceType', 'paymentType', 'email', 'phone', 'zipCode', 'address', 'city', 'state'].forEach((key) => {
        const val = (dependenteRapidocForm as any)[key];
        if (val) body[key] = val;
      });
      if (dependenteRapidocForm.cpf && dependenteRapidocForm.cpf !== dependenteEmEdicao.cpf) {
        body.cpf = dependenteRapidocForm.cpf;
      }

      const resp = await fetch(`${API_BASE}/dependentes/${dependenteEmEdicao.cpf}/rapidoc`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao atualizar dependente no Rapidoc (${resp.status})`);
      }
      const data = await resp.json();
      setDependentes(data.dependentes || []);
      fecharEdicaoDependente();
    } catch (e: any) {
      setDependentesError(e?.message || 'Erro ao atualizar dependente no Rapidoc');
    } finally {
      setSalvandoDependenteRapidoc(false);
    }
  };

  useEffect(() => {
    buscarPlanos();
  }, []);

  useEffect(() => {
    if (modalCadastrarVida && modalAssinante?.planoId) {
      setPlanoSelecionadoId(String(modalAssinante.planoId));
    }
  }, [modalCadastrarVida, modalAssinante]);

  const filteredAssinantes = useMemo(() => {
    return assinantes
      .map(a => ({
        ...a,
        ultimoPagamento: assinantesPagamentos[a.cpf] || '—',
      }))
      .filter(a =>
        a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.cpf.includes(searchTerm)
      )
      .filter(a => (filtroStatus ? a.status === filtroStatus : true))
      .filter(a => (filtroPlano ? a.plano === filtroPlano : true));
  }, [assinantes, assinantesPagamentos, searchTerm, filtroStatus, filtroPlano]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="success">Ativo</Badge>;
      case 'pendente':
        return <Badge variant="warning">Pendente</Badge>;
      case 'suspenso':
        return <Badge variant="danger">Suspenso</Badge>;
      default:
        return <Badge>Desconhecido</Badge>;
    }
  };

  return (
    <DashboardLayout title="Gerenciar Assinantes">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Assinantes do Sistema
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize e gerencie todos os usuários assinantes
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Assinantes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {assinantes.length}
                </p>
              </div>
              <Users className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Ativos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {assinantes.filter(a => a.status === 'ativo').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-success opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Pendentes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {assinantes.filter(a => a.status === 'pendente').length}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-warning opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Suspensos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {assinantes.filter(a => a.status === 'suspenso').length}
                </p>
              </div>
              <Ban className="w-10 h-10 text-danger opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Seção de Beneficiários sem Conta */}
      <Card className="mb-6 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Beneficiários sem Conta de Usuário
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={buscarBeneficiariosSemConta}
              isLoading={loadingBeneficiarios}
              disabled={loadingBeneficiarios}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingBeneficiarios ? 'animate-spin' : ''}`} />
              Buscar do Rapidoc
            </Button>
          </div>
        </CardHeader>
        {mostrarBeneficiariosSemConta && (
          <CardBody>
            {loadingBeneficiarios ? (
              <p className="text-gray-600 dark:text-gray-400">Carregando beneficiários...</p>
            ) : beneficiariosSemConta.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  Todos os beneficiários do Rapidoc já possuem conta de usuário ou assinatura no Asaas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Encontrados <strong>{beneficiariosSemConta.length}</strong> beneficiário(s) sem conta de usuário e sem cobrança no Asaas:
                </p>
                {beneficiariosSemConta.map((beneficiario) => (
                  <Card key={beneficiario.uuid} className="bg-orange-50 dark:bg-orange-900/20">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {beneficiario.nome}
                            </h3>
                            <Badge variant="warning">Sem Conta</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div>📧 {beneficiario.email}</div>
                            <div>🆔 {beneficiario.cpf}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              Firestore: {beneficiario.temUsuarioFirestore ? '✓' : '✗'} | 
                              Auth: {beneficiario.temUsuarioAuth ? '✓' : '✗'} | 
                              Asaas: {beneficiario.temAssinaturaAsaas ? '✓' : '✗'}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              router.push(`/admin/criar-usuario/${beneficiario.uuid}`);
                            }}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Criar Usuário
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="relative">
              <Button variant="outline" onClick={() => setShowFilters(v => !v)}>
                <Filter className="w-5 h-5 mr-2" />
                Filtros
              </Button>
              {showFilters && (
                <div className="absolute z-20 mt-2 right-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Status</p>
                    <select
                      value={filtroStatus}
                      onChange={(e) => setFiltroStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="">Todos</option>
                      <option value="ativo">Ativo</option>
                      <option value="pendente">Pendente</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Plano</p>
                    <select
                      value={filtroPlano}
                      onChange={(e) => setFiltroPlano(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="">Todos</option>
                      {planos.map((plano: any) => {
                        const label = plano.tipo || plano.descricao || plano.id;
                        return (
                          <option key={plano.id} value={label}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setFiltroStatus(''); setFiltroPlano(''); }}>
                      Limpar
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setShowFilters(false)}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Loading / Erro */}
      {loading && (
        <Card className="mb-6">
          <CardBody>
            <p className="text-gray-600 dark:text-gray-400">Carregando assinantes...</p>
          </CardBody>
        </Card>
      )}
      {error && !loading && (
        <Card className="mb-6 border border-red-300 dark:border-red-600">
          <CardBody>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => {
              setLoading(true); setError('');
              (async () => {
                try {
                  const token = typeof window !== 'undefined' 
                    ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) 
                    : null;
                  const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                  };
                  if (token) headers['Authorization'] = `Bearer ${token}`;
                  const [assinaturasResp, usuariosResp] = await Promise.all([
                    fetch(`${API_BASE}/assinaturas`, { headers }),
                    fetch(`${API_BASE}/usuarios`, { headers }),
                  ]);
                  if (!assinaturasResp.ok) throw new Error('Erro ao buscar assinaturas');
                  if (!usuariosResp.ok) throw new Error('Erro ao buscar usuários');
                  const assinaturasData: AssinaturaDoc[] = await assinaturasResp.json();
                  const usuariosData: UsuarioDoc[] = await usuariosResp.json();
                  const usuarioPorCpf = new Map<string, UsuarioDoc>();
                  usuariosData.forEach(u => { if (u.cpf) usuarioPorCpf.set(u.cpf, u); });
                  const itens: AssinanteItem[] = assinaturasData.map(a => {
                    const usuario = usuarioPorCpf.get(a.cpfUsuario);
                    const nome = usuario?.nome || '—';
                    const email = usuario?.email || '—';
                    const cpf = a.cpfUsuario;
                    const plano = a.planoDescricao || a.planoTipo || a.planoId || 'Plano';
                    const valorMensal = typeof a.planoPreco === 'number' ? a.planoPreco : 0;
                    const dataAdesaoISO = a.dataInicio || '';
                    const dataAdesao = dataAdesaoISO ? dataAdesaoISO.split('-').reverse().join('/') : '—';
                    let status = 'pendente';
                    if (a.formaPagamento && a.dataInicio) status = 'ativo';
                    const ultimoPagamento = '—';
                    return { id: a.id, nome, email, cpf, plano, status, dataAdesao, ultimoPagamento, dependentes: 0, valorMensal };
                  });
                  setAssinantes(itens);
                } catch (e: any) {
                  setError(e?.message || 'Falha ao carregar assinantes.');
                } finally { setLoading(false); }
              })();
            }}>Tentar novamente</Button>
          </CardBody>
        </Card>
      )}

      {/* Lista de Assinantes */}
      <div className="space-y-4">
        {!loading && !error && filteredAssinantes.map((assinante) => (
          <Card key={assinante.id} className="hover:shadow-lg transition-shadow">
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assinante.nome}
                      </h3>
                      {getStatusBadge(assinante.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div>📧 {assinante.email}</div>
                      <div>🆔 {assinante.cpf}</div>
                      <div className="flex items-center">
                        <Package className="w-4 h-4 mr-1" />
                        {assinante.plano}
                      </div>
                      <div className="flex items-center">
                        <UserPlus className="w-4 h-4 mr-1" />
                        {assinante.dependentes} dependentes
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Adesão: {assinante.dataAdesao}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3 ml-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Valor mensal</p>
                    <p className="text-xl font-bold text-primary">
                      R$ {assinante.valorMensal.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={async () => {
                      setModalAssinante(assinante);
                      setModalLoading(true);
                      setModalFaturas(null);
                      setDependentes([]);
                      try {
                        const token = typeof window !== 'undefined' 
                          ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) 
                          : null;
                        const headers: HeadersInit = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                        const [faturasResp] = await Promise.all([
                          fetch(`${API_BASE}/faturas?cpf=${assinante.cpf}`, { headers }),
                        ]);
                        if (faturasResp.ok) {
                          const data = await faturasResp.json();
                          setModalFaturas(data.faturas || []);
                        }
                        // Buscar dependentes
                        buscarDependentes(assinante.cpf);
                      } catch {
                        setModalFaturas([]);
                      } finally {
                        setModalLoading(false);
                      }
                    }}>
                      <Eye className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setModalEditar(assinante)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => gerarNovaSenha(assinante.cpf, assinante.nome, assinante.email)}
                      isLoading={gerandoSenha}
                      disabled={gerandoSenha}
                    >
                      <Key className="w-4 h-4 mr-1" />
                      Nova Senha
                    </Button>
                    {assinante.status === 'ativo' ? (
                      <Button variant="danger" size="sm" onClick={() => inativarVida(assinante.cpf)}>
                        <Ban className="w-4 h-4 mr-1" />
                        Suspender
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => ativarVida(assinante.cpf)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        {/* Modal de detalhes do assinante */}
        <Dialog open={!!modalAssinante} onOpenChange={v => { if (!v) { setModalAssinante(null); setModalFaturas(null); setDependentes([]); } }}>
          <Dialog.Content>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Detalhes do Assinante</h2>
            </div>
            {modalAssinante && (
              <div className="space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-2">
                  <div><b>Nome:</b> {modalAssinante.nome}</div>
                  <div><b>Email:</b> {modalAssinante.email}</div>
                  <div><b>CPF:</b> {modalAssinante.cpf}</div>
                  <div><b>Plano:</b> {modalAssinante.plano}</div>
                  <div><b>Status:</b> {getStatusBadge(modalAssinante.status)}</div>
                  <div><b>Data de adesão:</b> {modalAssinante.dataAdesao}</div>
                  <div><b>Valor mensal:</b> R$ {modalAssinante.valorMensal.toFixed(2).replace('.', ',')}</div>
                </div>

                {/* Seção de Dependentes/Vidas */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold">Dependentes/Vidas</h3>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => {
                        setPlanoSelecionadoId(String(modalAssinante.planoId || ''));
                        setModalCadastrarVida({ cpfTitular: modalAssinante.cpf, nomeTitular: modalAssinante.nome });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Cadastrar Nova Vida
                    </Button>
                  </div>
                  {dependentesError && !loadingDependentes && (
                    <div className="mb-2 text-sm text-red-500">{dependentesError}</div>
                  )}
                  {loadingDependentes ? (
                    <p className="text-sm text-gray-500">Carregando dependentes...</p>
                  ) : dependentesError ? (
                    <p className="text-sm text-red-500">{dependentesError}</p>
                  ) : dependentes.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum dependente cadastrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {dependentes.map((dep: any) => (
                        <div key={dep.id || dep.cpf} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{dep.nome}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              CPF: {dep.cpf} {dep.cortesia && <Badge variant="warning" className="ml-2">Cortesia</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => abrirEdicaoDependente(dep)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => dep.isActive !== false ? inativarVida(dep.cpf) : ativarVida(dep.cpf)}
                            >
                              {dep.isActive !== false ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => removerDependente(dep.cpf)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog>

        {/* Modal de edição de dependente */}
        <Dialog open={!!dependenteEmEdicao} onOpenChange={v => { if (!v) fecharEdicaoDependente(); }}>
          <Dialog.Content>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Editar dependente</h2>
              {dependenteEmEdicao && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dependenteEmEdicao.nome} — CPF {dependenteEmEdicao.cpf}
                </p>
              )}
            </div>
            {dependenteEmEdicao && (
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                <form
                  onSubmit={salvarDependenteLocal}
                  className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Atualizar dados locais (Firestore)</h3>
                    <Badge variant="neutral">Somente banco</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nome</label>
                      <Input
                        value={dependenteLocalForm.nome}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">CPF</label>
                      <Input
                        value={dependenteLocalForm.cpf}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, cpf: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
                      <Input
                        type="date"
                        value={dependenteLocalForm.birthDate}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, birthDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Parentesco</label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                        value={dependenteLocalForm.parentesco}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, parentesco: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        <option value="Filho(a)">Filho(a)</option>
                        <option value="Cônjuge">Cônjuge</option>
                        <option value="Pai/Mãe">Pai/Mãe</option>
                        <option value="Irmão(ã)">Irmão(ã)</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input
                        type="email"
                        value={dependenteLocalForm.email}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Telefone</label>
                      <Input
                        value={dependenteLocalForm.phone}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">CEP</label>
                      <Input
                        value={dependenteLocalForm.zipCode}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, zipCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cidade</label>
                      <Input
                        value={dependenteLocalForm.city}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estado</label>
                      <Input
                        value={dependenteLocalForm.state}
                        maxLength={2}
                        onChange={(e) => setDependenteLocalForm({ ...dependenteLocalForm, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" type="button" onClick={fecharEdicaoDependente} disabled={salvandoDependenteLocal || salvandoDependenteRapidoc}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit" isLoading={salvandoDependenteLocal} disabled={salvandoDependenteLocal}>
                      Salvar dados locais
                    </Button>
                  </div>
                </form>

                <form
                  onSubmit={salvarDependenteRapidoc}
                  className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Atualizar Rapidoc</h3>
                    <Badge variant="info">Sincroniza Rapidoc</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Type (UUID do plano Rapidoc)</label>
                      <Input
                        value={dependenteRapidocForm.serviceType}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, serviceType: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Type</label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                        value={dependenteRapidocForm.paymentType}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, paymentType: e.target.value })}
                      >
                        <option value="">Selecione</option>
                        <option value="S">S</option>
                        <option value="A">A</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input
                        type="email"
                        value={dependenteRapidocForm.email}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Telefone</label>
                      <Input
                        value={dependenteRapidocForm.phone}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">CEP</label>
                      <Input
                        value={dependenteRapidocForm.zipCode}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, zipCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Cidade</label>
                      <Input
                        value={dependenteRapidocForm.city}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estado</label>
                      <Input
                        value={dependenteRapidocForm.state}
                        maxLength={2}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">CPF (opcional para sincronizar)</label>
                      <Input
                        value={dependenteRapidocForm.cpf}
                        onChange={(e) => setDependenteRapidocForm({ ...dependenteRapidocForm, cpf: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" type="button" onClick={fecharEdicaoDependente} disabled={salvandoDependenteLocal || salvandoDependenteRapidoc}>
                      Cancelar
                    </Button>
                    <Button variant="primary" type="submit" isLoading={salvandoDependenteRapidoc} disabled={salvandoDependenteRapidoc}>
                      Salvar Rapidoc
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Dialog.Content>
        </Dialog>

        {/* Modal de senha gerada */}
        <Dialog open={!!modalSenha} onOpenChange={v => { if (!v) { setModalSenha(null); setMostrarSenha(false); } }}>
          <Dialog.Content>
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Key className="w-5 h-5 text-primary mr-2" />
                Nova Senha Gerada
              </h2>
            </div>
            {modalSenha && (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Esta senha deve ser compartilhada com o cliente de forma segura. Recomenda-se que o cliente altere a senha após o primeiro login.
                  </p>
                </div>
                <div className="space-y-2">
                  <div><b>Nome:</b> {modalSenha.nome}</div>
                  <div><b>Email:</b> {modalSenha.email}</div>
                  <div><b>CPF:</b> {modalSenha.cpf}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Nova Senha:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={mostrarSenha ? 'text' : 'password'}
                        value={modalSenha.senha}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copiarSenha}
                      title="Copiar senha"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setModalSenha(null);
                      setMostrarSenha(false);
                    }}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog>

        {/* Modal de edição de assinante */}
        <Dialog open={!!modalEditar} onOpenChange={v => { if (!v) setModalEditar(null); }}>
          <Dialog.Content>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Editar Assinante</h2>
            </div>
            {modalEditar && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const dados: any = {};
                formData.forEach((value, key) => {
                  if (value) dados[key] = value;
                });
                try {
                  const headers = await buildAuthHeaders();
                  const resp = await fetch(`${API_BASE}/usuario/${modalEditar.cpf}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(dados),
                  });
                  if (!resp.ok) {
                    const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
                    throw new Error(errorData.error || 'Erro ao atualizar');
                  }
                  setModalEditar(null);
                  window.location.reload();
                } catch (e: any) {
                  setError(e?.message || 'Erro ao editar assinante');
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome</label>
                    <Input name="nome" defaultValue={modalEditar.nome} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input name="email" type="email" defaultValue={modalEditar.email} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CPF</label>
                    <Input name="cpf" value={modalEditar.cpf} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <Input name="telefone" type="tel" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setModalEditar(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" type="submit">
                    Salvar
                  </Button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog>

        {/* Modal de cadastro de vida */}
        <Dialog open={!!modalCadastrarVida} onOpenChange={v => { if (!v) { setModalCadastrarVida(null); setPlanoSelecionadoId(''); } }}>
          <Dialog.Content>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastrar Nova Vida</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Titular: {modalCadastrarVida?.nomeTitular} ({modalCadastrarVida?.cpfTitular})
              </p>
            </div>
            {modalCadastrarVida && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                const formData = new FormData(e.currentTarget);
                const cpfDigits = String(formData.get('cpf') || '').replace(/\D/g, '');
                const planoId = String(formData.get('planoId') || '');
                const phoneDigits = String(formData.get('phone') || '').replace(/\D/g, '');
                const holderDigits = String(modalCadastrarVida.cpfTitular || '').replace(/\D/g, '');

                if (!cpfDigits || cpfDigits.length !== 11) {
                  setError('CPF deve ter 11 dígitos.');
                  return;
                }
                if (!planoId) {
                  setError('Selecione um plano para continuar.');
                  return;
                }
                if (phoneDigits.length !== 11) {
                  setError('Telefone deve ter 11 dígitos (DDD + número).');
                  return;
                }
                if (!holderDigits || holderDigits.length !== 11) {
                  setError('CPF do titular inválido.');
                  return;
                }

                const planoSel = planos.find((p: any) => String(p.id) === planoId);
                const serviceTypeAuto = planoSel?.uuidRapidocPlano || '';
                const paymentTypeAuto = (planoSel?.paymentType || '').toUpperCase();
                if (!planoSel) {
                  setError('Plano selecionado não encontrado.');
                  return;
                }
                if (!serviceTypeAuto) {
                  setError('Plano selecionado está sem UUID Rapidoc configurado.');
                  return;
                }
                const plansPayload = serviceTypeAuto
                  ? [{ paymentType: paymentTypeAuto || undefined, plan: { uuid: serviceTypeAuto } }]
                  : [];

                const dados: any = {
                  nome: formData.get('nome'),
                  cpf: cpfDigits,
                  birthDate: formData.get('birthDate'),
                  email: formData.get('email'),
                  phone: phoneDigits || undefined,
                  zipCode: formData.get('zipCode'),
                  address: formData.get('address'),
                  city: formData.get('city'),
                  state: formData.get('state'),
                  holder: holderDigits,
                  paymentType: paymentTypeAuto || undefined,
                  serviceType: serviceTypeAuto || undefined,
                  plans: plansPayload,
                  cortesia: formData.get('cortesia') === 'on',
                };
                try {
                  setError('');
                  const headers = await buildAuthHeaders();
                  const resp = await fetch(`${API_BASE}/dependentes`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(dados),
                  });
                  if (!resp.ok) {
                    const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
                    throw new Error(errorData.error || 'Erro ao cadastrar vida');
                  }
                  setModalCadastrarVida(null);
                  setPlanoSelecionadoId('');
                  if (modalAssinante) {
                    buscarDependentes(modalAssinante.cpf);
                  }
                  alert('Vida cadastrada com sucesso!');
                } catch (e: any) {
                  setError(e?.message || 'Erro ao cadastrar vida');
                }
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome *</label>
                    <Input name="nome" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CPF *</label>
                    <Input name="cpf" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data de Nascimento *</label>
                    <Input name="birthDate" type="date" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input name="email" type="email" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone</label>
                    <Input name="phone" type="tel" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CEP</label>
                    <Input name="zipCode" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Endereço</label>
                    <Input name="address" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cidade</label>
                    <Input name="city" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Estado</label>
                    <Input name="state" maxLength={2} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Plano</label>
                    <select
                      name="planoId"
                      value={planoSelecionadoId}
                      onChange={(e) => setPlanoSelecionadoId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      required
                    >
                      <option value="">Selecione um plano</option>
                      {planos.map((plano: any) => (
                        <option key={plano.id} value={plano.id}>{plano.tipo || plano.descricao} - R$ {plano.preco?.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Type (do plano)</label>
                    <Input value={planos.find((p: any) => String(p.id) === String(planoSelecionadoId))?.paymentType || ''} readOnly placeholder="Selecione um plano" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Service Type (UUID Rapidoc do plano)</label>
                    <Input value={planos.find((p: any) => String(p.id) === String(planoSelecionadoId))?.uuidRapidocPlano || ''} readOnly placeholder="Selecione um plano" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="cortesia" id="cortesia" />
                  <label htmlFor="cortesia" className="text-sm">
                    Cortesia (não gera faturas)
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setModalCadastrarVida(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" type="submit">
                    Cadastrar
                  </Button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog>

        {!loading && !error && filteredAssinantes.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Nenhum assinante encontrado
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}