import { Router } from 'express';
import { getHealth, getSpeedtest } from '../controller/health.controller.js';

const router = Router();

// GET /api/health
router.get('/health', getHealth);

router.get('/speedtest', getSpeedtest);

export default router;
