import { Router } from 'express';
import { UsuarioController } from '../controller/usuario.controller.js';

const router = Router();

// PATCH /api/usuario/:cpf - Atualiza dados do usuário
router.patch('/usuario/:cpf', UsuarioController.atualizarDados);

export default router;
