import { cadastrarBeneficiarioRapidoc, atualizarBeneficiarioRapidoc } from '../services/rapidoc.service.js';
import admin from 'firebase-admin';
import type { Request, Response } from 'express';
import axios from 'axios';

export class DependenteController {
  static async adicionar(req: Request, res: Response) {
    try {
      // 1. Extração dos dados
      const { 
        nome, 
        cpf, 
        birthDate, 
        parentesco, 
        holder, 
        email, 
        phone, 
        zipCode, 
        address, 
        city, 
        state, 
        paymentType, 
        serviceType, 
        plans 
      } = req.body;

      console.log('[DependenteController.adicionar] Início', { 
        nome, 
        hasCpf: !!cpf, 
        birthDate, 
        holder 
      });

      // 2. Sanitização Básica
      const cpfNormalizado = typeof cpf === 'string' ? cpf.replace(/\D/g, '') : '';
      const holderNormalizado = typeof holder === 'string' ? holder.replace(/\D/g, '') : '';
      const phoneDigits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';

      // 3. Validações Obrigatórias
      if (!nome || !cpfNormalizado || !birthDate || !holderNormalizado) {
        return res.status(400).json({ error: 'Campos obrigatórios (nome, cpf, birthDate, holder) não informados.' });
      }

      if (typeof nome === 'string' && nome.trim().split(' ').length < 2) {
        return res.status(400).json({ 
          error: 'Nome inválido. É necessário informar o nome completo (Nome e Sobrenome) para o cadastro.' 
        });
      }

      // 4. Montagem dos Planos
      const plansNormalizados: Array<{ paymentType: string; plan: { uuid: string } }> = Array.isArray(plans)
        ? plans
          .filter((p: any) => p && p.plan && typeof p.plan.uuid === 'string')
          .map((p: any) => ({
            plan: { uuid: String(p.plan.uuid).trim() },
            paymentType: p.paymentType ? String(p.paymentType).trim().toUpperCase() : 'S',
          }))
        : [];

      if (plansNormalizados.length === 0 && (serviceType || paymentType)) {
        if (serviceType) {
            plansNormalizados.push({
                plan: { uuid: String(serviceType).trim() },
                paymentType: paymentType ? String(paymentType).trim().toUpperCase() : 'S'
            });
        }
      }

      // 5. Preparação do Payload para o Service Rapidoc
      const rapidocPayload = {
        nome: nome.trim(),
        cpf: cpfNormalizado,
        birthday: birthDate,
        email,
        phone: phoneDigits,
        zipCode,
        address,
        city,
        state,
        holder: holderNormalizado,
        plans: plansNormalizados
      };

      console.log('[DependenteController.adicionar] Payload para Service:', JSON.stringify(rapidocPayload));

      // 6. Chamada ao Rapidoc Service
      const rapidocResp = await cadastrarBeneficiarioRapidoc(rapidocPayload);
      
      console.log('[DependenteController.adicionar] Resposta Bruta Rapidoc:', JSON.stringify(rapidocResp));

      // Normalização da resposta (pode ser array ou objeto)
      const rapidocObj = Array.isArray(rapidocResp) ? rapidocResp[0] : rapidocResp;

      if (rapidocObj && rapidocObj.success === false) {
         return res.status(400).json({ 
             error: rapidocObj.message || 'Erro lógico ao criar dependente no Rapidoc.',
             details: rapidocObj 
         });
      }

      // --- LÓGICA DE EXTRAÇÃO DO UUID CORRIGIDA ---
      let uuidGerado = rapidocObj?.uuid;

      // Caso 1: Estrutura { beneficiary: { uuid: ... } } (Singular)
      if (!uuidGerado && rapidocObj?.beneficiary?.uuid) {
          uuidGerado = rapidocObj.beneficiary.uuid;
      }
      
      // Caso 2: Estrutura { beneficiaries: [ { uuid: ... } ] } (Plural - Array) -> SEU CASO ATUAL
      if (!uuidGerado && Array.isArray(rapidocObj?.beneficiaries) && rapidocObj.beneficiaries.length > 0) {
          uuidGerado = rapidocObj.beneficiaries[0].uuid;
      }

      // Caso 3: Estrutura antiga ou alternativa { data: { uuid: ... } }
      if (!uuidGerado && rapidocObj?.data?.uuid) {
          uuidGerado = rapidocObj.data.uuid;
      }

      if (!uuidGerado) {
          console.warn('[DependenteController.adicionar] ATENÇÃO: UUID não encontrado na resposta do Rapidoc. Estrutura recebida:', Object.keys(rapidocObj || {}));
      }

      // 7. Salva no Firestore
      const docData: any = {
        nome,
        cpf: cpfNormalizado,
        birthDate,
        parentesco: parentesco || null,
        holder: holderNormalizado,
        email: email || null,
        phone: phoneDigits || null,
        zipCode: zipCode || null,
        address: address || null,
        city: city || null,
        state: state || null,
        paymentType: plansNormalizados[0]?.paymentType || paymentType || null,
        serviceType: plansNormalizados[0]?.plan?.uuid || serviceType || null,
        rapidocUuid: uuidGerado || null, 
        createdAt: new Date(),
      };
      
      Object.keys(docData).forEach(key => docData[key] === undefined && delete docData[key]);

      const createdRef = await admin.firestore().collection('beneficiarios').add(docData);
      console.log('[DependenteController.adicionar] Documento criado no Firestore:', createdRef.id, 'com UUID Rapidoc:', uuidGerado);

      // 8. Retorna lista atualizada
      const snapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderNormalizado).get();
      const dependentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return res.status(201).json({ dependentes });

    } catch (error: any) {
      console.error('[DependenteController.adicionar] Erro:', error);

      if (error.response) {
        const status = error.response.status || 500;
        const data = error.response.data || {};
        return res.status(status).json({ 
            error: data.message || data.error || error.message, 
            details: data 
        });
      }

      return res.status(500).json({ error: error.message || 'Erro interno ao adicionar dependente.' });
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
      // @ts-ignore
      const docRef = doc.ref;
      // @ts-ignore
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
          }
        } catch (err: any) {
          console.warn('Não foi possível recuperar UUID do Rapidoc para edição');
        }
      }

      // Se houver campos que impactam o Rapidoc, busca dados atuais
      const shouldUpdateRapidoc = (
        rapidocUuid && (
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
        )
      );

      if (shouldUpdateRapidoc && rapidocUuid) {
        const updateData: any = {};
        if (nome) updateData.name = nome;
        if (birthDate) updateData.birthday = birthDate;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone.replace(/\D/g, '');
        if (zipCode) updateData.zipCode = zipCode;
        if (address) updateData.address = address;
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (cpf) updateData.cpf = cpf;

        if (Array.isArray(plans) && plans.length > 0) {
            updateData.plans = plans;
        } else if (typeof serviceType === 'string' && serviceType.trim()) {
            const planEntry: any = { plan: { uuid: serviceType.trim() } };
            if (safePaymentType) planEntry.paymentType = safePaymentType;
            updateData.plans = [planEntry];
        }

        try {
          await atualizarBeneficiarioRapidoc(rapidocUuid, updateData);
        } catch (e: any) {
           console.error('[DependenteController.editar] Erro ao atualizar Rapidoc:', e?.response?.data || e.message);
           if (e?.response?.status === 422) {
             return res.status(422).json({ error: 'Erro de validação no Rapidoc', detail: e.response.data });
           }
        }
      }

      // 6. Atualiza no Firestore
      const holderFinal = holder || dependente.holder;
      
      const updatedFirestore: any = {
        nome: nome ?? dependente.nome,
        cpf: (typeof cpf === 'string' && cpf.trim()) ? cpf.trim() : (dependente.cpf ?? cpfParam),
        birthDate: birthDate ?? dependente.birthDate,
        parentesco: parentesco ?? dependente.parentesco ?? null,
        holder: holderFinal,
        email: email ?? dependente.email,
        phone: phone ?? dependente.phone ?? null,
        zipCode: zipCode ?? dependente.zipCode ?? null,
        address: address ?? dependente.address ?? null,
        city: city ?? dependente.city ?? null,
        state: state ?? dependente.state ?? null,
        paymentType: paymentType ?? dependente.paymentType ?? null,
        serviceType: serviceType ?? dependente.serviceType ?? null,
        rapidocUuid,
        updatedAt: new Date(),
      };
      
      Object.keys(updatedFirestore).forEach(key => updatedFirestore[key] === undefined && delete updatedFirestore[key]);

      await docRef.update(updatedFirestore);

      // 7. Retorna lista atualizada
      const dependentesSnapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderFinal).get();
      const dependentesLista = dependentesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      return res.status(200).json({ dependentes: dependentesLista });
    } catch (error: any) {
      console.error('[DependenteController.editar] Erro:', error);
      return res.status(500).json({ error: error.message || 'Erro ao editar dependente.' });
    }
  }

  // Métodos auxiliares
  static async atualizarLocal(req: Request, res: Response) {
      return res.status(501).json({error: 'Método não implementado nesta versão.'});
  }

  static async atualizarRapidoc(req: Request, res: Response) {
      return res.status(501).json({error: 'Método não implementado nesta versão.'});
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