import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import axios from 'axios';

export class AdminController {
  // Cadastro de administrador (apenas outro admin pode cadastrar)
  static async cadastrar(req: Request, res: Response) {
    try {
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
      }

      // Verifica se já existe admin com esse email
      const db = getFirestore(firebaseApp);
      const adminSnap = await db.collection('administradores').where('email', '==', email).get();
      if (!adminSnap.empty) {
        return res.status(409).json({ error: 'Já existe um administrador com esse email.' });
      }

      // Cria usuário no Firebase Auth
      const userRecord = await getAuth(firebaseApp).createUser({
        email,
        password: senha,
        displayName: nome,
      });

      // Salva na coleção administradores
      await db.collection('administradores').doc(userRecord.uid).set({
        uid: userRecord.uid,
        nome,
        email,
        criadoEm: new Date().toISOString(),
      });

      return res.status(201).json({ message: 'Administrador cadastrado com sucesso.', uid: userRecord.uid });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao cadastrar administrador.' });
    }
  }

  // Cadastro de plano vinculado ao Rapidoc
  static async cadastrarPlano(req: Request, res: Response) {
    try {
      // Extrai campos obrigatórios e todos os demais campos extras
      const {
        tipo, periodicidade, descricao, especialidades, preco, uuidRapidocPlano, paymentType,
        ...rest
      } = req.body;
      if (!tipo || !periodicidade || !descricao || !Array.isArray(especialidades) || !preco || !uuidRapidocPlano || !paymentType) {
        return res.status(400).json({ error: 'Campos obrigatórios: tipo, periodicidade, descricao, especialidades (array), preco, uuidRapidocPlano, paymentType.' });
      }

      // Consulta planos Rapidoc e valida UUID e paymentType
      const { listarRapidocPlanos } = await import('../services/rapidoc.service.js');
      const planosRapidoc = await listarRapidocPlanos();
      // Corrige busca: uuid está em p.plan.uuid
      const planoRemoto = planosRapidoc.find((p: any) => p.plan?.uuid === uuidRapidocPlano);
      if (!planoRemoto) {
        return res.status(404).json({ error: 'Plano Rapidoc não encontrado para o uuidRapidocPlano fornecido.' });
      }
      const remotePaymentType = planoRemoto.paymentType;
      const enviado = String(paymentType).toUpperCase();
      // Regra: se remotePaymentType = 'L', aceita S/A/L; senão, exige igual
      if (remotePaymentType === 'L') {
        if (!['S', 'A', 'L'].includes(enviado)) {
          return res.status(400).json({ error: 'paymentType inválido: permitido S, A ou L quando remotePaymentType=L.' });
        }
      } else if (remotePaymentType && enviado !== remotePaymentType) {
        return res.status(400).json({ error: `paymentType diferente do plano Rapidoc (${remotePaymentType}).` });
      }
      // Se quiser salvar nome/descrição do plano Rapidoc junto, pode usar planoRemoto.plan.name etc.

      const db = getFirestore(firebaseApp);
      // Evita duplicidade pelo uuidRapidocPlano
      const existentesSnap = await db.collection('planos').where('uuidRapidocPlano', '==', uuidRapidocPlano).get();
      if (!existentesSnap.empty) {
        return res.status(409).json({ error: 'Já existe plano local vinculado a este uuidRapidocPlano.' });
      }

      // Salva todos os campos recebidos, inclusive extras, junto com vínculo Rapidoc e data
      const planoData = {
        tipo,
        periodicidade,
        descricao,
        especialidades,
        preco,
        uuidRapidocPlano,
        paymentType: enviado,
        remotePaymentType,
        criadoEm: new Date().toISOString(),
        ...rest
      };
      const planoRef = await db.collection('planos').add(planoData);
      return res.status(201).json({ message: 'Plano cadastrado com sucesso.', id: planoRef.id });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao cadastrar plano.' });
    }
  }

  // Dashboard administrativo com métricas gerais
  static async dashboard(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);

      // Totais básicos (Firestore)
      const [usuariosSnap, assinSnap, ativasSnap, canceladasSnap, pendentesSnap, planosSnap] = await Promise.all([
        db.collection('usuarios').get(),
        db.collection('assinaturas').get(),
        db.collection('assinaturas').where('status', '==', 'ATIVA').get(),
        db.collection('assinaturas').where('status', 'in', ['CANCELADA', 'CANCELADO']).get().catch(() => ({ size: 0 } as any)),
        db.collection('assinaturas').where('status', 'in', ['PENDENTE', 'PENDING']).get().catch(() => ({ size: 0 } as any)),
        db.collection('planos').get(),
      ]);

      const totais = {
        usuarios: (usuariosSnap as any).size ?? 0,
        assinaturas: (assinSnap as any).size ?? 0,
        assinaturasAtivas: (ativasSnap as any).size ?? 0,
        assinaturasCanceladas: (canceladasSnap as any).size ?? 0,
        assinaturasPendentes: (pendentesSnap as any).size ?? 0,
      };

      // Número de planos e média de valor dos planos
      let numeroPlanos = (planosSnap as any).size ?? 0;
      let mediaValorPlanos = 0;
      let planosDetalhados: Array<{
        id: string;
        nome: string;
        valor: number;
        assinantes: number;
        valorTotal: number;
      }> = [];
      let novosAssinantes: Array<{
        nome: string;
        plano: string;
        data: string;
        status: string;
      }> = [];
      if (numeroPlanos > 0) {
        let soma = 0;
        let count = 0;
        const planosArr: any[] = [];
        (planosSnap as any).forEach((doc: any) => {
          const data = doc.data();
          planosArr.push({ id: doc.id, ...data });
          const preco = Number(data.preco);
          if (!isNaN(preco)) {
            soma += preco;
            count++;
          }
        });
        if (count > 0) mediaValorPlanos = soma / count;

        // Buscar assinaturas agrupadas por plano
        // Supondo que cada assinatura tem um campo planoId (referência ao id do plano)
        const assinaturasSnap = await db.collection('assinaturas').get();
        const assinaturasPorPlano: Record<string, number> = {};
        const assinaturasArr: any[] = [];
        (assinaturasSnap as any).forEach((doc: any) => {
          const data = doc.data();
          assinaturasArr.push({ id: doc.id, ...data });
          const planoId = data.planoId;
          if (planoId) {
            assinaturasPorPlano[planoId] = (assinaturasPorPlano[planoId] || 0) + 1;
          }
        });

        planosDetalhados = planosArr.map((plano) => {
          const valor = Number(plano.preco) || 0;
          const assinantes = assinaturasPorPlano[plano.id] || 0;
          return {
            id: plano.id,
            nome: plano.tipo || plano.descricao || plano.nome || plano.id,
            valor,
            assinantes,
            valorTotal: valor * assinantes,
          };
        });

        // Novos assinantes dos últimos 7 dias
        const agora = new Date();
        const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        novosAssinantes = assinaturasArr
          .filter(a => {
            const criadoEm = a.criadoEm ? new Date(a.criadoEm) : null;
            return criadoEm && criadoEm >= seteDiasAtras;
          })
          .map(a => {
            // Busca nome do usuário (ou beneficiário) relacionado à assinatura
            // e nome do plano
            let nome = a.nome || a.nomeTitular || a.email || 'Desconhecido';
            let plano = planosArr.find(p => p.id === a.planoId)?.tipo || 'Plano';
            let status = a.status ? String(a.status).toLowerCase() : 'success';
            // Data amigável
            let data = '-';
            if (a.criadoEm) {
              const criado = new Date(a.criadoEm);
              const diff = Math.floor((agora.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24));
              if (diff === 0) data = 'Hoje';
              else if (diff === 1) data = 'Ontem';
              else data = `Há ${diff} dias`;
            }
            return { nome, plano, data, status };
          });
      }

      // Faturamento (Asaas) - melhor esforço, primeira página
      const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
      const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string | undefined;
      let faturamento = { mesAtual: 0, ultimos30Dias: 0, pendencias: 0 };
      if (ASAAS_API_KEY) {
        try {
          const paymentsResp = await axios.get(`${ASAAS_API_URL}/payments`, {
            headers: { access_token: ASAAS_API_KEY },
            params: { limit: 100 },
          });
          const payments: any[] = paymentsResp.data?.data || [];
          const hoje = new Date();
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

          let mesAtual = 0;
          let ultimos30 = 0;
          let pendencias = 0;
          for (const p of payments) {
            const status = String(p?.status || '').toUpperCase();
            if (status === 'PENDING' || status === 'OVERDUE') pendencias += 1;
            const pago = status === 'RECEIVED';
            const dataPag = p.paymentDate || p.receivedDate || p.dueDate;
            if (!dataPag) continue;
            const data = new Date(dataPag);
            if (pago && data >= inicioMes) mesAtual += Number(p.value || 0);
            if (pago && data >= trintaDiasAtras) ultimos30 += Number(p.value || 0);
          }
          faturamento = { mesAtual, ultimos30Dias: ultimos30, pendencias };
        } catch {}
      }

      return res.status(200).json({
        totais,
        faturamento,
        planos: {
          numeroPlanos,
          mediaValorPlanos,
          detalhados: planosDetalhados
        },
        novosAssinantes
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao montar dashboard administrativo.' });
    }
  }
}
