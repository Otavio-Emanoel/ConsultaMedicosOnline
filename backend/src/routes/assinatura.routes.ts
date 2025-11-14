import { Router } from 'express';
import { AssinaturaController } from '../controller/assinatura.controller.js';

const router = Router();

// GET /api/assinatura/status/:cpf - retorna o id da assinatura ativa do usuário no Asaas
router.get('/assinatura/status/:cpf', AssinaturaController.obterStatusAssinatura);

export default router;
