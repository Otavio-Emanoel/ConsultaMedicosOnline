'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Stethoscope,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
  Video,
  ExternalLink,
  X,
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  cpf: string;
  relationship?: string;
}

export default function AtendimentoImediatoPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [consultationLink, setConsultationLink] = useState<string | null>(null);

  // Buscar pacientes (titular + dependentes) - sem usar dashboard
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadPatients = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          if (mounted) setLoadingPatients(false);
          return;
        }

        setLoadingPatients(true);

        // 1. Buscar CPF e dados do usuário logado (titular)
        const usuarioRes = await fetch(`${apiBase}/usuario/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!mounted) return;

        if (!usuarioRes.ok) {
          throw new Error('Erro ao buscar dados do usuário');
        }

        const usuarioData = await usuarioRes.json();
        const cpf = usuarioData?.cpf;

        if (!cpf) {
          throw new Error('CPF não encontrado');
        }

        // 2. Buscar dependentes em paralelo
        const dependentesRes = await fetch(`${apiBase}/dependentes/${cpf}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!mounted) return;

        const dependentesData = dependentesRes.ok ? await dependentesRes.json() : { dependentes: [] };
        const dependentes = dependentesData?.dependentes || dependentesData || [];

        // 3. Montar lista de pacientes: titular + dependentes
        const pacientes: Patient[] = [];
        
        // Adicionar titular (usuário logado)
        if (usuarioData?.nome && usuarioData?.cpf) {
          pacientes.push({
            id: usuarioData.cpf,
            name: usuarioData.nome,
            cpf: usuarioData.cpf,
            relationship: 'Titular',
          });
        }

        // Adicionar dependentes
        dependentes.forEach((dep: any) => {
          pacientes.push({
            id: dep.cpf,
            name: dep.nome,
            cpf: dep.cpf,
            relationship: dep.relationship || 'Dependente',
          });
        });

        if (mounted) {
          setPatients(pacientes);
          if (pacientes.length > 0) {
            setSelectedPatient(pacientes[0].id);
          }
          setLoadingPatients(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || !mounted) return;
        
        console.error('Erro ao carregar pacientes:', error);
        if (mounted) {
          setLoadingPatients(false);
        }
      }
    };

    loadPatients();

    // Cleanup: cancela requisições se componente desmontar
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);


  const handleStartConsultation = async () => {
    if (!selectedPatient) {
      setError('Por favor, selecione um paciente.');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Usuário não autenticado!');
      return;
    }

    setLoadingRequest(true);
    setError('');

    try {
      // Buscar o CPF do paciente selecionado
      const pacienteSelecionado = patients.find(p => p.id === selectedPatient);
      if (!pacienteSelecionado) {
        throw new Error('Paciente selecionado não encontrado.');
      }

      // Solicitar atendimento imediato via API Rapidoc
      const res = await fetch(`${apiBase}/agendamentos/imediato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cpf: pacienteSelecionado.cpf, // A API espera 'cpf', não 'cpfSelecionado'
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao solicitar consulta imediata');
      }

      const data = await res.json();
      
      // A API agora retorna o link diretamente da Rapidoc
      // Tentar extrair link da resposta (formato do Rapidoc)
      const linkConsulta = data?.url || data?.link || data?.joinUrl || data?.appointmentUrl ||
                          data?.meetingUrl || data?.roomUrl || data?.videoUrl || data?.telemedUrl ||
                          data?.video_link || data?.videoLink || data?.accessUrl;

      let finalLink: string | null = null;

      if (linkConsulta) {
        finalLink = linkConsulta;
      } else {
        // Se não encontrou link na resposta padrão, verificar rapidocResponse
        const rapidocResponse = data?.rapidocResponse;
        if (rapidocResponse) {
          // Tentar encontrar link em rapidocResponse
          const linkFromRapidoc = rapidocResponse?.url || rapidocResponse?.link || 
                                 rapidocResponse?.joinUrl || rapidocResponse?.appointmentUrl ||
                                 rapidocResponse?.appointment?.url || rapidocResponse?.appointment?.joinUrl ||
                                 rapidocResponse?.data?.url || rapidocResponse?.data?.joinUrl;
          
          if (linkFromRapidoc) {
            finalLink = linkFromRapidoc;
          } else {
            setError('Link da consulta não encontrado na resposta do Rapidoc. Verifique o console para mais detalhes.');
            console.error('Resposta completa da API:', data);
            console.error('Resposta do Rapidoc:', rapidocResponse);
          }
        } else {
          setError('Link da consulta não encontrado na resposta. Verifique o console para mais detalhes.');
          console.error('Resposta da API:', data);
        }
      }

      if (finalLink) {
        // Salvar link e mostrar modal
        setConsultationLink(finalLink);
        setShowModal(true);
        setError('');
        
        // Tentar abrir automaticamente (pode ser bloqueado pelo navegador)
        const popup = window.open(finalLink, '_blank', 'noopener,noreferrer');
        
        // Se o popup foi bloqueado, o modal já está aberto para o usuário clicar manualmente
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // Popup foi bloqueado, o modal já está visível
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar consulta imediata');
      console.error('Erro ao solicitar consulta imediata:', err);
    } finally {
      setLoadingRequest(false);
    }
  };


  return (
    <DashboardLayout title="Clínico Geral">
      {/* Status Card */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Clínico Geral Disponível
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Inicie uma consulta imediata agora - o link será aberto automaticamente
                </p>
              </div>
            </div>
            <Badge variant="success" className="text-base px-4 py-2">
              Disponível
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardBody>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pacientes Disponíveis
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {patients.length}
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
                  Tempo Estimado
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  Imediato
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tipo de Atendimento
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Telemedicina
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Form */}
      <Card>
          <CardHeader>Iniciar Atendimento</CardHeader>
          <CardBody>
            {/* Patient Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Para quem é o atendimento?
              </label>
              {loadingPatients ? (
                <div className="text-center text-gray-400 py-4">Carregando pacientes...</div>
              ) : (
              <div className="space-y-3">
                  {patients.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => setSelectedPatient(person.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPatient === person.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {person.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {person.cpf}
                            {person.relationship &&
                              ` • ${person.relationship}`}
                          </p>
                        </div>
                      </div>
                      {selectedPatient === person.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              )}
            </div>


            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
              </div>
            )}

            {/* Important Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-2">Informações Importantes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      O atendimento será realizado por um médico disponível
                    </li>
                    <li>Tempo estimado de espera: ~5 minutos</li>
                    <li>
                      Você receberá uma notificação quando o médico estiver pronto
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartConsultation}
              disabled={!selectedPatient || loadingRequest}
            >
              {loadingRequest ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Stethoscope className="w-5 h-5 mr-2" />
                  Iniciar Clínico Geral
                </>
              )}
            </Button>
          </CardBody>
        </Card>

      {/* Modal para link de consulta (caso popup seja bloqueado) */}
      {showModal && consultationLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Não abriu?
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setConsultationLink(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Se a janela da consulta não abriu automaticamente, clique no botão abaixo para acessar:
            </p>
            
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  window.open(consultationLink, '_blank', 'noopener,noreferrer');
                  setShowModal(false);
                  setConsultationLink(null);
                }}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Clique aqui para acessar a consulta
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setShowModal(false);
                  setConsultationLink(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
