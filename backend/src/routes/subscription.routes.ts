import { Router } from 'express';
import { SubscriptionController } from '../controller/subscription.controller.js';

const router = Router();

// POST /api/subscription/start
router.post('/subscription/start', SubscriptionController.startSubscription);

export default router;
