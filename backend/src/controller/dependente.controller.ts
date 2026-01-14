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

      console.log('--- [DependenteController.adicionar] INÍCIO ---');
      console.log('Dados recebidos:', { nome, cpf, holder });

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
      // NOVA LÓGICA: VERIFICAÇÃO DE LIMITE DE DEPENDENTES POR PLANO (COM DEBUG)
      // ==================================================================================
      const db = admin.firestore();

      // A) Buscar dados do titular para descobrir o plano
      const usuariosRef = db.collection('usuarios');
      // Busca flexível pelo CPF do titular
      const qUsuario = await usuariosRef.where('cpf', 'in', [holderNormalizado, req.body.holder]).limit(1).get();
      
      let limiteDependentes = 0; // Começa bloqueado por segurança
      let nomePlano = 'Plano Desconhecido';
      let planoEncontrado = false;

      if (!qUsuario.empty) {
          const usuarioDoc = qUsuario.docs?.[0];
          const usuarioData = usuarioDoc?.data();
          let planoId = usuarioData?.planoId;
          
          console.log(`[DEBUG] Usuário encontrado. PlanoId no usuário: "${planoId}"`);

          // Se não tem planoId no usuário, busca na assinatura ativa
          if (!planoId) {
              console.log('[DEBUG] planoId não encontrado no usuário. Buscando via assinaturas...');
              try {
                  const assinaturasRef = db.collection('assinaturas');
                  
                  // CORREÇÃO: O campo é cpfUsuario, não cpf
                  let qAssinatura = await assinaturasRef
                      .where('cpfUsuario', '==', holderNormalizado)
                      .limit(1)
                      .get();
                  
                  if (!qAssinatura.empty) {
                      const assinaturaData = qAssinatura.docs?.[0]?.data();
                      planoId = assinaturaData?.planoId;
                      console.log('[DEBUG] PlanoId encontrado via assinatura:', planoId);
                      console.log('[DEBUG] Dados completos da assinatura:', {
                          ciclo: assinaturaData?.ciclo,
                          formaPagamento: assinaturaData?.formaPagamento,
                          planoId: assinaturaData?.planoId
                      });
                  } else {
                      console.warn('[DEBUG] Nenhuma assinatura encontrada para CPF:', holderNormalizado);
                  }
              } catch (e) {
                  console.error('[DEBUG] Erro ao buscar assinaturas:', e);
              }
          }

          if (planoId) {
              let planoDoc = await db.collection('planos').doc(planoId).get();
              let planoData = planoDoc.exists ? planoDoc.data() : null;

              // TENTATIVA DE FALLBACK: Se não achar pelo ID direto, busca por chave interna
              if (!planoDoc.exists) {
                  console.log(`[DEBUG] Plano não encontrado pelo ID direto. Tentando buscar por internalPlanKey...`);
                  const qPlanoKey = await db.collection('planos').where('internalPlanKey', '==', planoId).limit(1).get();
                  if (!qPlanoKey.empty) {
                      const planoDocTemp = qPlanoKey.docs?.[0];
                      if (planoDocTemp) {
                          planoDoc = planoDocTemp as any;
                              planoData = planoDoc.data();
                          console.log(`[DEBUG] Plano recuperado via internalPlanKey.`);
                      }
                  }
              }

              if (planoData) {
                  planoEncontrado = true;
                  nomePlano = planoData.nome || planoData.descricao || planoData.tipo || 'Plano Personalizado';
                  
                  // LOG DO JSON DO PLANO PARA VOCÊ CONFERIR NO TERMINAL
                  console.log('[DEBUG] Dados do Plano Carregado:', JSON.stringify(planoData, null, 2));

                  // REGRA 1: Procura maxBeneficiaries na RAIZ ou dentro de beneficiaryConfig
                  const maxBeneficiariesRoot = planoData.maxBeneficiaries;
                  const maxBeneficiariesConfig = planoData.beneficiaryConfig?.maxBeneficiaries;
                  
                  // Prioriza o que estiver definido
                  let totalVidas = undefined;
                  if (maxBeneficiariesRoot !== undefined) totalVidas = Number(maxBeneficiariesRoot);
                  else if (maxBeneficiariesConfig !== undefined) totalVidas = Number(maxBeneficiariesConfig);

                  // Se achou um número válido
                  if (totalVidas !== undefined && !isNaN(totalVidas)) {
                      // O campo maxBeneficiaries geralmente inclui o titular.
                      // Então Dependentes = Total - 1
                      // SE o seu banco considera maxBeneficiaries APENAS como dependentes, remova o "- 1" abaixo.
                      // Baseado no seu JSON (4 vidas), assumo que seja 1 titular + 3 dependentes.
                      limiteDependentes = totalVidas > 0 ? totalVidas - 1 : 0; 
                      console.log(`[DEBUG] Limite calculado via maxBeneficiaries (${totalVidas}) - 1 titular = ${limiteDependentes} dependentes.`);
                  } 
                  else {
                      // REGRA 2: Inferência (Fallback)
                      console.log('[DEBUG] Campo maxBeneficiaries não encontrado. Usando inferência por nome.');
                      const nomeLower = (nomePlano || '').toLowerCase();
                      if (nomeLower.includes('familiar') || nomeLower.includes('família')) {
                          limiteDependentes = 3; 
                      } else if (nomeLower.includes('casal')) {
                          limiteDependentes = 1; 
                      } else {
                          limiteDependentes = 0; // Individual
                      }
                  }
              } else {
                  console.log('[DEBUG] Documento do plano não encontrado no Firestore.');
              }
          } else {
              console.log('[DEBUG] Campo planoId está vazio no cadastro do usuário.');
          }
      } else {
          console.log('[DEBUG] Usuário titular não encontrado no banco de dados.');
      }

      // B) Contar quantos dependentes ativos este titular já tem
      const beneficiariosRef = db.collection('beneficiarios');
      const snapshotDep = await beneficiariosRef.where('holder', 'in', [holderNormalizado, req.body.holder]).get();
      
      const cpfsDependentes = new Set<string>();
      snapshotDep.docs.forEach(doc => {
          const dados = doc.data();
          const cpfDep = String(dados.cpf || '').replace(/\D/g, '');
          if (cpfDep && cpfDep !== holderNormalizado) {
              cpfsDependentes.add(cpfDep);
          }
      });

      const quantidadeAtual = cpfsDependentes.size;

      console.log(`--- [RESUMO DA TRAVA] ---`);
      console.log(`Plano: ${nomePlano}`);
      console.log(`Limite Permitido: ${limiteDependentes}`);
      console.log(`Dependentes Atuais: ${quantidadeAtual}`);
      console.log(`Pode Adicionar? ${quantidadeAtual < limiteDependentes ? 'SIM' : 'NÃO'}`);
      console.log('-------------------------');

      if (planoEncontrado && quantidadeAtual >= limiteDependentes) {
          return res.status(403).json({ 
              error: `Seu plano (${nomePlano}) atingiu o limite de ${limiteDependentes} dependente(s).`,
              details: { limit: limiteDependentes, current: quantidadeAtual }
          });
      }
      
      // Se plano não foi encontrado, mas o usuário existe, talvez liberar ou bloquear? 
      // Por segurança, se não achou o plano, o limite ficou 0, então vai bloquear abaixo.
      if (!planoEncontrado) {
           console.warn('[WARN] Prosseguindo com limite 0 pois plano não foi identificado.');
           if (quantidadeAtual >= limiteDependentes) {
                return res.status(403).json({ 
                    error: `Não foi possível verificar o limite do seu plano. Contate o suporte.`,
                    debug: 'Plano não localizado'
                });
           }
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
          console.warn('[DependenteController.adicionar] ATENÇÃO: UUID não encontrado na resposta do Rapidoc.');
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
      console.log('[DependenteController.adicionar] Documento criado no Firestore:', createdRef.id);

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
      
      const hasUpdates = [nome, birthDate, email, phone, zipCode, address, city, state, paymentType, serviceType, plans, parentesco].some(v => v !== undefined && v !== '');
      if (!hasUpdates) return res.status(400).json({ error: 'Nenhum campo para atualizar informado.' });

      // 1. Busca o dependente no Firestore
      const snapshot = await admin.firestore().collection('beneficiarios').where('cpf', '==', cpfParam).limit(1).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Dependente não encontrado no sistema.' });
      }
      const doc = snapshot.docs[0];
      // @ts-ignore
      const dependente = doc.data();
      let rapidocUuid = dependente.rapidocUuid;

      // 2. Se não tem UUID, tenta recuperar (mantido igual)
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

      // 3. Atualiza no Rapidoc
      if (rapidocUuid) {
        // Busca dados atuais do dependente no Rapidoc para obter os planos corretos
        let atualRapidoc: any = null;
        try {
          const { RAPIDOC_BASE_URL, RAPIDOC_TOKEN, RAPIDOC_CLIENT_ID } = process.env as Record<string, string | undefined>;
          const respAtual = await axios.get(`${RAPIDOC_BASE_URL}/tema/api/beneficiaries/${rapidocUuid}`, {
            headers: {
              Authorization: `Bearer ${RAPIDOC_TOKEN}`,
              clientId: RAPIDOC_CLIENT_ID as string,
              'Content-Type': 'application/vnd.rapidoc.tema-v2+json'
            }
          });
          if (respAtual.data) {
            atualRapidoc = respAtual.data.beneficiary || respAtual.data.data?.beneficiary || respAtual.data.data || respAtual.data;
          }
          console.log('[DependenteController.editar] Dados atuais do Rapidoc:', JSON.stringify(atualRapidoc?.plans || 'sem planos'));
        } catch (e) {
          console.warn('[DependenteController.editar] Não foi possível buscar dados atuais do Rapidoc.');
        }

        const rapidocBody: any = { uuid: rapidocUuid };
        
        // Mapeamento de campos
        if (nome) rapidocBody.name = nome;
        if (birthDate) rapidocBody.birthday = birthDate;
        if (email && email.trim() !== (dependente.email || '').trim()) rapidocBody.email = email.trim();
        if (phone) rapidocBody.phone = phone.replace(/\D/g, ''); // Remove o 55 se o front mandar, ou remove formatação
        if (zipCode) rapidocBody.zipCode = zipCode;
        if (address) rapidocBody.address = address;
        if (city) rapidocBody.city = city;
        if (state) rapidocBody.state = state;

        // --- LÓGICA DE PLANOS BASEADA NO USUARIO.CONTROLLER.TS ---
        // Função helper para verificar se parece um UUID válido
        const isValidUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // Se o front mandou plans explicitamente, usa
        if (Array.isArray(plans) && plans.length > 0) {
            rapidocBody.plans = plans
                .filter((p: any) => p && p.plan && typeof p.plan.uuid === 'string' && p.plan.uuid.trim().length > 0)
                .map((p: any) => {
                    const out: any = { plan: { uuid: String(p.plan.uuid).trim() } };
                    const pt = String(p.paymentType || 'S').trim().toUpperCase();
                    out.paymentType = (pt === 'S' || pt === 'A') ? pt : 'S';
                    return out;
                });
        } else if (serviceType && serviceType.trim() && isValidUuid(serviceType.trim())) {
            // Se mandou serviceType específico (e é um UUID válido)
            const planEntry: any = { plan: { uuid: serviceType.trim() } };
            const pt = paymentType ? String(paymentType).trim().toUpperCase() : 'S';
            planEntry.paymentType = (pt === 'S' || pt === 'A') ? pt : 'S';
            rapidocBody.plans = [planEntry];
        } else if (atualRapidoc && Array.isArray(atualRapidoc.plans) && atualRapidoc.plans.length > 0) {
            // FALLBACK 1: Usa os planos atuais do próprio beneficiário no Rapidoc
            const normalizedPlans = atualRapidoc.plans
                .map((p: any) => {
                    const uuid = p?.plan?.uuid || p?.planUuid || p?.uuid || p?.id;
                    if (!uuid || typeof uuid !== 'string') return null;
                    const rawPt = String(p?.paymentType || 'S').trim().toUpperCase();
                    const paymentTypeNormalized = (rawPt === 'A') ? 'A' : 'S';
                    return { plan: { uuid: uuid.trim() }, paymentType: paymentTypeNormalized };
                })
                .filter(Boolean);
            if (normalizedPlans.length > 0) {
                rapidocBody.plans = normalizedPlans;
                console.log('[DependenteController.editar] Usando planos atuais do Rapidoc:', JSON.stringify(normalizedPlans));
            }
        } else if (dependente.serviceType && isValidUuid(dependente.serviceType)) {
            // FALLBACK 2: Usa o serviceType salvo no Firestore (só se for UUID válido)
            const existingPt = dependente.paymentType ? String(dependente.paymentType).trim().toUpperCase() : 'S';
            const validPt = (existingPt === 'A') ? 'A' : 'S';
            rapidocBody.plans = [{
                plan: { uuid: dependente.serviceType },
                paymentType: validPt
            }];
            console.log('[DependenteController.editar] Usando plano do Firestore:', dependente.serviceType);
        } else {
            // FALLBACK 3: Busca o plano do TITULAR no Firestore
            const holderCpf = holder || dependente.holder;
            if (holderCpf) {
                try {
                    const db = admin.firestore();
                    const userSnap = await db.collection('usuarios').where('cpf', '==', String(holderCpf).replace(/\D/g, '')).limit(1).get();
                    
                    if (!userSnap.empty && userSnap.docs[0]) {
                        const userData = userSnap.docs[0].data();
                        if (userData?.planoId) {
                            // Busca o plano do titular
                            let planoData: any = null;
                            const planoSnap = await db.collection('planos').doc(userData.planoId).get();
                            planoData = planoSnap.exists ? planoSnap.data() : null;
                            
                            // Tenta achar via internalPlanKey se não achar por ID
                            if (!planoData) {
                                const qPlan = await db.collection('planos').where('internalPlanKey', '==', userData.planoId).limit(1).get();
                                if (!qPlan.empty && qPlan.docs[0]) {
                                    planoData = qPlan.docs[0].data();
                                }
                            }

                            if (planoData?.uuidRapidocPlano && isValidUuid(planoData.uuidRapidocPlano)) {
                                console.log('[DependenteController.editar] Usando plano do titular:', planoData.uuidRapidocPlano);
                                rapidocBody.plans = [{
                                    plan: { uuid: planoData.uuidRapidocPlano },
                                    paymentType: 'S'
                                }];
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[DependenteController.editar] Falha ao buscar plano do titular.');
                }
            }
        }
        // Se nenhum plano foi definido, NÃO envia o campo plans (a API pode aceitar sem)
        if (!rapidocBody.plans) {
            console.log('[DependenteController.editar] Nenhum plano encontrado, enviando sem o campo plans.');
        }
        // ----------------------------------------

        try {
           console.log('[DependenteController.editar] Payload Rapidoc:', JSON.stringify(rapidocBody));
           await atualizarBeneficiarioRapidoc(rapidocUuid, rapidocBody);
        } catch (e: any) {
           console.error('[DependenteController.editar] Erro Rapidoc:', e.response?.data || e.message);
           
           // Se der erro de validação, retornamos detalhes
           if (e.response && (e.response.status === 422 || e.response.status === 400)) {
               return res.status(e.response.status).json({ 
                   error: 'Erro de validação no Rapidoc', 
                   details: e.response.data 
               });
           }
           // Se for outro erro, apenas logamos e continuamos para atualizar o Firestore
           // (Às vezes o erro é no Rapidoc mas queremos salvar a edição local, como telefone)
        }
      }

      // 4. Atualiza no Firestore (Código mantido, apenas adicionando update do serviceType se mudou)
      const holderFinal = holder || dependente.holder;
      
      const updateLocal: any = {
        nome: nome ?? dependente.nome,
        birthDate: birthDate ?? dependente.birthDate,
        email: email ?? dependente.email,
        phone: phone ? phone.replace(/\D/g, '') : (dependente.phone ?? null),
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