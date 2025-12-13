'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  TrendingUp,
  Download,
  Users,
  DollarSign,
  Activity,
  FileText,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import jsPDF from 'jspdf';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type DashboardData = {
  // Formato retornado pelo backend /admin/dashboard
  totais?: {
    usuarios?: number;
    usuariosMesAtual?: number;
    usuariosMesAnterior?: number;
    variacaoUsuarios?: number | null;
    assinaturas?: number;
    assinaturasAtivas?: number;
    assinaturasCanceladas?: number;
    assinaturasPendentes?: number;
  };
  faturamento?: {
    mesAtual?: number;
    ultimos30Dias?: number;
    pendencias?: number;
    mesAnterior?: number;
    variacaoMes?: number | null;
  };
  planos?: {
    numeroPlanos?: number;
    mediaValorPlanos?: number;
    detalhados?: Array<{
      id: string;
      nome: string;
      valor: number;
      assinantes: number;
      valorTotal: number;
    }>;
  };
  novosAssinantes?: Array<{ nome?: string; plano?: string; data?: string; status?: string }>;
  logs?: {
    errosPendentes?: number;
    errosCriticos?: number;
    errosRecentes?: number;
    ultimosErros?: any[];
  };

  // Fallbacks caso a API ainda retorne o formato antigo
  totalFaturamento?: number;
  totalAssinantes?: number;
  totalConsultas?: number;
  cancelamentos?: number;
  metricasErros?: {
    pendentes?: number;
    criticos?: number;
    recentes?: number;
  };
  receitaMensal?: { mes: string; valor: number }[];
  planosAntigo?: { nome: string; total: number }[];
  novosAssinantesAntigo?: { mes: string; total: number }[];
};

