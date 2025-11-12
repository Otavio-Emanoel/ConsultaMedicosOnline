import { Router } from 'express';
import { PlanosController } from '../controller/planos.controller.js';

const router = Router();

// GET /api/planos - Lista todos os planos locais
router.get('/planos', PlanosController.listarPlanos);

// GET /api/planos/rapidoc - Lista planos Rapidoc (direto da API)
router.get('/planos/rapidoc', PlanosController.listarPlanosRapidoc);

export default router;
