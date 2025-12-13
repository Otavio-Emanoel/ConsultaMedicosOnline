'use client';

type InvoiceStatus = 'paid' | 'pending' | 'overdue';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEffect, useState } from 'react';
import {
  CreditCard,
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Eye,
  Settings,
} from 'lucide-react';

type FaturaApi = {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  paymentDate?: string | null;
  billingType?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  description?: string;
};

interface Invoice {
  id: string;
  referenceMonth: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  paymentDate?: string | null;
  paymentMethod?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  description?: string;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: 'success' | 'warning' | 'danger'; icon: any }
> = {
  paid: {
    label: 'Paga',
    variant: 'success',
    icon: CheckCircle,
  },
  pending: {
    label: 'Pendente',
    variant: 'warning',
    icon: Clock,
  },
  overdue: {
    label: 'Vencida',
    variant: 'danger',
    icon: XCircle,
  },
};

export default function FaturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(`${apiBase}/dashboard`, {
      headers: token
        ? { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        : { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((res) => res.json())
      .then((json) => {
        const faturas: FaturaApi[] = json.faturas || [];
        const invoicesMapped: Invoice[] = faturas.map((f) => {
          let status: InvoiceStatus = 'pending';
          if (f.status === 'RECEIVED') status = 'paid';
          else if (f.status === 'OVERDUE') status = 'overdue';
          else if (f.status === 'PENDING') status = 'pending';
          let referenceMonth = '';
          if (f.dueDate) {
            const [ano, mes] = f.dueDate.split('-');
            referenceMonth = `${ano}-${mes}`;
          }
          return {
            id: f.id,
            referenceMonth,
            dueDate: f.dueDate,
            amount: f.value,
            status,
            paymentDate: f.paymentDate,
            paymentMethod: f.billingType,
            bankSlipUrl: f.bankSlipUrl,
            invoiceUrl: f.invoiceUrl,
            description: f.description,
          };
        });
        setInvoices(invoicesMapped);
        
        // Tentar obter o ID da assinatura do dashboard
        // Prioridade: idAssinaturaAtual > idAssinatura (do usuário) > idAssinatura (da primeira assinatura)
        if (json.usuario?.idAssinaturaAtual) {
          setAssinaturaId(json.usuario.idAssinaturaAtual);
        } else if (json.usuario?.idAssinatura) {
          setAssinaturaId(json.usuario.idAssinatura);
        } else if (json.assinaturas && json.assinaturas.length > 0) {
          const primeiraAssinatura = json.assinaturas[0];
          if (primeiraAssinatura.idAssinatura) {
            setAssinaturaId(primeiraAssinatura.idAssinatura);
          }
        }
        
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatMonthYear = (dateString: string) => {
    const date = new Date(dateString + '-01');
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const totalPaid = invoices
    .filter((inv: Invoice) => inv.status === 'paid')
    .reduce((sum: number, inv: Invoice) => sum + inv.amount, 0);

  const totalPending = invoices
    .filter((inv: Invoice) => inv.status === 'pending')
    .reduce((sum: number, inv: Invoice) => sum + inv.amount, 0);

  function PaymentModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
    if (!invoice) return null;

    const isPix = invoice.paymentMethod?.toLowerCase().includes('pix');
    const isBoleto = invoice.paymentMethod?.toLowerCase().includes('boleto');
    const isCartao = invoice.paymentMethod?.toLowerCase().includes('cartao') || invoice.paymentMethod?.toLowerCase().includes('crédito');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full p-6 relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
          <h2 className="text-lg font-bold mb-4">Pagamento da Fatura</h2>
          <div className="mb-4">
            <div className="text-gray-700 dark:text-gray-200 font-medium mb-2">
              Valor: <span className="font-bold">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              Vencimento: {new Date(invoice.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
          </div>
          {isPix && (
            <div className="mb-4">
              <div className="font-semibold mb-2">Pagamento via PIX</div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 mb-2 text-xs break-all select-all">
                {invoice.description || 'Chave/código PIX indisponível'}
              </div>
            </div>
          )}
          {isBoleto && (
            <div className="mb-4">
              <div className="font-semibold mb-2">Pagamento via Boleto</div>
              {invoice.bankSlipUrl ? (
                <a
                  href={invoice.bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Baixar Boleto
                </a>
              ) : (
                <div className="text-sm text-gray-500">Boleto indisponível</div>
              )}
            </div>
          )}
          {isCartao && (
            <div className="mb-4">
              <div className="font-semibold mb-2">Pagamento via Cartão</div>
              <div className="text-sm text-gray-500">Entre em contato com o suporte ou acesse o link de pagamento do cartão (se disponível).</div>
            </div>
          )}
          {!isPix && !isBoleto && !isCartao && (
            <div className="mb-4 text-sm text-gray-500">Forma de pagamento não reconhecida.</div>
          )}
          <button
            className="mt-2 w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Faturas">
        <div className="py-20 text-center text-gray-500">Carregando...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Faturas">
      {/* Header com botão de configurações */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faturas</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowPaymentMethodModal(true)}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Alterar Forma de Pagamento
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardBody>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Pago
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pendente
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalPending)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total de Faturas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {invoices.length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Invoices Table (Desktop) */}
      <Card className="hidden md:block">
        <CardHeader>Histórico de Faturas</CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Referência
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Vencimento
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Valor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Pagamento
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={invoice.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {invoice.referenceMonth ? formatMonthYear(invoice.referenceMonth) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(
                            invoice.dueDate + 'T00:00:00'
                          ).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={statusConfig.variant}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        {invoice.paymentDate ? (
                          <div className="text-sm">
                            <p className="text-gray-900 dark:text-white">
                              {new Date(
                                invoice.paymentDate + 'T00:00:00'
                              ).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {invoice.paymentMethod}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-2 py-1 text-gray-700 dark:text-gray-300"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          {invoice.bankSlipUrl && (
                            <a
                              href={invoice.bankSlipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-transparent hover:bg-accent hover:text-accent-foreground h-9 px-2 py-1 text-gray-700 dark:text-gray-300"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {invoice.status === 'pending' && (
                            <Button variant="primary" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                              Pagar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Invoices Cards (Mobile) */}
      <div className="md:hidden space-y-4">
        {invoices.map((invoice) => {
          const statusConfig = STATUS_CONFIG[invoice.status];
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={invoice.id}>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                        {invoice.referenceMonth ? formatMonthYear(invoice.referenceMonth) : '-'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Fatura #{invoice.id}
                      </p>
                    </div>
                    <Badge variant={statusConfig.variant}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Vencimento
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(
                          invoice.dueDate + 'T00:00:00'
                        ).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Valor
                      </span>
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">
                        {formatCurrency(invoice.amount)}
                      </span>
                    </div>
                    {invoice.paymentDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Pago em
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(
                            invoice.paymentDate + 'T00:00:00'
                          ).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    {invoice.invoiceUrl && (
                      <a
                        href={invoice.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-gray-700 dark:text-gray-300"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </a>
                    )}
                    {invoice.bankSlipUrl && (
                      <a
                        href={invoice.bankSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-gray-700 dark:text-gray-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </a>
                    )}
                    {invoice.status === 'pending' && (
                      <Button variant="primary" size="sm" className="flex-1" onClick={() => setSelectedInvoice(invoice)}>
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      {selectedInvoice && (
        <PaymentModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
      {showPaymentMethodModal && (
        <PaymentMethodModal
          assinaturaId={assinaturaId}
          onClose={() => setShowPaymentMethodModal(false)}
          onSuccess={() => {
            setShowPaymentMethodModal(false);
            // Recarregar a página para atualizar as faturas
            window.location.reload();
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Modal para alterar forma de pagamento
function PaymentMethodModal({
  assinaturaId,
  onClose,
  onSuccess,
}: {
  assinaturaId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [billingType, setBillingType] = useState<'BOLETO' | 'PIX' | 'CREDIT_CARD'>('BOLETO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // Dados do cartão
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });

  // Dados do portador do cartão
  const [holderInfo, setHolderInfo] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    postalCode: '',
    addressNumber: '',
    addressComplement: '',
    phone: '',
  });

  const [creditCardToken, setCreditCardToken] = useState<string>('');

  useEffect(() => {
    // Buscar dados do usuário se necessário
    const fetchUserData = async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      try {
        const res = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        });
        if (res.ok) {
          const userData = await res.json();
          if (userData) {
            setHolderInfo((prev) => ({
              ...prev,
              name: userData.nome || userData.name || prev.name,
              email: userData.email || prev.email,
              cpfCnpj: userData.cpf || prev.cpfCnpj,
              postalCode: userData.cep || userData.postalCode || prev.postalCode,
              phone: userData.telefone || userData.phone || prev.phone,
            }));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados do usuário:', err);
      }
    };

    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!assinaturaId) {
      setError('ID da assinatura não encontrado. Por favor, recarregue a página.');
      setLoading(false);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      setError('Usuário não autenticado. Por favor, faça login novamente.');
      setLoading(false);
      return;
    }

    // Validações para cartão de crédito
    if (billingType === 'CREDIT_CARD') {
      if (!creditCardToken && (!cardData.holderName || !cardData.number || !cardData.expiryMonth || !cardData.expiryYear || !cardData.ccv)) {
        setError('Por favor, preencha todos os dados do cartão ou use um token.');
        setLoading(false);
        return;
      }
      
      // Validações mais específicas
      if (!creditCardToken) {
        const numberOnly = cardData.number.replace(/\D/g, '');
        if (numberOnly.length < 13 || numberOnly.length > 19) {
          setError('Número do cartão inválido. Deve ter entre 13 e 19 dígitos.');
          setLoading(false);
          return;
        }
        if (!cardData.expiryMonth || parseInt(cardData.expiryMonth) < 1 || parseInt(cardData.expiryMonth) > 12) {
          setError('Mês de expiração inválido. Use um valor entre 01 e 12.');
          setLoading(false);
          return;
        }
        if (!cardData.expiryYear || cardData.expiryYear.length !== 4) {
          setError('Ano de expiração inválido. Use um ano completo (ex: 2025).');
          setLoading(false);
          return;
        }
        if (!cardData.ccv || cardData.ccv.length < 3 || cardData.ccv.length > 4) {
          setError('CVV inválido. Deve ter 3 ou 4 dígitos.');
          setLoading(false);
          return;
        }
      }
      
      if (!holderInfo.name || holderInfo.name.trim().length < 3) {
        setError('Nome completo do portador é obrigatório (mínimo 3 caracteres).');
        setLoading(false);
        return;
      }
      if (!holderInfo.email || !holderInfo.email.includes('@')) {
        setError('E-mail do portador é obrigatório e deve ser válido.');
        setLoading(false);
        return;
      }
      
      const cpfCnpjOnly = holderInfo.cpfCnpj.replace(/\D/g, '');
      if (!cpfCnpjOnly || (cpfCnpjOnly.length !== 11 && cpfCnpjOnly.length !== 14)) {
        setError('CPF/CNPJ inválido. CPF deve ter 11 dígitos e CNPJ deve ter 14 dígitos.');
        setLoading(false);
        return;
      }
      
      const postalCodeOnly = holderInfo.postalCode.replace(/\D/g, '');
      if (!postalCodeOnly || postalCodeOnly.length !== 8) {
        setError('CEP inválido. Deve ter 8 dígitos.');
        setLoading(false);
        return;
      }
      
      if (!holderInfo.addressNumber || holderInfo.addressNumber.trim().length === 0) {
        setError('Número do endereço é obrigatório.');
        setLoading(false);
        return;
      }
    }

    try {
      const body: any = {
        billingType,
      };

      if (billingType === 'CREDIT_CARD') {
        if (creditCardToken) {
          body.creditCardToken = creditCardToken.trim();
        } else {
          body.creditCard = {
            holderName: cardData.holderName.trim().toUpperCase(),
            number: cardData.number.replace(/\D/g, '').trim(),
            expiryMonth: String(cardData.expiryMonth).padStart(2, '0'),
            expiryYear: String(cardData.expiryYear).trim(),
            ccv: cardData.ccv.replace(/\D/g, '').trim(),
          };
        }
        
        // Normalizar CPF/CNPJ e CEP (apenas números)
        const cpfCnpjNormalized = holderInfo.cpfCnpj.replace(/\D/g, '').trim();
        const postalCodeNormalized = holderInfo.postalCode.replace(/\D/g, '').trim();
        const phoneNormalized = holderInfo.phone ? holderInfo.phone.replace(/\D/g, '').trim() : '';
        
        body.creditCardHolderInfo = {
          name: holderInfo.name.trim(),
          email: holderInfo.email.trim(),
          cpfCnpj: cpfCnpjNormalized,
          postalCode: postalCodeNormalized,
          addressNumber: holderInfo.addressNumber.trim(),
        };
        
        // Campos opcionais apenas se preenchidos
        if (holderInfo.addressComplement && holderInfo.addressComplement.trim()) {
          body.creditCardHolderInfo.addressComplement = holderInfo.addressComplement.trim();
        }
        
        if (phoneNormalized) {
          body.creditCardHolderInfo.phone = phoneNormalized;
        }
      }

      const response = await fetch(`${apiBase}/subscription/update-payment-method/${assinaturaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        // Tentar extrair mensagem de erro mais detalhada
        let errorMessage = 'Erro ao atualizar forma de pagamento';
        
        if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.map((e: any) => e.description || e.message || e).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.details) {
          errorMessage = `Erro: ${JSON.stringify(data.details)}`;
        }
        
        console.error('[PaymentMethodModal] Erro na requisição:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('[PaymentMethodModal] Erro:', err);
      setError(err.message || 'Erro ao atualizar forma de pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Forma de pagamento atualizada!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              A alteração foi realizada com sucesso.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Alterar Forma de Pagamento
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seleção da forma de pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setBillingType('BOLETO')}
                    className={`p-3 rounded-lg border-2 transition ${
                      billingType === 'BOLETO'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">Boleto</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType('PIX')}
                    className={`p-3 rounded-lg border-2 transition ${
                      billingType === 'PIX'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">PIX</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType('CREDIT_CARD')}
                    className={`p-3 rounded-lg border-2 transition ${
                      billingType === 'CREDIT_CARD'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">Cartão</div>
                  </button>
                </div>
              </div>

              {/* Campos para cartão de crédito */}
              {billingType === 'CREDIT_CARD' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Dados do Cartão</h3>

                  {/* Token do cartão (opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Token do Cartão (opcional)
                    </label>
                    <input
                      type="text"
                      value={creditCardToken}
                      onChange={(e) => setCreditCardToken(e.target.value)}
                      placeholder="tok_xxxxxxxxxxxx"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Se você já tem um token do cartão, preencha apenas este campo.
                    </p>
                  </div>

                  {!creditCardToken && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nome no Cartão *
                          </label>
                          <input
                            type="text"
                            value={cardData.holderName}
                            onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
                            placeholder="JOÃO SILVA"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Número do Cartão *
                          </label>
                          <input
                            type="text"
                            value={cardData.number}
                            onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                            placeholder="5162306219378829"
                            required
                            maxLength={16}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Mês *
                          </label>
                          <input
                            type="text"
                            value={cardData.expiryMonth}
                            onChange={(e) => setCardData({ ...cardData, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                            placeholder="05"
                            required
                            maxLength={2}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ano *
                          </label>
                          <input
                            type="text"
                            value={cardData.expiryYear}
                            onChange={(e) => setCardData({ ...cardData, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            placeholder="2028"
                            required
                            maxLength={4}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            value={cardData.ccv}
                            onChange={(e) => setCardData({ ...cardData, ccv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            placeholder="318"
                            required
                            maxLength={4}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <h3 className="font-semibold text-gray-900 dark:text-white mt-6">Dados do Portador</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={holderInfo.name}
                        onChange={(e) => setHolderInfo({ ...holderInfo, name: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        value={holderInfo.email}
                        onChange={(e) => setHolderInfo({ ...holderInfo, email: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CPF/CNPJ *
                      </label>
                      <input
                        type="text"
                        value={holderInfo.cpfCnpj}
                        onChange={(e) => setHolderInfo({ ...holderInfo, cpfCnpj: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CEP *
                      </label>
                      <input
                        type="text"
                        value={holderInfo.postalCode}
                        onChange={(e) => setHolderInfo({ ...holderInfo, postalCode: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Número do Endereço *
                      </label>
                      <input
                        type="text"
                        value={holderInfo.addressNumber}
                        onChange={(e) => setHolderInfo({ ...holderInfo, addressNumber: e.target.value })}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={holderInfo.addressComplement}
                        onChange={(e) => setHolderInfo({ ...holderInfo, addressComplement: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={holderInfo.phone}
                      onChange={(e) => setHolderInfo({ ...holderInfo, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}