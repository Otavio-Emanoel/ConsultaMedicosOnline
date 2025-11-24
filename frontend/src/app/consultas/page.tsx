'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  Video,
  ArrowRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export default function ConsultasPage() {
  // Página simplificada - sem chamadas de API para melhor performance

  return (
    <DashboardLayout title="Consultas">
      {/* Ações Rápidas - Página Simplificada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/consultas/agendar">
          <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 border-transparent hover:border-primary">
            <CardBody>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    Agendar Consulta
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Escolha data, horário e especialidade
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/consultas/imediato">
          <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 border-transparent hover:border-danger">
            <CardBody>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-danger to-red-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    Clínico Geral
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Conecte-se agora com um médico disponível
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-danger" />
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Links para outras páginas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link href="/consultas/historico">
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Ver Histórico de Consultas
            </span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        
        <Link href="/consultas/encaminhamentos">
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Ver Encaminhamentos
            </span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {/* Informações Importantes */}
      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <CardBody>
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Importante sobre suas consultas
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Entre na consulta com até 10 minutos de antecedência</li>
                <li>• Tenha seus exames e documentos em mãos</li>
                <li>• Cancele com pelo menos 3 horas de antecedência</li>
                <li>• Para emergências, use o Clínico Geral</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
