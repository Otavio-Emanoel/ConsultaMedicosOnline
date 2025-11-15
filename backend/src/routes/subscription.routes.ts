import { Router } from 'express';
import { SubscriptionController } from '../controller/subscription.controller.js';

const router = Router();

// POST /api/subscription/rapidoc-beneficiary
router.post('/subscription/rapidoc-beneficiary', SubscriptionController.createRapidocBeneficiary);

// POST /api/subscription/start
router.post('/subscription/start', SubscriptionController.startSubscription);

// GET /api/subscription/check-payment/:assinaturaId
router.get('/subscription/check-payment/:assinaturaId', SubscriptionController.checkFirstPayment);

// GET /api/subscription/payment-details/:assinaturaId
router.get('/subscription/payment-details/:assinaturaId', SubscriptionController.paymentDetails);

// DELETE /api/subscription/cancel/:assinaturaId
router.delete('/subscription/cancel/:assinaturaId', SubscriptionController.cancelSubscription);

// GET /api/subscription/onboarding-status/:cpf
router.get('/subscription/onboarding-status/:cpf', SubscriptionController.onboardingStatus);

// POST /api/subscription/complete-onboarding
router.post('/subscription/complete-onboarding', SubscriptionController.completeOnboarding);

export default router;