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

export default function DashboardPage() {
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
                <Badge variant="success">Ativo</Badge>
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
                  15/12/2025
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
                  3
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
                  5
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
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Cardiologia
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Dr. João Silva
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      20/11/2025
                      <Clock className="w-4 h-4 ml-3 mr-1" />
                      14:00
                    </div>
                  </div>
                  <Badge variant="info">Agendado</Badge>
                </div>
              ))}

              {/* Empty State */}
              {/* <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Nenhuma consulta agendada
                </p>
                <Link href="/consultas/agendar">
                  <Button variant="primary" size="sm" className="mt-4">
                    Agendar agora
                  </Button>
                </Link>
              </div> */}
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
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Pediatria
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        05/11/2025
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Realizada</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
