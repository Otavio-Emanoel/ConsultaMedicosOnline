import { Router } from 'express';
import { AdminController } from '../controller/admin.controller.js';
import { autenticarAdministrador } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/admin/cadastrar - Cadastro de administrador
router.post('/admin/cadastrar', AdminController.cadastrar);

// POST /api/admin/cadastrar-plano - Cadastro de plano
router.post('/admin/cadastrar-plano', autenticarAdministrador, AdminController.cadastrarPlano);

// GET /api/admin/dashboard - métricas administrativas
router.get('/admin/dashboard', autenticarAdministrador, AdminController.dashboard);

// TODO: Implementar métodos abaixo no AdminController
// GET /api/admin/beneficiarios-sem-conta - Buscar beneficiários sem conta de usuário
// router.get('/admin/beneficiarios-sem-conta', autenticarAdministrador, AdminController.beneficiariosSemConta);

// POST /api/admin/criar-usuario-completo - Criar usuário completo com assinatura
// router.post('/admin/criar-usuario-completo', autenticarAdministrador, AdminController.criarUsuarioCompleto);

// POST /api/admin/gerar-nova-senha - Gerar nova senha para um cliente
// router.post('/admin/gerar-nova-senha', autenticarAdministrador, AdminController.gerarNovaSenha);

export default router;
