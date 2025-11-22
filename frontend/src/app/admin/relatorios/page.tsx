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
  totalFaturamento: number;
  totalAssinantes: number;
  totalConsultas: number;
  cancelamentos: number;
  novosAssinantes: { mes: string; total: number }[];
  receitaMensal: { mes: string; valor: number }[];
  planos: { nome: string; total: number }[];
  metricasErros: {
    pendentes: number;
    criticos: number;
    recentes: number;
  };
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

  function exportarPDF() {
    const doc = new jsPDF();
    doc.text('Relatório de Métricas', 10, 10);
    if (data) {
      doc.text(`Receita Total: R$ ${data.totalFaturamento.toLocaleString('pt-BR')}`, 10, 20);
      doc.text(`Total de Assinantes: ${data.totalAssinantes}`, 10, 30);
      doc.text(`Total de Consultas: ${data.totalConsultas}`, 10, 40);
      doc.text(`Cancelamentos: ${data.cancelamentos}`, 10, 50);
      doc.text(`Erros Pendentes: ${data.metricasErros.pendentes}`, 10, 60);
      doc.text(`Erros Críticos: ${data.metricasErros.criticos}`, 10, 70);
      doc.text(`Erros Recentes: ${data.metricasErros.recentes}`, 10, 80);
    }
    doc.save('relatorio-metricas.pdf');
  }

  if (loading) {
    return <DashboardLayout title="Relatórios"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;
  }
  if (error) {
    return <DashboardLayout title="Relatórios"><div className="p-8 text-center text-red-500">{error}</div></DashboardLayout>;
  }
  if (!data) {
    return <DashboardLayout title="Relatórios"><div className="p-8 text-center">Sem dados</div></DashboardLayout>;
  }

  // Gráficos
  // Garantir arrays válidos para os gráficos
  const meses = Array.isArray(data.novosAssinantes) ? data.novosAssinantes.map((item) => item?.mes ?? '') : [];
  const assinantesPorMes = Array.isArray(data.novosAssinantes) ? data.novosAssinantes.map((item) => Number(item?.total ?? 0)) : [];
  const receitaPorMes = Array.isArray(data.receitaMensal) ? data.receitaMensal.map((item) => Number(item?.valor ?? 0)) : [];
  const receitaMeses = Array.isArray(data.receitaMensal) ? data.receitaMensal.map((item) => item?.mes ?? '') : [];
  const planosArr = Array.isArray(data.planos) ? data.planos : (data.planos ? Object.values(data.planos) : []);
  const planosLabels = Array.isArray(planosArr) ? planosArr.map((p: any) => p?.nome ?? '') : [];
  const planosData = Array.isArray(planosArr) ? planosArr.map((p: any) => Number(p?.total ?? 0)) : [];

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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ {(data.totalFaturamento ?? 0).toLocaleString('pt-BR')}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalAssinantes}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalConsultas}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.cancelamentos}</p>
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
                xaxis: { categories: meses.length === assinantesPorMes.length ? meses : assinantesPorMes.map((_, i) => `Mês ${i + 1}`) },
                colors: ['#2563eb'],
              }}
              series={[{ name: 'Novos Assinantes', data: assinantesPorMes.length ? assinantesPorMes : [0] }]}
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
                xaxis: { categories: receitaMeses.length === receitaPorMes.length ? receitaMeses : receitaPorMes.map((_, i) => `Mês ${i + 1}`) },
                colors: ['#10b981'],
              }}
              series={[{ name: 'Receita', data: receitaPorMes.length ? receitaPorMes : [0] }]}
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
                Number(data.metricasErros?.pendentes ?? 0),
                Number(data.metricasErros?.criticos ?? 0),
                Number(data.metricasErros?.recentes ?? 0),
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
