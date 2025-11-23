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
          if (mounted) setLoading(false);
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
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        
        if (mounted) {
          setData(json);
          setLoading(false);
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
  const consultasEsteMes = data?.consultas?.filter((c) => {
    if (!c.date) return false;
    const [dia, mes, ano] = c.date.split('/');
    const dataConsulta = new Date(`${ano}-${mes}-${dia}`);
    const hoje = new Date();
    return (
      dataConsulta.getMonth() === hoje.getMonth() &&
      dataConsulta.getFullYear() === hoje.getFullYear() &&
      c.status === 'SCHEDULED'
    );
  }).length || 0;

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
  const proximasConsultas = (data?.consultas || [])
    .filter((c) => {
      if (!c.date) return false;
      const [dia, mes, ano] = c.date.split('/');
      const dataConsulta = new Date(`${ano}-${mes}-${dia}`);
      return (
        c.status === 'SCHEDULED' &&
        dataConsulta >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      );
    })
    .sort((a, b) => {
      // Mais próximas primeiro
      const [da, ma, aa] = a.date.split('/');
      const [db, mb, ab] = b.date.split('/');
      return (
        new Date(`${aa}-${ma}-${da}`).getTime() - new Date(`${ab}-${mb}-${db}`).getTime()
      );
    })
    .slice(0, 2);

  // Consultas recentes: status != CANCELED e data passada
  const consultasRecentes = (data?.consultas || [])
    .filter((c) => {
      if (!c.date) return false;
      const [dia, mes, ano] = c.date.split('/');
      const dataConsulta = new Date(`${ano}-${mes}-${dia}`);
      return (
        c.status !== 'CANCELED' &&
        dataConsulta < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      );
    })
    .sort((a, b) => {
      // Mais recentes primeiro
      const [da, ma, aa] = a.date.split('/');
      const [db, mb, ab] = b.date.split('/');
      return (
        new Date(`${ab}-${mb}-${db}`).getTime() - new Date(`${aa}-${ma}-${da}`).getTime()
      );
    })
    .slice(0, 3);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Consultas este mês
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {consultasEsteMes}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
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
                  Atendimento Imediato
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        {consulta.specialty}
                      </p>
                      {/* <p className="text-sm text-gray-600 dark:text-gray-400">Dr. Nome</p> */}
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {consulta.date}
                        <Clock className="w-4 h-4 ml-3 mr-1" />
                        {consulta.from}
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

        {/* Histórico Recente */}
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
            Consultas Recentes
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {consultasRecentes.length > 0 ? (
                consultasRecentes.map((consulta) => (
                  <div
                    key={consulta.uuid}
                    className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {consulta.specialty}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {consulta.date}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">Realizada</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhuma consulta recente
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
