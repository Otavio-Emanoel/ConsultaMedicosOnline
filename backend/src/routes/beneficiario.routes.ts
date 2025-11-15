import { Router } from 'express';
import { BeneficiarioEspecialidadesController } from '../controller/beneficiarioEspecialidades.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/beneficiarios/:cpf/especialidades - lista especialidades efetivas agregadas
router.get('/beneficiarios/:cpf/especialidades', autenticarFirebase, BeneficiarioEspecialidadesController.listarEspecialidades);

export default router;
