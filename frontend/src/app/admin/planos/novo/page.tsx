'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import {
	Loader2,
	Package,
	Layers,
	ClipboardList,
	PlusCircle,
	Trash2,
	CheckCircle2,
} from 'lucide-react';

const paymentTypeLabel = (code?: string) => {
  switch ((code || '').toUpperCase()) {
    case 'S': return 'Recorrente';
    case 'A': return 'Avulso';
    case 'L': return 'Livre';
    default: return code || '-';
  }
};

type RapidocPlan = {
	uuid?: string;
	name?: string;
	description?: string;
	paymentType?: string;
	serviceType?: string;
	specialties?: any[];
	plan?: {
		uuid?: string;
		name?: string;
		description?: string;
		paymentType?: string;
		serviceType?: string;
		specialties?: any[];
	};
	pricing?: {
		value?: number;
	};
	[key: string]: any;
};

type Specialty = {
	uuid: string;
	name: string;
};

type BundleRow = {
	internalPlanKey: string;
	count: number;
};

const periodicidadeOptions = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];

export default function AdminNovoPlanoPage() {
	const router = useRouter();
	const [rapidocPlans, setRapidocPlans] = useState<RapidocPlan[]>([]);
	const [specialties, setSpecialties] = useState<Specialty[]>([]);
	const [selectedRapidocUuid, setSelectedRapidocUuid] = useState('');
	const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
	const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
	const [bundles, setBundles] = useState<BundleRow[]>([]);

	const [form, setForm] = useState({
		tipo: '',
		periodicidade: 'Mensal',
		descricao: '',
		preco: '',
		paymentType: '',
		uuidRapidocPlano: '',
		internalPlanKey: '',
		maxBeneficiaries: '',
	});

	const [loadingData, setLoadingData] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [erro, setErro] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	useEffect(() => {
		const fetchData = async () => {
			setLoadingData(true);
			setErro('');
			try {
				const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
				const auth = getAuth(app);
				const user = auth.currentUser;
				if (!user) {
					setErro('Usuário não autenticado.');
					setLoadingData(false);
					return;
				}
				const token = await user.getIdToken();
				const headers = { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' };

				const [plansResp, specsResp] = await Promise.all([
					fetch(`${API_BASE}/planos/rapidoc`, { headers }),
					fetch(`${API_BASE}/especialidades`, { headers }),
				]);

				if (!plansResp.ok) throw new Error('Erro ao buscar planos Rapidoc');
				const plansData = await plansResp.json();
				setRapidocPlans(Array.isArray(plansData) ? plansData : []);

				if (specsResp.ok) {
					const specJson = await specsResp.json();
					const lista: Specialty[] = Array.isArray(specJson?.specialties)
						? specJson.specialties.filter((s: any) => s?.uuid && s?.name)
						: [];
					setSpecialties(lista);
				} else {
					setSpecialties([]);
				}
			} catch (error) {
				console.error(error);
				setErro('Erro ao carregar dados iniciais. Tente novamente.');
			} finally {
				setLoadingData(false);
			}
		};

		fetchData();
	}, []);

	const selectedPlan = useMemo(() => {
		if (!selectedRapidocUuid) return null;
		return (
			rapidocPlans.find((plan) => (plan.plan?.uuid || plan.uuid) === selectedRapidocUuid) || null
		);
	}, [rapidocPlans, selectedRapidocUuid]);

	useEffect(() => {
		if (!selectedPlan) {
			setPaymentOptions([]);
			return;
		}

		const remoteUuid = selectedPlan.plan?.uuid || selectedPlan.uuid || '';
		const remotePayment = String(selectedPlan.paymentType || selectedPlan.plan?.paymentType || '')
			.toUpperCase()
			.trim();
		const options = remotePayment === 'L' ? ['S', 'A', 'L'] : remotePayment ? [remotePayment] : ['S', 'A', 'L'];

		setPaymentOptions(options);
		setForm((prev) => ({
			...prev,
			uuidRapidocPlano: remoteUuid,
			paymentType: options.includes(prev.paymentType) ? prev.paymentType : options[0] || '',
			tipo: prev.tipo || selectedPlan.plan?.name || selectedPlan.name || '',
			descricao: prev.descricao || selectedPlan.plan?.description || selectedPlan.description || '',
		}));

		if (!selectedSpecialties.length) {
			const rawSpecialties =
				(Array.isArray(selectedPlan.specialties) && selectedPlan.specialties) ||
				(Array.isArray(selectedPlan.plan?.specialties) && selectedPlan.plan?.specialties) || [];
			const names = rawSpecialties
				.map((s: any) => {
					if (!s) return null;
					if (typeof s === 'string') return s;
					return s?.name || s?.description || s?.title || null;
				})
				.filter((s: string | null): s is string => Boolean(s));
			if (names.length) setSelectedSpecialties(names);
		}
	}, [selectedPlan]);

	const handleFormChange = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const toggleSpecialty = (name: string) => {
		setSelectedSpecialties((prev) =>
			prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
		);
	};

	const addBundleRow = () => {
		setBundles((prev) => [...prev, { internalPlanKey: '', count: 1 }]);
	};

	const updateBundleRow = (index: number, field: keyof BundleRow, value: string) => {
		setBundles((prev) =>
			prev.map((bundle, idx) =>
				idx === index
					? {
							...bundle,
							[field]: field === 'count' ? Number(value) || 0 : value,
						}
					: bundle
			)
		);
	};

	const removeBundleRow = (index: number) => {
		setBundles((prev) => prev.filter((_, idx) => idx !== index));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErro('');
		setSuccessMessage('');

		if (!form.uuidRapidocPlano) {
			setErro('Selecione um plano Rapidoc para vincular.');
			return;
		}
		if (!form.tipo.trim()) {
			setErro('Informe o nome/tipo do plano.');
			return;
		}
		if (!form.descricao.trim()) {
			setErro('Informe uma descrição para o plano.');
			return;
		}
		const preco = Number(form.preco);
		if (Number.isNaN(preco) || preco <= 0) {
			setErro('Informe um preço válido para o plano.');
			return;
		}
		if (!form.paymentType) {
			setErro('Selecione o tipo de pagamento.');
			return;
		}

		try {
			setSubmitting(true);
			const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
			const auth = getAuth(app);
			const user = auth.currentUser;
			if (!user) {
				setErro('Usuário não autenticado.');
				return;
			}
			const token = await user.getIdToken();

			const payload: Record<string, any> = {
				tipo: form.tipo.trim(),
				periodicidade: form.periodicidade.trim(),
				descricao: form.descricao.trim(),
				especialidades: selectedSpecialties,
				preco,
				uuidRapidocPlano: form.uuidRapidocPlano,
				paymentType: form.paymentType,
			};

			if (form.internalPlanKey.trim()) payload.internalPlanKey = form.internalPlanKey.trim();

			const bundlesValidos = bundles.filter(
				(bundle) => bundle.internalPlanKey.trim() && Number(bundle.count) > 0
			);

			if (form.maxBeneficiaries || bundlesValidos.length) {
				const beneficiaryConfig: Record<string, any> = {};
				if (form.maxBeneficiaries) {
					const max = Number(form.maxBeneficiaries);
					if (!Number.isNaN(max) && max >= 0) beneficiaryConfig.maxBeneficiaries = max;
				}
				if (bundlesValidos.length) {
					beneficiaryConfig.bundles = bundlesValidos.map((bundle) => ({
						internalPlanKey: bundle.internalPlanKey.trim(),
						count: Number(bundle.count) || 1,
					}));
				}
				if (Object.keys(beneficiaryConfig).length) {
					payload.beneficiaryConfig = beneficiaryConfig;
				}
			}

			const response = await fetch(`${API_BASE}/admin/cadastrar-plano`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
					'ngrok-skip-browser-warning': 'true',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(errorBody?.error || 'Erro ao salvar plano.');
			}

			setSuccessMessage('Plano cadastrado com sucesso! Redirecionando...');
			setTimeout(() => router.push('/admin/planos'), 1500);
		} catch (error: any) {
			console.error(error);
			setErro(error?.message || 'Não foi possível cadastrar o plano.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<DashboardLayout title="Cadastrar Novo Plano">
			{loadingData ? (
				<div className="flex items-center justify-center py-20 text-gray-500">
					<Loader2 className="w-6 h-6 animate-spin mr-2" />
					Carregando informações do Rapidoc...
				</div>
			) : (
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
					<Card className="xl:col-span-2">
						<CardHeader>Informações do Plano</CardHeader>
						<CardBody>
							{erro && (
								<div className="mb-4 p-4 border border-red-200 dark:border-red-900 rounded-xl bg-red-50 dark:bg-red-900/10 text-sm text-red-700 dark:text-red-200">
									{erro}
								</div>
							)}
							{successMessage && (
								<div className="mb-4 p-4 border border-green-200 dark:border-emerald-900 rounded-xl bg-green-50 dark:bg-emerald-900/10 text-sm text-green-700 dark:text-emerald-200 flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4" />
									{successMessage}
								</div>
							)}
							<form onSubmit={handleSubmit} className="space-y-8">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Plano Rapidoc vinculado
										</label>
										<select
											value={selectedRapidocUuid}
											onChange={(event) => {
												setSelectedRapidocUuid(event.target.value);
												setSelectedSpecialties([]);
											}}
											className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
										>
											<option value="">Selecione um plano remoto</option>
											{rapidocPlans.map((plan) => {
												const uuid = plan.plan?.uuid || plan.uuid;
												const label = plan.plan?.name || plan.name || uuid;
												const payment = plan.paymentType || plan.plan?.paymentType;
												return (
													<option key={uuid} value={uuid || ''}>
														{label} {payment ? `• Pagamento: ${paymentTypeLabel(payment)}` : ''}
													</option>
												);
											})}
										</select>
										<p className="text-xs text-gray-500 mt-2">
											Os dados principais serão pré-preenchidos a partir do plano selecionado.
										</p>
									</div>

									<Input
										label="Nome / Tipo do Plano"
										placeholder="Ex.: Plano Premium"
										value={form.tipo}
										onChange={(event) => handleFormChange('tipo', event.target.value)}
										required
									/>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Periodicidade
										</label>
										<select
											value={form.periodicidade}
											onChange={(event) => handleFormChange('periodicidade', event.target.value)}
											className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
										>
											{periodicidadeOptions.map((value) => (
												<option key={value} value={value}>
													{value}
												</option>
											))}
										</select>
									</div>

									<Input
										label="Preço"
										type="number"
										min="0"
										step="0.01"
										placeholder="Ex.: 99.90"
										value={form.preco}
										onChange={(event) => handleFormChange('preco', event.target.value)}
										required
									/>

									<Input
										label="Internal Plan Key"
										placeholder="Ex.: PREMIUM"
										value={form.internalPlanKey}
										onChange={(event) => handleFormChange('internalPlanKey', event.target.value)}
									/>

									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Tipo de Pagamento
										</label>
										<select
											value={form.paymentType}
											onChange={(event) => handleFormChange('paymentType', event.target.value)}
											className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
										>
											<option value="">Selecione</option>
											{paymentOptions.map((option) => (
												<option key={option} value={option}>
													{paymentTypeLabel(option)}
												</option>
											))}
										</select>
										<p className="text-xs text-gray-500 mt-2">
											Utilize as opções compatíveis com o plano Rapidoc selecionado.
										</p>
									</div>

									<Input
										label="Máximo de beneficiários"
										type="number"
										min="0"
										placeholder="Ex.: 4"
										value={form.maxBeneficiaries}
										onChange={(event) => handleFormChange('maxBeneficiaries', event.target.value)}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Descrição detalhada
									</label>
									<textarea
										value={form.descricao}
										onChange={(event) => handleFormChange('descricao', event.target.value)}
										rows={4}
										className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
										placeholder="Descreva o que o plano oferece..."
									/>
								</div>

								<div>
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
											<Layers className="w-4 h-4" />
											<span className="text-sm font-medium">Especialidades incluídas</span>
										</div>
										<span className="text-xs text-gray-500">
											{selectedSpecialties.length} selecionada(s)
										</span>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
										{specialties.map((specialty) => {
											const checked = selectedSpecialties.includes(specialty.name);
											return (
												<label
													key={specialty.uuid}
													className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${
														checked
															? 'border-primary bg-primary/10 text-primary'
															: 'border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-300'
													}`}
												>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => toggleSpecialty(specialty.name)}
														className="accent-primary"
													/>
													<span className="text-sm">{specialty.name}</span>
												</label>
											);
										})}
										{specialties.length === 0 && (
											<div className="text-sm text-gray-500 col-span-full">Nenhuma especialidade disponível.</div>
										)}
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
											<ClipboardList className="w-4 h-4" />
											<span className="text-sm font-medium">Bundles (opcional)</span>
										</div>
										<Button type="button" variant="outline" size="sm" onClick={addBundleRow}>
											<PlusCircle className="w-4 h-4 mr-1" />
											Adicionar bundle
										</Button>
									</div>
									{bundles.length === 0 ? (
										<p className="text-sm text-gray-500">Nenhum bundle adicionado.</p>
									) : (
										<div className="space-y-3">
											{bundles.map((bundle, index) => (
												<div
													key={index}
													className="flex flex-col md:flex-row md:items-center gap-3 p-3 border border-border-light dark:border-border-dark rounded-xl"
												>
													<Input
														label="Internal Plan Key"
														value={bundle.internalPlanKey}
														onChange={(event) => updateBundleRow(index, 'internalPlanKey', event.target.value)}
													/>
													<Input
														label="Quantidade"
														type="number"
														min="1"
														value={bundle.count.toString()}
														onChange={(event) => updateBundleRow(index, 'count', event.target.value)}
													/>
													<Button
														type="button"
														variant="danger"
														size="sm"
														onClick={() => removeBundleRow(index)}
													>
														<Trash2 className="w-4 h-4 mr-1" />
														Remover
													</Button>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="flex items-center justify-end gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={() => router.push('/admin/planos')}
									>
										Cancelar
									</Button>
									<Button type="submit" variant="primary" size="lg" disabled={submitting}>
										{submitting ? (
											<>
												<Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...
											</>
										) : (
											'Cadastrar plano'
										)}
									</Button>
								</div>
							</form>
						</CardBody>
					</Card>

					<Card>
						<CardHeader>Plano Rapidoc Selecionado</CardHeader>
						<CardBody>
							{selectedPlan ? (
								<div className="space-y-4">
									<div className="flex items-center gap-3">
										<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
											<Package className="w-6 h-6 text-primary" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
												{selectedPlan.plan?.name || selectedPlan.name || 'Plano sem nome'}
											</h3>
											<p className="text-xs text-gray-500">
												UUID: {selectedPlan.plan?.uuid || selectedPlan.uuid || '-'}
											</p>
										</div>
									</div>

									{selectedPlan.plan?.description && (
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{selectedPlan.plan?.description}
										</p>
									)}

									<div className="flex flex-wrap gap-2">
										{selectedPlan.paymentType && (
											<Badge variant="info">Pagamento: {paymentTypeLabel(selectedPlan.paymentType)}</Badge>
										)}
										{selectedPlan.serviceType && (
											<Badge variant="info">Serviço: {selectedPlan.serviceType}</Badge>
										)}
										{selectedPlan.plan?.serviceType && (
											<Badge variant="info">Serviço: {selectedPlan.plan?.serviceType}</Badge>
										)}
									</div>

									{selectedPlan.pricing?.value && (
										<div className="text-sm text-gray-600 dark:text-gray-400">
											Valor sugerido Rapidoc: R$ {Number(selectedPlan.pricing.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
										</div>
									)}

									<div className="rounded-xl border border-border-light dark:border-border-dark p-3 bg-gray-50 dark:bg-gray-900/20 text-sm text-gray-600 dark:text-gray-400">
										<p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
											Observações
										</p>
										<p>
											Ajuste o preço, periodicidade e especialidades conforme a estratégia do seu produto.
											Os dados originais do Rapidoc são utilizados para manter a sincronização.
										</p>
									</div>
								</div>
							) : (
								<div className="text-sm text-gray-500">
									Selecione um plano Rapidoc para visualizar os detalhes e vincular ao novo plano local.
								</div>
							)}
						</CardBody>
					</Card>
				</div>
			)}
		</DashboardLayout>
	);
}
