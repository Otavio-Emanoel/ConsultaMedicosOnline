import type { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import admin from 'firebase-admin';
import { buscarBeneficiarioRapidocPorCpf, inativarBeneficiarioRapidoc, buscarEncaminhamentosBeneficiarioRapidoc, listarAgendamentosBeneficiarioRapidoc } from '../services/rapidoc.service.js';
import { listarBeneficiariosRapidocPorHolder } from '../services/rapidoc.service.js';

export class BeneficiarioController {
  // Cadastrar/Sincronizar beneficiário (dependente) no Firestore a partir do Rapidoc
  // POST /api/beneficiarios/dependente
  // Body: { cpf: string; holder: string }
  static async cadastrarDependente(req: Request, res: Response) {
    try {
      const { cpf, holder } = req.body as { cpf?: string; holder?: string };
      if (!cpf || !holder) {
        return res.status(400).json({ error: 'Campos obrigatórios: cpf (do beneficiário) e holder (CPF do responsável/assinante).' });
      }

      const cpfBenef = String(cpf).replace(/\D/g, '');
      const cpfHolder = String(holder).replace(/\D/g, '');
      if (cpfBenef.length !== 11 || cpfHolder.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido. Ambos devem ter 11 dígitos.' });
      }

      // Buscar beneficiário no Rapidoc pelo CPF
      const { buscarBeneficiarioRapidocPorCpf } = await import('../services/rapidoc.service.js');
      let rapidoc: any;
      try {
        const resp = await buscarBeneficiarioRapidocPorCpf(cpfBenef);
        rapidoc = resp?.beneficiary;
      } catch (e: any) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc para o CPF informado.' });
      }

      if (!rapidoc || !rapidoc.uuid) {
        return res.status(404).json({ error: 'Beneficiário não possui UUID no Rapidoc.' });
      }

      // Montar documento no Firestore
      const db = getFirestore(firebaseApp);
      const data: Record<string, any> = {
        nome: rapidoc.name || rapidoc.nome || rapidoc.fullName || '',
        cpf: cpfBenef,
        birthDate: rapidoc.birthday || rapidoc.birthDate || '',
        email: rapidoc.email || rapidoc.emailAddress || '',
        phone: rapidoc.phone || rapidoc.telefone || '',
        zipCode: rapidoc.zipCode || rapidoc.cep || '',
        address: rapidoc.address || rapidoc.endereco || '',
        city: rapidoc.city || rapidoc.cidade || '',
        state: rapidoc.state || rapidoc.estado || '',
        paymentType: rapidoc.paymentType || undefined,
        serviceType: rapidoc.serviceType || undefined,
        holder: cpfHolder,
        rapidocUuid: rapidoc.uuid,
        isActive: (rapidoc.isActive === true) || (rapidoc.active === true),
        updatedAt: new Date().toISOString(),
      };

      // Remover chaves undefined
      Object.keys(data).forEach((k) => { if (data[k] === undefined) delete data[k]; });

      // Se já existir o beneficiário no Firestore, atualiza; senão, cria
      const coll = db.collection('beneficiarios');
      const snap = await coll.where('cpf', '==', cpfBenef).limit(1).get();
      let docId: string | undefined;
      if (!snap.empty) {
        const firstDoc = snap.docs[0]!;
        docId = firstDoc.id;
        await coll.doc(docId).set(data, { merge: true });
      } else {
        const created = await coll.add({ ...data, createdAt: new Date().toISOString() });
        docId = created.id;
      }

      // Atualizar usuário (titular) com rapidocBeneficiaryUuid, se aplicável
      try {
        const userRef = db.collection('usuarios').doc(cpfHolder);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const u = userDoc.data() || {};
          const rapidocBeneficiaryUuid = u?.rapidocBeneficiaryUuid || rapidoc.uuid;
          await userRef.set({ rapidocBeneficiaryUuid }, { merge: true });
        }
      } catch {}

      return res.status(200).json({ ok: true, id: docId, beneficiario: data });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao cadastrar dependente.' });
    }
  }
  // Inativar beneficiário no Rapidoc via CPF
  static async inativarRapidoc(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const r = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = r?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
      }

      try {
        const resp = await inativarBeneficiarioRapidoc(beneficiario.uuid);
        if (!resp || resp.success === false) {
          return res.status(400).json({ error: resp?.message || 'Falha ao inativar beneficiário no Rapidoc.', detail: resp });
        }
        return res.status(200).json({ ok: true, beneficiaryUuid: beneficiario.uuid });
      } catch (e: any) {
        return res.status(400).json({ error: 'Erro ao inativar beneficiário no Rapidoc.', detail: e?.response?.data || e?.message });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao inativar beneficiário.' });
    }
  }

  // Remover titular e dependentes do Firestore
  static async removerDoBanco(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const db = admin.firestore();
      const batch = db.batch();

      // 1) usuarios (titular)
      const usuarioRef = db.collection('usuarios').doc(cpf);
      const usuarioDoc = await usuarioRef.get();
      if (usuarioDoc.exists) batch.delete(usuarioRef);

      // 2) assinaturas do titular
      const assinSnap = await db.collection('assinaturas').where('cpfUsuario', '==', cpf).get();
      assinSnap.forEach(doc => batch.delete(doc.ref));

      // 3) dependentes vinculados ao titular
      const depsSnap = await db.collection('beneficiarios').where('holder', '==', cpf).get();
      depsSnap.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      return res.status(200).json({ ok: true, removed: {
        usuario: usuarioDoc.exists,
        assinaturas: assinSnap.size,
        dependentes: depsSnap.size
      }});
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao remover do banco de dados.' });
    }
  }

  // Buscar encaminhamentos médicos do beneficiário
  static async listarEncaminhamentos(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      // Buscar beneficiário pelo CPF para obter o UUID
      const r = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = r?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
      }

      try {
        // OTIMIZAÇÃO: Adicionar timeout para não travar se a API do Rapidoc estiver lenta
        // O endpoint de encaminhamentos pode dar timeout (504) se a API estiver lenta
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao buscar encaminhamentos (60s)')), 60000);
        });

        const encaminhamentosPromise = buscarEncaminhamentosBeneficiarioRapidoc(beneficiario.uuid);
        
        const encaminhamentos = await Promise.race([encaminhamentosPromise, timeoutPromise]) as any;
        
        // A resposta pode vir como array ou objeto com array
        const lista = Array.isArray(encaminhamentos) 
          ? encaminhamentos 
          : Array.isArray(encaminhamentos?.medicalReferrals) 
            ? encaminhamentos.medicalReferrals 
            : Array.isArray(encaminhamentos?.data)
              ? encaminhamentos.data
              : Array.isArray(encaminhamentos?.referrals)
                ? encaminhamentos.referrals
                : [];
        
        return res.status(200).json({ count: lista.length, encaminhamentos: lista });
      } catch (e: any) {
        // Log apenas em caso de erro (não logar respostas grandes em produção)
        if (process.env.NODE_ENV === 'development') {
          console.error('[BeneficiarioController] Erro ao buscar encaminhamentos:', {
            status: e?.response?.status,
            statusText: e?.response?.statusText,
            message: e?.message
          });
        }
        
        // Se for timeout ou 504, retornar array vazio em vez de erro
        // Encaminhamentos são opcionais e não devem travar a página
        if (e?.message?.includes('Timeout') || e?.response?.status === 504) {
          return res.status(200).json({ count: 0, encaminhamentos: [] });
        }
        
        return res.status(400).json({ 
          error: 'Erro ao buscar encaminhamentos no Rapidoc.', 
          detail: e?.response?.data || e?.message 
        });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao buscar encaminhamentos.' });
    }
  }

  // Listar agendamentos do beneficiário por UUID
  static async listarAgendamentos(req: Request, res: Response) {
    try {
      const { uuid } = req.params as { uuid?: string };
      if (!uuid) return res.status(400).json({ error: 'UUID do beneficiário é obrigatório.' });

      try {
        const agendamentos = await listarAgendamentosBeneficiarioRapidoc(uuid);
        
        return res.status(200).json({ count: agendamentos.length, appointments: agendamentos });
      } catch (e: any) {
        // Log apenas em caso de erro (não logar respostas grandes em produção)
        if (process.env.NODE_ENV === 'development') {
          console.error('[BeneficiarioController] Erro ao buscar agendamentos:', {
            status: e?.response?.status,
            statusText: e?.response?.statusText,
            message: e?.message
          });
        }
        
        return res.status(400).json({ 
          error: 'Erro ao buscar agendamentos no Rapidoc.', 
          detail: e?.response?.data || e?.message 
        });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao buscar agendamentos.' });
    }
  }

  // Buscar encaminhamentos do usuário logado (usa CPF do token)
  static async listarEncaminhamentosMe(req: Request, res: Response) {
    try {
      // Obter CPF do token
      let cpf = req.user?.cpf as string | undefined;
      
      // Fallback 1: Se não tiver CPF no token, tenta usar o UID (que pode ser o CPF)
      if (!cpf && req.user?.uid) {
        const uid = req.user.uid;
        if (/^\d{11}$/.test(uid)) {
          cpf = uid;
        } else {
          // Se UID não é CPF, busca no Firestore pelo UID
          try {
            const usuarioRef = admin.firestore().collection('usuarios').doc(uid);
            const usuarioDoc = await usuarioRef.get();
            if (usuarioDoc.exists) {
              const usuarioData = usuarioDoc.data();
              cpf = usuarioData?.cpf || uid;
            }
          } catch {}
        }
      }
      
      // Fallback 2: Busca pelo email no Firestore
      if (!cpf && req.user?.email) {
        try {
          const snap = await admin.firestore().collection('usuarios')
            .where('email', '==', req.user.email)
            .limit(1)
            .get();
          if (!snap.empty) {
            const first = snap.docs[0];
            if (first) {
              cpf = (first.data().cpf as string) || first.id;
            }
          }
        } catch {}
      }

      if (!cpf) {
        return res.status(400).json({ error: 'CPF não encontrado. Não foi possível identificar o usuário.' });
      }

      // Buscar beneficiário pelo CPF para obter o UUID (usando cache)
      const r = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = r?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
      }

      try {
        // OTIMIZAÇÃO: Timeout de 60s (encaminhamentos são opcionais)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao buscar encaminhamentos (60s)')), 60000);
        });

        const encaminhamentosPromise = buscarEncaminhamentosBeneficiarioRapidoc(beneficiario.uuid);
        
        const encaminhamentos = await Promise.race([encaminhamentosPromise, timeoutPromise]) as any;
        
        // A resposta pode vir como array ou objeto com array
        const lista = Array.isArray(encaminhamentos) 
          ? encaminhamentos 
          : Array.isArray(encaminhamentos?.medicalReferrals) 
            ? encaminhamentos.medicalReferrals 
            : Array.isArray(encaminhamentos?.data)
              ? encaminhamentos.data
              : Array.isArray(encaminhamentos?.referrals)
                ? encaminhamentos.referrals
                : [];
        
        return res.status(200).json({ 
          cpf,
          beneficiaryUuid: beneficiario.uuid,
          count: lista.length, 
          encaminhamentos: lista 
        });
      } catch (e: any) {
        // Log apenas em caso de erro (não logar respostas grandes em produção)
        if (process.env.NODE_ENV === 'development') {
          console.error('[BeneficiarioController] Erro ao buscar encaminhamentos:', {
            status: e?.response?.status,
            statusText: e?.response?.statusText,
            message: e?.message
          });
        }
        
        // Se for timeout ou 504, retornar array vazio em vez de erro
        // Encaminhamentos são opcionais e não devem travar a página
        if (e?.message?.includes('Timeout') || e?.response?.status === 504) {
          return res.status(200).json({ 
            cpf,
            beneficiaryUuid: beneficiario.uuid,
            count: 0, 
            encaminhamentos: [] 
          });
        }
        
        return res.status(400).json({ 
          error: 'Erro ao buscar encaminhamentos no Rapidoc.', 
          detail: e?.response?.data || e?.message 
        });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao buscar encaminhamentos.' });
    }
  }
}

