'use client';

import { useState, useEffect } from 'react';

type Dependente = {
  id: string;
  nome: string;
  cpf: string;
  birthDate: string;
  parentesco: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

function getToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('firebaseToken') : null;
  } catch {
    return null;
  }
}

function extractCpfFromToken(token: string): string | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = JSON.parse(atob(payloadB64));
    return (json?.user_id as string) || (json?.uid as string) || null;
  } catch {
    return null;
  }
}

export default function DependentesPage() {
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Dependente | null>(null);
  const [form, setForm] = useState<Omit<Dependente, 'id'>>({
    nome: '',
    cpf: '',
    birthDate: '',
    parentesco: '',
  });

  // Buscar dependentes do usuário autenticado
  useEffect(() => {
    async function fetchDependentes() {
      setLoading(true);
      setErro(null);
      const token = getToken();
      if (!token) {
        setErro('Não autenticado.');
        setLoading(false);
        return;
      }
      const cpfTitular = extractCpfFromToken(token);
      if (!cpfTitular) {
        setErro('Não foi possível obter o CPF do titular.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/dependentes/${cpfTitular}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erro ao buscar dependentes');
        const data = await res.json();
        setDependentes(data.dependentes || []);
      } catch {
        setErro('Erro ao buscar dependentes.');
      } finally {
        setLoading(false);
      }
    }
    fetchDependentes();
  }, []);

  // Abrir modal para adicionar ou editar
  function openModal(dep?: Dependente) {
    if (dep) {
      setEditing(dep);
      setForm({
        nome: dep.nome,
        cpf: dep.cpf,
        birthDate: dep.birthDate,
        parentesco: dep.parentesco,
      });
    } else {
      setEditing(null);
      setForm({ nome: '', cpf: '', birthDate: '', parentesco: '' });
    }
    setShowModal(true);
  }

  // Salvar dependente (adicionar ou editar)
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const cpfTitular = extractCpfFromToken(token);
    if (!cpfTitular) return;

    try {
      let res;
      if (editing) {
        // Editar dependente
        res = await fetch(`${API}/dependentes/${editing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, holder: cpfTitular }),
        });
      } else {
        // Adicionar dependente
        res = await fetch(`${API}/dependentes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, holder: cpfTitular }),
        });
      }
      if (!res.ok) throw new Error('Erro ao salvar dependente');
      setShowModal(false);
      // Atualiza lista
      const updated = await res.json();
      setDependentes(updated.dependentes || []);
    } catch {
      alert('Erro ao salvar dependente.');
    }
  }

  // Remover dependente
  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover este dependente?')) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/dependentes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao remover dependente');
      setDependentes(dependentes.filter((d) => d.id !== id));
    } catch {
      alert('Erro ao remover dependente.');
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen bg-zinc-50 dark:bg-black">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Meus Dependentes</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold"
          onClick={() => openModal()}
        >
          + Adicionar
        </button>
      </div>
      {loading ? (
        <p className="text-zinc-500">Carregando...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : dependentes.length === 0 ? (
        <div className="text-zinc-500">Nenhum dependente cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {dependentes.map((dep) => (
            <div key={dep.id} className="rounded-xl border p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{dep.nome}</div>
                <div className="text-xs text-zinc-500">CPF: {dep.cpf}</div>
                <div className="text-xs text-zinc-500">Nascimento: {dep.birthDate}</div>
                <div className="text-xs text-zinc-500">Parentesco: {dep.parentesco}</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded bg-yellow-400 text-white font-semibold"
                  onClick={() => openModal(dep)}
                >
                  Editar
                </button>
                <button
                  className="px-3 py-1 rounded bg-red-600 text-white font-semibold"
                  onClick={() => handleDelete(dep.id)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xl"
              onClick={() => setShowModal(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              {editing ? 'Editar Dependente' : 'Adicionar Dependente'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome completo</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CPF</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={form.cpf}
                  onChange={e => setForm({ ...form, cpf: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data de nascimento</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parentesco</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.parentesco}
                  onChange={e => setForm({ ...form, parentesco: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Pai/Mãe">Pai/Mãe</option>
                  <option value="Irmão(ã)">Irmão(ã)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 font-semibold mt-2"
              >
                {editing ? 'Salvar Alterações' : 'Adicionar Dependente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}