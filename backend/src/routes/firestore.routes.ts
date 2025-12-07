import { Router } from 'express';
import { UsuarioController } from '../controller/usuario.controller.js';
import { AssinaturaController } from '../controller/assinatura.controller.js';
import { DependenteController } from '../controller/dependente.controller.js';
import { autenticarFirebase } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/usuarios', UsuarioController.criarOuAtualizar);
router.get('/usuarios', UsuarioController.listar);
router.post('/assinaturas', AssinaturaController.criarOuAtualizar);
router.get('/assinaturas', AssinaturaController.listar);
router.post('/dependentes', autenticarFirebase, DependenteController.adicionar);
// Alterado para usar CPF como parâmetro principal
router.put('/dependentes/:cpf', autenticarFirebase, DependenteController.editar);
router.put('/dependentes/:cpf/local', autenticarFirebase, DependenteController.atualizarLocal);
router.put('/dependentes/:cpf/rapidoc', autenticarFirebase, DependenteController.atualizarRapidoc);
router.get('/dependentes/:cpf', autenticarFirebase, DependenteController.listarPorTitular);

export default router;
