import { Router } from 'express';
import { WebhookController } from '../controller/webhook.controller.js';

const router = Router();

// Rota POST que o Asaas vai chamar
router.post('/asaas', WebhookController.handleAsaasWebhook);

export default router;