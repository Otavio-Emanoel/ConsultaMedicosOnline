import { Router } from 'express';
import { PlanosController } from '../controller/planos.controller.js';
import { autenticarAdministrador } from '../middlewares/auth.middleware.js';

const router = Router();


// GET /api/planos/rapidoc/:uuid
router.get('/planos/rapidoc', PlanosController.listarPlanosRapidoc);
// GET /api/planos/rapidoc/:uuid - Obtém um plano Rapidoc específico por UUID
router.get('/planos/rapidoc/:uuid', PlanosController.obterPlanoRapidoc);

// GET /api/planos - Lista todos os planos locais
router.get('/planos', PlanosController.listarPlanos);


// GET /api/planos/:id - Obtém um plano local específico
router.get('/planos/:id', PlanosController.obterPlano);

// PUT /api/planos/:id - Edita um plano local existente
router.put('/planos/:id', autenticarAdministrador, PlanosController.editarPlano);

// DELETE /api/planos/:id - Exclui um plano local existente
router.delete('/planos/:id', autenticarAdministrador, PlanosController.excluirPlano);

// PUT /api/planos/rapidoc/:uuid/especialidades - atualiza specialties do plano Rapidoc (admin)
router.put('/planos/rapidoc/:uuid/especialidades', autenticarAdministrador, PlanosController.atualizarEspecialidadesPlanoRapidoc);

export default router;
