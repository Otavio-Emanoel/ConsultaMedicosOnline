'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Bell,
  Mail,
  MessageSquare,
  Globe,
  Moon,
  Lock,
  Shield,
  Smartphone,
  CheckCircle,
} from 'lucide-react';

export default function ConfiguracoesPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    appointments: true,
    invoices: true,
    marketing: false,
  });

  const [privacy, setPrivacy] = useState({
    shareData: false,
    publicProfile: false,
  });

  const [twoFactor, setTwoFactor] = useState(false);

  const handleSaveNotifications = () => {
    console.log('Salvando notificações:', notifications);
    // Aqui faria a chamada à API
  };

  const handleSavePrivacy = () => {
    console.log('Salvando privacidade:', privacy);
    // Aqui faria a chamada à API
  };

  return (
    <DashboardLayout title="Configurações">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary" />
              Notificações
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Escolha como deseja receber notificações
            </p>

            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Notificações por Email
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receba atualizações por email
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        email: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Notificações por SMS
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receba SMS com lembretes importantes
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.sms}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        sms: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Notificações Push
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receba notificações no navegador
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        push: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Tipos de Notificações
              </p>
              <div className="space-y-3">
                <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.appointments}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        appointments: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    Lembretes de consultas agendadas
                  </span>
                </label>
                <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.invoices}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        invoices: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    Avisos sobre faturas e pagamentos
                  </span>
                </label>
                <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.marketing}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        marketing: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary focus:ring-primary rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    Novidades e promoções
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleSaveNotifications}>
                Salvar Preferências
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-primary" />
              Segurança
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {/* Change Password */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3 mb-4">
                  <Lock className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Alterar Senha
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                      Mantenha sua conta segura alterando sua senha regularmente
                    </p>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    // Implementação futura: abrir modal ou redirecionar
                    alert('Funcionalidade de trocar senha será implementada aqui. Por enquanto, entre em contato com o suporte.');
                  }}
                  className="w-full sm:w-auto"
                >
                  Trocar Senha Agora
                </Button>
              </div>

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Autenticação de Dois Fatores
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Adicione uma camada extra de segurança
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => setTwoFactor(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Recomendado:</strong> Ative a autenticação de dois
                  fatores para proteger sua conta contra acessos não
                  autorizados.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Globe className="w-5 h-5 mr-2 text-primary" />
              Privacidade
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Compartilhar Dados Anônimos
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ajude a melhorar nossos serviços
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.shareData}
                  onChange={(e) =>
                    setPrivacy({ ...privacy, shareData: e.target.checked })
                  }
                  className="w-5 h-5 text-primary focus:ring-primary rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Perfil Público
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Permita que médicos vejam seu perfil
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.publicProfile}
                  onChange={(e) =>
                    setPrivacy({ ...privacy, publicProfile: e.target.checked })
                  }
                  className="w-5 h-5 text-primary focus:ring-primary rounded"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleSavePrivacy}>
                Salvar Preferências
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>Seus Dados</CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Você pode exportar ou excluir seus dados a qualquer momento
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <Button variant="outline" className="flex-1">
                Exportar Meus Dados
              </Button>
              <Button variant="danger" className="flex-1">
                Excluir Minha Conta
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