// Listar beneficiários do Rapidoc cujo holder é o CPF do usuário logado
export class BeneficiariosRapidocQueryController {
  static async listarMe(req: Request, res: Response) {
    try {
      let holderCpf = (req.user as any)?.cpf as string | undefined;
      const uid = (req.user as any)?.uid as string | undefined;
      const email = (req.user as any)?.email as string | undefined;

      // Fallbacks para descobrir CPF
      if (!holderCpf && uid) {
        if (/^\d{11}$/.test(uid)) {
          holderCpf = uid;
        } else {
          try {
            const usuarioSnap = await admin.firestore().collection('usuarios').doc(uid).get();
            if (usuarioSnap.exists) holderCpf = (usuarioSnap.data() as any)?.cpf || holderCpf;
          } catch {}
        }
      }
      if (!holderCpf && email) {
        try {
          const snap = await admin.firestore().collection('usuarios')
            .where('email', '==', email)
            .limit(1)
            .get();
          if (!snap.empty) {
            const first = snap.docs[0]!;
            holderCpf = (first.data() as any)?.cpf || first.id;
          }
        } catch {}
      }

      if (!holderCpf) return res.status(400).json({ error: 'CPF do usuário não identificado.' });

      try {
        const beneficiarios = await listarBeneficiariosRapidocPorHolder(holderCpf);
        const lista = Array.isArray(beneficiarios) ? beneficiarios : [];
        return res.status(200).json({ holder: holderCpf, count: lista.length, beneficiarios: lista });
      } catch (e: any) {
        return res.status(400).json({ error: 'Erro ao listar beneficiários do Rapidoc.', detail: e?.response?.data || e?.message });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro no servidor.' });
    }
  }
}
