'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  Stethoscope,
  User,
  XCircle,
  ExternalLink,
} from 'lucide-react';

type AppointmentStatus =
  | 'SCHEDULED'
  | 'UNFINISHED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CANCELED'
  | 'MISSED'
  | string;

interface AppointmentApi {
  uuid?: string;
  status?: string;
  date?: string;
  from?: string;
  to?: string;
  detail?: {
    date?: string;
    from?: string;
    to?: string;
  };
  specialty?: {
    name?: string;
  };
  professional?: {
    name?: string;
  };
  beneficiary?: {
    name?: string;
  };
  beneficiaryUrl?: string;
}

interface Appointment {
  uuid: string;
  date: string | null;
  from: string | null;
  to: string | null;
  specialty: string;
  doctor?: string | null;
  patient?: string | null;
  status: AppointmentStatus;
  beneficiaryUrl?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const CANCEL_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
> = {
  SCHEDULED: { label: 'Agendada', variant: 'info' },
  UNFINISHED: { label: 'Agendada', variant: 'info' },
  COMPLETED: { label: 'Realizada', variant: 'success' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' },
  CANCELED: { label: 'Cancelada', variant: 'danger' },
  MISSED: { label: 'Não compareceu', variant: 'warning' },
};

const formatDateDisplay = (date: string | null) => {
  if (!date) return 'Data não informada';
  if (date.includes('/')) {
    return date;
  }
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
  } catch {
    return date;
  }
};

const formatTimeRange = (from: string | null, to: string | null) => {
  if (!from && !to) return 'Horário não informado';
  if (from && to) return `${from} - ${to}`;
  return from || to || '';
};

const parseDateTime = (date?: string | null, time?: string | null) => {
  if (!date) return null;
  try {
    if (date.includes('/')) {
      const [day, month, year] = date.split('/');
      const iso = `${year}-${month}-${day}T${time || '00:00'}`;
      return new Date(iso);
    }
    return new Date(`${date}T${time || '00:00'}`);
  } catch {
    return null;
  }
};

const formatDateTimeLong = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);

const normalizeStatus = (status?: string): AppointmentStatus =>
  (status || 'UNKNOWN').toUpperCase();

const generateFallbackUuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `appointment-${Math.random().toString(36).slice(2, 11)}`;

const mapAppointments = (items: AppointmentApi[]): Appointment[] =>
  items
    .map((item) => {
      const date = item.detail?.date || item.date || null;
      const from = item.detail?.from || item.from || null;
      const to = item.detail?.to || item.to || null;

      return {
        uuid: item.uuid || generateFallbackUuid(),
        date,
        from,
        to,
        specialty: item.specialty?.name || 'Especialidade não informada',
        doctor: item.professional?.name || null,
        patient: item.beneficiary?.name || null,
        status: normalizeStatus(item.status),
        beneficiaryUrl: item.beneficiaryUrl || null,
      };
    })
    .sort((a, b) => {
      const dateA = parseDateTime(a.date, a.from)?.getTime() ?? 0;
      const dateB = parseDateTime(b.date, b.from)?.getTime() ?? 0;
      return dateA - dateB;
    });

