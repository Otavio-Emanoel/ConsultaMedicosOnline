'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  Lock,
} from 'lucide-react';

export default function Page() {
  const [showModal, setShowModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Corrigido: resetar mensagem de sucesso/erro ao abrir o modal
  const handleOpenModal = (open: boolean) => {
    setShowModal(open);
    if (open) {
      setSuccess(false);
      setError('');
      setNewPassword('');
      setCurrentPassword('');
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Usuário não autenticado');
      const res = await fetch(`${apiBase}/usuario/senha`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senhaAtual: currentPassword, novaSenha: newPassword }),
      });
      if (!res.ok) {
        let data;
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        throw new Error(data?.error || 'Erro ao alterar senha');
      }
      setSuccess(true);
      setShowModal(false);
      setNewPassword('');
      setCurrentPassword('');
    } catch (e: any) {
      setError(e.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Configurações">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Lock className="w-5 h-5 mr-2 text-primary" />
              Alterar Senha
            </div>
          </CardHeader>
          <CardBody>
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
                onClick={() => handleOpenModal(true)}
                className="w-full sm:w-auto"
              >
                Trocar Senha Agora
              </Button>
              {success && (
                <div className="mt-4 text-green-700 dark:text-green-300 text-sm">Senha alterada com sucesso!</div>
              )}
              {error && (
                <div className="mt-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Modal de troca de senha */}
        <Dialog open={showModal} onOpenChange={handleOpenModal}>
          <Dialog.Content>
            <Dialog.Title>Alterar Senha</Dialog.Title>
            <div className="space-y-4 mt-2">
              <Input
                type="password"
                label="Senha Atual"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoFocus
                minLength={6}
              />
              <Input
                type="password"
                label="Nova Senha"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={6}
              />
              <Button
                variant="primary"
                onClick={handleChangePassword}
                disabled={loading || newPassword.length < 6 || currentPassword.length < 6}
                className="w-full"
              >
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog>

        {/* Exportar/Excluir Dados */}
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