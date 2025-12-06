'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  MapPin,
  Lock,
  Save,
  Globe2,
} from 'lucide-react';

type TabType = 'local' | 'rapidoc' | 'security';

export default function MeusDadosPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [userCpf, setUserCpf] = useState<string>('');

  const [activeTab, setActiveTab] = useState<TabType>('local');

  const [localData, setLocalData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    gender: '',
  });

  const [localAddress, setLocalAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [rapidocData, setRapidocData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    zipCode: '',
    address: '',
    city: '',
    state: '',
    serviceType: '',
    paymentType: '',
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Função para obter CPF do token JWT
  const getCpfFromToken = (token: string): string | null => {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = JSON.parse(atob(payloadBase64));
      return payloadJson.cpf || null;
    } catch {
      return null;
    }
  };

  // Buscar dados do usuário ao carregar a página
  useEffect(() => {
    const fetchUserData = async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setError('Usuário não autenticado');
        return;
      }

      const cpfFromToken = getCpfFromToken(token);
      if (cpfFromToken) {
        setUserCpf(cpfFromToken);
      }

      try {
        setLoading(true);
        setError('');

        // Dados locais (Firestore)
        const res = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Erro ao buscar dados' }));
          throw new Error(errorData.error || 'Erro ao buscar dados do usuário');
        }

        const data = await res.json();
        const cpfResolvido = cpfFromToken || data.cpf || '';
        if (cpfResolvido) setUserCpf(cpfResolvido);

        setLocalData({
          name: data.nome || '',
          email: data.email || '',
          phone: data.telefone || '',
          cpf: data.cpf || '',
          birthDate: data.dataNascimento ? data.dataNascimento.substring(0, 10) : '',
          gender: data.genero || '',
        });

        const endereco = data.endereco || {};
        setLocalAddress({
          zipCode: endereco.cep || data.cep || '',
          street: endereco.rua || endereco.street || data.rua || '',
          number: endereco.numero || endereco.number || data.numero || '',
          complement: endereco.complemento || endereco.complement || data.complemento || '',
          neighborhood: endereco.bairro || endereco.neighborhood || data.bairro || '',
          city: endereco.cidade || endereco.city || data.cidade || '',
          state: endereco.estado || endereco.state || data.estado || '',
        });

        // Dados Rapidoc
        if (cpfResolvido) {
          try {
            const rapidocRes = await fetch(`${apiBase}/rapidoc/beneficiario/${cpfResolvido}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (rapidocRes.ok) {
              const rapidoc = await rapidocRes.json();
              const beneficiary = rapidoc?.beneficiary || rapidoc;
              setRapidocData({
                name: beneficiary?.name || '',
                email: beneficiary?.email || '',
                phone: beneficiary?.phone || '',
                cpf: beneficiary?.cpf || cpfResolvido,
                birthDate: beneficiary?.birthday || '',
                zipCode: beneficiary?.zipCode || '',
                address: beneficiary?.address || '',
                city: beneficiary?.city || '',
                state: beneficiary?.state || '',
                serviceType: beneficiary?.serviceType || '',
                paymentType: beneficiary?.paymentType || '',
              });
            }
          } catch (rapidocErr: any) {
            console.warn('Falha ao carregar dados Rapidoc', rapidocErr?.message);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do usuário');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const tabs = [
    { id: 'local' as TabType, label: 'Dados do Banco', icon: User },
    { id: 'rapidoc' as TabType, label: 'Dados Rapidoc', icon: Globe2 },
    { id: 'security' as TabType, label: 'Segurança', icon: Lock },
  ];

  const handleSave = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Usuário não autenticado!');
      return;
    }

    if (activeTab === 'security') {
      if (!securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword) {
        setError('Preencha todos os campos de senha');
        return;
      }
      if (securityData.newPassword !== securityData.confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }
      if (securityData.newPassword.length < 8) {
        setError('A nova senha deve ter pelo menos 8 caracteres');
        return;
      }
    }

    let body: any = {};
    let endpoint = '';
    let method = 'PATCH';

    if (activeTab === 'local') {
      if (!userCpf) {
        setError('CPF não encontrado. Por favor, recarregue a página.');
        return;
      }
      endpoint = `/usuario/${userCpf}`;
      body = {
        nome: localData.name,
        email: localData.email,
        telefone: localData.phone,
        dataNascimento: localData.birthDate,
        genero: localData.gender,
        endereco: {
          cep: localAddress.zipCode,
          rua: localAddress.street,
          numero: localAddress.number,
          complemento: localAddress.complement,
          bairro: localAddress.neighborhood,
          cidade: localAddress.city,
          estado: localAddress.state,
        },
      };
    } else if (activeTab === 'rapidoc') {
      if (!userCpf) {
        setError('CPF não encontrado. Por favor, recarregue a página.');
        return;
      }
      endpoint = `/rapidoc/beneficiario/${userCpf}`;
      body = {
        nome: rapidocData.name,
        email: rapidocData.email,
        telefone: rapidocData.phone,
        dataNascimento: rapidocData.birthDate,
        zipCode: rapidocData.zipCode,
        address: rapidocData.address,
        city: rapidocData.city,
        state: rapidocData.state,
      };
    } else if (activeTab === 'security') {
      endpoint = '/usuario/senha';
      body = {
        senhaAtual: securityData.currentPassword,
        novaSenha: securityData.newPassword,
      };
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await fetch(`${apiBase}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar dados');
      }

      setSuccess('Dados salvos com sucesso!');

      if (activeTab === 'security') {
        setSecurityData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }

      if (activeTab === 'local') {
        const resUser = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resUser.ok) {
          const userData = await resUser.json();
          setLocalData({
            name: userData.nome || '',
            email: userData.email || '',
            phone: userData.telefone || '',
            cpf: userData.cpf || '',
            birthDate: userData.dataNascimento ? userData.dataNascimento.substring(0, 10) : '',
            gender: userData.genero || '',
          });
          setLocalAddress({
            zipCode: userData.endereco?.cep || '',
            street: userData.endereco?.rua || '',
            number: userData.endereco?.numero || '',
            complement: userData.endereco?.complemento || '',
            neighborhood: userData.endereco?.bairro || '',
            city: userData.endereco?.cidade || '',
            state: userData.endereco?.estado || '',
          });
        }
      }

      if (activeTab === 'rapidoc') {
        const resRapidoc = await fetch(`${apiBase}/rapidoc/beneficiario/${userCpf}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resRapidoc.ok) {
          const rapidoc = await resRapidoc.json();
          const beneficiary = rapidoc?.beneficiary || rapidoc;
          setRapidocData({
            name: beneficiary?.name || '',
            email: beneficiary?.email || '',
            phone: beneficiary?.phone || '',
            cpf: beneficiary?.cpf || userCpf,
            birthDate: beneficiary?.birthday || '',
            zipCode: beneficiary?.zipCode || '',
            address: beneficiary?.address || '',
            city: beneficiary?.city || '',
            state: beneficiary?.state || '',
            serviceType: beneficiary?.serviceType || '',
            paymentType: beneficiary?.paymentType || '',
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Meus Dados">
      <div className="max-w-4xl mx-auto">
        {/* Mensagens de erro e sucesso */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <Card>
          <CardHeader>
            {activeTab === 'local' && 'Dados do Banco (Firestore/Asaas)'}
            {activeTab === 'rapidoc' && 'Dados Rapidoc'}
            {activeTab === 'security' && 'Segurança'}
          </CardHeader>
          <CardBody>
            {/* Dados locais */}
            {activeTab === 'local' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Input
                    label="Nome Completo"
                    type="text"
                    value={localData.name}
                    onChange={(e) =>
                      setLocalData({ ...localData, name: e.target.value })
                    }
                    icon={<User className="w-5 h-5" />}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      value={localData.email}
                      onChange={(e) =>
                        setLocalData({
                          ...localData,
                          email: e.target.value,
                        })
                      }
                      icon={<Mail className="w-5 h-5" />}
                    />

                    <Input
                      label="Telefone"
                      type="tel"
                      value={localData.phone}
                      onChange={(e) =>
                        setLocalData({
                          ...localData,
                          phone: e.target.value,
                        })
                      }
                      icon={<Phone className="w-5 h-5" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="CPF"
                      type="text"
                      value={localData.cpf}
                      disabled
                      icon={<FileText className="w-5 h-5" />}
                    />

                    <Input
                      label="Data de Nascimento"
                      type="date"
                      value={localData.birthDate}
                      onChange={(e) =>
                        setLocalData({
                          ...localData,
                          birthDate: e.target.value,
                        })
                      }
                      icon={<Calendar className="w-5 h-5" />}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sexo
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { value: 'M', label: 'Masculino' },
                        { value: 'F', label: 'Feminino' },
                        { value: 'O', label: 'Outro' },
                      ].map((option) => (
                        <label className="flex items-center" key={option.value}>
                          <input
                            type="radio"
                            name="gender"
                            value={option.value}
                            checked={localData.gender === option.value}
                            onChange={(e) =>
                              setLocalData({
                                ...localData,
                                gender: e.target.value,
                              })
                            }
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(!localAddress.zipCode || !localAddress.street || !localAddress.number || !localAddress.neighborhood || !localAddress.city || !localAddress.state) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                            Complete seus dados de endereço
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            {!localAddress.zipCode && !localAddress.street && !localAddress.city
                              ? 'Seu endereço não está cadastrado. Por favor, preencha todos os campos abaixo para completar seu cadastro.'
                              : 'Alguns campos do endereço estão incompletos. Por favor, preencha todos os campos obrigatórios.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="CEP"
                      type="text"
                      value={localAddress.zipCode}
                      onChange={(e) =>
                        setLocalAddress({
                          ...localAddress,
                          zipCode: e.target.value,
                        })
                      }
                      icon={<MapPin className="w-5 h-5" />}
                    />

                    <div className="md:col-span-2">
                      <Input
                        label="Rua"
                        type="text"
                        value={localAddress.street}
                        onChange={(e) =>
                          setLocalAddress({
                            ...localAddress,
                            street: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Número"
                      type="text"
                      value={localAddress.number}
                      onChange={(e) =>
                        setLocalAddress({
                          ...localAddress,
                          number: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Complemento"
                      type="text"
                      value={localAddress.complement}
                      onChange={(e) =>
                        setLocalAddress({
                          ...localAddress,
                          complement: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Input
                    label="Bairro"
                    type="text"
                    value={localAddress.neighborhood}
                    onChange={(e) =>
                      setLocalAddress({
                        ...localAddress,
                        neighborhood: e.target.value,
                      })
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        label="Cidade"
                        type="text"
                        value={localAddress.city}
                        onChange={(e) =>
                          setLocalAddress({
                            ...localAddress,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>

                    <Input
                      label="Estado (UF)"
                      type="text"
                      value={localAddress.state}
                      onChange={(e) =>
                        setLocalAddress({
                          ...localAddress,
                          state: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dados Rapidoc */}
            {activeTab === 'rapidoc' && (
              <div className="space-y-4">
                <Input
                  label="Nome (Rapidoc)"
                  type="text"
                  value={rapidocData.name}
                  onChange={(e) => setRapidocData({ ...rapidocData, name: e.target.value })}
                  icon={<User className="w-5 h-5" />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={rapidocData.email}
                    onChange={(e) => setRapidocData({ ...rapidocData, email: e.target.value })}
                    icon={<Mail className="w-5 h-5" />}
                  />

                  <Input
                    label="Telefone"
                    type="tel"
                    value={rapidocData.phone}
                    onChange={(e) => setRapidocData({ ...rapidocData, phone: e.target.value })}
                    icon={<Phone className="w-5 h-5" />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="CPF"
                    type="text"
                    value={rapidocData.cpf}
                    disabled
                    icon={<FileText className="w-5 h-5" />}
                  />

                  <Input
                    label="Data de Nascimento"
                    type="date"
                    value={rapidocData.birthDate ? rapidocData.birthDate.substring(0, 10) : ''}
                    onChange={(e) => setRapidocData({ ...rapidocData, birthDate: e.target.value })}
                    icon={<Calendar className="w-5 h-5" />}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="CEP"
                    type="text"
                    value={rapidocData.zipCode}
                    onChange={(e) => setRapidocData({ ...rapidocData, zipCode: e.target.value })}
                    icon={<MapPin className="w-5 h-5" />}
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Endereço"
                      type="text"
                      value={rapidocData.address}
                      onChange={(e) => setRapidocData({ ...rapidocData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Cidade"
                      type="text"
                      value={rapidocData.city}
                      onChange={(e) => setRapidocData({ ...rapidocData, city: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Estado"
                    type="text"
                    value={rapidocData.state}
                    onChange={(e) => setRapidocData({ ...rapidocData, state: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Payment Type (S/A)"
                    type="text"
                    value={rapidocData.paymentType}
                    onChange={(e) => setRapidocData({ ...rapidocData, paymentType: e.target.value })}
                    disabled
                    helperText="Este campo é gerenciado pelo Rapidoc."
                  />
                  <Input
                    label="Service/Plan UUID"
                    type="text"
                    value={rapidocData.serviceType}
                    onChange={(e) => setRapidocData({ ...rapidocData, serviceType: e.target.value })}
                    disabled
                    helperText="Gerenciado pelo Rapidoc/assinatura."
                  />
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Dica:</strong> Use uma senha forte com pelo menos 8
                    caracteres, incluindo letras maiúsculas, minúsculas,
                    números e símbolos.
                  </p>
                </div>

                <Input
                  label="Senha Atual"
                  type="password"
                  value={securityData.currentPassword}
                  onChange={(e) =>
                    setSecurityData({
                      ...securityData,
                      currentPassword: e.target.value,
                    })
                  }
                  icon={<Lock className="w-5 h-5" />}
                />

                <Input
                  label="Nova Senha"
                  type="password"
                  value={securityData.newPassword}
                  onChange={(e) =>
                    setSecurityData({
                      ...securityData,
                      newPassword: e.target.value,
                    })
                  }
                  icon={<Lock className="w-5 h-5" />}
                />

                <Input
                  label="Confirmar Nova Senha"
                  type="password"
                  value={securityData.confirmPassword}
                  onChange={(e) =>
                    setSecurityData({
                      ...securityData,
                      confirmPassword: e.target.value,
                    })
                  }
                  icon={<Lock className="w-5 h-5" />}
                  error={
                    securityData.confirmPassword &&
                    securityData.newPassword !== securityData.confirmPassword
                      ? 'As senhas não coincidem'
                      : undefined
                  }
                />
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleSave}
                disabled={loading}
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
