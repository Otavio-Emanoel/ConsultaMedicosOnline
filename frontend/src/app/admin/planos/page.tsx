'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardBody } from '@/components/ui/Card';
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
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

// --- COMPONENTES DOS MODAIS (Mantidos, apenas organizados) ---

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={onClose}>
          <XCircle className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-4 dark:text-white">Editar Plano</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome do Plano" value={form.tipo} onChange={e => handleChange('tipo', e.target.value)} required />
          <Input label="Preço" type="number" min="0" step="0.01" value={form.preco} onChange={e => handleChange('preco', e.target.value)} required />
          <Input label="Periodicidade" value={form.periodicidade} onChange={e => handleChange('periodicidade', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
            <textarea 
              value={form.descricao} 
              onChange={e => handleChange('descricao', e.target.value)} 
              rows={3} 
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none" 
            />
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

function DeletePlanoModal({ plano, open, onClose, onDelete }: { plano: any, open: boolean, onClose: () => void, onDelete: () => Promise<void> }) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  
  // Limpa o input sempre que o modal abre
  useEffect(() => {
    if(open) {
        setInput('');
        setErro('');
    }
  }, [open]);

  if (!open || !plano) return null;
  const planName = plano.tipo || plano.nome || plano.internalPlanKey || plano.id;
  const disabled = input.trim() !== planName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={onClose}>
          <XCircle className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-red-700 dark:text-red-400">Excluir Plano</h2>
        <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          <p><b>Nome do plano:</b> <span className="text-primary font-semibold select-all">{planName}</span></p>
          <p className="mt-2 text-red-600 dark:text-red-400 font-medium">Esta ação é irreversível!</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-gray-600 dark:text-gray-400">
            <li>Usuários neste plano ficarão <b>sem plano</b>.</li>
            <li>Dados do plano serão removidos.</li>
          </ul>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">Digite o nome do plano para confirmar:</label>
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder={planName} autoFocus />
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

// --- PÁGINA PRINCIPAL ---

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  
  // Estados dos Modais (Agora globais para a página)
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

  const handleDeleteConfirm = async () => {
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
          // Pequeno delay para garantir que o firebase carregou
          setTimeout(async () => {
             const userRetry = auth.currentUser;
             if(userRetry) {
                 const token = await userRetry.getIdToken();
                 const res = await fetch(`${API_BASE}/admin/planos/dashboard`, {
                    headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
                 });
                 if (!res.ok) throw new Error('Erro ao buscar planos');
                 const data = await res.json();
                 setPlanos(data.planos || []);
                 setLoading(false);
             } else {
                 setErro("Usuário não autenticado.");
                 setLoading(false);
             }
          }, 1000);
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
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Planos Cadastrados
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie os planos de telemedicina oferecidos
          </p>
        </div>
        <Link href="/admin/planos/novo" className="w-full sm:w-auto">
          <Button variant="primary" size="lg" className="w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Novo Plano
          </Button>
        </Link>
      </div>

      {/* Estatísticas (Grid Responsivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ativos</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assinantes</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Receita (Est.)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : erro ? '-' : `R$ ${(planos.reduce((acc, p) => acc + ((p.valor || 0) * (p.assinantes || 0)), 0) / 1000).toFixed(1)}k`}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-success opacity-20" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lista de Planos Responsiva */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-12">
             <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-2"></div>
             <p>Carregando planos...</p>
          </div>
        ) : erro ? (
          <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg">{erro}</div>
        ) : planos.length === 0 ? (
          <div className="text-center text-gray-500 py-12">Nenhum plano cadastrado</div>
        ) : (
          planos.map((plano) => (
            <Card key={plano.id} className="hover:shadow-lg transition-shadow">
              <CardBody>
                {/* Container flexivel: Coluna no mobile, Linha no desktop */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  
                  {/* Esquerda: Ícone e Informações */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">
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
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {plano.descricao}
                      </p>

                      {Array.isArray(plano.especialidades) && plano.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {plano.especialidades.slice(0, 4).map((esp: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-700 dark:text-gray-300"
                            >
                              {esp}
                            </span>
                          ))}
                          {plano.especialidades.length > 4 && (
                            <span className="px-2 py-1 text-xs text-gray-500">+ {plano.especialidades.length - 4}</span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs sm:text-sm mt-2">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{plano.assinantes} assinantes</span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>R$ {((plano.preco || plano.valor || 0) * (plano.assinantes || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direita: Preço e Botões */}
                  <div className="flex flex-col md:items-end gap-3 w-full md:w-auto border-t md:border-t-0 border-gray-100 dark:border-gray-800 pt-4 md:pt-0">
                    <div className="flex md:flex-col items-center justify-between md:items-end">
                        <p className="text-sm text-gray-600 dark:text-gray-400 md:mb-1">Valor mensal</p>
                        <p className="text-2xl font-bold text-primary">
                            R$ {((plano.preco ?? plano.valor ?? 0).toFixed(2)).replace('.', ',')}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:flex md:items-center gap-2 w-full md:w-auto">
                      <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={() => handleEdit(plano)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" className="w-full md:w-auto" onClick={() => handleDelete(plano)}>
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

      {/* Modais Renderizados Fora do Loop */}
      <EditPlanoModal 
        plano={editPlano} 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        onSave={handleEditSave} 
      />
      
      <DeletePlanoModal
        plano={deletePlano}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDelete={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}