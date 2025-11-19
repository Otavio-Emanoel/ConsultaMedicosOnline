import { Router } from 'express';
import { PlanosDashboardController } from '../controller/planosDashboard.controller.js';
import { autenticarAdministrador } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/planos/dashboard - Dashboard de planos (admin)
router.get('/admin/planos/dashboard', autenticarAdministrador, PlanosDashboardController.dashboard);

export default router;
