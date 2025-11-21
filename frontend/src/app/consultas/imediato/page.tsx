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

  // Buscar pacientes (usuário + dependentes) do dashboard
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoadingPatients(true);
    fetch(`${apiBase}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const pacientes: Patient[] = [];
        // Usuário logado
        if (data?.usuario) {
          pacientes.push({
            id: data.usuario.cpf,
            name: data.usuario.nome,
            cpf: data.usuario.cpf,
            relationship: 'Titular',
          });
        }
        // Dependentes (beneficiarios)
        if (Array.isArray(data?.beneficiarios)) {
          data.beneficiarios.forEach((dep: any) => {
            pacientes.push({
              id: dep.cpf,
              name: dep.nome,
              cpf: dep.cpf,
              relationship: dep.relationship || 'Dependente',
            });
          });
        }
        setPatients(pacientes);
        if (pacientes.length > 0) {
          setSelectedPatient(pacientes[0].id);
        }
        setLoadingPatients(false);
      })
      .catch(() => setLoadingPatients(false));
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

      const res = await fetch(`${apiBase}/agendamentos/imediato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cpfSelecionado: pacienteSelecionado.cpf,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao solicitar consulta imediata');
      }

      const data = await res.json();
      
      // Extrair link da resposta (formato do Rapidoc: { success: true, url: "..." })
      let linkConsulta: string | null = null;
      if (data?.url) linkConsulta = data.url; // Formato padrão do Rapidoc
      else if (data?.link) linkConsulta = data.link;
      else if (data?.joinUrl) linkConsulta = data.joinUrl;
      else if (data?.appointmentUrl) linkConsulta = data.appointmentUrl;

      if (linkConsulta) {
        // Abrir link automaticamente em nova guia
        window.open(linkConsulta, '_blank', 'noopener,noreferrer');
        
        // Mostrar mensagem de sucesso
        setError('');
        // Não usar alert, apenas abrir o link silenciosamente
      } else {
        // Se não encontrou link, mostrar erro ou resposta raw
        setError('Link da consulta não encontrado na resposta. Verifique o console para mais detalhes.');
        console.error('Resposta da API:', data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar consulta imediata');
      console.error('Erro ao solicitar consulta imediata:', err);
    } finally {
      setLoadingRequest(false);
    }
  };


  return (
    <DashboardLayout title="Atendimento Imediato">
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
                  Atendimento Imediato Disponível
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
                  Iniciar Atendimento Imediato
                </>
              )}
            </Button>
          </CardBody>
        </Card>
      )}


    </DashboardLayout>
  );
}
