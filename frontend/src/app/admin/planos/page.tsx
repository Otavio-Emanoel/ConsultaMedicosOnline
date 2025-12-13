'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
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
function EditPlanoModal({ plano, open, onClose, onSave }: { plano: any, open: boolean, onClose: () => void, onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    tipo: '',
    preco: '',
    periodicidade: '',
    descricao: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (plano && open) {
      setForm({
        tipo: plano.tipo || '',
        preco: String(plano.preco ?? plano.valor ?? ''),
        periodicidade: plano.periodicidade || '',
        descricao: plano.descricao || '',
      });
      setErro('');
    }
  }, [plano, open]);

  if (!open) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErro('');
    if (!form.tipo.trim()) return setErro('Nome do plano obrigatório.');
    if (!form.preco.trim() || isNaN(Number(form.preco)) || Number(form.preco) <= 0) return setErro('Preço inválido.');
    setSubmitting(true);
    try {
      await onSave({
        tipo: form.tipo.trim(),
        preco: Number(form.preco),
        periodicidade: form.periodicidade.trim(),
        descricao: form.descricao.trim(),
      });
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={onClose}>
          <XCircle className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-4">Editar Plano</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome do Plano" value={form.tipo} onChange={e => handleChange('tipo', e.target.value)} required />
          <Input label="Preço" type="number" min="0" step="0.01" value={form.preco} onChange={e => handleChange('preco', e.target.value)} required />
          <Input label="Periodicidade" value={form.periodicidade} onChange={e => handleChange('periodicidade', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
            <textarea value={form.descricao} onChange={e => handleChange('descricao', e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          {erro && <div className="text-red-600 text-sm">{erro}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

function DeletePlanoModal({ plano, open, onClose, onDelete }: { plano: any, open: boolean, onClose: () => void, onDelete: () => Promise<void> }) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  if (!open || !plano) return null;
  const disabled = input.trim() !== (plano.tipo || plano.nome || plano.internalPlanKey || plano.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={onClose}>
          <XCircle className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-red-700 dark:text-red-300">Excluir Plano</h2>
        <div className="mb-4 text-sm text-gray-700 dark:text-gray-200">
          <p><b>Nome do plano:</b> <span className="text-primary font-semibold">{plano.tipo || plano.nome || plano.internalPlanKey || plano.id}</span></p>
          <p className="mt-2 text-red-600 dark:text-red-300 font-medium">Esta ação é irreversível!</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-gray-600 dark:text-gray-400">
            <li>Todos os usuários e beneficiários vinculados a este plano ficarão <b>sem plano</b> e precisarão escolher outro.</li>
            <li>Os dados do plano serão permanentemente removidos do sistema.</li>
            <li>Esta ação não pode ser desfeita.</li>
          </ul>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Digite o nome do plano para confirmar:</label>
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Nome exato do plano" autoFocus />
        </div>
        {erro && <div className="text-red-600 text-sm mb-2">{erro}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="danger" disabled={disabled || submitting} onClick={async () => {
            setErro('');
            setSubmitting(true);
            try {
              await onDelete();
              onClose();
            } catch (err: any) {
              setErro(err?.message || 'Erro ao excluir plano.');
            } finally {
              setSubmitting(false);
            }
          }}>
            {submitting ? 'Excluindo...' : 'Excluir Plano'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [editPlano, setEditPlano] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletePlano, setDeletePlano] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const handleEdit = (plano: any) => {
    setEditPlano(plano);
    setEditOpen(true);
  };
  const handleDelete = (plano: any) => {
    setDeletePlano(plano);
    setDeleteOpen(true);
  };

  const handleEditSave = async (data: any) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado.');
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/planos/${editPlano.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Erro ao editar plano.');
    }
    // Atualiza lista local
    setPlanos((prev) => prev.map((p) => (p.id === editPlano.id ? { ...p, ...data } : p)));
  };

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
            'ngrok-skip-browser-warning': 'true',
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
                      <Button variant="outline" size="sm" onClick={() => handleEdit(plano)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <EditPlanoModal plano={editPlano} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleEditSave} />
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(plano)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                          <DeletePlanoModal
                            plano={deletePlano}
                            open={deleteOpen}
                            onClose={() => setDeleteOpen(false)}
                            onDelete={async () => {
                              const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
                              const auth = getAuth(app);
                              const user = auth.currentUser;
                              if (!user) throw new Error('Usuário não autenticado.');
                              const token = await user.getIdToken();
                              const res = await fetch(`${API_BASE}/planos/${deletePlano.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
                              });
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err?.error || 'Erro ao excluir plano.');
                              }
                              setPlanos((prev) => prev.filter((p) => p.id !== deletePlano.id));
                            }}
                          />
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
