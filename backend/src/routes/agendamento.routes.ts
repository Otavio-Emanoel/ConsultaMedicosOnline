import { Router } from 'express';
import { AgendamentoController } from '../controller/agendamento.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/agendamentos - agenda consulta no Rapidoc
router.post('/agendamentos', autenticarFirebase, AgendamentoController.criar);
// GET /api/agendamentos - lista consultas do beneficiário (por cpf/beneficiaryUuid)
router.get('/agendamentos', autenticarFirebase, AgendamentoController.listar);
router.get('/agendamentos/:uuid', autenticarFirebase, AgendamentoController.ler);
// GET /api/agendamentos/:uuid/join - retorna link/credenciais para entrar
router.get('/agendamentos/:uuid/join', autenticarFirebase, AgendamentoController.join);
router.delete('/agendamentos/:uuid', autenticarFirebase, AgendamentoController.cancelar);

// Consulta imediata (fila/triagem)
router.post('/agendamentos/imediato', autenticarFirebase, AgendamentoController.solicitarImediato);
router.get('/agendamentos/imediato/:id', autenticarFirebase, AgendamentoController.statusImediato);
router.delete('/agendamentos/imediato/:id', autenticarFirebase, AgendamentoController.cancelarSolicitacaoImediato);
router.get('/agendamentos/imediato/:id/join', autenticarFirebase, AgendamentoController.joinImediato);

export default router;
