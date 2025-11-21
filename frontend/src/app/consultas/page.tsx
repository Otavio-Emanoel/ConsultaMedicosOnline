'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar,
  Clock,
  Stethoscope,
  Video,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Appointment {
  uuid: string;
  status: string;
  date?: string;
  from?: string;
  to?: string;
  specialty?: {
    name?: string;
    uuid?: string;
  };
  professional?: {
    name?: string;
  };
  beneficiaryUrl?: string;
  detail?: {
    date?: string;
    from?: string;
    to?: string;
  };
}

interface MedicalReferral {
  uuid?: string;
  specialty?: {
    name?: string;
    uuid?: string;
  };
  professional?: {
    name?: string;
  };
  date?: string;
  status?: string;
  description?: string;
}

export default function ConsultasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [referrals, setReferrals] = useState<MedicalReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [beneficiaryUuid, setBeneficiaryUuid] = useState<string | null>(null);

  // Buscar UUID do beneficiário e carregar dados
  useEffect(() => {
    const loadData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Buscar dados do dashboard para obter CPF e UUID do beneficiário
        const dashboardRes = await fetch(`${apiBase}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!dashboardRes.ok) {
          throw new Error('Erro ao buscar dados do dashboard');
        }

        const dashboardData = await dashboardRes.json();
        const cpf = dashboardData?.usuario?.cpf;

        if (!cpf) {
          throw new Error('CPF não encontrado');
        }

        // Buscar beneficiário pelo CPF para obter UUID
        const beneficiaryRes = await fetch(`${apiBase}/rapidoc/beneficiario/${cpf}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!beneficiaryRes.ok) {
          throw new Error('Erro ao buscar beneficiário');
        }

        const beneficiaryData = await beneficiaryRes.json();
        const uuid = beneficiaryData?.uuid;

        if (!uuid) {
          throw new Error('UUID do beneficiário não encontrado');
        }

        setBeneficiaryUuid(uuid);

        // Buscar agendamentos
        const appointmentsRes = await fetch(`${apiBase}/beneficiarios/${uuid}/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          const allAppointments = appointmentsData?.appointments || [];
          
          // Filtrar apenas agendamentos não atendidos (SCHEDULED, PENDING, etc)
          const nonCompletedAppointments = allAppointments.filter((apt: Appointment) => {
            const status = apt?.status?.toUpperCase();
            return status === 'SCHEDULED' || status === 'PENDING' || status === 'CONFIRMED';
          });

          setAppointments(nonCompletedAppointments);
        }

        // Buscar encaminhamentos
        const referralsRes = await fetch(`${apiBase}/beneficiarios/${cpf}/encaminhamentos`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (referralsRes.ok) {
          const referralsData = await referralsRes.json();
          setReferrals(referralsData?.encaminhamentos || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCancelAppointment = async (uuid: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta consulta?')) {
      return;
    }

    setCancelingId(uuid);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        alert('Token não encontrado. Por favor, faça login novamente.');
        return;
      }

      const res = await fetch(`${apiBase}/agendamentos/${uuid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok || res.status === 204) {
        // Remover da lista
        setAppointments((prev) => prev.filter((apt) => apt.uuid !== uuid));
        alert('Consulta cancelada com sucesso!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData?.error || 'Erro ao cancelar consulta');
      }
    } catch (error) {
      console.error('Erro ao cancelar consulta:', error);
      alert('Erro ao cancelar consulta. Tente novamente.');
    } finally {
      setCancelingId(null);
    }
  };

  const handleAccessConsultation = async (appointment: Appointment) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        alert('Token não encontrado. Por favor, faça login novamente.');
        return;
      }

      // Tentar obter o link de acesso
      const res = await fetch(`${apiBase}/agendamentos/${appointment.uuid}/join`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const joinUrl = data?.joinUrl || appointment.beneficiaryUrl;

        if (joinUrl) {
          window.open(joinUrl, '_blank');
        } else {
          alert('Link de acesso não disponível no momento. Tente novamente mais tarde.');
        }
      } else {
        // Se não conseguir o link, tenta usar o beneficiaryUrl direto
        if (appointment.beneficiaryUrl) {
          window.open(appointment.beneficiaryUrl, '_blank');
        } else {
          alert('Link de acesso não disponível no momento. Tente novamente mais tarde.');
        }
      }
    } catch (error) {
      console.error('Erro ao acessar consulta:', error);
      alert('Erro ao acessar consulta. Tente novamente.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return <Badge variant="success">Agendada</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pendente</Badge>;
      case 'COMPLETED':
        return <Badge variant="info">Realizada</Badge>;
      case 'CANCELED':
      case 'CANCELLED':
        return <Badge variant="danger">Cancelada</Badge>;
      default:
        return <Badge>{status || 'Desconhecido'}</Badge>;
    }
  };

  const getReferralStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
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
      <DashboardLayout title="Consultas">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Consultas">
      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/consultas/agendar">
          <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 border-transparent hover:border-primary">
            <CardBody>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    Agendar Consulta
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Escolha data, horário e especialidade
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/consultas/imediato">
          <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 border-transparent hover:border-danger">
            <CardBody>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-danger to-red-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    Atendimento Imediato
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Conecte-se agora com um médico disponível
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-danger" />
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Próximas Consultas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {appointments.length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Encaminhamentos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {referrals.length}
                </p>
              </div>
              <FileText className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Agendadas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {appointments.filter(a => a.status?.toUpperCase() === 'SCHEDULED' || a.status?.toUpperCase() === 'CONFIRMED').length}
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
                  {appointments.filter(a => a.status?.toUpperCase() === 'PENDING').length}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-warning opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Próximas Consultas */}
        <Card>
          <CardHeader
            action={
              <Link href="/consultas/historico">
                <Button variant="ghost" size="sm">
                  Ver histórico
                </Button>
              </Link>
            }
          >
            Próximas Consultas
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Nenhuma consulta agendada
                  </p>
                  <Link href="/consultas/agendar">
                    <Button variant="primary" size="sm">
                      Agendar agora
                    </Button>
                  </Link>
                </div>
              ) : (
                appointments.map((appointment) => {
                  const date = appointment.detail?.date || appointment.date || '';
                  const from = appointment.detail?.from || appointment.from || '';
                  const to = appointment.detail?.to || appointment.to || '';
                  const doctorName = appointment.professional?.name || 'Médico não informado';
                  const specialtyName = appointment.specialty?.name || 'Especialidade não informada';

                  return (
                    <div
                      key={appointment.uuid}
                      className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {specialtyName}
                          </p>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {doctorName}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          {date && (
                            <>
                              <Calendar className="w-4 h-4 mr-1" />
                              {date}
                            </>
                          )}
                          {from && (
                            <>
                              <Clock className="w-4 h-4 ml-3 mr-1" />
                              {from}
                              {to && ` - ${to}`}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {(appointment.status?.toUpperCase() === 'SCHEDULED' || 
                            appointment.status?.toUpperCase() === 'CONFIRMED') && (
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleAccessConsultation(appointment)}
                            >
                              <Video className="w-4 h-4 mr-1" />
                              Acessar Consulta
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelAppointment(appointment.uuid)}
                            disabled={cancelingId === appointment.uuid}
                          >
                            {cancelingId === appointment.uuid ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-1" />
                                Cancelar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>

        {/* Encaminhamentos */}
        <Card>
          <CardHeader>
            Encaminhamentos
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {referrals.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhum encaminhamento encontrado
                  </p>
                </div>
              ) : (
                referrals.map((referral, index) => {
                  const specialtyName = referral.specialty?.name || 'Especialidade não informada';
                  const doctorName = referral.professional?.name || 'Médico não informado';
                  const date = referral.date || 'Data não informada';

                  return (
                    <div
                      key={referral.uuid || index}
                      className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {specialtyName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {doctorName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {date}
                          </p>
                          {referral.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {referral.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {getReferralStatusBadge(referral.status)}
                    </div>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Informações Importantes */}
      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <CardBody>
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Importante sobre suas consultas
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Entre na consulta com até 10 minutos de antecedência</li>
                <li>• Tenha seus exames e documentos em mãos</li>
                <li>• Cancele com pelo menos 3 horas de antecedência</li>
                <li>• Para emergências, use o Atendimento Imediato</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