export default function AdminRelatoriosPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let url = '/api/admin/dashboard';
        if (process.env.NEXT_PUBLIC_API_BASE_URL) {
          url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/dashboard`;
        }
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');
        const token = await user.getIdToken();
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (!res.ok) throw new Error('Erro ao buscar dados do dashboard');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <DashboardLayout title="Relatórios"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;
  }
  if (error) {
    return <DashboardLayout title="Relatórios"><div className="p-8 text-center text-red-500">{error}</div></DashboardLayout>;
  }
  if (!data) {
    return <DashboardLayout title="Relatórios"><div className="p-8 text-center">Sem dados</div></DashboardLayout>;
  }

  // Normalizações dos dados para exibição
  const totalFaturamento = Number(
    data.faturamento?.mesAtual ?? data.totalFaturamento ?? 0
  );
  const totalAssinantes = Number(
    data.totais?.assinaturas ?? data.totalAssinantes ?? 0
  );
  const totalConsultas = Number(
    // Backend não retorna consultas; usamos usuários como aproximação
    data.totais?.usuarios ?? data.totalConsultas ?? 0
  );
  const cancelamentos = Number(
    data.totais?.assinaturasCanceladas ?? data.cancelamentos ?? 0
  );

  const errosPendentes = Number(
    data.logs?.errosPendentes ?? data.metricasErros?.pendentes ?? 0
  );
  const errosCriticos = Number(
    data.logs?.errosCriticos ?? data.metricasErros?.criticos ?? 0
  );
  const errosRecentes = Number(
    data.logs?.errosRecentes ?? data.metricasErros?.recentes ?? 0
  );

  // Gráfico de assinantes: usa meses anterior e atual se disponíveis; caso contrário, usa formato antigo
  const assinantesCategorias =
    typeof data.totais?.usuariosMesAtual === 'number' && typeof data.totais?.usuariosMesAnterior === 'number'
      ? ['Mês anterior', 'Mês atual']
      : Array.isArray(data.novosAssinantesAntigo)
        ? data.novosAssinantesAntigo.map((item) => item?.mes ?? '')
        : [];

  const assinantesSeries =
    typeof data.totais?.usuariosMesAtual === 'number' && typeof data.totais?.usuariosMesAnterior === 'number'
      ? [Number(data.totais.usuariosMesAnterior ?? 0), Number(data.totais.usuariosMesAtual ?? 0)]
      : Array.isArray(data.novosAssinantesAntigo)
        ? data.novosAssinantesAntigo.map((item) => Number(item?.total ?? 0))
        : [];

  // Gráfico de receita: usa mês anterior vs mês atual
  const receitaCategorias = ['Mês anterior', 'Mês atual'];
  const receitaSeries = [
    Number(data.faturamento?.mesAnterior ?? 0),
    Number(data.faturamento?.mesAtual ?? 0),
  ];

  // Gráfico de planos: usa planos detalhados (assinantes por plano)
  const planosDetalhados = Array.isArray(data.planos?.detalhados)
    ? data.planos?.detalhados
    : Array.isArray(data.planosAntigo)
      ? data.planosAntigo.map((p) => ({ id: p.nome, nome: p.nome, assinantes: p.total, valor: 0, valorTotal: 0 }))
      : [];
  const planosLabels = planosDetalhados.map((p) => p.nome ?? 'Plano');
  const planosData = planosDetalhados.map((p) => Number(p.assinantes ?? 0));

  function exportarPDF() {
    if (!data) {
      // Opcional: mostrar alerta ou retornar silenciosamente
      return;
    }
    const doc = new jsPDF();
    const now = new Date();
    const dataStr = now.toLocaleString('pt-BR');

    const formatBRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Relatório de Métricas', 12, 18);
    doc.setFontSize(10);
    doc.text(`Gerado em ${dataStr}`, 150, 18, { align: 'left' });

    // Cards resumidos
    const cardY = 38;
    const cardW = 46;
    const cardH = 24;
    const cards = [
      { label: 'Receita Total', value: formatBRL(totalFaturamento) },
      { label: 'Assinantes', value: String(totalAssinantes) },
      { label: 'Consultas', value: String(totalConsultas) },
      { label: 'Cancelamentos', value: String(cancelamentos) },
    ];
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(11);
    cards.forEach((c, i) => {
      const x = 12 + i * (cardW + 6);
      doc.setDrawColor(230, 236, 245);
      doc.setFillColor(247, 250, 255);
      doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'DF');
      doc.setFontSize(9);
      doc.text(c.label, x + 4, cardY + 8);
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text(c.value, x + 4, cardY + 18);
      doc.setTextColor(33, 37, 41);
    });

    let y = cardY + cardH + 14;

    // Receita
    doc.setFontSize(12);
    doc.text('Receita (mês anterior vs atual)', 12, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Mês anterior: ${formatBRL(Number(data.faturamento?.mesAnterior ?? 0))}`, 12, y);
    doc.text(`Mês atual: ${formatBRL(Number(data.faturamento?.mesAtual ?? 0))}`, 90, y);
    const variacaoMes = data.faturamento?.variacaoMes;
    if (typeof variacaoMes === 'number') {
      doc.text(`Variação: ${variacaoMes.toFixed(2)}%`, 150, y);
    }

    // Planos
    y += 10;
    doc.setFontSize(12);
    doc.text('Planos (assinantes por plano)', 12, y);
    y += 6;
    doc.setFontSize(10);
    const planosToShow = planosDetalhados.slice(0, 6);
    if (!planosToShow.length) {
      doc.text('Sem dados de planos.', 12, y);
      y += 8;
    } else {
      planosToShow.forEach((p) => {
        doc.text(`${p.nome ?? 'Plano'} — ${p.assinantes ?? 0} assinantes`, 12, y);
        y += 6;
      });
    }

    // Erros
    y += 4;
    doc.setFontSize(12);
    doc.text('Métricas de erros', 12, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Pendentes: ${errosPendentes}`, 12, y);
    doc.text(`Críticos: ${errosCriticos}`, 70, y);
    doc.text(`Recentes: ${errosRecentes}`, 130, y);

    // Novos assinantes (se houver)
    y += 10;
    const novos = Array.isArray(data.novosAssinantes) ? data.novosAssinantes.slice(0, 6) : [];
    doc.setFontSize(12);
    doc.text('Novos assinantes (últimos)', 12, y);
    y += 6;
    doc.setFontSize(10);
    if (!novos.length) {
      doc.text('Sem novos assinantes listados.', 12, y);
    } else {
      novos.forEach((n) => {
        doc.text(`${n.nome ?? '—'} — ${n.plano ?? 'Plano'} — ${n.data ?? ''}`, 12, y);
        y += 6;
      });
    }

    doc.save('relatorio-metricas.pdf');
  }

  return (
    <DashboardLayout title="Relatórios">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Relatórios e Métricas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize estatísticas e exporte relatórios
          </p>
        </div>
        <Button variant="primary" onClick={exportarPDF}>
          <Download className="w-5 h-5 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ {totalFaturamento.toLocaleString('pt-BR')}</p>
              </div>
              <DollarSign className="w-10 h-10 text-success opacity-20" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assinantes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAssinantes}</p>
              </div>
              <Users className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Consultas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalConsultas}</p>
              </div>
              <Activity className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cancelamentos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{cancelamentos}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-danger opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>Crescimento de Assinantes (Últimos meses)</CardHeader>
          <CardBody>
            <Chart
              type="bar"
              height={300}
              options={{
                chart: { id: 'assinantes-bar' },
                xaxis: { categories: assinantesCategorias.length ? assinantesCategorias : ['Sem dados'] },
                colors: ['#2563eb'],
              }}
              series={[{ name: 'Novos Assinantes', data: assinantesSeries.length ? assinantesSeries : [0] }]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Distribuição por Plano</CardHeader>
          <CardBody>
            <Chart
              type="pie"
              height={300}
              options={{
                labels: planosLabels.length === planosData.length ? planosLabels : planosData.map((_, i) => `Plano ${i + 1}`),
                legend: { position: 'bottom' },
                colors: ['#2563eb', '#10b981', '#f59e42', '#a78bfa', '#f43f5e'],
              }}
              series={planosData.length ? planosData : [1]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Receita Mensal</CardHeader>
          <CardBody>
            <Chart
              type="line"
              height={300}
              options={{
                chart: { id: 'receita-line' },
                xaxis: { categories: receitaCategorias },
                colors: ['#10b981'],
              }}
              series={[{ name: 'Receita', data: receitaSeries.length ? receitaSeries : [0] }]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Métricas de Erros</CardHeader>
          <CardBody>
            <Chart
              type="donut"
              height={300}
              options={{
                labels: ['Pendentes', 'Críticos', 'Recentes'],
                legend: { position: 'bottom' },
                colors: ['#f59e42', '#f43f5e', '#2563eb'],
              }}
              series={[
                errosPendentes,
                errosCriticos,
                errosRecentes,
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