const getCancelState = (appointment: Appointment) => {
  const status = normalizeStatus(appointment.status);
  const isFinalStatus = ['COMPLETED', 'CANCELLED', 'CANCELED', 'MISSED'].includes(status);
  if (isFinalStatus) {
    return { canCancel: false, message: 'Consulta já finalizada ou cancelada.' };
  }

  const appointmentDate = parseDateTime(appointment.date, appointment.from);
  if (!appointmentDate) {
    return { canCancel: false, message: 'Não foi possível validar a data da consulta.' };
  }

  const timeDiff = appointmentDate.getTime() - Date.now();
  if (timeDiff <= CANCEL_THRESHOLD_MS) {
    return {
      canCancel: false,
      message: 'O cancelamento precisa ser solicitado com pelo menos 24h de antecedência.',
    };
  }

  const limitDate = new Date(appointmentDate.getTime() - CANCEL_THRESHOLD_MS);
  return {
    canCancel: true,
    message: `Permitido até ${formatDateTimeLong(limitDate)}.`,
  };
};

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [beneficiaryUuid, setBeneficiaryUuid] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cancellingUuid, setCancellingUuid] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('auth_token')
          : null;

      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }

      const headers = { Authorization: `Bearer ${token}` };

      const usuarioRes = await fetch(`${API_BASE_URL}/usuario/me`, { headers });
      if (!usuarioRes.ok) {
        throw new Error('Não foi possível carregar os dados do usuário.');
      }
      const usuarioData = await usuarioRes.json();
      const cpf = usuarioData?.cpf;
      if (!cpf) {
        throw new Error('CPF do usuário não encontrado.');
      }

      const beneficiarioRes = await fetch(`${API_BASE_URL}/rapidoc/beneficiario/${cpf}`, { headers });
      if (!beneficiarioRes.ok) {
        throw new Error('Não encontramos seu cadastro no Rapidoc.');
      }
      const beneficiarioData = await beneficiarioRes.json();
      const beneficiarioUuid = beneficiarioData?.uuid;
      if (!beneficiarioUuid) {
        throw new Error('UUID do beneficiário não encontrado.');
      }

      const appointmentsRes = await fetch(
        `${API_BASE_URL}/beneficiarios/${beneficiarioUuid}/appointments`,
        { headers }
      );

      if (!appointmentsRes.ok) {
        const body = await appointmentsRes.json().catch(() => null);
        throw new Error(body?.error || 'Erro ao carregar agendamentos.');
      }

      const data = await appointmentsRes.json();
      const rawAppointments = Array.isArray(data?.appointments)
        ? data.appointments
        : Array.isArray(data)
          ? data
          : [];
      const mapped = mapAppointments(rawAppointments);

      setAppointments(mapped);
      setBeneficiaryUuid(beneficiarioUuid);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Erro ao carregar agendamentos', err);
      setError(err?.message || 'Erro ao carregar agendamentos. Tente novamente.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadAppointments();
    })();
    return () => {
      active = false;
    };
  }, [loadAppointments]);

  const handleCancel = async (appointment: Appointment) => {
    const confirmMessage = `Tem certeza de que deseja cancelar a consulta de ${appointment.specialty}?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setCancellingUuid(appointment.uuid);
      setError(null);
      setFeedback(null);

      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('auth_token')
          : null;

      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }

      const response = await fetch(`${API_BASE_URL}/agendamentos/${appointment.uuid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Não foi possível cancelar este agendamento.');
      }

      setAppointments((prev) =>
        prev.map((item) =>
          item.uuid === appointment.uuid ? { ...item, status: 'CANCELLED' } : item
        )
      );
      setFeedback('Consulta cancelada com sucesso.');
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento', err);
      setError(err?.message || 'Erro ao cancelar o agendamento.');
    } finally {
      setCancellingUuid(null);
    }
  };

  const totalUpcoming = useMemo(
    () =>
      appointments.filter((appointment) => {
        const status = normalizeStatus(appointment.status);
        if (['COMPLETED', 'CANCELLED', 'CANCELED', 'MISSED'].includes(status)) {
          return false;
        }
        const date = parseDateTime(appointment.date, appointment.from);
        return !!date && date.getTime() > Date.now();
      }).length,
    [appointments]
  );

  return (
    <DashboardLayout title="Agendamentos">
      <div className="space-y-6">
        <Card>
          <CardHeader
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={loadAppointments}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            }
          >
            Meus agendamentos
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Consulte todas as consultas marcadas no Rapidoc e cancele aquelas que ainda não foram
              realizadas. Cancelamentos só são permitidos com pelo menos 24h de antecedência da data
              agendada.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-primary/10 text-primary">
                <p className="text-sm uppercase tracking-wide">Agendamentos ativos</p>
                <p className="text-3xl font-semibold">{totalUpcoming}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-300">Beneficiário (UUID)</p>
                <p className="text-sm font-mono break-all text-gray-900 dark:text-white">
                  {beneficiaryUuid || '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">
                  Cancelamentos só são confirmados após o retorno 204/200 da API do Rapidoc.
                </span>
              </div>
            </div>
            {lastUpdated && (
              <p className="mt-4 text-xs text-gray-500">
                Última atualização: {formatDateTimeLong(lastUpdated)}
              </p>
            )}
          </CardBody>
        </Card>

        {error && (
          <Card className="border border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardBody className="flex items-start gap-3 text-red-700 dark:text-red-200">
              <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível concluir sua solicitação</p>
                <p className="text-sm">{error}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {feedback && !error && (
          <Card className="border border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardBody className="text-green-700 dark:text-green-200">{feedback}</CardBody>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardBody className="flex items-center justify-center gap-3 py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Carregando agendamentos...</span>
            </CardBody>
          </Card>
        ) : appointments.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Assim que uma consulta for marcada, ela aparecerá aqui.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const statusKey = normalizeStatus(appointment.status);
              const statusInfo = STATUS_CONFIG[statusKey] || {
                label: statusKey,
                variant: 'neutral' as const,
              };

              const cancelState = getCancelState(appointment);

              return (
                <Card key={appointment.uuid}>
                  <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        <span className="text-sm text-gray-500">{appointment.uuid}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {appointment.specialty}
                        </h3>
                        {appointment.doctor && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Profissional: {appointment.doctor}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-primary" />
                          {formatDateDisplay(appointment.date)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-primary" />
                          {formatTimeRange(appointment.from, appointment.to)}
                        </div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-primary" />
                          {appointment.patient || 'Beneficiário titular'}
                        </div>
                      </div>

                      <p
                        className={`text-xs ${
                          cancelState.canCancel ? 'text-gray-500' : 'text-red-500 dark:text-red-300'
                        }`}
                      >
                        {cancelState.message}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      {appointment.beneficiaryUrl && 
                       statusKey !== 'CANCELED' && 
                       statusKey !== 'CANCELLED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => window.open(appointment.beneficiaryUrl!, '_blank')}
                          className="w-full"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Acessar Consulta
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={!cancelState.canCancel || cancellingUuid === appointment.uuid}
                        isLoading={cancellingUuid === appointment.uuid}
                        onClick={() => handleCancel(appointment)}
                        className="w-full"
                      >
                        Cancelar consulta
                      </Button>
                      {!cancelState.canCancel && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Cancelamento indisponível
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

