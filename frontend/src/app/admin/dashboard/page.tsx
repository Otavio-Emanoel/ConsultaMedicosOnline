'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Package,
  Activity,
  DollarSign,
  UserPlus,
  Settings,
  FileText,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

type DashboardData = {
  totais: { usuarios: number };
  faturamento: { mesAtual: number };
  planos?: {
    numeroPlanos: number;
    mediaValorPlanos: number;
    detalhados?: Array<{
      id: string;
      nome: string;
      valor: number;
      assinantes: number;
      valorTotal: number;
    }>;
  };
  novosAssinantes?: Array<{
    nome: string;
    email: string;
    plano: string;
    data: string;
    status: string;
  }>;
};

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setErro("");
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) {
          setErro("Usuário não autenticado.");
          setLoading(false);
          return;
        }
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Erro ao buscar dados do dashboard');
        const data = await res.json();
        setDashboard(data);
      } catch (e) {
        setErro("Erro ao carregar dados do dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <DashboardLayout title="Dashboard Administrativo">
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total de Assinantes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : dashboard?.totais?.usuarios?.toLocaleString('pt-BR') ?? '-'}
                </p>
                <p className="text-xs text-success mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {/* Placeholder, ajuste depois se quiser variação real */}
                  +12% este mês
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Receita Mensal
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : `R$ ${dashboard?.faturamento?.mesAtual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
                <p className="text-xs text-success mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {/* Placeholder, ajuste depois se quiser variação real */}
                  +8% este mês
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Planos Ativos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : dashboard?.planos?.numeroPlanos ?? '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {loading ? '...' : erro ? '-' : `Média: R$ ${dashboard?.planos?.mediaValorPlanos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Erros Pendentes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  12
                </p>
                <p className="text-xs text-danger mt-1 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  3 críticos
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Ações Rápidas do Admin */}
      <Card className="mb-8">
        <CardHeader>Ações Administrativas</CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/planos/novo">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-between group"
              >
                <span className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Cadastrar Plano
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/admin/assinantes">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-between group"
              >
                <span className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Gerenciar Assinantes
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/admin/logs">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-between group"
              >
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Ver Logs de Erro
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/admin/configuracoes">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-between group"
              >
                <span className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Configurações
                </span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Planos Cadastrados */}
        <Card>
          <CardHeader
            action={
              <Link href="/admin/planos">
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </Link>
            }
          >
            Planos Cadastrados
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-gray-500">Carregando...</div>
              ) : erro ? (
                <div className="text-center text-danger">Erro ao carregar planos</div>
              ) : dashboard?.planos?.detalhados && dashboard.planos.detalhados.length > 0 ? (
                dashboard.planos.detalhados.map((plano, idx) => (
                  <div
                    key={plano.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-slate-700 text-blue-600`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {plano.nome}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {plano.assinantes} assinantes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {`R$ ${plano.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        Total: R$ {plano.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500">Nenhum plano cadastrado</div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Assinantes Recentes */}
        <Card>
          <CardHeader
            action={
              <Link href="/admin/assinantes">
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </Link>
            }
          >
            Novos Assinantes (Últimos 7 dias)
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-gray-500">Carregando...</div>
              ) : erro ? (
                <div className="text-center text-danger">Erro ao carregar assinantes</div>
              ) : dashboard?.novosAssinantes && dashboard.novosAssinantes.length > 0 ? (
                dashboard.novosAssinantes.slice(0, 4).map((assinante, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 via-white to-blue-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-blue-100 dark:border-slate-700"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center shadow-md">
                        <UserPlus className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-base flex items-center gap-2">
                          {assinante.nome}
                          {assinante.status === 'success' ? (
                            <Badge variant="success" className="ml-2">Ativo</Badge>
                          ) : (
                            <Badge variant="warning" className="ml-2">Pendente</Badge>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <span className="font-medium text-primary">{assinante.email}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {assinante.plano} • {assinante.data}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500">Nenhum novo assinante</div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Logs de Erro Recentes */}
      <Card>
        <CardHeader
          action={
            <Link href="/admin/logs">
              <Button variant="ghost" size="sm">
                Ver todos os logs
              </Button>
            </Link>
          }
        >
          Logs de Erro Recentes
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {[
              { tipo: 'Crítico', mensagem: 'Falha na integração de pagamento - Asaas', tempo: 'Há 10 min', icon: XCircle, color: 'text-danger' },
              { tipo: 'Alerta', mensagem: 'Taxa de erro elevada no endpoint /api/appointments', tempo: 'Há 1 hora', icon: AlertTriangle, color: 'text-warning' },
              { tipo: 'Info', mensagem: 'Backup automático concluído com sucesso', tempo: 'Há 2 horas', icon: CheckCircle, color: 'text-success' },
              { tipo: 'Alerta', mensagem: 'Limite de requisições próximo (85%)', tempo: 'Há 3 horas', icon: Activity, color: 'text-warning' },
            ].map((log, idx) => {
              const Icon = log.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <Icon className={`w-5 h-5 ${log.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${log.color}`}>
                        {log.tipo}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {log.tempo}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {log.mensagem}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
