import { cadastrarBeneficiarioRapidoc, atualizarBeneficiarioRapidoc } from '../services/rapidoc.service.js';
import admin from 'firebase-admin';
import type { Request, Response } from 'express';
import axios from 'axios';

export class DependenteController {
  static async adicionar(req: Request, res: Response) {
    try {
      const { nome, cpf, birthDate, parentesco, holder, email, phone, zipCode, address, city, state, paymentType, serviceType, plans } = req.body;
      console.log('[DependenteController.adicionar] Início', { hasNome: !!nome, hasCpf: !!cpf, hasBirthDate: !!birthDate, hasHolder: !!holder });

      const cpfNormalizado = typeof cpf === 'string' ? cpf.replace(/\D/g, '') : '';
      const holderNormalizado = typeof holder === 'string' ? holder.replace(/\D/g, '') : '';
      const phoneDigits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
      if (!nome || !cpfNormalizado || !birthDate || !holderNormalizado) {
        return res.status(400).json({ error: 'Campos obrigatórios não informados.' });
      }

      // Monta plans priorizando o array recebido; caso contrário, monta a partir de serviceType/paymentType
      const plansNormalizados: Array<{ paymentType?: string; plan: { uuid: string } }> = Array.isArray(plans)
        ? plans
          .filter((p: any) => p && p.plan && typeof p.plan.uuid === 'string')
          .map((p: any) => ({
            plan: { uuid: String(p.plan.uuid).trim() },
            ...(p.paymentType ? { paymentType: String(p.paymentType).trim().toUpperCase() } : {}),
          }))
        : [];

      if (plansNormalizados.length === 0 && (serviceType || paymentType)) {
        const entry: any = { plan: { uuid: String(serviceType || '').trim() } };
        if (paymentType) entry.paymentType = String(paymentType).trim().toUpperCase();
        plansNormalizados.push(entry);
      }

      // 1. Cria no Rapidoc
      console.log('[DependenteController.adicionar] Chamando Rapidoc cadastrarBeneficiario');
      const rapidocPayload: any = {
        name: nome,
        cpf: cpfNormalizado,
        birthday: birthDate,
        email,
        ...(phoneDigits ? { phone: phoneDigits } : {}),
        zipCode,
        address,
        city,
        state,
        holder: holderNormalizado,
      };

      if (plansNormalizados.length > 0) {
        rapidocPayload.plans = plansNormalizados;
      }

      const rapidocResp = await cadastrarBeneficiarioRapidoc(rapidocPayload);
      console.log('[DependenteController.adicionar] Resposta Rapidoc', { success: rapidocResp?.success, uuid: rapidocResp?.uuid });
      if (!rapidocResp || rapidocResp.success === false) {
        return res.status(400).json({ error: rapidocResp?.message || 'Erro ao criar dependente no Rapidoc.' });
      }

      // 2. Salva no Firestore
      const docData: any = {
        nome,
        cpf: cpfNormalizado,
        birthDate,
        parentesco,
        holder: holderNormalizado,
        email,
        phone: phoneDigits || phone,
        zipCode,
        address,
        city,
        state,
        paymentType: plansNormalizados[0]?.paymentType || paymentType,
        serviceType: plansNormalizados[0]?.plan?.uuid || serviceType,
        createdAt: new Date(),
      };
      if (rapidocResp.uuid) {
        docData.rapidocUuid = rapidocResp.uuid;
      }
      const createdRef = await admin.firestore().collection('beneficiarios').add(docData);
      console.log('[DependenteController.adicionar] Documento criado', { docId: createdRef.id, hasRapidocUuid: !!docData.rapidocUuid });

      // 3. Retorna lista atualizada
      const snapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderNormalizado).get();
      const dependentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(201).json({ dependentes });
    } catch (error: any) {
      console.error('[DependenteController.adicionar] Erro inesperado', { message: error?.message });
      return res.status(500).json({ error: error.message || 'Erro ao adicionar dependente.' });
    }
  }

  static async editar(req: Request, res: Response) {
    try {
      const cpfParam = (req.params as any).cpf || (req.params as any).id;
      if (!cpfParam) {
        return res.status(400).json({ error: 'CPF do dependente não informado.' });
      }

      const { nome, birthDate, parentesco, holder, email, phone, zipCode, address, city, state, paymentType, serviceType, cpf, plans } = req.body;
      const paymentTypeNormalized = typeof paymentType === 'string' ? paymentType.trim().toUpperCase() : undefined;
      const safePaymentType = paymentTypeNormalized === 'S' || paymentTypeNormalized === 'A' ? paymentTypeNormalized : undefined;
      // Aceitar também alterações de 'parentesco' e 'holder' como válidas
      const hasAnyUpdateField = (
        (typeof nome === 'string' && nome.trim().length > 0) ||
        (typeof birthDate === 'string' && birthDate.trim().length > 0) ||
        (typeof email === 'string' && email.trim().length > 0) ||
        (typeof phone === 'string' && phone.trim().length > 0) ||
        (typeof zipCode === 'string' && zipCode.trim().length > 0) ||
        (typeof address === 'string' && address.trim().length > 0) ||
        (typeof city === 'string' && city.trim().length > 0) ||
        (typeof state === 'string' && state.trim().length > 0) ||
        (typeof paymentType === 'string' && paymentType.trim().length > 0) ||
        (typeof serviceType === 'string' && serviceType.trim().length > 0) ||
        (typeof cpf === 'string' && cpf.trim().length > 0) ||
        (Array.isArray(plans) && plans.length > 0) ||
        (typeof parentesco === 'string' && parentesco.trim().length > 0) ||
        (typeof holder === 'string' && holder.trim().length > 0)
      );
      if (!hasAnyUpdateField) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar informado.' });
      }

      // 1. Busca o dependente no Firestore pelo CPF
      const snapshot = await admin.firestore().collection('beneficiarios').where('cpf', '==', cpfParam).limit(1).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Dependente não encontrado.' });
      }
      const doc = snapshot.docs[0];
      if (!doc) {
        return res.status(404).json({ error: 'Dependente não encontrado.' });
      }
      const docRef = doc.ref;
      const dependente = doc.data();

      // 2. Obter rapidocUuid se estiver ausente
      let rapidocUuid: string | undefined = dependente?.rapidocUuid as string | undefined;
      if (!rapidocUuid) {
        
        try {
          const { RAPIDOC_BASE_URL, RAPIDOC_TOKEN, RAPIDOC_CLIENT_ID } = process.env as Record<string, string | undefined>;
          const urlCpf = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpfParam}`;
          const resp = await axios.get(urlCpf, {
            headers: {
              Authorization: `Bearer ${RAPIDOC_TOKEN}`,
              clientId: RAPIDOC_CLIENT_ID as string,
              'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
            }
          });
          if (resp.data && resp.data.success && resp.data.beneficiary && resp.data.beneficiary.uuid) {
            rapidocUuid = resp.data.beneficiary.uuid;
            await docRef.update({ rapidocUuid });
          } else {
            return res.status(400).json({ error: 'Dependente não possui rapidocUuid e não foi possível obter do Rapidoc.' });
          }
        } catch (err: any) {
          return res.status(400).json({ error: 'Dependente não possui rapidocUuid e não foi possível obter do Rapidoc.' });
        }
      }

      // Se houver campos que impactam o Rapidoc, busca dados atuais; caso contrário, pula atualização no Rapidoc
      const shouldUpdateRapidoc = (
        (typeof nome === 'string' && nome.trim().length > 0) ||
        (typeof birthDate === 'string' && birthDate.trim().length > 0) ||
        (typeof email === 'string' && email.trim().length > 0) ||
        (typeof phone === 'string' && phone.trim().length > 0) ||
        (typeof zipCode === 'string' && zipCode.trim().length > 0) ||
        (typeof address === 'string' && address.trim().length > 0) ||
        (typeof city === 'string' && city.trim().length > 0) ||
        (typeof state === 'string' && state.trim().length > 0) ||
        (typeof serviceType === 'string' && serviceType.trim().length > 0) ||
        (typeof cpf === 'string' && cpf.trim().length > 0) ||
        (Array.isArray(plans) && plans.length > 0)
      );

      // 3. Busca os dados atuais do beneficiário no Rapidoc
      const { RAPIDOC_BASE_URL, RAPIDOC_TOKEN, RAPIDOC_CLIENT_ID } = process.env as Record<string, string | undefined>;
      let atualRapidoc: any;
      if (shouldUpdateRapidoc) {
        try {
          const urlUuid = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${rapidocUuid}`;
          const respUuid = await axios.get(urlUuid, {
            headers: {
              Authorization: `Bearer ${RAPIDOC_TOKEN}`,
              clientId: RAPIDOC_CLIENT_ID as string,
              'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
            }
          });
          if (respUuid.data && respUuid.data.success && respUuid.data.beneficiary) {
            atualRapidoc = respUuid.data.beneficiary;
          }
        } catch (e: any) {
          console.warn('[DependenteController.editar] Falha no GET por UUID, tentando fallback CPF', { status: e?.response?.status });
        }

        // Fallback: tentar por CPF se não veio
        if (!atualRapidoc) {
          try {
            const urlCpf = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpfParam}`;
            const respCpf = await axios.get(urlCpf, {
              headers: {
                Authorization: `Bearer ${RAPIDOC_TOKEN}`,
                clientId: RAPIDOC_CLIENT_ID as string,
                'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
              }
            });
            if (respCpf.data && respCpf.data.success && respCpf.data.beneficiary) {
              atualRapidoc = respCpf.data.beneficiary;
              // Se uuid diferente, atualiza
              if (!rapidocUuid && atualRapidoc.uuid) {
                rapidocUuid = atualRapidoc.uuid;
                await docRef.update({ rapidocUuid });
              }
            }
          } catch (e: any) {
            return res.status(400).json({ error: 'Não foi possível obter dados atuais do Rapidoc (fallback CPF).', detail: e?.response?.data || null });
          }
        }

        if (!atualRapidoc) {
          return res.status(400).json({ error: 'Não foi possível obter dados atuais do Rapidoc.' });
        }
      }

      // 4. Monta o body do Rapidoc somente com campos enviados (evita erros de campos imutáveis/duplicados)
      const bodyRapidoc: any = { uuid: rapidocUuid };
      if (typeof nome === 'string' && nome.trim()) bodyRapidoc.name = nome.trim();
      if (typeof birthDate === 'string' && birthDate.trim()) bodyRapidoc.birthday = birthDate.trim();
      if (typeof email === 'string' && email.trim() && (shouldUpdateRapidoc ? (email.trim() !== (atualRapidoc?.email || '').trim()) : true)) bodyRapidoc.email = email.trim();
      // Sanitiza e valida phone: apenas dígitos e 11 caracteres
      if (typeof phone === 'string' && phone.trim()) {
        const justDigits = phone.replace(/\D/g, '');
        if (justDigits.length === 11) {
          bodyRapidoc.phone = justDigits;
        }
      }
      if (typeof zipCode === 'string' && zipCode.trim()) bodyRapidoc.zipCode = zipCode.trim();
      if (typeof address === 'string' && address.trim()) bodyRapidoc.address = address.trim();
      if (typeof city === 'string' && city.trim()) bodyRapidoc.city = city.trim();
      if (typeof state === 'string' && state.trim()) bodyRapidoc.state = state.trim();
      // Monta estrutura de planos (aceita via payload direto ou por serviceType/paymentType)
      if (Array.isArray(plans) && plans.length > 0) {
        bodyRapidoc.plans = plans;
      } else if (typeof serviceType === 'string' && serviceType.trim()) {
        const planEntry: any = { plan: { uuid: serviceType.trim() } };
        if (safePaymentType) planEntry.paymentType = safePaymentType;
        bodyRapidoc.plans = [planEntry];
      }
      if (typeof cpf === 'string' && cpf.trim()) bodyRapidoc.cpf = cpf.trim();

      // Sanitização extra: garantir que não exista paymentType fora de plans e validar valores
      if (Array.isArray(bodyRapidoc.plans)) {
        bodyRapidoc.plans = bodyRapidoc.plans
          .filter((p: any) => p && p.plan && typeof p.plan.uuid === 'string' && p.plan.uuid.trim().length > 0)
          .map((p: any) => {
            const out: any = { plan: { uuid: String(p.plan.uuid).trim() } };
            const pt = String(p.paymentType || '').trim().toUpperCase();
            if (pt === 'S' || pt === 'A') {
              out.paymentType = pt;
            }
            return out;
          });
        if (bodyRapidoc.plans.length === 0) delete bodyRapidoc.plans;
      }
      // Remover qualquer paymentType/serviceType solto, por segurança
      delete (bodyRapidoc as any).paymentType;
      delete (bodyRapidoc as any).serviceType;

      // Se nenhum plano foi enviado, não sobrepor nem validar paymentType
      if (!bodyRapidoc.plans) {
        delete (bodyRapidoc as any).plans;
      }
      

      // 5. Atualiza no Rapidoc somente se houver campos relevantes
      if (shouldUpdateRapidoc) {
        console.log('[DependenteController.editar] PUT Rapidoc body', JSON.stringify(bodyRapidoc));
        try {
          const rapidocResp = await atualizarBeneficiarioRapidoc(rapidocUuid as string, bodyRapidoc);
          if (!rapidocResp || rapidocResp.success === false) {
            
            return res.status(400).json({ error: rapidocResp?.message || 'Erro ao atualizar dependente no Rapidoc.', detail: rapidocResp });
          }
        } catch (e: any) {
          const status = e?.response?.status;
          const data = e?.response?.data;
          
          // Retry sem email se o erro for de email já em uso
          const emailInUse = Array.isArray(data?.errors) && data.errors.some((er: any) => typeof er?.description === 'string' && /email address already in use/i.test(er.description));
          if (emailInUse && bodyRapidoc.email) {
            
            const retryBody = { ...bodyRapidoc };
            delete (retryBody as any).email;
            try {
              const rapidocResp2 = await atualizarBeneficiarioRapidoc(rapidocUuid as string, retryBody);
              if (!rapidocResp2 || rapidocResp2.success === false) {
                
                return res.status(400).json({ error: rapidocResp2?.message || 'Erro ao atualizar dependente no Rapidoc.', detail: rapidocResp2, status });
              }
            } catch (e2: any) {
              const status2 = e2?.response?.status;
              const data2 = e2?.response?.data;
              
              return res.status(400).json({ error: 'Erro ao atualizar dependente no Rapidoc.', detail: data2 || data, status: status2 || status });
            }
          } else {
            return res.status(400).json({ error: 'Erro ao atualizar dependente no Rapidoc.', detail: data, status });
          }
        }
      }
      

      // 6. Atualiza no Firestore
      const holderFinal = holder || dependente.holder;
      
      const updatedFirestore: any = {
        nome: nome ?? dependente.nome,
        cpf: (typeof cpf === 'string' && cpf.trim()) ? cpf.trim() : (dependente.cpf ?? cpfParam),
        birthDate: birthDate ?? dependente.birthDate,
        parentesco: parentesco ?? dependente.parentesco,
        holder: holderFinal,
        email: email ?? dependente.email,
        // Atualiza phone no banco como foi enviado, mesmo que não tenha ido ao Rapidoc
        phone: phone ?? dependente.phone,
        zipCode: zipCode ?? dependente.zipCode,
        address: address ?? dependente.address,
        city: city ?? dependente.city,
        state: state ?? dependente.state,
        paymentType: paymentType ?? dependente.paymentType,
        serviceType: serviceType ?? dependente.serviceType,
        rapidocUuid,
        updatedAt: new Date(),
      };
      await docRef.update(updatedFirestore);

      // 7. Retorna lista atualizada
      
      const dependentesSnapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderFinal).get();
      const dependentes = dependentesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return res.status(200).json({ dependentes });
    } catch (error: any) {
      
      return res.status(500).json({ error: error.message || 'Erro ao editar dependente.' });
    }
  }

  // Atualiza apenas dados locais (Firestore), sem tocar Rapidoc
  static async atualizarLocal(req: Request, res: Response) {
    try {
      const cpfParam = (req.params as any).cpf || (req.params as any).id;
      if (!cpfParam) return res.status(400).json({ error: 'CPF do dependente não informado.' });

      const { nome, birthDate, parentesco, holder, email, phone, zipCode, address, city, state, paymentType, serviceType, cpf } = req.body;
      const hasAnyUpdateField = (
        (typeof nome === 'string' && nome.trim().length > 0) ||
        (typeof birthDate === 'string' && birthDate.trim().length > 0) ||
        (typeof parentesco === 'string' && parentesco.trim().length > 0) ||
        (typeof holder === 'string' && holder.trim().length > 0) ||
        (typeof email === 'string' && email.trim().length > 0) ||
        (typeof phone === 'string' && phone.trim().length > 0) ||
        (typeof zipCode === 'string' && zipCode.trim().length > 0) ||
        (typeof address === 'string' && address.trim().length > 0) ||
        (typeof city === 'string' && city.trim().length > 0) ||
        (typeof state === 'string' && state.trim().length > 0) ||
        (typeof paymentType === 'string' && paymentType.trim().length > 0) ||
        (typeof serviceType === 'string' && serviceType.trim().length > 0) ||
        (typeof cpf === 'string' && cpf.trim().length > 0)
      );
      if (!hasAnyUpdateField) return res.status(400).json({ error: 'Nenhum campo para atualizar informado.' });

      const snapshot = await admin.firestore().collection('beneficiarios').where('cpf', '==', cpfParam).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ error: 'Dependente não encontrado.' });
      const doc = snapshot.docs[0];
      if (!doc) return res.status(404).json({ error: 'Dependente não encontrado.' });
      const dependente = doc.data();
      const holderFinal = holder || dependente.holder;

      const updatedFirestore: any = {
        nome: nome ?? dependente.nome,
        cpf: (typeof cpf === 'string' && cpf.trim()) ? cpf.trim() : (dependente.cpf ?? cpfParam),
        birthDate: birthDate ?? dependente.birthDate,
        parentesco: parentesco ?? dependente.parentesco,
        holder: holderFinal,
        email: email ?? dependente.email,
        phone: phone ?? dependente.phone,
        zipCode: zipCode ?? dependente.zipCode,
        address: address ?? dependente.address,
        city: city ?? dependente.city,
        state: state ?? dependente.state,
        paymentType: paymentType ?? dependente.paymentType,
        serviceType: serviceType ?? dependente.serviceType,
        updatedAt: new Date(),
      };

      await doc.ref.update(updatedFirestore);

      const dependentesSnapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderFinal).get();
      const dependentes = dependentesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ dependentes });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao atualizar dependente (local).' });
    }
  }

  // Atualiza somente Rapidoc (e reflete no Firestore os campos enviados)
  static async atualizarRapidoc(req: Request, res: Response) {
    try {
      const cpfParam = (req.params as any).cpf || (req.params as any).id;
      if (!cpfParam) return res.status(400).json({ error: 'CPF do dependente não informado.' });

      const { email, phone, zipCode, address, city, state, paymentType, serviceType, cpf, plans } = req.body;
      const paymentTypeNormalized = typeof paymentType === 'string' ? paymentType.trim().toUpperCase() : undefined;
      const safePaymentType = paymentTypeNormalized === 'S' || paymentTypeNormalized === 'A' ? paymentTypeNormalized : undefined;

      const hasRapidocFields = (
        (typeof serviceType === 'string' && serviceType.trim().length > 0) ||
        (typeof email === 'string' && email.trim().length > 0) ||
        (typeof phone === 'string' && phone.trim().length > 0) ||
        (typeof zipCode === 'string' && zipCode.trim().length > 0) ||
        (typeof address === 'string' && address.trim().length > 0) ||
        (typeof city === 'string' && city.trim().length > 0) ||
        (typeof state === 'string' && state.trim().length > 0) ||
        (typeof cpf === 'string' && cpf.trim().length > 0) ||
        (Array.isArray(plans) && plans.length > 0)
      );
      if (!hasRapidocFields) return res.status(400).json({ error: 'Nenhum campo para atualizar no Rapidoc informado.' });

      const snapshot = await admin.firestore().collection('beneficiarios').where('cpf', '==', cpfParam).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ error: 'Dependente não encontrado.' });
      const doc = snapshot.docs[0];
      if (!doc) return res.status(404).json({ error: 'Dependente não encontrado.' });
      const dependente = doc.data();

      let rapidocUuid: string | undefined = dependente?.rapidocUuid as string | undefined;
      if (!rapidocUuid) {
        try {
          const { RAPIDOC_BASE_URL, RAPIDOC_TOKEN, RAPIDOC_CLIENT_ID } = process.env as Record<string, string | undefined>;
          const urlCpf = `${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpfParam}`;
          const resp = await axios.get(urlCpf, {
            headers: {
              Authorization: `Bearer ${RAPIDOC_TOKEN}`,
              clientId: RAPIDOC_CLIENT_ID as string,
              'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
            }
          });
          if (resp.data && resp.data.success && resp.data.beneficiary && resp.data.beneficiary.uuid) {
            rapidocUuid = resp.data.beneficiary.uuid;
            if (doc) {
              await doc.ref.update({ rapidocUuid });
            }
          } else {
            return res.status(400).json({ error: 'Dependente não possui rapidocUuid e não foi possível obter do Rapidoc.' });
          }
        } catch (err: any) {
          return res.status(400).json({ error: 'Dependente não possui rapidocUuid e não foi possível obter do Rapidoc.' });
        }
      }

      const bodyRapidoc: any = { uuid: rapidocUuid };
      if (typeof email === 'string' && email.trim()) bodyRapidoc.email = email.trim();
      if (typeof phone === 'string' && phone.trim()) {
        const justDigits = phone.replace(/\D/g, '');
        if (justDigits.length === 11) bodyRapidoc.phone = justDigits;
      }
      if (typeof zipCode === 'string' && zipCode.trim()) bodyRapidoc.zipCode = zipCode.trim();
      if (typeof address === 'string' && address.trim()) bodyRapidoc.address = address.trim();
      if (typeof city === 'string' && city.trim()) bodyRapidoc.city = city.trim();
      if (typeof state === 'string' && state.trim()) bodyRapidoc.state = state.trim();
      if (typeof cpf === 'string' && cpf.trim()) bodyRapidoc.cpf = cpf.trim();

      if (Array.isArray(plans) && plans.length > 0) {
        bodyRapidoc.plans = plans;
      } else if (typeof serviceType === 'string' && serviceType.trim()) {
        const planEntry: any = { plan: { uuid: serviceType.trim() } };
        if (safePaymentType) planEntry.paymentType = safePaymentType;
        bodyRapidoc.plans = [planEntry];
      }

      if (Array.isArray(bodyRapidoc.plans)) {
        bodyRapidoc.plans = bodyRapidoc.plans
          .filter((p: any) => p && p.plan && typeof p.plan.uuid === 'string' && p.plan.uuid.trim().length > 0)
          .map((p: any) => {
            const out: any = { plan: { uuid: String(p.plan.uuid).trim() } };
            const pt = String(p.paymentType || '').trim().toUpperCase();
            if (pt === 'S' || pt === 'A') out.paymentType = pt;
            return out;
          });
        if (bodyRapidoc.plans.length === 0) delete bodyRapidoc.plans;
      }
      delete (bodyRapidoc as any).paymentType;
      delete (bodyRapidoc as any).serviceType;

      if (!bodyRapidoc.plans && typeof serviceType === 'string' && !serviceType.trim()) {
        delete (bodyRapidoc as any).plans;
      }

      console.log('[DependenteController.atualizarRapidoc] PUT Rapidoc body', JSON.stringify(bodyRapidoc));

      // Controla fallback e mensagens
      let warning: string | undefined;
      let nextPaymentType = safePaymentType ?? dependente.paymentType;
      let nextServiceType = serviceType ?? dependente.serviceType;

      try {
        const rapidocResp = await atualizarBeneficiarioRapidoc(rapidocUuid as string, bodyRapidoc);
        if (!rapidocResp || rapidocResp.success === false) {
          return res.status(400).json({ error: rapidocResp?.message || 'Erro ao atualizar dependente no Rapidoc.', detail: rapidocResp });
        }
      } catch (e: any) {
        const status = e?.response?.status;
        const data = e?.response?.data;
        const messageStr = String(data?.message || data?.error || '').toLowerCase();

        const planNotAllowed = status === 422 && bodyRapidoc.plans && /plano.*(não contempla|nao contempla)/i.test(messageStr);
        const emailInUse = Array.isArray(data?.errors) && data.errors.some((er: any) => typeof er?.description === 'string' && /email address already in use/i.test(er.description));

        if (planNotAllowed) {
          const retryBody = { ...bodyRapidoc };
          delete (retryBody as any).plans;
          try {
            const rapidocResp2 = await atualizarBeneficiarioRapidoc(rapidocUuid as string, retryBody);
            if (!rapidocResp2 || rapidocResp2.success === false) {
              return res.status(400).json({ error: rapidocResp2?.message || 'Erro ao atualizar dependente no Rapidoc.', detail: rapidocResp2, status });
            }
            warning = data?.message || 'Plano não atualizado no Rapidoc (não contemplado pelo cliente).';
            // Mantém paymentType/serviceType atuais do banco quando o plano é rejeitado
            nextPaymentType = dependente.paymentType;
            nextServiceType = dependente.serviceType;
          } catch (e2: any) {
            const status2 = e2?.response?.status;
            const data2 = e2?.response?.data;
            return res.status(status2 || status || 400).json({ error: 'Erro ao atualizar dependente no Rapidoc.', detail: data2 || data, status: status2 || status });
          }
        } else if (emailInUse && bodyRapidoc.email) {
          const retryBody = { ...bodyRapidoc };
          delete (retryBody as any).email;
          try {
            const rapidocResp2 = await atualizarBeneficiarioRapidoc(rapidocUuid as string, retryBody);
            if (!rapidocResp2 || rapidocResp2.success === false) {
              return res.status(400).json({ error: rapidocResp2?.message || 'Erro ao atualizar dependente no Rapidoc.', detail: rapidocResp2, status });
            }
            warning = 'Email não atualizado no Rapidoc (já está em uso).';
          } catch (e2: any) {
            const status2 = e2?.response?.status;
            const data2 = e2?.response?.data;
            return res.status(status2 || status || 400).json({ error: 'Erro ao atualizar dependente no Rapidoc.', detail: data2 || data, status: status2 || status });
          }
        } else {
          return res.status(status || 400).json({ error: 'Erro ao atualizar dependente no Rapidoc.', detail: data, status });
        }
      }

      // Reflete no Firestore os campos enviados (com fallback aplicado)
      const holderFinal = dependente.holder;
      const updatedFirestore: any = {
        email: email ?? dependente.email,
        phone: phone ?? dependente.phone,
        zipCode: zipCode ?? dependente.zipCode,
        address: address ?? dependente.address,
        city: city ?? dependente.city,
        state: state ?? dependente.state,
        paymentType: nextPaymentType,
        serviceType: nextServiceType,
        rapidocUuid,
        updatedAt: new Date(),
      };
      if (typeof cpf === 'string' && cpf.trim()) updatedFirestore.cpf = cpf.trim();
      await doc.ref.update(updatedFirestore);

      const dependentesSnapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderFinal).get();
      const dependentes = dependentesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ dependentes, warning });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao atualizar dependente no Rapidoc.' });
    }
  }

  static async listarPorTitular(req: Request, res: Response) {
    try {
      const { cpf } = req.params;
      const snapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', cpf).get();
      const dependentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ dependentes });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao listar dependentes.' });
    }
  }
}