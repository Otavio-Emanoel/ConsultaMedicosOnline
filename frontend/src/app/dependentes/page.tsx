'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Dialog } from '@/components/ui/Dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  User,
  Calendar,
  FileText,
  Search,
} from 'lucide-react';

interface DependentBackend {
  id: string; // Firestore doc id
  nome: string;
  cpf: string;
  birthDate: string;
  parentesco?: string;
  holder: string;
  email?: string;
  phone?: string;
  zipCode?: string;
}

interface DependentForm {
  nome: string;
  cpf: string;
  birthDate: string;
  parentesco: string;
  email?: string;
  phone?: string;
  zipCode?: string;
}

interface RapidocBeneficiary {
  uuid?: string;
  name?: string;
  cpf?: string;
  birthday?: string;
  holder?: string;
  isActive?: boolean;
}

export default function DependentesPage() {
  const [dependents, setDependents] = useState<DependentBackend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingCpf, setEditingCpf] = useState<string | null>(null);
  const [formData, setFormData] = useState<DependentForm>({
    nome: '',
    cpf: '',
    birthDate: '',
    parentesco: '',
    email: '',
    phone: '',
    zipCode: '',
  });
  const [holderCpf, setHolderCpf] = useState<string>('');
  // Rapidoc sync state
  const [showRapidocModal, setShowRapidocModal] = useState(false);
  const [rapidocItems, setRapidocItems] = useState<RapidocBeneficiary[]>([]);
  const [loadingRapidoc, setLoadingRapidoc] = useState<boolean>(false);
  const [errorRapidoc, setErrorRapidoc] = useState<string>('');
  const [syncingCpf, setSyncingCpf] = useState<string | null>(null);

  // Extrai CPF do titular via custom claim do Firebase ou fallback localStorage
  useEffect(() => {
    (async () => {
      try {
        if (auth.currentUser) {
          // Tenta claims do Firebase (caso o backend tenha setado custom claims)
          const tokenResult = await auth.currentUser.getIdTokenResult();
          const claims: any = tokenResult.claims || {};
          if (claims.cpf) {
            setHolderCpf(claims.cpf as string);
            return;
          }
          // Se não houver claim cpf, tenta decodificar o próprio JWT
          const raw = await auth.currentUser.getIdToken();
          const payloadBase64 = raw.split('.')[1];
          const payloadJson = JSON.parse(atob(payloadBase64));
          if (payloadJson.cpf) setHolderCpf(payloadJson.cpf);
        } else {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (token) {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = JSON.parse(atob(payloadBase64));
            if (payloadJson.cpf) setHolderCpf(payloadJson.cpf);
          }
        }
        // Fallback extra: ler user do localStorage (pode conter cpf ou uid numérico)
        if (typeof window !== 'undefined' && !holderCpf) {
          try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);
              const maybeCpf = (user?.cpf || user?.uid || '').toString();
              const onlyDigits = maybeCpf.replace(/\D/g, '');
              if (/^\d{11}$/.test(onlyDigits)) {
                setHolderCpf(onlyDigits);
              }
            }
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // Carrega dependentes do backend
  useEffect(() => {
    const fetchDependents = async () => {
      if (!holderCpf) { setLoading(false); return; }
      setLoading(true);
      setError('');
      try {
        let token: string | null = null;
        if (auth.currentUser) token = await auth.currentUser.getIdToken();
        else token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dependentes/${holderCpf}`, { headers });
        if (!resp.ok) throw new Error('Erro ao buscar dependentes');
        const data = await resp.json();
        setDependents((data.dependentes || []).map((d: any) => d));
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar dependentes.');
      } finally {
        setLoading(false);
      }
    };
    fetchDependents();
  }, [holderCpf]);

  const normalizeCpf = (v?: string) => (v || '').replace(/\D/g, '');
  const isRegisteredInLocal = (cpf?: string) => {
    const n = normalizeCpf(cpf);
    return dependents.some(d => normalizeCpf(d.cpf) === n);
  };

  const fetchRapidocBeneficiaries = async () => {
    setLoadingRapidoc(true);
    setErrorRapidoc('');
    try {
      let token: string | null = null;
      if (auth.currentUser) token = await auth.currentUser.getIdToken();
      else token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/beneficiarios/rapidoc/me`, { headers });
      if (!resp.ok) throw new Error('Falha ao consultar Rapidoc');
      const data = await resp.json();
      const items = Array.isArray(data?.beneficiarios) ? data.beneficiarios : [];
      setRapidocItems(items);
      setShowRapidocModal(true);
    } catch (e: any) {
      setErrorRapidoc(e?.message || 'Erro ao buscar beneficiários no Rapidoc.');
    } finally {
      setLoadingRapidoc(false);
    }
  };

  const handleSyncRapidocBeneficiary = async (cpf?: string) => {
    const c = normalizeCpf(cpf);
    if (!c) {
      alert('CPF do beneficiário ausente na resposta do Rapidoc.');
      return;
    }
    // Garantir holderCpf resolvido antes de sincronizar
    let effectiveHolder = holderCpf;
    if (!effectiveHolder) {
      try {
        if (auth.currentUser) {
          const tokenResult = await auth.currentUser.getIdTokenResult();
          const claims: any = tokenResult.claims || {};
          if (claims.cpf) effectiveHolder = claims.cpf;
          if (!effectiveHolder) {
            const raw = await auth.currentUser.getIdToken();
            const payloadBase64 = raw.split('.')[1];
            const payloadJson = JSON.parse(atob(payloadBase64));
            if (payloadJson.cpf) effectiveHolder = payloadJson.cpf;
          }
        } else {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (token) {
            const payloadBase64 = token.split('.')[1];
            const payloadJson = JSON.parse(atob(payloadBase64));
            if (payloadJson.cpf) effectiveHolder = payloadJson.cpf;
          }
        }
        // Fallback: localStorage.user
        if (!effectiveHolder && typeof window !== 'undefined') {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              const maybeCpf = (user?.cpf || user?.uid || '').toString();
              const onlyDigits = maybeCpf.replace(/\D/g, '');
              if (/^\d{11}$/.test(onlyDigits)) effectiveHolder = onlyDigits;
            } catch {}
          }
        }
      } catch {}
      if (!effectiveHolder) {
        alert('CPF do titular não identificado. Aguarde carregar o perfil e tente novamente.');
        return;
      }
      setHolderCpf(effectiveHolder);
    }
    setSyncingCpf(c);
    try {
      let token: string | null = null;
      if (auth.currentUser) token = await auth.currentUser.getIdToken(true);
      else token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/beneficiarios/dependente`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cpf: c, holder: effectiveHolder })
      });
      if (!resp.ok) throw new Error('Erro ao sincronizar dependente');
      // Atualiza lista local de dependentes
      const depsResp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dependentes/${effectiveHolder}`, { headers });
      if (depsResp.ok) {
        const depsData = await depsResp.json();
        setDependents((depsData.dependentes || []).map((d: any) => d));
      }
    } catch (e: any) {
      alert(e?.message || 'Falha ao adicionar dependente ao sistema');
    } finally {
      setSyncingCpf(null);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenModal = (dependent?: DependentBackend) => {
    if (dependent) {
      setEditingCpf(dependent.cpf);
      setFormData({
        nome: dependent.nome || '',
        cpf: dependent.cpf || '',
        birthDate: dependent.birthDate || '',
        parentesco: dependent.parentesco || '',
        email: dependent.email || '',
        phone: dependent.phone || '',
        zipCode: dependent.zipCode || '',
      });
    } else {
      setEditingCpf(null);
      setFormData({
        nome: '',
        cpf: '',
        birthDate: '',
        parentesco: '',
        email: '',
        phone: '',
        zipCode: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCpf(null);
    setFormData({
      nome: '',
      cpf: '',
      birthDate: '',
      parentesco: '',
      email: '',
      phone: '',
      zipCode: '',
    });
  };

  const handleSave = async () => {
    let token: string | null = null;
    if (auth.currentUser) token = await auth.currentUser.getIdToken(true); // força refresh para evitar expiração
    else token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      if (editingCpf) {
        // PUT atualizar dependente (campos enviados)
        const body: any = {};
        if (formData.nome) body.nome = formData.nome;
        if (formData.birthDate) body.birthDate = formData.birthDate;
        if (formData.parentesco) body.parentesco = formData.parentesco;
        if (formData.email) body.email = formData.email;
        if (formData.phone) body.phone = formData.phone;
        if (formData.zipCode) body.zipCode = formData.zipCode;
        if (formData.cpf && formData.cpf !== editingCpf) body.cpf = formData.cpf; // alteração de cpf
        body.holder = holderCpf;
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dependentes/${editingCpf}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body)
        });
        if (!resp.ok) throw new Error('Erro ao atualizar dependente');
        const data = await resp.json();
        setDependents(data.dependentes || []);
      } else {
        // POST novo dependente
        const payload = {
          nome: formData.nome,
            cpf: formData.cpf,
            birthDate: formData.birthDate,
            parentesco: formData.parentesco,
            holder: holderCpf,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            zipCode: formData.zipCode || undefined
        };
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dependentes`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Erro ao adicionar dependente');
        const data = await resp.json();
        setDependents(data.dependentes || []);
      }
      handleCloseModal();
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar dependente');
    }
  };

  const handleDelete = (cpf: string) => {
    alert('Remoção de dependente não implementada no backend.');
  };

  return (
    <DashboardLayout title="Dependentes">
      {/* Header Action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie os dependentes do seu plano
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" onClick={fetchRapidocBeneficiaries} disabled={loadingRapidoc}>
          <Search className="w-5 h-5 mr-2" />
          Verificar no Rapidoc
        </Button>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus className="w-5 h-5 mr-2" />
          Adicionar Dependente
        </Button>
        </div>
      </div>

      {/* Estados de carregamento / erro */}
      {loading && (
        <Card className="mb-6">
          <CardBody>
            <p className="text-gray-600 dark:text-gray-400">Carregando dependentes...</p>
          </CardBody>
        </Card>
      )}
      {error && !loading && (
        <Card className="mb-6 border border-red-300 dark:border-red-600">
          <CardBody>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => {
              if (!holderCpf) return;
              setLoading(true); setError('');
              (async () => {
                try {
                  let token: string | null = null;
                  if (auth.currentUser) token = await auth.currentUser.getIdToken();
                  else token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                  const headers: HeadersInit = { 'Content-Type': 'application/json' };
                  if (token) headers['Authorization'] = `Bearer ${token}`;
                  const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dependentes/${holderCpf}`, { headers });
                  if (!resp.ok) throw new Error('Erro ao buscar dependentes');
                  const data = await resp.json();
                  setDependents((data.dependentes || []).map((d: any) => d));
                } catch (e: any) {
                  setError(e?.message || 'Falha ao carregar dependentes.');
                } finally { setLoading(false); }
              })();
            }}>Tentar novamente</Button>
          </CardBody>
        </Card>
      )}

      {/* Dependents Grid */}
      {!loading && !error && dependents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.map((dependent) => {
            const age = calculateAge(dependent.birthDate);

            return (
              <Card key={dependent.id}>
                <CardBody>
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar */}
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-400 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-white">
                        {dependent.nome.charAt(0)}
                      </span>
                    </div>

                    {/* Name and Relationship */}
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {dependent.nome}
                    </h3>
                    <Badge variant="info" className="mb-4">
                      {dependent.parentesco || '—'}
                    </Badge>

                    {/* Info */}
                    <div className="w-full space-y-2 mb-6">
                      <div className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">
                          Idade
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {age} anos
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">
                          CPF
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {dependent.cpf}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400">
                          Nascimento
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(dependent.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenModal(dependent)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(dependent.cpf)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum dependente cadastrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Adicione dependentes para que eles também possam usar o plano
              </p>
              {!loading && !error && (
              <Button variant="primary" onClick={() => handleOpenModal()}>
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Dependente
              </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal */}
      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(o) => { if (!o) handleCloseModal(); }}>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingCpf ? 'Editar Dependente' : 'Novo Dependente'}</h2>
          <div className="space-y-4">
            <Input
              label="Nome Completo"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Maria Silva Santos"
              icon={<User className="w-5 h-5" />}
            />
            <Input
              label="CPF"
              type="text"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
              icon={<FileText className="w-5 h-5" />}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              icon={<Calendar className="w-5 h-5" />}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grau de Parentesco
              </label>
              <select
                value={formData.parentesco}
                onChange={(e) => setFormData({ ...formData, parentesco: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="Filho(a)">Filho(a)</option>
                <option value="Cônjuge">Cônjuge</option>
                <option value="Pai/Mãe">Pai/Mãe</option>
                <option value="Irmão(ã)">Irmão(ã)</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
              <Input
                label="Telefone"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="11999999999"
              />
              <Input
                label="CEP"
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="00000000"
              />
            </div>
          </div>
          <div className="flex space-x-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSave}
              disabled={!formData.nome || !formData.cpf || !formData.birthDate || !formData.parentesco}
            >
              <Check className="w-4 h-4 mr-2" /> {editingCpf ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Rapidoc Modal */}
      <Dialog open={showRapidocModal} onOpenChange={(o) => { if (!o) setShowRapidocModal(false); }}>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Beneficiários encontrados no Rapidoc</h2>
            <Button variant="outline" size="sm" onClick={fetchRapidocBeneficiaries} disabled={loadingRapidoc}>
              Atualizar
            </Button>
          </div>
          {errorRapidoc && (
            <Card className="border border-red-300 dark:border-red-600">
              <CardBody>
                <p className="text-red-600 dark:text-red-400 text-sm">{errorRapidoc}</p>
              </CardBody>
            </Card>
          )}
          {loadingRapidoc ? (
            <Card>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-400">Carregando dados do Rapidoc...</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {rapidocItems.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">Nenhum beneficiário encontrado para o titular.</p>
              ) : (
                rapidocItems.map((b, idx) => {
                  const cpfN = normalizeCpf(b.cpf);
                  const registered = isRegisteredInLocal(cpfN);
                  const birthLabel = b.birthday ? new Date((/\d{2}\/\d{2}\/\d{4}/.test(b.birthday) ? b.birthday.split('/').reverse().join('-') : b.birthday) + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
                  return (
                    <Card key={`${cpfN}-${idx}`}>
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{b.name || '—'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">CPF: {cpfN || '—'} · Nasc.: {birthLabel}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={registered ? 'success' : 'warning'}>
                              {registered ? 'Cadastrado' : 'Não cadastrado'}
                            </Badge>
                            {!registered && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSyncRapidocBeneficiary(cpfN)}
                                disabled={syncingCpf === cpfN}
                              >
                                {syncingCpf === cpfN ? 'Adicionando...' : 'Adicionar ao sistema'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </div>
          )}
          <div className="flex space-x-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowRapidocModal(false)}>
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
