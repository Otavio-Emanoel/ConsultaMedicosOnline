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
} from 'lucide-react';

type TabType = 'personal' | 'address' | 'security';

export default function MeusDadosPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [userCpf, setUserCpf] = useState<string>('');

  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [personalData, setPersonalData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    gender: '',
  });

  const [addressData, setAddressData] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
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

      // Tenta obter CPF do token
      const cpfFromToken = getCpfFromToken(token);
      if (cpfFromToken) {
        setUserCpf(cpfFromToken);
      }

      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Erro ao buscar dados' }));
          throw new Error(errorData.error || 'Erro ao buscar dados do usuário');
        }

        const data = await res.json();
        
        // Define CPF se não foi obtido do token
        if (!cpfFromToken && data.cpf) {
          setUserCpf(data.cpf);
        }

        // Ajuste os campos conforme a resposta da API
        setPersonalData({
          name: data.nome || '',
          email: data.email || '',
          phone: data.telefone || '',
          cpf: data.cpf || '',
          birthDate: data.dataNascimento ? (data.dataNascimento.substring(0, 10)) : '',
          gender: data.genero || '',
        });
        
        // Verifica se há endereço no formato objeto ou campos diretos
        const endereco = data.endereco || {};
        const addressDataToSet = {
          zipCode: endereco.cep || data.cep || '',
          street: endereco.rua || endereco.street || data.rua || '',
          number: endereco.numero || endereco.number || data.numero || '',
          complement: endereco.complemento || endereco.complement || data.complemento || '',
          neighborhood: endereco.bairro || endereco.neighborhood || data.bairro || '',
          city: endereco.cidade || endereco.city || data.cidade || '',
          state: endereco.estado || endereco.state || data.estado || '',
        };
        
        setAddressData(addressDataToSet);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do usuário');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const tabs = [
    { id: 'personal' as TabType, label: 'Dados Pessoais', icon: User },
    { id: 'address' as TabType, label: 'Endereço', icon: MapPin },
    { id: 'security' as TabType, label: 'Segurança', icon: Lock },
  ];

  const handleSave = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Usuário não autenticado!');
      return;
    }

    // Validações
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

    if (activeTab === 'personal') {
      if (!userCpf) {
        setError('CPF não encontrado. Por favor, recarregue a página.');
        return;
      }
      endpoint = `/usuario/${userCpf}`;
      body = {
        nome: personalData.name,
        email: personalData.email,
        telefone: personalData.phone,
        dataNascimento: personalData.birthDate,
        genero: personalData.gender,
      };
    } else if (activeTab === 'address') {
      if (!userCpf) {
        setError('CPF não encontrado. Por favor, recarregue a página.');
        return;
      }
      endpoint = `/usuario/${userCpf}`;
      body = {
        endereco: {
          cep: addressData.zipCode,
          rua: addressData.street,
          numero: addressData.number,
          complemento: addressData.complement,
          bairro: addressData.neighborhood,
          cidade: addressData.city,
          estado: addressData.state,
        },
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
      
      // Limpa campos de senha após sucesso
      if (activeTab === 'security') {
        setSecurityData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }

      // Recarrega dados após salvar
      if (activeTab !== 'security') {
        const resUser = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resUser.ok) {
          const userData = await resUser.json();
          if (activeTab === 'personal') {
            setPersonalData({
              name: userData.nome || '',
              email: userData.email || '',
              phone: userData.telefone || '',
              cpf: userData.cpf || '',
              birthDate: userData.dataNascimento ? userData.dataNascimento.substring(0, 10) : '',
              gender: userData.genero || '',
            });
          } else if (activeTab === 'address') {
            setAddressData({
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
            {activeTab === 'personal' && 'Dados Pessoais'}
            {activeTab === 'address' && 'Endereço'}
            {activeTab === 'security' && 'Segurança'}
          </CardHeader>
          <CardBody>
            {/* Personal Data Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <Input
                  label="Nome Completo"
                  type="text"
                  value={personalData.name}
                  onChange={(e) =>
                    setPersonalData({ ...personalData, name: e.target.value })
                  }
                  icon={<User className="w-5 h-5" />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={personalData.email}
                    onChange={(e) =>
                      setPersonalData({
                        ...personalData,
                        email: e.target.value,
                      })
                    }
                    icon={<Mail className="w-5 h-5" />}
                  />

                  <Input
                    label="Telefone"
                    type="tel"
                    value={personalData.phone}
                    onChange={(e) =>
                      setPersonalData({
                        ...personalData,
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
                    value={personalData.cpf}
                    disabled
                    icon={<FileText className="w-5 h-5" />}
                  />

                  <Input
                    label="Data de Nascimento"
                    type="date"
                    value={personalData.birthDate}
                    onChange={(e) =>
                      setPersonalData({
                        ...personalData,
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
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="M"
                        checked={personalData.gender === 'M'}
                        onChange={(e) =>
                          setPersonalData({
                            ...personalData,
                            gender: e.target.value,
                          })
                        }
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">
                        Masculino
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="F"
                        checked={personalData.gender === 'F'}
                        onChange={(e) =>
                          setPersonalData({
                            ...personalData,
                            gender: e.target.value,
                          })
                        }
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">
                        Feminino
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="O"
                        checked={personalData.gender === 'O'}
                        onChange={(e) =>
                          setPersonalData({
                            ...personalData,
                            gender: e.target.value,
                          })
                        }
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">
                        Outro
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-4">
                {/* Mensagem quando endereço estiver vazio */}
                {(!addressData.zipCode || !addressData.street || !addressData.number || !addressData.neighborhood || !addressData.city || !addressData.state) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                          Complete seus dados de endereço
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          {!addressData.zipCode && !addressData.street && !addressData.city 
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
                    value={addressData.zipCode}
                    onChange={(e) =>
                      setAddressData({
                        ...addressData,
                        zipCode: e.target.value,
                      })
                    }
                    icon={<MapPin className="w-5 h-5" />}
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Rua"
                      type="text"
                      value={addressData.street}
                      onChange={(e) =>
                        setAddressData({
                          ...addressData,
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
                    value={addressData.number}
                    onChange={(e) =>
                      setAddressData({
                        ...addressData,
                        number: e.target.value,
                      })
                    }
                  />

                  <Input
                    label="Complemento"
                    type="text"
                    value={addressData.complement}
                    onChange={(e) =>
                      setAddressData({
                        ...addressData,
                        complement: e.target.value,
                      })
                    }
                  />
                </div>

                <Input
                  label="Bairro"
                  type="text"
                  value={addressData.neighborhood}
                  onChange={(e) =>
                    setAddressData({
                      ...addressData,
                      neighborhood: e.target.value,
                    })
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Cidade"
                      type="text"
                      value={addressData.city}
                      onChange={(e) =>
                        setAddressData({
                          ...addressData,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estado
                    </label>
                    <select
                      value={addressData.state}
                      onChange={(e) =>
                        setAddressData({
                          ...addressData,
                          state: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="SP">SP</option>
                      <option value="RJ">RJ</option>
                      <option value="MG">MG</option>
                      <option value="RS">RS</option>
                      {/* Add more states as needed */}
                    </select>
                  </div>
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
