import { Router } from 'express';
import { UsuarioController } from '../controller/usuario.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

// PATCH /api/usuario/senha - Atualiza a senha do usuário autenticado (colocar antes de rotas dinâmicas :cpf)
router.patch('/usuario/senha', autenticarFirebase, UsuarioController.atualizarSenha);

// GET /api/usuario/me - Obtém dados do usuário autenticado
router.get('/usuario/me', autenticarFirebase, UsuarioController.obterDadosAutenticado);

// PATCH /api/usuario/:cpf - Atualiza dados do usuário no banco local e sincroniza Firebase Auth
router.patch('/usuario/:cpf', autenticarFirebase, UsuarioController.atualizarDadosLocal);

// PATCH /api/rapidoc/beneficiario/:cpf - Atualiza dados do beneficiário no Rapidoc
router.patch('/rapidoc/beneficiario/:cpf', autenticarFirebase, UsuarioController.atualizarDadosRapidoc);

// GET /api/usuario/:cpf - Obtém dados do usuário pelo CPF
router.get('/usuario/:cpf', autenticarFirebase, UsuarioController.obterDados);

// GET /api/usuario/:cpf/status - Obtém apenas o status do usuário (sem autenticação necessária para webhook refresh)
router.get('/usuario/:cpf/status', UsuarioController.obterStatusUsuario);

// POST /api/usuario/recuperar-senha
router.post('/usuario/recuperar-senha', UsuarioController.recuperarSenha);

// GET /api/rapidoc/beneficiario/:cpf - Obtém dados do beneficiário no Rapidoc pelo CPF
router.get('/rapidoc/beneficiario/:cpf', autenticarFirebase, UsuarioController.obterBeneficiarioRapidoc);

export default router;
