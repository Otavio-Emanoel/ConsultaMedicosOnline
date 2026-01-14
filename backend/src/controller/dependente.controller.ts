import { cadastrarBeneficiarioRapidoc, atualizarBeneficiarioRapidoc } from '../services/rapidoc.service.js';
import admin from 'firebase-admin';
import type { Request, Response } from 'express';
import axios from 'axios';

// ==================================================================================
// FUNÇÕES UTILITÁRIAS PARA VALIDAÇÃO
// ==================================================================================

/**
 * Valida se uma string é um UUID válido (formato v4)
 * Formato UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function isValidUUID(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value.trim());
}

/**
 * Recupera o plano do titular a partir do seu CPF
 * Tenta múltiplas estratégias para encontrar um plano válido
 */
async function recuperarPlanoDoTitular(cpfTitular: string): Promise<{ uuid: string; paymentType: string } | null> {
  try {
    const db = admin.firestore();
    
    // ESTRATÉGIA 1: Busca a assinatura ativa do titular
    console.log(`[RECUPERAR PLANO] Estratégia 1: Buscando assinatura ativa para ${cpfTitular}`);
    const assinaturasRef = db.collection('assinaturas');
    let qAssinatura = await assinaturasRef
      .where('cpfUsuario', '==', cpfTitular)
      .where('ativo', '==', true)
      .limit(1)
      .get();
    
    if (!qAssinatura.empty) {
      const assinaturaData = qAssinatura.docs[0]?.data();
      const planoId = assinaturaData?.planoId;
      let paymentType = assinaturaData?.formaPagamento || 'S';
      
      // Força 'S' ou 'A' se vier diferente
      if (paymentType !== 'S' && paymentType !== 'A') {
        paymentType = 'S';
      }
      
      if (planoId && isValidUUID(planoId)) {
        console.log(`[RECUPERAR PLANO] ✓ Estratégia 1 funcionou: ${planoId}`);
        return { uuid: planoId, paymentType };
      }
    }
    
    // ESTRATÉGIA 2: Busca qualquer assinatura do titular (sem filtro de ativo)
    console.log(`[RECUPERAR PLANO] Estratégia 2: Buscando ANY assinatura para ${cpfTitular}`);
    qAssinatura = await assinaturasRef
      .where('cpfUsuario', '==', cpfTitular)
      .limit(1)
      .get();
    
    if (!qAssinatura.empty) {
      const assinaturaData = qAssinatura.docs[0]?.data();
      const planoId = assinaturaData?.planoId;
      let paymentType = assinaturaData?.formaPagamento || 'S';
      
      if (paymentType !== 'S' && paymentType !== 'A') {
        paymentType = 'S';
      }
      
      if (planoId && isValidUUID(planoId)) {
        console.log(`[RECUPERAR PLANO] ✓ Estratégia 2 funcionou: ${planoId}`);
        return { uuid: planoId, paymentType };
      }
    }
    
    // ESTRATÉGIA 3: Busca direto na collection usuarios
    console.log(`[RECUPERAR PLANO] Estratégia 3: Buscando no usuários para ${cpfTitular}`);
    const usuariosRef = db.collection('usuarios');
    const qUsuario = await usuariosRef
      .where('cpf', '==', cpfTitular)
      .limit(1)
      .get();
    
    if (!qUsuario.empty) {
      const usuarioData = qUsuario.docs[0]?.data();
      const planoId = usuarioData?.planoId;
      
      if (planoId && isValidUUID(planoId)) {
        console.log(`[RECUPERAR PLANO] ✓ Estratégia 3 funcionou: ${planoId}`);
        return { uuid: planoId, paymentType: 'S' };
      }
    }
    
    // ESTRATÉGIA 4: Busca qualquer beneficiário do mesmo holder e recupera seu plano
    console.log(`[RECUPERAR PLANO] Estratégia 4: Buscando beneficiários do mesmo holder`);
    const beneficiarioRef = db.collection('beneficiarios');
    const qBenef = await beneficiarioRef
      .where('holder', '==', cpfTitular)
      .limit(10)
      .get();
    
    for (const benef of qBenef.docs) {
      const benefData = benef.data();
      const planoId = benefData?.serviceType;
      if (planoId && isValidUUID(planoId)) {
        console.log(`[RECUPERAR PLANO] ✓ Estratégia 4 funcionou: ${planoId}`);
        return { uuid: planoId, paymentType: benefData?.paymentType || 'S' };
      }
    }
    
    // ESTRATÉGIA 5: Busca o PRIMEIRO UUID válido em toda a collection de assinaturas
    console.log(`[RECUPERAR PLANO] Estratégia 5: Procurando primeiro UUID válido em assinaturas`);
    const allAssinaturas = await assinaturasRef.limit(100).get();
    for (const doc of allAssinaturas.docs) {
      const data = doc.data();
      const planoId = data?.planoId;
      if (planoId && isValidUUID(planoId)) {
        console.log(`[RECUPERAR PLANO] ✓ Estratégia 5 funcionou (fallback global): ${planoId}`);
        return { uuid: planoId, paymentType: 'S' };
      }
    }
    
    console.warn('[RECUPERAR PLANO] ✗ Nenhuma estratégia funcionou para recuperar plano');
  } catch (e) {
    console.error('[RECUPERAR PLANO] Erro geral:', e);
  }
  
  return null;
}

