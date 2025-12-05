'use client';


import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar,
  Users,
  CreditCard,
  Clock,
  TrendingUp,
  Stethoscope,
  ArrowRight,
  Heart,
  FileText,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';


type DashboardData = {
  usuario: any;
  assinaturas: any[];
  beneficiarios: any[];
  rapidoc: any;
  consultas: any[];
  faturas: any[];
  statusAssinatura?: string;
  proximaCobranca?: string;
  numeroDependentes?: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // OTIMIZAÇÃO: AbortController para cancelar requisição se componente desmontar
    // Evita requisições pendentes que ficam travadas
    const controller = new AbortController();
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const loadDashboard = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          // Sem token: redireciona para login
          if (mounted) {
            setLoading(false);
            router.push('/login');
          }
          return;
        }

        // Timeout de 60 segundos para não travar indefinidamente
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 60000);

        const response = await fetch(`${apiBase}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal, // Permite cancelar a requisição
        });

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!mounted) return; // Componente foi desmontado

        if (!response.ok) {
          // Token expirado/sem autorização → redireciona
          if (response.status === 401 || response.status === 403) {
            router.push('/login');
            if (mounted) setLoading(false);
            return;
          }
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        
        if (mounted) {
          setData(json);
          setLoading(false); // Libera UI rapidamente
        }

        // Carregar próximas consultas em background, via /dashboard/agendamentos
        if (mounted) {
          const appointmentsController = new AbortController();
          
          // Timeout aumentado para 120 segundos para agendamentos
          const appointmentsTimeoutId = setTimeout(() => {
            appointmentsController.abort();
          }, 120000);

          fetch(`${apiBase}/dashboard/agendamentos?limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: appointmentsController.signal,
          })
            .then((appointmentsRes) => {
              clearTimeout(appointmentsTimeoutId);
              if (!mounted) return;
              
              if (!appointmentsRes.ok) {
                if (appointmentsRes.status === 401 || appointmentsRes.status === 403) {
                  router.push('/login');
                  return null;
                }
                console.error('Erro ao buscar agendamentos:', appointmentsRes.status, appointmentsRes.statusText);
                return null;
              }
              
              return appointmentsRes.json();
            })
            .then((appointmentsData) => {
              if (!mounted || !appointmentsData) return;
              
              const appointmentsList = appointmentsData?.appointments || appointmentsData?.data || [];
              
              // Mapear agendamentos para formato esperado
              const mappedAppointments = appointmentsList.map((apt: any) => ({
                uuid: apt?.uuid || apt?.id || null,
                status: apt?.status || null,
                date: apt?.detail?.date || apt?.date || null,
                from: apt?.detail?.from || apt?.from || null,
                to: apt?.detail?.to || apt?.to || null,
                specialty: apt?.specialty || (apt?.specialtyObject?.name || apt?.specialtyObject?.description || apt?.specialtyObject?.title) || null
              }));

              // Log apenas em desenvolvimento para debug
              if (process.env.NODE_ENV === 'development') {
                console.log('Consultas carregadas:', mappedAppointments.length, mappedAppointments);
              }

              // Atualizar dados com próximas consultas carregadas em background
              setData((prevData) => {
                if (!prevData) return prevData;
                return {
                  ...prevData,
                  consultas: mappedAppointments
                };
              });
            })
            .catch((err: any) => {
              clearTimeout(appointmentsTimeoutId);
              if (err.name !== 'AbortError' && mounted) {
                console.error('Erro ao carregar consultas em background:', err);
                // Não atualiza estado se erro (mantém consultas vazias)
              }
            });
        }
      } catch (error: any) {
        // Ignora erro se foi cancelado (componente desmontou ou timeout)
        if (error.name === 'AbortError') {
          return;
        }
        
        if (mounted) {
          console.error('Erro ao carregar dashboard:', error);
          setLoading(false);
        }
      } finally {
        // Garantir que o timeout é limpo
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };

    loadDashboard();

    // Cleanup: cancela requisição se componente desmontar
    return () => {
      mounted = false;
      controller.abort();
      // Limpar timeout se houver
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Helpers
  const statusAssinatura = data?.statusAssinatura === 'ativa' ? 'Ativo' : 'Inativo';
  const dependentesCount = typeof data?.numeroDependentes === 'number' ? data.numeroDependentes : (data?.beneficiarios?.length || 0);

  // Próxima cobrança: usar campo proximaCobranca se existir
  let proximaFatura = null;
  if (data?.proximaCobranca) {
    proximaFatura = { dueDate: data.proximaCobranca };
  } else if (data?.faturas?.length) {
    proximaFatura = data.faturas
      .filter((f) => f.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }

  // Próximas consultas: status SCHEDULED e data futura
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data
  
  const proximasConsultas = (data?.consultas || [])
    .filter((c) => {
      if (!c.date) return false;
      
      // Aceitar status SCHEDULED (case insensitive) ou outros status de consulta agendada
      // Status válidos: SCHEDULED, scheduled, AGENDADA, etc.
      const statusUpper = c.status ? String(c.status).toUpperCase() : '';
      const statusValidos = ['SCHEDULED', 'AGENDADA', 'AGENDADO', 'CONFIRMED', 'CONFIRMADA'];
      
      // Se tiver status, verificar se é válido
      if (c.status && !statusValidos.includes(statusUpper)) {
        return false; // Status inválido, pular esta consulta
      }
      // Se não tiver status, considerar como agendada (para compatibilidade com dados antigos)
      
      // Tentar diferentes formatos de data
      let dataConsulta: Date | null = null;
      
      // Formato dd/MM/yyyy
      if (c.date.includes('/')) {
        const partes = c.date.split('/');
        if (partes.length === 3) {
          const [dia, mes, ano] = partes;
          dataConsulta = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        }
      }
      // Formato yyyy-MM-dd
      else if (c.date.includes('-')) {
        const partes = c.date.split('-');
        if (partes.length === 3) {
          const [ano, mes, dia] = partes;
          dataConsulta = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        }
      }
      
      if (!dataConsulta || isNaN(dataConsulta.getTime())) {
        console.warn('Data inválida na consulta:', c.date, c);
        return false;
      }
      
      dataConsulta.setHours(0, 0, 0, 0);
      return dataConsulta >= hoje;
    })
    .sort((a, b) => {
      // Mais próximas primeiro
      let dataA: Date | null = null;
      let dataB: Date | null = null;
      
      // Parse data A
      if (a.date.includes('/')) {
        const [da, ma, aa] = a.date.split('/');
        dataA = new Date(parseInt(aa), parseInt(ma) - 1, parseInt(da));
      } else if (a.date.includes('-')) {
        const [aa, ma, da] = a.date.split('-');
        dataA = new Date(parseInt(aa), parseInt(ma) - 1, parseInt(da));
      }
      
      // Parse data B
      if (b.date.includes('/')) {
        const [db, mb, ab] = b.date.split('/');
        dataB = new Date(parseInt(ab), parseInt(mb) - 1, parseInt(db));
      } else if (b.date.includes('-')) {
        const [ab, mb, db] = b.date.split('-');
        dataB = new Date(parseInt(ab), parseInt(mb) - 1, parseInt(db));
      }
      
      if (!dataA || !dataB) return 0;
      return dataA.getTime() - dataB.getTime();
    })
    .slice(0, 2);


  if (loading) {
    return (
      <DashboardLayout title="Dashboard - Assinante">
        <div className="py-20 text-center text-gray-500">Carregando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard - Assinante">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Status da Assinatura
                </p>
                <Badge variant={data?.statusAssinatura === 'ativa' ? 'success' : 'danger'}>
                  {statusAssinatura}
                </Badge>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Próxima Cobrança
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {proximaFatura && proximaFatura.dueDate ?
                    new Date(proximaFatura.dueDate).toLocaleDateString('pt-BR') :
                    'Nenhuma pendente'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Dependentes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dependentesCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

      </div>

      {/* Ações Rápidas */}
      <Card className="mb-8">
        <CardHeader>Ações Rápidas</CardHeader>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <Link href="/consultas/agendar">
              <Button
                variant="primary"
                size="lg"
                className="flex-1 justify-between group"
              >
                <span className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Consulta
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/consultas/imediato">
              <Button
                variant="danger"
                size="lg"
                className="flex-1 justify-between group"
              >
                <span className="flex items-center">
                  <Stethoscope className="w-5 h-5 mr-2" />
                  Clínico Geral
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/dependentes">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 justify-between group"
              >
                <span className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Gerenciar Dependentes
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/faturas">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 justify-between group"
              >
                <span className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ver Faturas
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {/* Próximas Consultas */}
        <Card>
          <CardHeader
            action={
              <Link href="/consultas">
                <Button variant="ghost" size="sm">
                  Ver todas
                </Button>
              </Link>
            }
          >
            Próximas Consultas
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {proximasConsultas.length > 0 ? (
                proximasConsultas.map((consulta) => (
                  <div
                    key={consulta.uuid}
                    className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {consulta.specialty || 'Consulta agendada'}
                      </p>
                      {/* <p className="text-sm text-gray-600 dark:text-gray-400">Dr. Nome</p> */}
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {consulta.date || 'Data não informada'}
                        {consulta.from && (
                          <>
                            <Clock className="w-4 h-4 ml-3 mr-1" />
                            {consulta.from}
                            {consulta.to && ` - ${consulta.to}`}
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="info">Agendado</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhuma consulta agendada
                  </p>
                  <Link href="/consultas/agendar">
                    <Button variant="primary" size="sm" className="mt-4">
                      Agendar agora
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
