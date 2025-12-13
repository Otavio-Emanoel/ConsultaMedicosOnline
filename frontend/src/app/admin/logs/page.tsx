'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  FileText,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

type LogErro = {
  id: string;
  ts: string;
  method: string;
  url: string;
  status: number;
  latencyMs: number;
  uid: string | null;
  cpf: string | null;
  ip: string;
  userAgent: string;
};

type LogsResumo = {
  errosPendentes: number;
  errosCriticos: number;
  errosRecentes: number;
  ultimosErros: LogErro[];
};

export default function AdminLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [logsResumo, setLogsResumo] = useState<LogsResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // BUG FIX: fetchLogs estava sendo declarada fora do componente, 
  // mas usava setLoading/setErro/setLogsResumo do hook. 
  // Agora está dentro do componente para acessar os estados corretamente.
  const fetchLogs = async () => {
    setLoading(true);
    setErro('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
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
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!res.ok) throw new Error('Erro ao buscar logs');
      const data = await res.json();
      setLogsResumo(data.logs);
    } catch (e) {
      setErro("Erro ao carregar logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = logsResumo?.ultimosErros?.filter(log =>
    log.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.uid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.cpf || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getLogIcon = (log: LogErro) => {
    if (log.method === 'POST') return <XCircle className="w-5 h-5 text-danger" />;
    if (log.method === 'GET') return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <Activity className="w-5 h-5 text-gray-500" />;
  };

  const getLogBadge = (log: LogErro) => {
    if (log.method === 'POST') return <Badge variant="danger">Crítico</Badge>;
    if (log.method === 'GET') return <Badge variant="warning">Alerta</Badge>;
    return <Badge variant="info">Info</Badge>;
  };

  return (
    <DashboardLayout title="Logs de Erro">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Logs do Sistema
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitore erros e eventos do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => {
            if (!logsResumo || !logsResumo.ultimosErros?.length) return;
            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text('Logs de Erro do Sistema', 10, 15);
            doc.setFontSize(10);
            let y = 25;
            logsResumo.ultimosErros.forEach((log, idx) => {
              doc.text(`#${idx + 1} - ${log.method} ${log.url}`, 10, y);
              y += 6;
              doc.text(`Status: ${log.status} | Latência: ${log.latencyMs?.toFixed(0)}ms | Usuário: ${log.uid || log.cpf || '-'}`, 10, y);
              y += 6;
              doc.text(`Data: ${(new Date(log.ts)).toLocaleString('pt-BR')}`, 10, y);
              y += 8;
              if (y > 270) { doc.addPage(); y = 15; }
            });
            doc.save('logs-erro.pdf');
          }}>
            <Download className="w-5 h-5 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total de Logs
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : logsResumo?.errosRecentes ?? '-'}
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
                  Críticos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : logsResumo?.errosCriticos ?? '-'}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-danger opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Alertas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : (logsResumo?.ultimosErros?.filter(l => l.method === 'GET').length ?? '-')} 
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-warning opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Info
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  -
                </p>
              </div>
              <Info className="w-10 h-10 text-info opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar logs por mensagem, endpoint ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Lista de Logs */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-500">Carregando...</div>
        ) : erro ? (
          <div className="text-center text-danger">Erro ao carregar logs</div>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            // Formatação de data/tempo
            const data = new Date(log.ts);
            const agora = new Date();
            const diffMs = agora.getTime() - data.getTime();
            let tempo = '';
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin < 1) tempo = 'Agora';
            else if (diffMin < 60) tempo = `Há ${diffMin} min`;
            else if (diffMin < 1440) tempo = `Há ${Math.floor(diffMin / 60)}h`;
            else tempo = data.toLocaleString('pt-BR');

            return (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardBody>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getLogIcon(log)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {getLogBadge(log)}
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {tempo}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        {log.url}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <div>
                          <span className="font-medium">Método:</span> {log.method}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {log.status}
                        </div>
                        <div>
                          <span className="font-medium">Latência:</span> {log.latencyMs?.toFixed(0)}ms
                        </div>
                        <div>
                          <span className="font-medium">Usuário:</span> {log.uid || log.cpf || '-'}
                        </div>
                        <div>
                          <span className="font-medium">IP:</span> {log.ip}
                        </div>
                        <div>
                          <span className="font-medium">User-Agent:</span> {log.userAgent}
                        </div>
                      </div>
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
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Nenhum log encontrado
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}