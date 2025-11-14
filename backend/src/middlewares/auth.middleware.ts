import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import { verificarAssinaturaPorCpf } from '../services/asaas.service.js';

// Extensão do tipo Request para incluir user, admin e clienteAsaas
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
    admin?: { uid: string; email?: string };
    clienteAsaas?: any;
  }
}

// Middleware para proteger rotas de administrador
export async function autenticarAdministrador(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }
    const parts = authHeader.split(' ');
    const token = parts[1];
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }
    const decoded = await getAuth(firebaseApp).verifyIdToken(token);
    const uid = decoded.uid;
    // Verifica se UID está na coleção administradores
    const db = getFirestore(firebaseApp);
    const adminDoc = await db.collection('administradores').doc(uid).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    req.admin = decoded.email ? { uid, email: decoded.email } : { uid };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export async function autenticarFirebase(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }
    const parts = authHeader.split(' ');
    const token = parts[1];
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }
    const decoded = await getAuth(firebaseApp).verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export async function verificarPagamentoEmDia(req: Request, res: Response, next: NextFunction) {
  try {
    // O CPF pode vir do usuário autenticado ou do parâmetro
    const cpf = req.user?.cpf || req.params.cpf || req.body.cpf;
    if (!cpf) return res.status(400).json({ error: 'CPF não informado.' });

    const resultado = await verificarAssinaturaPorCpf(cpf);
    if (!resultado.assinaturaOk || !resultado.cliente?.pagamentoEmDia) {
      return res.status(402).json({ error: 'Assinatura não está em dia.' });
    }

    // Se quiser, pode anexar info do cliente no req para uso posterior
    req.clienteAsaas = resultado.cliente;
    next();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao verificar pagamento.' });
  }
}