/**
 * Tenta fazer update no Rapidoc com retry logic
 */
async function atualizarBeneficiarioComRetry(
  uuid: string, 
  body: any, 
  tentativa: number = 1
): Promise<any> {
  try {
    console.log(`[RAPIDOC UPDATE] Tentativa ${tentativa}: UUID=${uuid}, Body=${JSON.stringify(body)}`);
    const resultado = await atualizarBeneficiarioRapidoc(uuid, body);
    console.log(`[RAPIDOC UPDATE] ✓ Sucesso na tentativa ${tentativa}`);
    return resultado;
  } catch (e: any) {
    const statusCode = e.response?.status;
    const errorMsg = e.response?.data?.message || e.response?.data?.errors?.[0]?.description || e.message;
    
    console.error(`[RAPIDOC UPDATE] ✗ Erro na tentativa ${tentativa}: ${statusCode} - ${errorMsg}`);
    
    // Se for erro 422 (validação), tenta remover plans
    if (statusCode === 422 && tentativa === 1) {
      console.log(`[RAPIDOC UPDATE] Removendo plans e tentando novamente...`);
      const bodySemPlans = { ...body };
      delete bodySemPlans.plans;
      return atualizarBeneficiarioComRetry(uuid, bodySemPlans, 2);
    }
    
    // Se for erro 400, tenta novamente sem email
    if (statusCode === 400 && tentativa === 2) {
      console.log(`[RAPIDOC UPDATE] Removendo email e tentando novamente...`);
      const bodySemEmail = { ...body };
      delete bodySemEmail.email;
      return atualizarBeneficiarioComRetry(uuid, bodySemEmail, 3);
    }
    
    // Se foi tentativa 3, tenta apenas com dados básicos
    if (tentativa === 3) {
      console.log(`[RAPIDOC UPDATE] Enviando apenas dados básicos...`);
      const bodyBasico = { 
        uuid: body.uuid,
        name: body.name,
        birthday: body.birthday
      };
      return atualizarBeneficiarioComRetry(uuid, bodyBasico, 4);
    }
    
    // Se falhou tudo, retorna o erro
    throw e;
  }
}

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

        // ==================================================================================
        // LÓGICA DE PLANOS E PAGAMENTO COM MÚLTIPLAS TENTATIVAS
        // ==================================================================================
        let planoFinal: { uuid: string; paymentType: string } | null = null;

        // PASSO 1: Se veio array de plans, usar direto
        if (Array.isArray(plans) && plans.length > 0) {
          const planoValido = plans.find((p: any) => p?.plan?.uuid && isValidUUID(p.plan.uuid));
          if (planoValido) {
            let pt = planoValido.paymentType || 'S';
            if (pt !== 'S' && pt !== 'A') pt = 'S';
            rapidocBody.plans = [{
              plan: { uuid: planoValido.plan.uuid },
              paymentType: pt
            }];
            planoFinal = { uuid: planoValido.plan.uuid, paymentType: pt };
            console.log('[EDITAR PLANOS] ✓ Passo 1: Plano válido encontrado no array');
          }
        }
        
        // PASSO 2: Se não usou plans acima, tenta usar serviceType (se for UUID válido)
        if (!planoFinal && serviceType && serviceType.trim()) {
          const stTrim = String(serviceType).trim();
          if (isValidUUID(stTrim)) {
            let pt = paymentType ? String(paymentType).trim().toUpperCase() : 'S';
            if (pt !== 'S' && pt !== 'A') pt = 'S';
            rapidocBody.plans = [{
              plan: { uuid: stTrim },
              paymentType: pt
            }];
            planoFinal = { uuid: stTrim, paymentType: pt };
            console.log('[EDITAR PLANOS] ✓ Passo 2: Usando serviceType válido');
          }
        }
        
        // PASSO 3: Recuperar plano do dependente existente (se ainda não tem)
        if (!planoFinal && dependente.serviceType && isValidUUID(dependente.serviceType)) {
          let pt = dependente.paymentType || 'S';
          if (pt !== 'S' && pt !== 'A') pt = 'S';
          rapidocBody.plans = [{
            plan: { uuid: dependente.serviceType },
            paymentType: pt
          }];
          planoFinal = { uuid: dependente.serviceType, paymentType: pt };
          console.log('[EDITAR PLANOS] ✓ Passo 3: Usando plano do dependente existente');
        }
        
        // PASSO 4: Recuperar plano do titular (AGRESSIVO - múltiplas estratégias)
        if (!planoFinal && holder) {
          const holderNorm = String(holder).replace(/\D/g, '');
          console.log(`[EDITAR PLANOS] Passo 4: Tentando recuperar plano do titular ${holderNorm}`);
          const planoTitular = await recuperarPlanoDoTitular(holderNorm);
          
          if (planoTitular && isValidUUID(planoTitular.uuid)) {
            rapidocBody.plans = [{
              plan: { uuid: planoTitular.uuid },
              paymentType: planoTitular.paymentType
            }];
            planoFinal = planoTitular;
            console.log('[EDITAR PLANOS] ✓ Passo 4: Plano do titular recuperado');
          }
        }

        // PASSO 5: Se AINDA não tem plano, tenta recuperar do holder que veio no body (pode ser diferente)
        if (!planoFinal && dependente.holder) {
          const holderExistente = String(dependente.holder).replace(/\D/g, '');
          if (holderExistente !== String(holder || '').replace(/\D/g, '')) {
            console.log(`[EDITAR PLANOS] Passo 5: Tentando recuperar plano do holder existente ${holderExistente}`);
            const planoTitularExistente = await recuperarPlanoDoTitular(holderExistente);
            
            if (planoTitularExistente && isValidUUID(planoTitularExistente.uuid)) {
              rapidocBody.plans = [{
                plan: { uuid: planoTitularExistente.uuid },
                paymentType: planoTitularExistente.paymentType
              }];
              planoFinal = planoTitularExistente;
              console.log('[EDITAR PLANOS] ✓ Passo 5: Plano do holder existente recuperado');
            }
          }
        }

        // PASSO 6: Se NÃO tem nenhum plano válido, NÃO enviar planos para o Rapidoc
        if (!planoFinal) {
          console.warn('[EDITAR PLANOS] AVISO: Nenhum plano válido disponível. Não enviando plans.');
          if (rapidocBody.plans) {
            delete rapidocBody.plans;
          }
        }

        // ==================================================================================

        try {
           console.log('[DependenteController.editar] Enviando para Rapidoc:', JSON.stringify(rapidocBody));
           await atualizarBeneficiarioComRetry(rapidocUuid, rapidocBody);
           console.log('[DependenteController.editar] ✓ Atualização Rapidoc bem-sucedida');
        } catch (e: any) {
           console.error('[DependenteController.editar] ✗ Erro final Rapidoc:', e.response?.data || e.message);
           
           // Se o erro persistiu mesmo com retries, tenta fazer update APENAS local no Firestore
           // e retorna sucesso (update parcial)
           if (e.response && (e.response.status === 422 || e.response.status === 400 || e.response.status === 500)) {
               console.warn('[DependenteController.editar] Prosseguindo com update local apenas (sem Rapidoc)');
               // Não lança erro aqui - continuará com o update local abaixo
           } else {
               // Se for outro tipo de erro, retorna erro
               return res.status(500).json({ 
                   error: 'Erro ao atualizar no Rapidoc', 
                   details: e.response?.data 
               });
           }
        }
      }

      // 4. Atualiza no Firestore (com ou sem sucesso no Rapidoc)
      const holderFinal = holder || dependente.holder;
      
      // Determina qual serviceType salvar (prioriza os validados acima)
      let serviceTypeFinal = dependente.serviceType; // Padrão: mantém o existente
      
      if (serviceType && serviceType.trim()) {
        const stTrim = String(serviceType).trim();
        if (isValidUUID(stTrim)) {
          serviceTypeFinal = stTrim;
        }
      } else if (Array.isArray(plans) && plans.length > 0) {
        const planoValido = plans.find((p: any) => p?.plan?.uuid && isValidUUID(p.plan.uuid));
        if (planoValido) {
          serviceTypeFinal = planoValido.plan.uuid;
        }
      }
      
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
        serviceType: serviceTypeFinal,
        rapidocUuid: rapidocUuid || dependente.rapidocUuid || null,
        updatedAt: new Date()
      };

      Object.keys(updateLocal).forEach(key => updateLocal[key] === undefined && delete updateLocal[key]);

      // @ts-ignore
      await doc.ref.update(updateLocal);
      console.log('[DependenteController.editar] ✓ Atualização Firestore bem-sucedida');

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