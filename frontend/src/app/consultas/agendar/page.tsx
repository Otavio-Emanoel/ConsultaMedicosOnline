'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Especialidade', icon: Stethoscope },
  { id: 2, title: 'Horário', icon: Clock },
  { id: 3, title: 'Paciente', icon: User },
  { id: 4, title: 'Observações', icon: FileText },
  { id: 5, title: 'Confirmação', icon: CheckCircle },
];

// Será preenchido dinamicamente

// Será preenchido dinamicamente

function AgendarContent() {
  const searchParams = useSearchParams();
  const specialtyUuidFromQuery = searchParams?.get('specialtyUuid') || '';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    specialty: '',
    specialtyUuid: '',
    date: '',
    time: '',
    availabilityUuid: '',
    patient: '',
    notes: '',
  });
  const [specialties, setSpecialties] = useState<Array<{ uuid: string; name: string }>>([]);
  const [availableSlots, setAvailableSlots] = useState<Array<{ uuid: string; date: string; from: string; to: string }>>([]);
  const [selectedSpecialtyUuid, setSelectedSpecialtyUuid] = useState<string>('');
  const [patients, setPatients] = useState<Array<{ id: string; name: string; cpf: string; relationship?: string }>>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  
  // Estado para o mês/ano selecionado (formato: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });


  // Buscar apenas o necessário: CPF, lista de pacientes e especialidades
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setLoadingSpecialties(false);
      setLoadingPatients(false);
      return;
    }
    
    setLoadingSpecialties(true);
    setLoadingPatients(true);

    const loadData = async () => {
      try {
        // 1. Buscar CPF e dados do usuário logado
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

        // 2. Buscar pacientes (titular + dependentes) e especialidades em paralelo
        const pacientesPromise = fetch(`${apiBase}/dependentes/${cpf}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }).then(res => res.ok ? res.json() : { dependentes: [] }).catch(() => ({ dependentes: [] }));

        const especialidadesPromise = fetch(`${apiBase}/beneficiarios/${cpf}/especialidades`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }).then(res => res.ok ? res.json() : { specialties: [] }).catch(() => ({ specialties: [] }));

        const [dependentesData, especialidadesData] = await Promise.all([pacientesPromise, especialidadesPromise]);

        if (!mounted) return;

        // Preparar lista de pacientes: titular + dependentes
        const pacientes = [];
        
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
        const dependentes = dependentesData?.dependentes || dependentesData || [];
        dependentes.forEach((dep: any) => {
          pacientes.push({
            id: dep.cpf,
            name: dep.nome,
            cpf: dep.cpf,
            relationship: dep.relationship || 'Dependente',
          });
        });

        setPatients(pacientes);
        setLoadingPatients(false);

        // Processar especialidades
        const specialties = especialidadesData?.specialties || especialidadesData?.especialidades || [];
        if (Array.isArray(specialties)) {
          const mappedSpecialties = specialties.map((s: any) => ({
            uuid: s.uuid || s.id,
            name: s.name || s.description || s.title || 'Especialidade'
          }));
          setSpecialties(mappedSpecialties);
          
          // Se há specialtyUuid na query, pré-selecionar a especialidade
          if (specialtyUuidFromQuery && mounted) {
            const specialtyFromQuery = mappedSpecialties.find(
              (s) => s.uuid === specialtyUuidFromQuery
            );
            if (specialtyFromQuery) {
              setSelectedSpecialtyUuid(specialtyFromQuery.uuid);
              setFormData((prev) => ({
                ...prev,
                specialty: specialtyFromQuery.name,
                specialtyUuid: specialtyFromQuery.uuid,
              }));
            }
          }
        } else {
          setSpecialties([]);
        }

        setLoadingSpecialties(false);
      } catch (err: any) {
        if (err.name === 'AbortError' || !mounted) return;
        
        console.error('Erro ao carregar dados:', err);
        if (mounted) {
          setLoadingSpecialties(false);
          setLoadingPatients(false);
        }
      }
    };

    loadData();

    // Cleanup: cancela requisição se componente desmontar
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [specialtyUuidFromQuery]);

  // Buscar disponibilidade quando especialidade e mês são selecionados
  useEffect(() => {
    if (!selectedSpecialtyUuid || currentStep !== 2) return;
    
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoadingTimes(true);
    
    // Calcular primeiro e último dia do mês selecionado
    const [year, month] = selectedMonth.split('-');
    const dateInitial = `01/${month}/${year}`;
    
    // Último dia do mês
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const dateFinal = `${String(lastDay).padStart(2, '0')}/${month}/${year}`;

    fetch(`${apiBase}/agendamentos/disponibilidade?specialtyUuid=${selectedSpecialtyUuid}&dateInitial=${dateInitial}&dateFinal=${dateFinal}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar disponibilidade');
        return res.json();
      })
      .then((data) => {
        // A resposta pode vir em diferentes formatos
        let slots: any[] = [];
        if (Array.isArray(data.disponibilidade)) {
          slots = data.disponibilidade;
        } else if (Array.isArray(data)) {
          slots = data;
        } else if (data?.data && Array.isArray(data.data)) {
          slots = data.data;
        } else if (data?.availability && Array.isArray(data.availability)) {
          slots = data.availability;
        }
        
        // Mapear slots para formato { uuid, date, from, to }
        const mappedSlots = slots
          .filter((slot: any) => slot?.uuid || slot?.availabilityUuid)
          .map((slot: any) => {
            // Tentar extrair data e horário de diferentes formatos
            let slotDate = slot.date;
            let slotFrom = slot.from || slot.time;
            let slotTo = slot.to;
            
            // Se vier dateTime no formato "dd/MM/yyyy HH:mm-HH:mm"
            if (slot.dateTime && !slotDate) {
              const parts = slot.dateTime.split(' ');
              if (parts.length >= 1) slotDate = parts[0];
              if (parts.length >= 2) {
                const times = parts[1].split('-');
                if (times.length >= 1) slotFrom = times[0];
                if (times.length >= 2) slotTo = times[1];
              }
            }
            
            return {
              uuid: slot.uuid || slot.availabilityUuid,
              date: slotDate,
              from: slotFrom,
              to: slotTo
            };
          });
        
        setAvailableSlots(mappedSlots);
        setLoadingTimes(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar disponibilidade:', err);
        setAvailableSlots([]);
        setLoadingTimes(false);
      });
  }, [selectedSpecialtyUuid, selectedMonth, currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return alert('Usuário não autenticado!');
    
    if (!formData.availabilityUuid || !formData.specialtyUuid) {
      return alert('Por favor, selecione um horário disponível.');
    }

    if (!formData.patient) {
      return alert('Por favor, selecione um paciente.');
    }
    
    try {
      // Identificar se a especialidade é psicologia ou nutrição
      const specialtyName = formData.specialty.toLowerCase();
      const isPsicologiaOuNutricao = specialtyName.includes('psicologia') || specialtyName.includes('nutrição') || specialtyName.includes('nutricao');

      // Buscar beneficiário pelo CPF do paciente selecionado
      const pacienteSelecionado = patients.find(p => p.id === formData.patient);
      if (!pacienteSelecionado) {
        throw new Error('Paciente selecionado não encontrado.');
      }

      // Buscar beneficiário no Rapidoc para obter o UUID
      const beneficiarioRes = await fetch(`${apiBase}/rapidoc/beneficiario/${pacienteSelecionado.cpf}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!beneficiarioRes.ok) {
        throw new Error('Erro ao buscar dados do beneficiário.');
      }

      const beneficiario = await beneficiarioRes.json();
      if (!beneficiario || !beneficiario.uuid) {
        throw new Error('Beneficiário não encontrado no Rapidoc.');
      }

      // Montar body conforme a especialidade
      let body: any = {
        availabilityUuid: formData.availabilityUuid,
        specialtyUuid: formData.specialtyUuid,
        beneficiaryUuid: beneficiario.uuid, // Enviar beneficiaryUuid ao invés de cpfSelecionado
      };

      if (isPsicologiaOuNutricao) {
        // Para psicologia ou nutrição: usar approveAdditionalPayment (sem encaminhamento)
        body.approveAdditionalPayment = true;
      } else {
        // Para outras especialidades: buscar encaminhamentos agendáveis daquela especialidade
        const encaminhamentosRes = await fetch(`${apiBase}/beneficiarios/${pacienteSelecionado.cpf}/encaminhamentos`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!encaminhamentosRes.ok) {
          const errorData = await encaminhamentosRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Erro ao buscar encaminhamentos do beneficiário.');
        }

        const encaminhamentosData = await encaminhamentosRes.json();
        const encaminhamentos = Array.isArray(encaminhamentosData?.encaminhamentos) 
          ? encaminhamentosData.encaminhamentos 
          : Array.isArray(encaminhamentosData)
            ? encaminhamentosData
            : [];

        // Filtrar encaminhamentos:
        // 1. Da especialidade correta
        // 2. Que ainda não estão agendados (sem appointment associado)
        const encaminhamentosAgendaveis = encaminhamentos.filter((ref: any) => {
          // Verificar se é da especialidade correta
          const refSpecialtyUuid = ref.specialty?.uuid || ref.specialtyUuid;
          if (refSpecialtyUuid && refSpecialtyUuid !== formData.specialtyUuid) {
            return false;
          }

          // Verificar se já está agendado
          if (ref.appointment?.uuid || ref.appointmentUuid) {
            return false;
          }

          // Verificar se tem status que permita agendamento (não deve estar expirado ou cancelado)
          const status = ref.status?.toUpperCase() || '';
          if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'USED') {
            return false;
          }

          return true;
        });

        if (encaminhamentosAgendaveis.length === 0) {
          // Verificar se há encaminhamentos da especialidade, mas já agendados
          const encaminhamentosDaEspecialidade = encaminhamentos.filter((ref: any) => {
            const refSpecialtyUuid = ref.specialty?.uuid || ref.specialtyUuid;
            return refSpecialtyUuid === formData.specialtyUuid;
          });

          if (encaminhamentosDaEspecialidade.length > 0) {
            throw new Error('Nenhum encaminhamento disponível para agendamento. Todos os encaminhamentos desta especialidade já possuem agendamento associado.');
          } else {
            throw new Error('Nenhum encaminhamento encontrado para esta especialidade. É necessário um encaminhamento médico agendável para esta especialidade.');
          }
        }

        // Usar o primeiro encaminhamento agendável
        const primeiroEncaminhamento = encaminhamentosAgendaveis[0];
        console.log('Encaminhamento selecionado:', primeiroEncaminhamento);
        
        // Tentar diferentes campos que podem conter o UUID do encaminhamento
        body.beneficiaryMedicalReferralUuid = primeiroEncaminhamento.uuid 
          || primeiroEncaminhamento.medicalReferralUuid 
          || primeiroEncaminhamento.referralUuid
          || primeiroEncaminhamento.id
          || primeiroEncaminhamento.beneficiaryMedicalReferralUuid;
        
        if (!body.beneficiaryMedicalReferralUuid) {
          console.error('Encaminhamento sem UUID válido:', primeiroEncaminhamento);
          throw new Error('Erro ao obter UUID do encaminhamento. Formato inesperado da resposta da API.');
        }
      }

      // Log do body para debug (pode remover em produção)
      console.log('Body do agendamento:', JSON.stringify(body, null, 2));

      // Enviar requisição de agendamento
      const res = await fetch(`${apiBase}/agendamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Erro ao agendar:', errorData);
        
        // Montar mensagem de erro mais detalhada
        let errorMessage = errorData.error || 'Erro ao agendar consulta';
        
        if (errorData.detail) {
          // Se houver detalhes da API Rapidoc, incluir na mensagem
          if (typeof errorData.detail === 'string') {
            errorMessage += `: ${errorData.detail}`;
          } else if (errorData.detail.message) {
            errorMessage += `: ${errorData.detail.message}`;
          } else if (errorData.detail.error) {
            errorMessage += `: ${errorData.detail.error}`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      alert('Consulta agendada com sucesso!');
      // Redirecionar ou resetar formulário
      setFormData({
        specialty: '',
        specialtyUuid: '',
        date: '',
        time: '',
        availabilityUuid: '',
        patient: '',
        notes: '',
      });
      setCurrentStep(1);
    } catch (err: any) {
      alert(err.message || 'Erro ao agendar consulta');
      console.error('Erro ao agendar:', err);
    }
  };

  return (
    <DashboardLayout title="Agendar Consulta">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          isCompleted
                            ? 'bg-success text-white'
                            : isActive
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <p
                        className={`text-xs font-medium text-center hidden md:block ${
                          isActive
                            ? 'text-primary'
                            : isCompleted
                            ? 'text-success'
                            : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 ${
                          isCompleted
                            ? 'bg-success'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {STEPS[currentStep - 1].title}
            </h2>
          </CardHeader>
          <CardBody>
            {/* Step 1: Especialidade */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Selecione a especialidade médica desejada
                </p>
                {loadingSpecialties ? (
                  <div className="text-center text-gray-400">Carregando especialidades...</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specialties.map((specialty) => (
                      <button
                        key={specialty.uuid}
                        onClick={() => {
                          setSelectedSpecialtyUuid(specialty.uuid);
                          setFormData({ ...formData, specialty: specialty.name, specialtyUuid: specialty.uuid });
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.specialtyUuid === specialty.uuid
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <Stethoscope
                          className={`w-6 h-6 mb-2 ${
                            formData.specialtyUuid === specialty.uuid
                              ? 'text-primary'
                              : 'text-gray-400'
                          }`}
                        />
                        <p className="font-medium text-gray-900 dark:text-white">
                          {specialty.name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Horário */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Selecione o horário disponível
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Mês/Ano:
                    </label>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-auto min-w-[160px]"
                    />
                  </div>
                </div>
                
                {loadingTimes ? (
                  <div className="text-center text-gray-400 py-8">
                    Carregando horários disponíveis...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Nenhum horário disponível para esta especialidade no mês selecionado. Tente selecionar outro mês.
                  </div>
                ) : (() => {
                  // Data de hoje (sem horas, apenas data)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Agrupar slots por dia
                  const slotsByDay: { [key: string]: Array<{ uuid: string; date: string; from: string; to: string }> } = {};
                  
                  availableSlots.forEach((slot) => {
                    if (slot.date) {
                      // Normalizar formato de data para chave (dd/MM/yyyy)
                      let dateKey = slot.date;
                      if (!dateKey.includes('/')) {
                        // Se vier em outro formato, tentar converter
                        const dateObj = new Date(dateKey);
                        if (!isNaN(dateObj.getTime())) {
                          dateKey = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                        }
                      }
                      
                      // Verificar se a data não é anterior a hoje
                      const [dayNum, monthNum, yearNum] = dateKey.split('/').map(Number);
                      const slotDate = new Date(yearNum, monthNum - 1, dayNum);
                      slotDate.setHours(0, 0, 0, 0);
                      
                      // Filtrar apenas datas futuras ou hoje
                      if (slotDate >= today) {
                        if (!slotsByDay[dateKey]) {
                          slotsByDay[dateKey] = [];
                        }
                        slotsByDay[dateKey].push(slot);
                      }
                    }
                  });
                  
                  // Ordenar dias
                  const sortedDays = Object.keys(slotsByDay).sort((a, b) => {
                    const [d1, m1, y1] = a.split('/').map(Number);
                    const [d2, m2, y2] = b.split('/').map(Number);
                    const date1 = new Date(y1, m1 - 1, d1);
                    const date2 = new Date(y2, m2 - 1, d2);
                    return date1.getTime() - date2.getTime();
                  });
                  
                  return (
                    <div className="space-y-6">
                      {sortedDays.map((day) => {
                        const slots = slotsByDay[day];
                        const [dayNum, monthNum, yearNum] = day.split('/');
                        const dateObj = new Date(parseInt(yearNum), parseInt(monthNum) - 1, parseInt(dayNum));
                        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                        
                        return (
                          <div key={day} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <div className="mb-3">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {day} - {dayName}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {slots.length} {slots.length === 1 ? 'horário disponível' : 'horários disponíveis'}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                              {slots
                                .sort((a, b) => {
                                  // Ordenar por horário
                                  const timeA = a.from || '';
                                  const timeB = b.from || '';
                                  return timeA.localeCompare(timeB);
                                })
                                .map((slot) => {
                                  const timeLabel = slot.from || 'Horário';
                                  return (
                                    <button
                                      key={slot.uuid}
                                      onClick={() => {
                                        setFormData({ 
                                          ...formData, 
                                          time: timeLabel,
                                          availabilityUuid: slot.uuid,
                                          date: day
                                        });
                                      }}
                                      className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                                        formData.availabilityUuid === slot.uuid
                                          ? 'border-primary bg-primary text-white'
                                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                      }`}
                                      title={slot.to ? `${slot.from} - ${slot.to}` : slot.from}
                                    >
                                      {timeLabel}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Step 3: Paciente */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Para quem é a consulta?
                </p>
                {loadingPatients ? (
                  <div className="text-center text-gray-400">Carregando pacientes...</div>
                ) : (
                  <div className="space-y-3">
                    {patients.map((person) => (
                      <button
                        key={person.id}
                        onClick={() =>
                          setFormData({ ...formData, patient: person.id })
                        }
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          formData.patient === person.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
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
                          {formData.patient === person.id && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Observações */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Adicione informações importantes (opcional)
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={6}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Ex: Sintomas, medicamentos em uso, alergias..."
                  />
                </div>
              </div>
            )}

            {/* Step 5: Confirmação */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-slate-800 p-6 rounded-xl text-center">
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Revise os dados da consulta
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Verifique se todas as informações estão corretas
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Especialidade
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.specialty || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Data
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.date || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Horário
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.time || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-primary" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Paciente
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.patient || '-'}
                    </span>
                  </div>

                  {formData.notes && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <div className="flex items-center space-x-3 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Observações
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white ml-8">
                        {formData.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !formData.specialtyUuid) ||
                    (currentStep === 2 && !formData.availabilityUuid) ||
                    (currentStep === 3 && !formData.patient)
                  }
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit}>
                  Confirmar Agendamento
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Agendar Consulta">
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </DashboardLayout>
    }>
      <AgendarContent />
    </Suspense>
  );
}
