import { Router } from 'express';
import { DashboardController } from '../controller/dashboard.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/dashboard (protegido)
router.get('/dashboard', autenticarFirebase, DashboardController.getDashboard);
// GET /api/dashboard/agendamentos (protegido) - próximas consultas do usuário logado
router.get('/dashboard/agendamentos', autenticarFirebase, DashboardController.getProximosAgendamentos);

export default router;
