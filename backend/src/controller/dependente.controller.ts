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

      // ==================================================================================
      // VERIFICAÇÃO DE LIMITE DE DEPENDENTES POR PLANO
      // ==================================================================================
      const db = admin.firestore();

      // A) Buscar dados do titular para descobrir o plano
      const usuariosRef = db.collection('usuarios');
      const qUsuario = await usuariosRef.where('cpf', 'in', [holderNormalizado, req.body.holder]).limit(1).get();
      
      let limiteDependentes = 0; // Padrão restritivo (Individual = 0 dependentes)
      let nomePlano = 'Não identificado (Individual)';

      console.log('[DependenteController.adicionar] Buscando usuário com CPF:', { holderNormalizado, reqHolderBody: req.body.holder, usuariosEncontrados: qUsuario.size });

      if (!qUsuario.empty) {
          const usuarioDoc = qUsuario.docs?.[0];
          const usuarioData = usuarioDoc?.data();
          console.log('[DependenteController.adicionar] Dados do usuário encontrados:', { planoId: usuarioData?.planoId, usuarioId: usuarioDoc?.id });
          
          if (!usuarioData) {
              console.warn('[DependenteController] Usuário encontrado mas sem dados válidos');
          } else {
              let planoId = usuarioData.planoId;

              // Se não tem planoId, tenta buscar via assinatura ativa
              if (!planoId) {
                  console.log('[DependenteController] planoId não encontrado no usuário, buscando via assinaturas...');
                  try {
                      // Busca a assinatura ativa do usuário
                      const assinaturasRef = db.collection('assinaturas');
                      const qAssinatura = await assinaturasRef
                          .where('cpf', '==', holderNormalizado)
                          .where('status', 'in', ['ACTIVE', 'PENDING', 'ONGOING']) // Status ativo/pendente
                          .limit(1)
                          .get();
                      
                      if (!qAssinatura.empty) {
                          const assinaturaDoc = qAssinatura.docs?.[0];
                          const assinaturaData = assinaturaDoc?.data();
                          planoId = assinaturaData?.planoId || assinaturaData?.planId;
                          console.log('[DependenteController] PlanoId encontrado via assinatura:', planoId);
                      } else {
                          console.warn('[DependenteController] Nenhuma assinatura ativa encontrada para CPF:', holderNormalizado);
                      }
                  } catch (e) {
                      console.error('[DependenteController] Erro ao buscar assinaturas:', e);
                  }
              }

              if (planoId) {
                  const planoDoc = await db.collection('planos').doc(planoId).get();
                  console.log('[DependenteController.adicionar] Plano buscado:', { planoId, planoExists: planoDoc.exists });
                  
                  if (planoDoc.exists) {
                      const planoData = planoDoc.data() || {};
                      // Normaliza o nome para verificação
                      const nomePlanoLower = (planoData.nome || planoData.descricao || planoData.tipo || '').toLowerCase();
                      const descricaoLower = (planoData.descricao || '').toLowerCase();
                      
                      nomePlano = planoData.nome || planoData.tipo || planoData.descricao || 'Plano Personalizado';

                      // Prioridade 1: Campo explícito no banco 'maxDependentes'
                      if (planoData.maxDependentes !== undefined && planoData.maxDependentes !== null) {
                          limiteDependentes = Number(planoData.maxDependentes);
                          console.log('[DependenteController] Limite via maxDependentes:', limiteDependentes);
                      } 
                      // Prioridade 2: Campo 'maxBeneficiaries' (Total de vidas). Dependentes = Total - 1 (Titular)
                      else if (planoData.maxBeneficiaries !== undefined && planoData.maxBeneficiaries !== null) {
                          limiteDependentes = Number(planoData.maxBeneficiaries) - 1;
                          if (limiteDependentes < 0) limiteDependentes = 0;
                          console.log('[DependenteController] Limite via maxBeneficiaries:', { maxBeneficiaries: planoData.maxBeneficiaries, limiteDependentes });
                      }
                      // Prioridade 3: Inferência pelo nome (Regra de Negócio do Cliente)
                      else {
                          if (nomePlanoLower.includes('familiar') || nomePlanoLower.includes('família') || descricaoLower.includes('família')) {
                              limiteDependentes = 3; // Familiar = 3 dependentes
                          } else if (nomePlanoLower.includes('casal') || descricaoLower.includes('casal')) {
                              limiteDependentes = 1; // Casal = 1 dependente
                          } else {
                              limiteDependentes = 0; // Individual = 0 dependentes
                          }
                          console.log('[DependenteController] Limite via inferência de nome:', { nomePlano, limiteDependentes });
                      }
                  } else {
                      console.warn('[DependenteController] Plano com ID não encontrado na coleção:', planoId);
                  }
              } else {
                  console.warn('[DependenteController] Não foi possível encontrar planoId via usuário ou assinatura');
              }
          }
      } else {
          console.warn('[DependenteController] Nenhum usuário encontrado com CPF:', { holderNormalizado, reqHolderBody: req.body.holder });
      }

      // B) Contar quantos dependentes ativos este titular já tem
      const beneficiariosRef = db.collection('beneficiarios');
      const snapshotDep = await beneficiariosRef.where('holder', 'in', [holderNormalizado, req.body.holder]).get();
      
      // Filtra para garantir que não estamos contando o próprio titular se ele estiver nesta coleção
      // e garante que contamos apenas CPFs únicos (caso haja sujeira no banco)
      const cpfsDependentes = new Set<string>();
      snapshotDep.docs.forEach(doc => {
          const dados = doc.data();
          const cpfDep = String(dados.cpf || '').replace(/\D/g, '');
          // Só conta se o CPF for válido e DIFERENTE do titular
          if (cpfDep && cpfDep !== holderNormalizado) {
              cpfsDependentes.add(cpfDep);
          }
      });

      const quantidadeAtual = cpfsDependentes.size;

      console.log(`[DependenteController] Verificação Limite: Plano="${nomePlano}", Limite=${limiteDependentes}, Atual=${quantidadeAtual}`);

      if (quantidadeAtual >= limiteDependentes) {
          return res.status(403).json({ 
              error: `O seu plano (${nomePlano}) permite no máximo ${limiteDependentes} dependente(s). Você já possui ${quantidadeAtual}. Faça um upgrade para adicionar mais.`,
              limit: limiteDependentes,
              current: quantidadeAtual
          });
      }
      // ==================================================================================

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

      const { nome, birthDate, parentesco, holder, email, phone, zipCode, address, city, state, paymentType, serviceType, plans } = req.body;
      
      // Validação básica se veio algo para atualizar
      const hasUpdates = [nome, birthDate, email, phone, zipCode, address, city, state, paymentType, serviceType, plans, parentesco].some(v => v !== undefined && v !== '');
      if (!hasUpdates) return res.status(400).json({ error: 'Nenhum campo para atualizar informado.' });

      // 1. Busca o dependente no Firestore pelo CPF
      const snapshot = await admin.firestore().collection('beneficiarios').where('cpf', '==', cpfParam).limit(1).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Dependente não encontrado no sistema.' });
      }
      const doc = snapshot.docs[0];
      // @ts-ignore
      const dependente = doc.data();
      let rapidocUuid = dependente.rapidocUuid;

      // 2. Se não tem UUID, tenta recuperar do Rapidoc via CPF
      if (!rapidocUuid) {
        try {
          const { RAPIDOC_BASE_URL, RAPIDOC_TOKEN, RAPIDOC_CLIENT_ID } = process.env as Record<string, string | undefined>;
          const resp = await axios.get(`${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${cpfParam}`, {
             headers: { Authorization: `Bearer ${RAPIDOC_TOKEN}`, clientId: RAPIDOC_CLIENT_ID as string, 'Content-Type': 'application/vnd.rapidoc.tema-v2+json' }
          });
          const data = resp.data;
          rapidocUuid = data?.beneficiary?.uuid || (Array.isArray(data?.beneficiaries) ? data.beneficiaries[0]?.uuid : null) || data?.uuid;
          
      // @ts-ignore
          if (rapidocUuid) await doc.ref.update({ rapidocUuid });
        } catch (e) {
          console.warn('[DependenteController.editar] Não foi possível recuperar UUID externo.');
        }
      }

      // 3. Atualiza no Rapidoc (se tiver UUID)
      if (rapidocUuid) {
        const rapidocBody: any = { uuid: rapidocUuid };
        
        // Mapeamento e lógica para evitar envio duplicado de email
        if (nome) rapidocBody.name = nome;
        if (birthDate) rapidocBody.birthday = birthDate;
        
        // CORREÇÃO: Só envia o email se ele for diferente do que está no banco
        // Isso evita o erro "Email address already in use" se o usuário não trocou o email
        if (email && email.trim() !== (dependente.email || '').trim()) {
            rapidocBody.email = email.trim();
        }

        if (phone) rapidocBody.phone = phone.replace(/\D/g, '');
        if (zipCode) rapidocBody.zipCode = zipCode;
        if (address) rapidocBody.address = address;
        if (city) rapidocBody.city = city;
        if (state) rapidocBody.state = state;

        // Lógica de Planos e Pagamento
        if (Array.isArray(plans) && plans.length > 0) {
            rapidocBody.plans = plans;
        } else if (serviceType && serviceType.trim()) {
            // Só monta o plano se serviceType for válido
            const pt = paymentType ? String(paymentType).trim().toUpperCase() : 'S';
            if (pt === 'S' || pt === 'A') {
                rapidocBody.plans = [{
                    plan: { uuid: serviceType.trim() },
                    paymentType: pt
                }];
            }
        }

        try {
           console.log('[DependenteController.editar] Atualizando Rapidoc:', JSON.stringify(rapidocBody));
           await atualizarBeneficiarioRapidoc(rapidocUuid, rapidocBody);
        } catch (e: any) {
           console.error('[DependenteController.editar] Erro Rapidoc:', e.response?.data || e.message);
           // Retorna erro se for 422 (validação) ou 400
           if (e.response && (e.response.status === 422 || e.response.status === 400)) {
               return res.status(e.response.status).json({ 
                   error: 'Erro de validação no Rapidoc', 
                   details: e.response.data 
               });
           }
        }
      }

      // 4. Atualiza no Firestore
      const holderFinal = holder || dependente.holder;
      
      const updateLocal: any = {
        nome: nome ?? dependente.nome,
        birthDate: birthDate ?? dependente.birthDate,
        email: email ?? dependente.email,
        phone: phone ?? dependente.phone ?? null,
        zipCode: zipCode ?? dependente.zipCode ?? null,
        address: address ?? dependente.address ?? null,
        city: city ?? dependente.city ?? null,
        state: state ?? dependente.state ?? null,
        parentesco: parentesco ?? dependente.parentesco ?? null,
        paymentType: paymentType ?? dependente.paymentType ?? null,
        serviceType: serviceType ?? dependente.serviceType ?? null,
        rapidocUuid: rapidocUuid || dependente.rapidocUuid || null,
        updatedAt: new Date()
      };

      Object.keys(updateLocal).forEach(key => updateLocal[key] === undefined && delete updateLocal[key]);

      // @ts-ignore
      await doc.ref.update(updateLocal);

      // 5. Retorna lista atualizada
      const listaSnapshot = await admin.firestore().collection('beneficiarios').where('holder', '==', holderFinal).get();
      const lista = listaSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      return res.status(200).json({ dependentes: lista });

    } catch (error: any) {
      console.error('[DependenteController.editar] Erro Geral:', error);
      return res.status(500).json({ error: error.message || 'Erro ao editar dependente.' });
    }
  }
  
  // Métodos auxiliares para rotas específicas (mantidos para compatibilidade, mas o editar acima cobre tudo)
  static async atualizarLocal(req: Request, res: Response) { return DependenteController.editar(req, res); }
  static async atualizarRapidoc(req: Request, res: Response) { return DependenteController.editar(req, res); }

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