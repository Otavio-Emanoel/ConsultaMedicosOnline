'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar,
  Clock,
  Stethoscope,
  ArrowRight,
  Heart,
  User,
  Video,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DependentDashboardPage() {
  return (
    <DashboardLayout title="Meu Painel - Beneficiário">
      {/* Informação do Titular */}
      <Card className="mb-6 bg-gradient-to-r from-primary/5 to-green-50 dark:from-slate-700 dark:to-slate-800 border-2 border-primary/20">
        <CardBody>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Você é dependente de
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Gustavo Silva Santos
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Plano: Premium Familiar
                </p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Beneficiário Ativo
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* Cards de Estatísticas Simplificadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Consultas Agendadas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  2
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Próxima em 3 dias
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Consultas Realizadas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  8
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Nos últimos 6 meses
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Especialidades
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  50+
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Disponíveis para você
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Ações Rápidas - Apenas Serviços de Telemedicina */}
      <Card className="mb-8">
        <CardHeader>Agendar Atendimento</CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/consultas/agendar">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-between group h-auto py-6"
              >
                <div className="flex items-start">
                  <Calendar className="w-6 h-6 mr-3 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">Agendar Consulta</p>
                    <p className="text-xs opacity-90 font-normal mt-1">
                      Escolha data e especialidade
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/consultas/imediato">
              <Button
                variant="danger"
                size="lg"
                className="w-full justify-between group h-auto py-6"
              >
                <div className="flex items-start">
                  <Video className="w-6 h-6 mr-3 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold">Clínico Geral</p>
                    <p className="text-xs opacity-90 font-normal mt-1">
                      Conecte-se agora com um médico
                    </p>
                  </div>
                </div>
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
            Minhas Próximas Consultas
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {[
                { especialidade: 'Pediatria', medico: 'Dra. Ana Paula', data: '15/11/2025', hora: '10:30' },
                { especialidade: 'Dermatologia', medico: 'Dr. Carlos Mendes', data: '22/11/2025', hora: '14:00' },
              ].map((consulta, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {consulta.especialidade}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {consulta.medico}
                    </p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {consulta.data}
                      <Clock className="w-4 h-4 ml-3 mr-1" />
                      {consulta.hora}
                    </div>
                  </div>
                  <Badge variant="info">Agendada</Badge>
                </div>
              ))}

              {/* Empty State */}
              {false && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Nenhuma consulta agendada
                  </p>
                  <Link href="/consultas/agendar">
                    <Button variant="primary" size="sm">
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
                  Ver histórico completo
                </Button>
              </Link>
            }
          >
            Consultas Realizadas
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {[
                { especialidade: 'Clínico Geral', data: '05/11/2025', status: 'success' },
                { especialidade: 'Pediatria', data: '28/10/2025', status: 'success' },
                { especialidade: 'Oftalmologia', data: '15/10/2025', status: 'success' },
              ].map((consulta, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {consulta.especialidade}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {consulta.data}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Realizada</Badge>
                </div>
              ))}

              {/* Empty State */}
              {false && (
                <div className="text-center py-8">
                  <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhuma consulta realizada ainda
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Informação sobre Limitações */}
      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <CardBody>
          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Acesso como Beneficiário
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Como dependente, você tem acesso completo a todos os serviços de telemedicina (consultas, agendamentos e histórico). 
                Para informações sobre pagamento, planos e gerenciamento da assinatura, entre em contato com o titular:{' '}
                <span className="font-semibold text-primary">Gustavo Silva Santos</span>.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
