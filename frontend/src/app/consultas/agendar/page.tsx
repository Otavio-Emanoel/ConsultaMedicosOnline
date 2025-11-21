'use client';

import { useState, useEffect } from 'react';
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
  { id: 2, title: 'Data', icon: Calendar },
  { id: 3, title: 'Horário', icon: Clock },
  { id: 4, title: 'Paciente', icon: User },
  { id: 5, title: 'Observações', icon: FileText },
  { id: 6, title: 'Confirmação', icon: CheckCircle },
];

// Será preenchido dinamicamente

// Será preenchido dinamicamente

export default function Page() {
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


  // Buscar especialidades do beneficiário principal (usuário logado)
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    setLoadingSpecialties(true);

    fetch(`${apiBase}/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const cpf = data?.usuario?.cpf;
        if (!cpf) throw new Error('CPF não encontrado no dashboard');
        return fetch(`${apiBase}/beneficiarios/${cpf}/especialidades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => res.json())
      .then((data) => {
        // API retorna { specialties: [{ uuid, name, source }] }
        if (data && Array.isArray(data.specialties)) {
          setSpecialties(data.specialties.map((s: any) => ({
            uuid: s.uuid,
            name: s.name || s.description || s.title || 'Especialidade'
          })));
        } else {
          setSpecialties([]);
        }
        setLoadingSpecialties(false);
      })
      .catch(() => setLoadingSpecialties(false));
  }, []);

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
        const pacientes = [];
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
        setLoadingPatients(false);
      })
      .catch(() => setLoadingPatients(false));
  }, []);

  // Buscar disponibilidade quando especialidade e data são selecionados
  useEffect(() => {
    if (!selectedSpecialtyUuid || !formData.date || currentStep !== 3) return;
    
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoadingTimes(true);
    
    // Converter data de yyyy-MM-dd para dd/MM/yyyy
    const [year, month, day] = formData.date.split('-');
    const dateInitial = `${day}/${month}/${year}`;
    
    // Calcular data final (7 dias após a data inicial)
    const dateObj = new Date(formData.date);
    dateObj.setDate(dateObj.getDate() + 7);
    const dateFinal = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

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
  }, [selectedSpecialtyUuid, formData.date, currentStep]);

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
    
    try {
      const res = await fetch(`${apiBase}/agendamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          availabilityUuid: formData.availabilityUuid,
          specialtyUuid: formData.specialtyUuid,
          // Opcional: para especialidades que requerem encaminhamento
          // beneficiaryMedicalReferralUuid: formData.referralUuid,
          // Para nutrição e psicologia (sem encaminhamento):
          approveAdditionalPayment: true,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao agendar consulta');
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

            {/* Step 2: Data */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Escolha a data da consulta
                </p>
                <Input
                  type="date"
                  label="Data da Consulta"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Dica:</strong> Consultas podem ser agendadas com
                    até 30 dias de antecedência.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Horário */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Selecione o horário disponível
                </p>
                {loadingTimes ? (
                  <div className="text-center text-gray-400">Carregando horários disponíveis...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    Nenhum horário disponível para esta especialidade e data. Tente selecionar outra data.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {availableSlots
                      .filter((slot) => {
                        // Filtrar slots pela data selecionada
                        if (!formData.date || !slot.date) return true;
                        // Converter slot.date (dd/MM/yyyy) para comparar com formData.date (yyyy-MM-dd)
                        if (slot.date.includes('/')) {
                          const [d, m, y] = slot.date.split('/');
                          const slotDateFormatted = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                          return slotDateFormatted === formData.date;
                        }
                        return slot.date === formData.date;
                      })
                      .map((slot) => {
                        const timeLabel = slot.from || 'Horário';
                        return (
                          <button
                            key={slot.uuid}
                            onClick={() => setFormData({ 
                              ...formData, 
                              time: timeLabel,
                              availabilityUuid: slot.uuid
                            })}
                            className={`p-3 rounded-lg border-2 transition-all font-medium ${
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
                )}
              </div>
            )}

            {/* Step 4: Paciente */}
            {currentStep === 4 && (
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

            {/* Step 5: Observações */}
            {currentStep === 5 && (
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

            {/* Step 6: Confirmação */}
            {currentStep === 6 && (
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
                      {formData.date
                        ? new Date(formData.date + 'T00:00:00').toLocaleDateString(
                            'pt-BR'
                          )
                        : '-'}
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
                    (currentStep === 2 && !formData.date) ||
                    (currentStep === 3 && !formData.availabilityUuid) ||
                    (currentStep === 4 && !formData.patient)
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
