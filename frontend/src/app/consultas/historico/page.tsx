'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Calendar,
  Clock,
  Stethoscope,
  FileText,
  Download,
  Search,
  Filter,
  User,
  Loader2,
  ExternalLink,
  FileCheck,
} from 'lucide-react';

type AppointmentStatus = 'completed' | 'cancelled' | 'missed' | 'scheduled';

interface Appointment {
  id: string;
  uuid: string;
  specialty: string;
  doctor: string;
  date: string;
  time: string;
  patient: string;
  status: AppointmentStatus;
  hasReport: boolean;
  from?: string;
  to?: string;
  beneficiaryUrl?: string;
  clinic?: {
    name?: string;
    uuid?: string;
  };
  type?: string;
  medicalReferral?: {
    uuid?: string;
    urlPath?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
  };
}

interface AppointmentApi {
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
  beneficiary?: {
    name?: string;
  };
  detail?: {
    date?: string;
    from?: string;
    to?: string;
    uuid?: string;
  };
  beneficiaryUrl?: string;
  clinic?: {
    name?: string;
    uuid?: string;
  };
  type?: string;
  beneficiaryMedicalReferral?: {
    uuid?: string;
    urlPath?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
  };
}

const STATUS_MAP: Record<
  AppointmentStatus,
  { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }
