import { Router } from 'express';
import { getHealth } from '../controller/health.controller.js';

const router = Router();

// GET /api/health
router.get('/health', getHealth);

export default router;
