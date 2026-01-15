'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlertCircle, FileText, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from '@/components/landing/ui/use-toast';

interface Fatura {
  id: string;
  value: number;
  dueDate: string;
  status: string;
  invoiceUrl: string;
  bankSlipUrl?: string; // URL do boleto bancário
  pixQrCodeId?: string; // Se tiver PIX
}

export function PlanoCanceladoBlocker() {
  const [bloqueado, setBloqueado] = useState(false);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? `${window.location.origin}/api` : '');

  console.log('[PlanoCanceladoBlocker] Componente montado. Estado bloqueado:', bloqueado);
  
  // DEBUG: Descomente a linha abaixo para testar o modal forçadamente
  // useEffect(() => { setBloqueado(true); setFaturas([{ id: '1', value: 99.90, dueDate: '2026-01-10', status: 'OVERDUE', invoiceUrl: 'https://exemplo.com' }]); }, []);

  useEffect(() => {
    verificarStatus();
    
    // Verifica o status a cada 30 segundos para capturar mudanças do webhook
    const interval = setInterval(() => {
      verificarStatus();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  const verificarStatus = async () => {
    try {
      if (!API_BASE) {
        console.error('[PlanoCanceladoBlocker] API_BASE não configurado. Defina NEXT_PUBLIC_API_BASE_URL ou NEXT_PUBLIC_API_URL');
        return;
      }

      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        console.log('[PlanoCanceladoBlocker] Nenhum usuário encontrado no localStorage');
        return;
      }

      const user = JSON.parse(storedUser);
      console.log('[PlanoCanceladoBlocker] Usuário encontrado:', user);
      
      // Busca o status atualizado da API
      try {
        console.log('[PlanoCanceladoBlocker] Verificando status do usuário:', user.cpf);
        const response = await fetch(`${API_BASE}/usuario/${user.cpf}/status`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!response.ok) throw new Error(`Status HTTP ${response.status}`);

        const data = await response.json();
        const statusAtualizado = data.statusAssinatura ? data.statusAssinatura.toLowerCase() : 'ativo';
        
        console.log('[PlanoCanceladoBlocker] Status recebido da API:', statusAtualizado);
        
        // Atualiza o localStorage com o status mais recente
        user.statusAssinatura = statusAtualizado;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Lista de status que bloqueiam o acesso
        const statusBloqueantes = ['suspenso', 'overdue', 'cancelado', 'bloqueado'];

        if (statusBloqueantes.includes(statusAtualizado)) {
          console.log('[PlanoCanceladoBlocker] 🔴 Usuário bloqueado! Status:', statusAtualizado);
          setBloqueado(true);
          buscarFaturasPendentes(user.cpf);
        } else {
          console.log('[PlanoCanceladoBlocker] ✅ Usuário ativo! Status:', statusAtualizado);
          setBloqueado(false);
        }
      } catch (apiError) {
        console.error('Erro ao buscar status da API, usando localStorage:', apiError);
        // Fallback: usa o status do localStorage se a API falhar
        const status = user.statusAssinatura ? user.statusAssinatura.toLowerCase() : 'ativo';
        const statusBloqueantes = ['suspenso', 'overdue', 'cancelado', 'bloqueado'];

        if (statusBloqueantes.includes(status)) {
          setBloqueado(true);
          buscarFaturasPendentes(user.cpf);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const buscarFaturasPendentes = async (cpf: string) => {
    setLoading(true);
    try {
      if (!API_BASE) throw new Error('API_BASE não configurado');

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch(`${API_BASE}/faturas`, { headers });

      if (!resp.ok) throw new Error(`Erro ao buscar faturas: HTTP ${resp.status}`);

      const data = await resp.json();
      const pendentes = Array.isArray(data)
        ? data.filter((f: Fatura) => ['PENDING', 'OVERDUE'].includes(f.status))
        : [];

      setFaturas(pendentes);
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas faturas pendentes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: "Link/Código copiado para a área de transferência.",
    });
  };

  console.log('[PlanoCanceladoBlocker] Renderizando. Bloqueado:', bloqueado, '| Faturas:', faturas.length);

  if (!bloqueado) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-red-200 overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 text-center border-b border-red-100 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Acesso Bloqueado</h2>
          <p className="text-sm text-red-600/80 dark:text-red-300 mt-2">
            Identificamos pendências financeiras em sua assinatura. Para liberar seu acesso a consultas e agendamentos, realize o pagamento abaixo.
          </p>
        </div>

        {/* Corpo com as Faturas */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground mt-2">Buscando faturas...</span>
            </div>
          ) : faturas.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                Nenhuma fatura pendente encontrada automaticamente. 
                <br />
                Entre em contato com o suporte.
              </p>
              <Button 
                className="mt-4 w-full"
                onClick={() => window.open('https://wa.me/55SEUNUMERO', '_blank')}
              >
                Falar com Suporte
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Faturas em Aberto
              </h3>
              
              {faturas.map((fatura) => (
                <Card key={fatura.id} className="p-4 border-l-4 border-l-red-500 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.value)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Venceu em: {new Date(fatura.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full uppercase">
                      {fatura.status === 'OVERDUE' ? 'Vencida' : 'Pendente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => window.open(fatura.invoiceUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Abrir Fatura
                    </Button>
                    
                    <Button 
                      size="sm" 
                      className="w-full text-xs bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => window.open(fatura.bankSlipUrl || fatura.invoiceUrl, '_blank')}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Pagar Agora
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé (Opcional: Botão de Atualizar) */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t flex justify-center">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                    setLoading(true);
                    verificarStatus(); // Tenta revalidar
                }}
                className="text-xs text-zinc-500"
            >
                Já paguei, verificar novamente
            </Button>
        </div>
      </div>
    </div>
  );
}