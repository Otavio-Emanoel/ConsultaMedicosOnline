import { Router } from 'express';
import { UsuarioController } from '../controller/usuario.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// PATCH /api/usuario/:cpf - Atualiza dados do usuário
router.patch('/usuario/:cpf', autenticarFirebase, UsuarioController.atualizarDados);

// GET /api/usuario/:cpf - Obtém dados do usuário pelo CPF
router.get('/usuario/:cpf', autenticarFirebase, UsuarioController.obterDados);

// GET /api/usuario/me - Obtém dados do usuário autenticado
router.get('/usuario/me', autenticarFirebase, UsuarioController.obterDadosAutenticado);

// PATCH /api/usuario/senha - Atualiza a senha do usuário autenticado
router.patch('/usuario/senha', autenticarFirebase, UsuarioController.atualizarSenha);

// POST /api/usuario/recuperar-senha
router.post('/usuario/recuperar-senha', UsuarioController.recuperarSenha);

// GET /api/rapidoc/beneficiario/:cpf - Obtém dados do beneficiário no Rapidoc pelo CPF
router.get('/rapidoc/beneficiario/:cpf', autenticarFirebase, UsuarioController.obterBeneficiarioRapidoc);

export default router;
