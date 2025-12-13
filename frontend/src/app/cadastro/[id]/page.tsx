"use client";

import { useEffect, useState } from "react";
import { Dialog } from '@/components/ui/Dialog';
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type Plano = {
  id: string;
  tipo: string;
  periodicidade: string;
  descricao: string;
  especialidades: string[];
  preco: number;
};

export default function CadastroPage() {
  const params = useParams();
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const planoId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [plano, setPlano] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [step, setStep] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    cpf: "",
    birthday: "",
    telefone: "",
    zipCode: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    country: "BR",
    billingType: "BOLETO" as "BOLETO" | "CREDIT_CARD",
  });

  // Corrigido: Removido duplicidade dos estados de cartão e modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [assinaturaCriada, setAssinaturaCriada] = useState(false);
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);
  const [redirecionamentoTentado, setRedirecionamentoTentado] = useState(false);

  useEffect(() => {
    if (!planoId) return;
    
    fetch(`${API_BASE}/planos`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then((res) => res.json())
      .then((planos) => {
        const p = planos.find((pl: Plano) => pl.id === planoId);
        if (p) setPlano(p);
        else setErro("Plano não encontrado.");
      })
      .catch(() => setErro("Erro ao buscar plano."))
      .finally(() => setLoading(false));
  }, [planoId, API_BASE]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const formatCPF = (value: string) => {
    const onlyNums = value.replace(/\D/g, "");
    return onlyNums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const onlyNums = value.replace(/\D/g, "");
    if (onlyNums.length <= 10) {
      return onlyNums.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    }
    return onlyNums.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  };

  const nextStep = () => {
    if (step === 0) {
      if (!form.nome || !form.email || !form.cpf || !form.birthday || !form.telefone) {
        setMensagem("Preencha todos os campos pessoais obrigatórios.");
        return;
      }
      const phoneDigits = form.telefone.replace(/\D/g, "");
      if (phoneDigits.length !== 11) {
        setMensagem("Telefone deve conter 11 dígitos (DDD + celular). Ex: 11998765432");
        return;
      }
    }
    if (step === 1) {
      if (!form.zipCode || !form.endereco || !form.numero || !form.bairro || !form.cidade || !form.estado) {
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

  const extractErrorMessage = (data: any): string => {
    if (!data) return "Erro ao criar assinatura.";
    if (typeof data === "string") return data;
    if (typeof data?.error === "string") return data.error;
    if (data?.error && typeof data.error === "object") {
      const desc = data.error.description || data.error.message;
      const code = data.error.code;
      if (desc) return code ? `${desc} (${code})` : desc;
    }
    if (data?.description || data?.message) {
      const base = data.description || data.message;
      return data.code ? `${base} (${data.code})` : base;
    }
    try {
      return JSON.stringify(data);
    } catch {
      return "Erro ao criar assinatura.";
    }
  };

  const submitAssinatura = async () => {
    const periodicidade = (plano?.periodicidade || "").toLowerCase();
    let cicloAsaas: "MONTHLY" | "QUARTERLY" | "YEARLY" = "MONTHLY";
    if (periodicidade.includes("tri")) cicloAsaas = "QUARTERLY";
    if (periodicidade.includes("anu")) cicloAsaas = "YEARLY";

    setEnviando(true);
    setMensagem("");
    
    try {
      const body: any = {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf.replace(/\D/g, ""),
        birthday: form.birthday,
        telefone: form.telefone.replace(/\D/g, ""),
        zipCode: form.zipCode.replace(/\D/g, ""),
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
      // Se for cartão, inclui dados do cartão
      if (form.billingType === 'CREDIT_CARD') {
        body.creditCard = {
          holderName: cardData.holderName,
          number: cardData.number,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        };
      }
      const resp = await fetch(`${API_BASE}/subscription/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(body),
      });
      
      const data = await resp.json();
      
      if (resp.ok) {
        const idAssinatura = data.assinaturaId;
        const urlCheckout = data.checkoutUrl; // URL do checkout do Asaas (apenas para cartão de crédito)
        
        // Salvar no estado
        setAssinaturaId(idAssinatura);
        if (urlCheckout) {
          setCheckoutUrl(urlCheckout);
        }
        
        try {
          localStorage.setItem(
            "assinaturaDraft",
            JSON.stringify({
              createdAt: Date.now(),
              assinaturaId: idAssinatura,
              clienteId: data.clienteId,
              checkoutUrl: urlCheckout, // Salvar URL do checkout
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
        
        setAssinaturaCriada(true);
        
        // Se for cartão de crédito e tiver URL de checkout, tentar redirecionar automaticamente
        // Mas também mostrar botão de fallback
        if (form.billingType === 'CREDIT_CARD' && urlCheckout && !redirecionamentoTentado) {
          setRedirecionamentoTentado(true);
          // Tentar redirecionar após um pequeno delay para dar tempo de mostrar mensagem
          setTimeout(() => {
            window.location.href = urlCheckout;
          }, 2000);
        } else if (form.billingType !== 'CREDIT_CARD') {
          // Para boleto, redirecionar imediatamente
          router.push(`/aguardando-pagamento/${idAssinatura}`);
        }
      } else {
        setMensagem(extractErrorMessage(data));
      }
    } catch {
      setMensagem("Erro de conexão com o servidor.");
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando plano...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{erro}</p>
          <button
            onClick={() => router.push("/planos")}
            className="text-primary hover:underline"
          >
            Voltar para planos
          </button>
        </div>
      </div>
    );
  }

  if (!plano) return null;

  const steps = ["Dados Pessoais", "Endereço", "Pagamento", "Confirmar"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/planos")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para planos
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 overflow-hidden">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Cadastro - {plano.tipo}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">{plano.descricao}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      i <= step
                        ? "bg-primary text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    }`}
                  >
                    {i < step ? <Check className="w-5 h-5" /> : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        i < step ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              {steps.map((s, i) => (
                <span key={i} className={i === step ? "font-semibold text-primary" : ""}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Form Steps */}
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${step * 100}%)` }}
            >
              {/* Etapa 0: Dados Pessoais */}
              <div className="w-full flex-shrink-0 pr-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Dados Pessoais
                </h3>
                <div className="grid gap-4">
                  <input
                    name="nome"
                    placeholder="Nome completo *"
                    value={form.nome}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="E-mail *"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    name="cpf"
                    placeholder="CPF *"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    maxLength={14}
                  />
                  <input
                    name="birthday"
                    type="date"
                    placeholder="Data de nascimento *"
                    value={form.birthday}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    name="telefone"
                    placeholder="Telefone *"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Etapa 1: Endereço */}
              <div className="w-full flex-shrink-0 pr-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Endereço</h3>
                <div className="grid gap-4">
                  <input
                    name="zipCode"
                    placeholder="CEP *"
                    value={form.zipCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    maxLength={9}
                  />
                  <input
                    name="endereco"
                    placeholder="Endereço *"
                    value={form.endereco}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="numero"
                      placeholder="Número *"
                      value={form.numero}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      name="bairro"
                      placeholder="Bairro *"
                      value={form.bairro}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="cidade"
                      placeholder="Cidade *"
                      value={form.cidade}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      name="estado"
                      placeholder="Estado (UF) *"
                      value={form.estado}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      maxLength={2}
                    />
                  </div>
                  <input
                    name="country"
                    placeholder="País"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Etapa 2: Pagamento */}
              <div className="w-full flex-shrink-0 pr-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Plano & Pagamento
                </h3>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="font-bold text-lg text-gray-900 dark:text-white">{plano.tipo}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{plano.periodicidade}</div>
                    <div className="text-primary font-bold text-2xl mt-2">
                      R$ {plano.preco.toFixed(2)}/mês
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Forma de Pagamento *
                    </label>
                    <select
                      name="billingType"
                      value={form.billingType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    >
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                    </select>
                    {form.billingType === 'CREDIT_CARD' && (
                      <button
                        type="button"
                        className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition"
                        onClick={() => setShowCardModal(true)}
                      >
                        Configurar Cartão
                      </button>
                    )}
                  </div>


                        {/* Modal de Cartão de Crédito - sempre renderizado fora do carrossel e do return principal */}
                        <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
                          <Dialog.Content>
                            <Dialog.Title>Dados do Cartão de Crédito</Dialog.Title>
                            <div className="space-y-4 mt-2">
                              <input
                                type="text"
                                placeholder="Nome impresso no cartão"
                                value={cardData.holderName}
                                onChange={e => setCardData({ ...cardData, holderName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                              />
                              <input
                                type="text"
                                placeholder="Número do cartão"
                                value={cardData.number}
                                onChange={e => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '') })}
                                maxLength={16}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                              />
                              <div className="flex gap-4">
                                <input
                                  type="text"
                                  placeholder="Mês (MM)"
                                  value={cardData.expiryMonth}
                                  onChange={e => setCardData({ ...cardData, expiryMonth: e.target.value.replace(/\D/g, '').slice(0,2) })}
                                  maxLength={2}
                                  className="w-1/2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                                />
                                <input
                                  type="text"
                                  placeholder="Ano (AA ou AAAA)"
                                  value={cardData.expiryYear}
                                  onChange={e => setCardData({ ...cardData, expiryYear: e.target.value.replace(/\D/g, '').slice(0,4) })}
                                  maxLength={4}
                                  className="w-1/2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="CVV"
                                value={cardData.ccv}
                                onChange={e => setCardData({ ...cardData, ccv: e.target.value.replace(/\D/g, '').slice(0,4) })}
                                maxLength={4}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                              />
                              <div className="flex justify-end gap-2 mt-4">
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  onClick={() => setShowCardModal(false)}
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-green-700"
                                  onClick={() => setShowCardModal(false)}
                                  disabled={
                                    !cardData.holderName ||
                                    cardData.number.length < 13 ||
                                    cardData.expiryMonth.length < 1 ||
                                    cardData.expiryYear.length < 2 ||
                                    cardData.ccv.length < 3
                                  }
                                >
                                  Salvar Cartão
                                </button>
                              </div>
                            </div>
                          </Dialog.Content>
                        </Dialog>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Ciclo de cobrança: {plano.periodicidade}
                  </div>
                </div>
              </div>

              {/* Etapa 3: Confirmar */}
              <div className="w-full flex-shrink-0 pr-4">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Confirmar Dados
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Nome:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">{form.nome}</span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Email:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">{form.email}</span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">CPF:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">{form.cpf}</span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Nascimento:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">{form.birthday}</span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Telefone:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">{form.telefone}</span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Endereço:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">
                      {form.endereco}, {form.numero} - {form.bairro} - {form.cidade}/{form.estado} (
                      {form.zipCode})
                    </span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Plano:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">
                      {plano.tipo} / {plano.periodicidade} - R$ {plano.preco.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <strong className="text-gray-700 dark:text-gray-300">Pagamento:</strong>{" "}
                    <span className="text-gray-900 dark:text-white">
                      {form.billingType === "BOLETO"
                        ? "Boleto Bancário"
                        : form.billingType === "CREDIT_CARD"
                        ? "Cartão de Crédito"
                        : "PIX"}
                    </span>
                  </div>
                </div>
                {!assinaturaCriada ? (
                  <button
                    type="button"
                    className="w-full mt-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg py-3 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    disabled={enviando}
                    onClick={submitAssinatura}
                  >
                    {enviando ? "Enviando..." : "Confirmar e Criar Assinatura"}
                  </button>
                ) : form.billingType === 'CREDIT_CARD' && checkoutUrl ? (
                  <div className="mt-6 space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                            Assinatura criada com sucesso!
                          </h4>
                          <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                            Você será redirecionado para o pagamento em instantes...
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-400 mb-4">
                            Se a página de pagamento não abrir automaticamente, clique no botão abaixo para continuar:
                          </p>
                        </div>
                      </div>
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full text-center px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        Continuar para Pagamento
                      </a>
                    </div>
                    {assinaturaId && (
                      <button
                        type="button"
                        onClick={() => router.push(`/aguardando-pagamento/${assinaturaId}`)}
                        className="w-full px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        Ir para página de aguardando pagamento
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-3 text-center">
                      Assinatura criada com sucesso!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const draft = localStorage.getItem('assinaturaDraft');
                        if (draft) {
                          const data = JSON.parse(draft);
                          router.push(`/aguardando-pagamento/${data.assinaturaId}`);
                        }
                      }}
                      className="w-full px-6 py-3 rounded-lg bg-primary hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mensagem && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center text-sm text-red-800 dark:text-red-200">
              {mensagem}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 0 || enviando}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            {step < 3 && (
              <button
                type="button"
                onClick={nextStep}
                disabled={enviando}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary hover:bg-green-700 text-white transition"
              >
                Próximo
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}