> = {
  completed: { label: 'Realizada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
  missed: { label: 'Não compareceu', variant: 'warning' },
  scheduled: { label: 'Agendada', variant: 'info' },
};

export default function HistoricoConsultasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');

  // Buscar agendamentos do backend - sem usar dashboard
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadAppointments = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          if (mounted) setLoading(false);
          return;
        }

        // 1. Buscar CPF do usuário logado
        const usuarioRes = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!mounted) return;

        if (!usuarioRes.ok) {
          throw new Error('Erro ao buscar dados do usuário');
        }

        const usuarioData = await usuarioRes.json();
        const cpf = usuarioData?.cpf;

        if (!cpf) {
          throw new Error('CPF não encontrado');
        }

        // 2. Buscar beneficiário no Rapidoc para pegar UUID
        const rapidocRes = await fetch(`${apiBase}/rapidoc/beneficiario/${cpf}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!mounted) return;

        if (!rapidocRes.ok) {
          throw new Error('Erro ao buscar beneficiário no Rapidoc');
        }

        const rapidocData = await rapidocRes.json();
        const rapidocUuid = rapidocData?.uuid; // O endpoint retorna diretamente o beneficiary

        if (!rapidocUuid) {
          throw new Error('UUID do beneficiário não encontrado');
        }

        // 3. Buscar todos os agendamentos do beneficiário (com timeout)
        const appointmentsController = new AbortController();
        const appointmentsTimeout = setTimeout(() => appointmentsController.abort(), 15000); // Timeout de 15s
        
        let appointmentsRes;
        try {
          appointmentsRes = await fetch(`${apiBase}/beneficiarios/${rapidocUuid}/appointments`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: appointmentsController.signal,
          });
          clearTimeout(appointmentsTimeout);
        } catch (error: any) {
          clearTimeout(appointmentsTimeout);
          if (error.name === 'AbortError' || !mounted) return;
          throw error;
        }

        if (!mounted) return;

        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          const apiAppointments: AppointmentApi[] = appointmentsData?.appointments || appointmentsData || [];
          
          // Mapear para o formato da interface (mostrar todas as consultas, não apenas as finalizadas)
          const mappedAppointments: Appointment[] = apiAppointments.map((apt: AppointmentApi) => {
            const date = apt.detail?.date || apt.date || '';
            const from = apt.detail?.from || apt.from || '';
            const to = apt.detail?.to || apt.to || '';
            const doctorName = apt.professional?.name || 'Médico não informado';
            const specialtyName = apt.specialty?.name || 'Especialidade não informada';
            const patientName = apt.beneficiary?.name || 'Você';
            
            // Converter status da API para o formato da interface
            let status: AppointmentStatus = 'completed';
            const apiStatus = apt.status?.toUpperCase();
            if (apiStatus === 'CANCELED' || apiStatus === 'CANCELLED') {
              status = 'cancelled';
            } else if (apiStatus === 'MISSED') {
              // Só marcar como "não compareceu" se a API explicitamente indicar
              status = 'missed';
            } else if (apiStatus === 'COMPLETED') {
              status = 'completed';
            } else if (apiStatus === 'UNFINISHED') {
              // Verificar se a data já passou
              if (date) {
                try {
                  // Converter dd/MM/yyyy para Date
                  const [day, month, year] = date.split('/');
                  const appointmentDate = new Date(`${year}-${month}-${day}`);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  appointmentDate.setHours(0, 0, 0, 0);
                  
                  // Se a data já passou e não há informação de não comparecimento, marcar como "realizada"
                  if (appointmentDate < today) {
                    status = 'completed';
                  } else {
                    status = 'scheduled';
                  }
                } catch (e) {
                  // Se houver erro ao parsear a data, manter como agendada
                  status = 'scheduled';
                }
              } else {
                status = 'scheduled';
              }
            }

            // Formatar hora
            const time = from || '00:00';

            return {
              id: apt.uuid,
              uuid: apt.uuid,
              specialty: specialtyName,
              doctor: doctorName,
              date: date,
              time: time,
              patient: patientName,
              status: status,
              hasReport: false, // Por enquanto, não temos informação de laudo na API
              from: from,
              to: to,
              beneficiaryUrl: apt.beneficiaryUrl,
              clinic: apt.clinic,
              type: apt.type,
              medicalReferral: apt.beneficiaryMedicalReferral,
            };
          });

          // Ordenar por data (mais recentes primeiro)
          mappedAppointments.sort((a, b) => {
            if (!a.date || !b.date) return 0;
            // Converter dd/MM/yyyy para Date
            const [da, ma, aa] = a.date.split('/');
            const [db, mb, ab] = b.date.split('/');
            const dateA = new Date(`${aa}-${ma}-${da}`);
            const dateB = new Date(`${ab}-${mb}-${db}`);
            return dateB.getTime() - dateA.getTime();
          });

          if (mounted) {
            setAllAppointments(mappedAppointments);
            setAppointments(mappedAppointments);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || !mounted) return;
        
        console.error('Erro ao carregar histórico de consultas:', error);
        if (mounted) {
          setLoading(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAppointments();

    // Cleanup: cancela requisições se componente desmontar
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // Filtrar agendamentos
  useEffect(() => {
    const filtered = allAppointments.filter((apt) => {
      const matchesSearch =
        apt.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.patient.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' || apt.status === filterStatus;

      const matchesSpecialty =
        filterSpecialty === 'all' || apt.specialty === filterSpecialty;

      return matchesSearch && matchesStatus && matchesSpecialty;
    });

    setAppointments(filtered);
  }, [searchTerm, filterStatus, filterSpecialty, allAppointments]);

  // Obter lista única de especialidades para o filtro
  const specialties = Array.from(
    new Set(allAppointments.map((apt) => apt.specialty))
  ).sort();

  const handleViewDetails = (uuid: string) => {
    // Buscar o agendamento nos dados locais
    const appointment = allAppointments.find(apt => apt.uuid === uuid);
    
    if (!appointment) {
      alert('Consulta não encontrada');
      return;
    }

    // Construir mensagem com todas as informações disponíveis
    let details = `
📋 DETALHES DA CONSULTA

Especialidade: ${appointment.specialty}
Médico: ${appointment.doctor}
Paciente: ${appointment.patient}
Data: ${appointment.date || 'N/A'}
Horário: ${appointment.from || 'N/A'}${appointment.to ? ` - ${appointment.to}` : ''}
Status: ${STATUS_MAP[appointment.status]?.label || appointment.status}
    `.trim();

    if (appointment.type) {
      const typeLabel = appointment.type === 'scheduled' ? 'Agendada' : 
                       appointment.type === 'immediate' ? 'Imediata' : 
                       appointment.type;
      details += `\nTipo: ${typeLabel}`;
    }

    if (appointment.medicalReferral) {
      details += `\n\n📄 ENCAMINHAMENTO MÉDICO`;
      if (appointment.medicalReferral.status) {
        details += `\nStatus: ${appointment.medicalReferral.status}`;
      }
      if (appointment.medicalReferral.createdAt) {
        details += `\nCriado em: ${appointment.medicalReferral.createdAt}`;
      }
      if (appointment.medicalReferral.updatedAt) {
        details += `\nAtualizado em: ${appointment.medicalReferral.updatedAt}`;
      }
      if (appointment.medicalReferral.urlPath) {
        details += `\n\n🔗 Link do encaminhamento disponível (clique no botão "Ver Encaminhamento")`;
      }
    }

    if (appointment.beneficiaryUrl) {
      details += `\n\n🔗 Link para entrar na consulta disponível (clique no botão "Entrar na Consulta")`;
    }

    alert(details);
  };

  if (loading) {
    return (
      <DashboardLayout title="Histórico de Consultas">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando histórico...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Histórico de Consultas">
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Buscar por especialidade, médico ou paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* Filter by Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todos os status</option>
                <option value="completed">Realizadas</option>
                <option value="scheduled">Agendadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="missed">Não compareceu</option>
              </select>
            </div>
          </div>

          {/* Filter by Specialty */}
          {specialties.length > 0 && (
            <div className="mt-4">
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todas as especialidades</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => {
            const statusInfo = STATUS_MAP[appointment.status];

            // Converter data para formato brasileiro se necessário
            let formattedDate = appointment.date;
            if (appointment.date && appointment.date.includes('/')) {
              // Já está em formato dd/MM/yyyy
              formattedDate = appointment.date;
            } else if (appointment.date) {
              // Tentar converter de yyyy-MM-dd para dd/MM/yyyy
              try {
                const [year, month, day] = appointment.date.split('-');
                formattedDate = `${day}/${month}/${year}`;
              } catch {
                formattedDate = appointment.date;
              }
            }

            return (
              <Card key={appointment.id}>
                <CardBody>
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    {/* Main Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {appointment.specialty}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {appointment.doctor}
                            </p>
                          </div>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formattedDate ? (
                              formattedDate.includes('/') ? (
                                formattedDate
                              ) : (
                                new Date(formattedDate + 'T00:00:00').toLocaleDateString('pt-BR')
                              )
                            ) : (
                              'Data não informada'
                            )}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {appointment.time}
                            {appointment.to && ` - ${appointment.to}`}
                          </div>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            {appointment.patient}
                          </div>
                        </div>

                        {/* Informações adicionais */}
                        {(appointment.type || appointment.medicalReferral) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            {appointment.type && (
                              <div className="flex items-center">
                                <Stethoscope className="w-4 h-4 mr-2" />
                                {appointment.type === 'scheduled' ? 'Agendada' : 
                                 appointment.type === 'immediate' ? 'Imediata' : 
                                 appointment.type}
                              </div>
                            )}
                            {appointment.medicalReferral?.urlPath && (
                              <div className="flex items-center text-blue-600 dark:text-blue-400">
                                <FileCheck className="w-4 h-4 mr-2" />
                                Encaminhamento disponível
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                      {appointment.beneficiaryUrl && (
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => window.open(appointment.beneficiaryUrl, '_blank')}
                          className="w-full md:w-auto"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Entrar na Consulta
                        </Button>
                      )}
                      
                      {appointment.medicalReferral?.urlPath && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(appointment.medicalReferral?.urlPath, '_blank')}
                          className="w-full md:w-auto"
                        >
                          <FileCheck className="w-4 h-4 mr-2" />
                          Ver Encaminhamento
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(appointment.uuid)}
                        className="w-full md:w-auto"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>

                      {appointment.hasReport && (
                        <Button variant="primary" size="sm" className="w-full md:w-auto">
                          <Download className="w-4 h-4 mr-2" />
                          Laudo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {allAppointments.length === 0 
                    ? 'Nenhuma consulta no histórico'
                    : 'Nenhuma consulta encontrada'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {allAppointments.length === 0
                    ? 'Você ainda não possui consultas realizadas no histórico'
                    : 'Tente ajustar os filtros ou termos de busca'}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Summary Stats */}
      {allAppointments.length > 0 && (
        <Card className="mt-6">
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {allAppointments.filter((a) => a.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Realizadas
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {allAppointments.filter((a) => a.status === 'scheduled').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Agendadas
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-danger">
                  {allAppointments.filter((a) => a.status === 'cancelled').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Canceladas
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-warning">
                  {allAppointments.filter((a) => a.status === 'missed').length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Perdidas
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {allAppointments.length}
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
