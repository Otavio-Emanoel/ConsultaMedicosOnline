'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Search,
  User,
  Calendar,
  Stethoscope,
  Loader2,
  AlertCircle,
  Download,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface MedicalReferral {
  uuid?: string;
  specialty?: {
    name?: string;
    uuid?: string;
  };
  professional?: {
    name?: string;
  };
  beneficiary?: {
    name?: string;
    cpf?: string;
    uuid?: string;
  };
  date?: string;
  status?: string;
  description?: string;
  notes?: string;
  expirationDate?: string;
  urlPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function EncaminhamentosPage() {
  const [referrals, setReferrals] = useState<MedicalReferral[]>([]);
  const [allReferrals, setAllReferrals] = useState<MedicalReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Buscar encaminhamentos do backend - UMA ÚNICA CHAMADA usando CPF do token
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadReferrals = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          if (mounted) setLoading(false);
          return;
        }

        // UMA ÚNICA CHAMADA: Buscar encaminhamentos do usuário logado (usa CPF do token)
        const referralsTimeout = setTimeout(() => controller.abort(), 15000); // Timeout de 15s
        
        let referralsRes;
        try {
          referralsRes = await fetch(`${apiBase}/encaminhamentos/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          clearTimeout(referralsTimeout);
        } catch (error: any) {
          clearTimeout(referralsTimeout);
          if (error.name === 'AbortError' || !mounted) return;
          throw error;
        }

        if (!mounted) return;

        if (referralsRes.ok) {
          const referralsData = await referralsRes.json();
          const encaminhamentos = referralsData?.encaminhamentos || [];
          
          // Ordenar por data de criação (mais recentes primeiro)
          const sorted = [...encaminhamentos].sort((a: MedicalReferral, b: MedicalReferral) => {
            // Priorizar createdAt, depois updatedAt, depois date
            const dateA = a.createdAt || a.updatedAt || a.date || '';
            const dateB = b.createdAt || b.updatedAt || b.date || '';
            
            if (!dateA || !dateB) return 0;
            
            try {
              // Formato: dd/MM/yyyy HH:mm:ss ou dd/MM/yyyy
              const parseDate = (dateStr: string) => {
                const parts = dateStr.split(' ');
                const datePart = parts[0]; // dd/MM/yyyy
                const [day, month, year] = datePart.split('/');
                return new Date(`${year}-${month}-${day}`);
              };
              
              const parsedA = parseDate(dateA);
              const parsedB = parseDate(dateB);
              return parsedB.getTime() - parsedA.getTime();
            } catch {
              return 0;
            }
          });

          if (mounted) {
            setAllReferrals(sorted);
            setReferrals(sorted);
          }
        } else {
          // Se der erro, retornar array vazio (encaminhamentos são opcionais)
          if (mounted) {
            setAllReferrals([]);
            setReferrals([]);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || !mounted) return;
        
        console.error('Erro ao carregar encaminhamentos:', error);
        // Em caso de erro, retornar array vazio (encaminhamentos são opcionais)
        if (mounted) {
          setAllReferrals([]);
          setReferrals([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReferrals();

    // Cleanup: cancela requisições se componente desmontar
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // Filtrar encaminhamentos
  useEffect(() => {
    const filtered = allReferrals.filter((ref) => {
      const matchesSearch =
        (ref.specialty?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ref.professional?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ref.beneficiary?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ref.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const statusUpper = ref.status?.toUpperCase() || '';
      const matchesStatus =
        filterStatus === 'all' || 
        (filterStatus === 'pending' && statusUpper === 'PENDING') ||
        (filterStatus === 'unfinished' && statusUpper === 'UNFINISHED') ||
        (filterStatus === 'non_schedulable' && statusUpper === 'NON_SCHEDULABLE') ||
        (filterStatus === 'active' && (statusUpper === 'ACTIVE' || statusUpper === 'VALID')) ||
        (filterStatus === 'used' && statusUpper === 'USED') ||
        (filterStatus === 'expired' && statusUpper === 'EXPIRED');

      return matchesSearch && matchesStatus;
    });

    setReferrals(filtered);
  }, [searchTerm, filterStatus, allReferrals]);

  const getReferralStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'PENDING':
        return <Badge variant="info">Pendente</Badge>;
      case 'UNFINISHED':
        return <Badge variant="warning">Não Finalizado</Badge>;
      case 'NON_SCHEDULABLE':
        return <Badge variant="danger">Não Agendável</Badge>;
      case 'ACTIVE':
      case 'VALID':
        return <Badge variant="success">Ativo</Badge>;
      case 'USED':
        return <Badge variant="info">Utilizado</Badge>;
      case 'EXPIRED':
        return <Badge variant="danger">Expirado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Encaminhamentos">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando encaminhamentos...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Encaminhamentos">
      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Buscar por especialidade, médico ou paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* Filtro por Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendente</option>
                <option value="unfinished">Não Finalizado</option>
                <option value="non_schedulable">Não Agendável</option>
                <option value="active">Ativos</option>
                <option value="used">Utilizados</option>
                <option value="expired">Expirados</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lista de Encaminhamentos */}
      <div className="space-y-4">
        {referrals.length > 0 ? (
          referrals.map((referral, index) => {
            const specialtyName = referral.specialty?.name || 'Especialidade não informada';
            const doctorName = referral.professional?.name || 'Médico não informado';
            const patientName = referral.beneficiary?.name || 'Você';
            const date = referral.date || referral.createdAt?.split(' ')[0] || 'Data não informada';
            const description = referral.description || referral.notes || '';
            const createdAt = referral.createdAt || '';
            const updatedAt = referral.updatedAt || '';
            const urlPath = referral.urlPath;

            return (
              <Card key={referral.uuid || index}>
                <CardBody>
                  <div className="flex flex-col md:flex-row md:items-start justify-between space-y-4 md:space-y-0">
                    {/* Informações Principais */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {specialtyName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {patientName}
                            </p>
                          </div>
                          {getReferralStatusBadge(referral.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {createdAt && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              Criado em: {createdAt}
                            </div>
                          )}
                          {updatedAt && updatedAt !== createdAt && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              Atualizado em: {updatedAt}
                            </div>
                          )}
                        </div>

                        {description && (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {description}
                            </p>
                          </div>
                        )}

                        {referral.expirationDate && (
                          <div className="mt-2 text-xs text-gray-500">
                            Válido até: {referral.expirationDate}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {urlPath && (
                      <div className="flex items-center">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => window.open(urlPath, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Ver Arquivo
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {allReferrals.length === 0 
                    ? 'Nenhum encaminhamento encontrado'
                    : 'Nenhum encaminhamento corresponde aos filtros'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {allReferrals.length === 0
                    ? 'Você ainda não possui encaminhamentos médicos'
                    : 'Tente ajustar os filtros ou termos de busca'}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Estatísticas */}
      {allReferrals.length > 0 && (
        <Card className="mt-6">
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {allReferrals.filter((r) => r.status?.toUpperCase() === 'PENDING').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Pendentes
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-warning">
                  {allReferrals.filter((r) => r.status?.toUpperCase() === 'UNFINISHED').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Não Finalizados
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-danger">
                  {allReferrals.filter((r) => r.status?.toUpperCase() === 'NON_SCHEDULABLE').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Não Agendáveis
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {allReferrals.filter((r) => r.status?.toUpperCase() === 'ACTIVE' || r.status?.toUpperCase() === 'VALID').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Ativos
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {allReferrals.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </DashboardLayout>
  );
}

