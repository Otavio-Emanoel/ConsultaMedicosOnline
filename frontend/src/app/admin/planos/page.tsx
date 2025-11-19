'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const fetchPlanos = async () => {
      setLoading(true);
      setErro("");
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
        const res = await fetch(`${API_BASE}/admin/planos/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Erro ao buscar planos');
        const data = await res.json();
        setPlanos(data.planos || []);
      } catch (e) {
        setErro("Erro ao carregar planos.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlanos();
  }, []);

  return (
    <DashboardLayout title="Gerenciar Planos">
      {/* Header com ação */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Planos Cadastrados
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie os planos de telemedicina oferecidos
          </p>
        </div>
        <Link href="/admin/planos/novo">
          <Button variant="primary" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Novo Plano
          </Button>
        </Link>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total de Planos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : planos.length}
                </p>
              </div>
              <Package className="w-10 h-10 text-primary opacity-20" />
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
                  {loading ? '...' : erro ? '-' : planos.filter(p => p.status === 'ativo').length}
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
                  Total Assinantes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : planos.reduce((acc, p) => acc + (p.assinantes || 0), 0)}
                </p>
              </div>
              <Users className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Receita Estimada
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : `R$ ${(planos.reduce((acc, p) => acc + ((p.valor || 0) * (p.assinantes || 0)), 0) / 1000).toFixed(0)}k`}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-success opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lista de Planos */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500">Carregando...</div>
        ) : erro ? (
          <div className="text-center text-danger">{erro}</div>
        ) : planos.length === 0 ? (
          <div className="text-center text-gray-500">Nenhum plano cadastrado</div>
        ) : (
          planos.map((plano) => (
            <Card key={plano.id} className="hover:shadow-lg transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {plano.tipo || plano.nome || plano.internalPlanKey || plano.id}
                        </h3>
                        {plano.status && (
                          <Badge variant={plano.status === 'ativo' ? 'success' : 'danger'}>
                            {plano.status.charAt(0).toUpperCase() + plano.status.slice(1)}
                          </Badge>
                        )}
                        {plano.periodicidade && (
                          <Badge variant="info">{plano.periodicidade}</Badge>
                        )}
                        {plano.internalPlanKey && (
                          <Badge variant="info">{plano.internalPlanKey}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {plano.descricao}
                      </p>
                      {Array.isArray(plano.especialidades) && plano.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {plano.especialidades.map((esp: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-700 dark:text-gray-300"
                            >
                              {esp}
                            </span>
                          ))}
                        </div>
                      )}
                      {plano.beneficiaryConfig && (
                        <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Beneficiários:</span> até {plano.beneficiaryConfig.maxBeneficiaries}
                          {Array.isArray(plano.beneficiaryConfig.bundles) && plano.beneficiaryConfig.bundles.length > 0 && (
                            <span> | Bundles: {plano.beneficiaryConfig.bundles.map((b: any) => `${b.internalPlanKey} (${b.count})`).join(', ')}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{plano.assinantes} assinantes</span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>Receita: R$ {((plano.preco || plano.valor || 0) * (plano.assinantes || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-3 ml-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Valor mensal</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {((plano.preco ?? plano.valor ?? 0).toFixed(2)).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="danger" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
