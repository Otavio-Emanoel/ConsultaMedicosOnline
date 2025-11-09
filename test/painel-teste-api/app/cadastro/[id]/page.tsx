"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Plano = {
  id: string;
  tipo: string;
  periodicidade: string;
  descricao: string;
  especialidades: string[];
  preco: number;
  criadoEm?: string;
};

export default function CadastroPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    nome: "",
    email: "",
    cpf: "",
    birthday: "",
    telefone: "",
    // Endereço
    zipCode: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    country: "BR",
    // Pagamento
    billingType: "BOLETO", // BOLETO | CREDIT_CARD | PIX
  });
  const [step, setStep] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!planoId) return;
    fetch(`http://localhost:3000/api/planos`)
      .then((res) => res.json())
      .then((planos) => {
        const p = planos.find((pl: Plano) => pl.id === planoId);
        if (p) setPlano(p);
        else setErro("Plano não encontrado.");
      })
      .catch(() => setErro("Erro ao buscar plano."))
      .finally(() => setLoading(false));
  }, [planoId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    // validações simples por etapa
    if (step === 0) {
      if (!form.nome || !form.email || !form.cpf || !form.birthday || !form.telefone) {
        setMensagem("Preencha todos os campos pessoais obrigatórios.");
        return;
      }
    }
    if (step === 1) {
      if (!form.zipCode || !form.endereco || !form.numero || !form.bairro || !form.cidade || !form.estado || !form.country) {
        setMensagem("Preencha todos os campos de endereço.");
        return;
      }
    }
    setMensagem("");
    setStep(s => s + 1);
  };
  const prevStep = () => {
    setMensagem("");
    setStep(s => (s > 0 ? s - 1 : s));
  };

  const submitAssinatura = async () => {
    // Converter periodicidade do plano para ciclo Asaas
    const periodicidade = (plano?.periodicidade || '').toLowerCase();
    let cicloAsaas: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY';
    if (periodicidade.includes('tri')) cicloAsaas = 'QUARTERLY';
    if (periodicidade.includes('anu')) cicloAsaas = 'YEARLY';

    setEnviando(true);
    setMensagem("");
    try {
      const body = {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf.replace(/\D/g, ""),
        birthday: form.birthday,
        telefone: form.telefone,
        zipCode: form.zipCode,
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        country: form.country,
        valor: plano?.preco,
        billingType: form.billingType,
        ciclo: cicloAsaas,
      };
      const resp = await fetch("http://localhost:3000/api/subscription/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (resp.ok) {
        const assinaturaId = data.assinaturaId;
        // Persistir rascunho local para próxima tela
        try {
          localStorage.setItem(
            "assinaturaDraft",
            JSON.stringify({
              createdAt: Date.now(),
              assinaturaId,
              clienteId: data.clienteId,
              plano: {
                id: plano?.id,
                tipo: plano?.tipo,
                preco: plano?.preco,
                periodicidade: plano?.periodicidade,
              },
              dados: body,
            })
          );
        } catch {}
        router.push(`/aguardando-pagamento/${assinaturaId}`);
      } else {
        setMensagem(data.error || "Erro ao criar assinatura.");
      }
    } catch {
      setMensagem("Erro de conexão com o servidor.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando plano...</div>;
  if (erro) return <div className="p-8 text-center text-red-500">{erro}</div>;
  if (!plano) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black py-8">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md w-full max-w-xl overflow-hidden">
        <h2 className="text-2xl font-bold mb-2">Cadastro - {plano.tipo}</h2>
        <p className="mb-6 text-zinc-700 dark:text-zinc-200">{plano.descricao}</p>
        <div className="relative w-full">
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {/* Etapa 0: Dados Pessoais */}
            <div className="w-full flex-shrink-0 pr-4">
              <h3 className="text-lg font-semibold mb-4">Dados Pessoais</h3>
              <div className="flex flex-col gap-3">
                <input name="nome" placeholder="Nome completo" value={form.nome} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="email" placeholder="E-mail" value={form.email} onChange={handleChange} className="border rounded px-4 py-2" type="email" />
                <input name="cpf" placeholder="CPF" value={form.cpf} onChange={handleChange} className="border rounded px-4 py-2" maxLength={14} />
                <input name="birthday" placeholder="Data de nascimento" value={form.birthday} onChange={handleChange} className="border rounded px-4 py-2" type="date" />
                <input name="telefone" placeholder="Telefone" value={form.telefone} onChange={handleChange} className="border rounded px-4 py-2" />
              </div>
            </div>
            {/* Etapa 1: Endereço */}
            <div className="w-full flex-shrink-0 pr-4">
              <h3 className="text-lg font-semibold mb-4">Endereço</h3>
              <div className="flex flex-col gap-3">
                <input name="zipCode" placeholder="CEP" value={form.zipCode} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="endereco" placeholder="Endereço" value={form.endereco} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="numero" placeholder="Número" value={form.numero} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="estado" placeholder="Estado" value={form.estado} onChange={handleChange} className="border rounded px-4 py-2" />
                <input name="country" placeholder="País" value={form.country} onChange={handleChange} className="border rounded px-4 py-2" />
              </div>
            </div>
            {/* Etapa 2: Plano & Pagamento */}
            <div className="w-full flex-shrink-0 pr-4">
              <h3 className="text-lg font-semibold mb-4">Plano & Pagamento</h3>
              <div className="flex flex-col gap-3">
                <div className="p-4 border rounded bg-zinc-50 dark:bg-zinc-800">
                  <div className="font-bold">{plano.tipo}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">{plano.periodicidade}</div>
                  <div className="text-blue-600 dark:text-blue-400 font-bold mt-1">R$ {plano.preco.toFixed(2)}</div>
                </div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <select
                  name="billingType"
                  value={form.billingType}
                  onChange={(e) => setForm({ ...form, billingType: e.target.value })}
                  className="border rounded px-4 py-2"
                >
                  <option value="BOLETO">Boleto</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="PIX">PIX</option>
                </select>
                {/* Ciclo definido pelo plano, não editável pelo usuário */}
                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  Ciclo definido pelo plano: {plano.periodicidade}
                </div>
              </div>
            </div>
            {/* Etapa 3: Confirmar */}
            <div className="w-full flex-shrink-0 pr-4">
              <h3 className="text-lg font-semibold mb-4">Confirmar Dados</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Nome:</strong> {form.nome}</div>
                <div><strong>Email:</strong> {form.email}</div>
                <div><strong>CPF:</strong> {form.cpf}</div>
                <div><strong>Nascimento:</strong> {form.birthday}</div>
                <div><strong>Telefone:</strong> {form.telefone}</div>
                <div><strong>Endereço:</strong> {form.endereco}, {form.numero} - {form.bairro} - {form.cidade}/{form.estado} ({form.zipCode})</div>
                <div><strong>País:</strong> {form.country}</div>
                <div><strong>Plano:</strong> {plano.tipo} / {plano.periodicidade} - R$ {plano.preco.toFixed(2)}</div>
                <div><strong>Pagamento:</strong> {form.billingType}</div>
                <div><strong>Ciclo:</strong> {plano.periodicidade}</div>
              </div>
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white rounded py-2 font-semibold mt-6 w-full"
                disabled={enviando}
                onClick={submitAssinatura}
              >
                {enviando ? "Enviando..." : "Confirmar e Criar Assinatura"}
              </button>
            </div>
          </div>
        </div>
        {mensagem && <div className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{mensagem}</div>}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0 || enviando}
            className="px-4 py-2 rounded border text-sm disabled:opacity-40"
          >
            Voltar
          </button>
          {step < 3 && (
            <button
              type="button"
              onClick={nextStep}
              disabled={enviando}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Próximo
            </button>
          )}
        </div>
        <div className="mt-4 text-xs text-center text-zinc-500 dark:text-zinc-400">Etapa {step + 1} de 4</div>
      </div>
    </div>
  );
}
