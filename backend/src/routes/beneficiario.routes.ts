import { Router } from 'express';
import { BeneficiarioEspecialidadesController } from '../controller/beneficiarioEspecialidades.controller.js';
import { BeneficiarioController } from '../controller/beneficiario.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/beneficiarios/:cpf/especialidades - lista especialidades efetivas agregadas
router.get('/beneficiarios/:cpf/especialidades', autenticarFirebase, BeneficiarioEspecialidadesController.listarEspecialidades);
router.put('/beneficiarios/:cpf/especialidades', autenticarFirebase, BeneficiarioEspecialidadesController.associarEspecialidade);

// GET /api/beneficiarios/:cpf/encaminhamentos - lista encaminhamentos médicos do beneficiário
router.get('/beneficiarios/:cpf/encaminhamentos', autenticarFirebase, BeneficiarioController.listarEncaminhamentos);

// GET /api/beneficiarios/:uuid/appointments - lista agendamentos do beneficiário por UUID
router.get('/beneficiarios/:uuid/appointments', autenticarFirebase, BeneficiarioController.listarAgendamentos);

// Inativar beneficiário no Rapidoc por CPF
router.post('/beneficiarios/:cpf/inativar-rapidoc', autenticarFirebase, BeneficiarioController.inativarRapidoc);

// Remover do nosso banco de dados (titular e seus dependentes)
router.delete('/beneficiarios/:cpf', autenticarFirebase, BeneficiarioController.removerDoBanco);

export default router;
