import { Router } from 'express';
import { BeneficiarioEspecialidadesController } from '../controller/beneficiarioEspecialidades.controller.js';
import { BeneficiarioController, BeneficiariosRapidocQueryController } from '../controller/beneficiario.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/beneficiarios/:cpf/especialidades - lista especialidades efetivas agregadas
router.get('/beneficiarios/:cpf/especialidades', autenticarFirebase, BeneficiarioEspecialidadesController.listarEspecialidades);
router.put('/beneficiarios/:cpf/especialidades', autenticarFirebase, BeneficiarioEspecialidadesController.associarEspecialidade);

// GET /api/encaminhamentos/me - lista encaminhamentos médicos do usuário logado (otimizado - usa CPF do token)
router.get('/encaminhamentos/me', autenticarFirebase, BeneficiarioController.listarEncaminhamentosMe);

// GET /api/beneficiarios/:cpf/encaminhamentos - lista encaminhamentos médicos do beneficiário
router.get('/beneficiarios/:cpf/encaminhamentos', autenticarFirebase, BeneficiarioController.listarEncaminhamentos);

// GET /api/beneficiarios/:uuid/appointments - lista agendamentos do beneficiário por UUID
router.get('/beneficiarios/:uuid/appointments', autenticarFirebase, BeneficiarioController.listarAgendamentos);

// GET /api/beneficiarios/rapidoc/me - lista beneficiários do Rapidoc com holder igual ao CPF do usuário logado
router.get('/beneficiarios/rapidoc/me', autenticarFirebase, BeneficiariosRapidocQueryController.listarMe);

// Inativar beneficiário no Rapidoc por CPF
router.post('/beneficiarios/:cpf/inativar-rapidoc', autenticarFirebase, BeneficiarioController.inativarRapidoc);

// Remover do nosso banco de dados (titular e seus dependentes)
router.delete('/beneficiarios/:cpf', autenticarFirebase, BeneficiarioController.removerDoBanco);

// Remover apenas um beneficiário (dependente) do banco por CPF
router.delete('/beneficiarios/:cpf/dependente', autenticarFirebase, BeneficiarioController.removerBeneficiarioPorCpf);
 
 // Cadastrar/Sincronizar dependente a partir do CPF (Rapidoc -> Firestore)
 router.post('/beneficiarios/dependente', autenticarFirebase, BeneficiarioController.cadastrarDependente);

export default router;
