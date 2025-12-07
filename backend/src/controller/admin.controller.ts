import type { Firestore } from 'firebase-admin/firestore';
import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseApp } from '../config/firebase.js';
import axios from 'axios';

// BUG FIX: getLogsCounts estava sendo declarada dentro da classe como função aninhada, 
// mas usada como função externa (fora do escopo da classe). 
// O correto é declarar fora da classe, como função utilitária.

async function getLogsCounts(db: Firestore) {
  // Erros pendentes: status 500
  const pendentesSnap = await db.collection('logs_api').where('status', '==', 500).get();
  const errosPendentes = pendentesSnap.size;

  // Erros críticos: status 500 e método POST (exemplo de critério)
  const criticosSnap = await db.collection('logs_api')
    .where('status', '==', 500)
    .where('method', '==', 'POST')
    .get();
  const errosCriticos = criticosSnap.size;

  // Erros recentes: últimos 7 dias
  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentesSnap = await db.collection('logs_api')
    .where('status', '==', 500)
    .where('ts', '>=', seteDiasAtras)
    .get();
  const errosRecentes = recentesSnap.size;

  return { errosPendentes, errosCriticos, errosRecentes };
}

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

      // Busca contagem de erros (logs)
      const { errosPendentes, errosCriticos, errosRecentes } = await getLogsCounts(db);

      // Busca os 10 últimos erros (status 500), ordenados por ts desc
      const ultimosErrosSnap = await db.collection('logs_api')
        .where('status', '==', 500)
        .orderBy('ts', 'desc')
        .limit(10)
        .get();
      const ultimosErros = ultimosErrosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Totais básicos (Firestore)
      const [usuariosSnap, assinSnap, ativasSnap, canceladasSnap, pendentesSnap, planosSnap] = await Promise.all([
        db.collection('usuarios').get(),
        db.collection('assinaturas').get(),
        db.collection('assinaturas').where('status', '==', 'ATIVA').get(),
        db.collection('assinaturas').where('status', 'in', ['CANCELADA', 'CANCELADO']).get().catch(() => ({ size: 0 } as any)),
        db.collection('assinaturas').where('status', 'in', ['PENDENTE', 'PENDING']).get().catch(() => ({ size: 0 } as any)),
        db.collection('planos').get(),
      ]);

      // Usuários criados por mês (mês atual vs anterior)
      const hoje = new Date();
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      let usuariosMesAtual = 0;
      let usuariosMesAnterior = 0;
      (usuariosSnap as any).forEach((doc: any) => {
        const data = doc.data();
        const raw = data?.criadoEm || data?.createdAt || data?.created_at;
        if (!raw) return;
        const dt = raw.toDate ? raw.toDate() : new Date(raw);
        if (isNaN(dt.getTime())) return;
        if (dt >= inicioMesAtual) usuariosMesAtual += 1;
        else if (dt >= inicioMesAnterior && dt <= fimMesAnterior) usuariosMesAnterior += 1;
      });
      const variacaoUsuarios = usuariosMesAnterior > 0 ? ((usuariosMesAtual - usuariosMesAnterior) / usuariosMesAnterior) * 100 : null;

      const totais = {
        usuarios: (usuariosSnap as any).size ?? 0,
        usuariosMesAtual,
        usuariosMesAnterior,
        variacaoUsuarios,
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
        const assinaturasSnap = await db.collection('assinaturas').get();
        const assinaturasPorPlano: Record<string, number> = {};
        (assinaturasSnap as any).forEach((doc: any) => {
          const data = doc.data();
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

        // Novos assinantes dos últimos 7 dias (máx 5)
        const usuariosSnap = await db.collection('usuarios').get();
        const usuariosArr: any[] = [];
        (usuariosSnap as any).forEach((doc: any) => {
          const data = doc.data();
          usuariosArr.push({ id: doc.id, ...data });
        });
        const agora = new Date();
        const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        const assinantesRecentes = usuariosArr
          .filter(u => u.idAssinaturaAtual && u.criadoEm && new Date(u.criadoEm) >= seteDiasAtras)
          .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
          .slice(0, 5);
        novosAssinantes = assinantesRecentes.map(u => {
          let nome = u.nome || u.email || 'Desconhecido';
          let email = u.email || '';
          let plano = u.idAssinaturaAtual;
          let status = 'success';
          // Data amigável
          let data = '-';
          if (u.criadoEm) {
            const criado = new Date(u.criadoEm);
            let diff = Math.floor((agora.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24));
            if (diff != 0) diff = diff * -1;
            if (diff === 0) data = 'Hoje';
            else if (diff === 1) data = 'Ontem';
            else data = `Há ${diff} dias`;
          }
          return { nome, email, plano, data, status };
        });
      }

      // Faturamento (Asaas) - melhor esforço, primeira página
      const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
      const ASAAS_API_KEY = process.env.ASAAS_API_KEY as string | undefined;
      let faturamento = { mesAtual: 0, ultimos30Dias: 0, pendencias: 0, mesAnterior: 0, variacaoMes: null as number | null };
      if (ASAAS_API_KEY) {
        try {
          const paymentsResp = await axios.get(`${ASAAS_API_URL}/payments`, {
            headers: { access_token: ASAAS_API_KEY },
            params: { limit: 100 },
          });
          const payments: any[] = paymentsResp.data?.data || [];
          const hoje = new Date();
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
          const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // último dia do mês anterior
          const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

          let mesAtual = 0;
          let ultimos30 = 0;
          let pendencias = 0;
          let mesAnterior = 0;
          for (const p of payments) {
            const status = String(p?.status || '').toUpperCase();
            if (status === 'PENDING' || status === 'OVERDUE') pendencias += 1;
            const pago = ['RECEIVED', 'RECEIVED_IN_CASH', 'CONFIRMED'].includes(status);
            const dataPag = p.paymentDate || p.receivedDate || p.dueDate;
            if (!dataPag) continue;
            const data = new Date(dataPag);
            if (pago && data >= inicioMes) mesAtual += Number(p.value || 0);
            if (pago && data >= inicioMesAnterior && data <= fimMesAnterior) mesAnterior += Number(p.value || 0);
            if (pago && data >= trintaDiasAtras) ultimos30 += Number(p.value || 0);
          }
          const variacaoMes = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : null;
          faturamento = { mesAtual, ultimos30Dias: ultimos30, pendencias, mesAnterior, variacaoMes };
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
        novosAssinantes,
        logs: {
          errosPendentes,
          errosCriticos,
          errosRecentes,
          ultimosErros
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao montar dashboard administrativo.' });
    }
  }

  // Buscar beneficiários sem conta de usuário
  static async beneficiariosSemConta(req: Request, res: Response) {
    try {
      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);
      
      // Buscar todos os beneficiários do Rapidoc
      const { listarBeneficiariosRapidoc } = await import('../services/rapidoc.service.js');
      const beneficiariosRapidoc = await listarBeneficiariosRapidoc();
      
      // Buscar todos os usuários do Firestore para comparação
      const usuariosSnap = await db.collection('usuarios').get();
      const usuariosMap = new Map<string, boolean>();
      usuariosSnap.forEach((doc) => {
        const data = doc.data();
        const cpf = data.cpf || doc.id;
        if (cpf) {
          // Normalizar CPF (remover caracteres não numéricos)
          const cpfNormalizado = String(cpf).replace(/\D/g, '');
          if (cpfNormalizado.length === 11) {
            usuariosMap.set(cpfNormalizado, true);
          }
        }
      });
      
      // Lista de beneficiários sem conta
      const beneficiariosSemConta: Array<{
        uuid: string;
        nome: string;
        cpf: string;
        email: string;
        temUsuarioFirestore: boolean;
        temUsuarioAuth: boolean;
        temAssinaturaAsaas: boolean;
      }> = [];
      
      // Verificar cada beneficiário do Rapidoc
      for (const beneficiario of beneficiariosRapidoc) {
        // Extrair dados do beneficiário (pode vir em diferentes estruturas)
        const cpf = beneficiario.cpf || beneficiario.document || beneficiario.documentNumber;
        const email = beneficiario.email || beneficiario.emailAddress;
        const nome = beneficiario.name || beneficiario.nome || beneficiario.fullName || 'Sem nome';
        const uuid = beneficiario.uuid || beneficiario.id || beneficiario.beneficiaryUuid;
        
        if (!cpf) continue;
        
        // Normalizar CPF (remover caracteres não numéricos)
        const cpfNormalizado = cpf.replace(/\D/g, '');
        if (cpfNormalizado.length !== 11) continue; // CPF deve ter 11 dígitos
        
        // Verificar se tem usuário no Firestore
        const temUsuarioFirestore = usuariosMap.has(cpfNormalizado);
        
        // Verificar se tem usuário no Firebase Auth (por email ou CPF como UID)
        let temUsuarioAuth = false;
        try {
          if (email) {
            try {
              await auth.getUserByEmail(email);
              temUsuarioAuth = true;
            } catch {
              // Usuário não encontrado por email, tenta por CPF como UID
              try {
                await auth.getUser(cpfNormalizado);
                temUsuarioAuth = true;
              } catch {
                // Não encontrado
              }
            }
          } else {
            // Tenta apenas por CPF como UID
            try {
              await auth.getUser(cpfNormalizado);
              temUsuarioAuth = true;
            } catch {
              // Não encontrado
            }
          }
        } catch {
          // Erro ao verificar, assume que não tem
        }
        
        // Verificar se tem assinatura no Asaas (opcional, pode ser implementado depois)
        const temAssinaturaAsaas = false; // TODO: implementar verificação Asaas se necessário
        
        // Se não tem usuário no Firestore E não tem no Auth, adiciona à lista
        if (!temUsuarioFirestore && !temUsuarioAuth) {
          beneficiariosSemConta.push({
            uuid: uuid || '',
            nome,
            cpf: cpfNormalizado,
            email: email || '',
            temUsuarioFirestore,
            temUsuarioAuth,
            temAssinaturaAsaas,
          });
        }
      }
      
      return res.status(200).json({
        beneficiarios: beneficiariosSemConta,
        total: beneficiariosSemConta.length
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao buscar beneficiários sem conta.' });
    }
  }

  // Criar usuário completo com assinatura
  static async criarUsuarioCompleto(req: Request, res: Response) {
    try {
      const { beneficiarioUuid, cpf, nome, email, planoId, billingType, ciclo, telefone, dataNascimento, cep, endereco, cidade, estado } = req.body;

      if (!cpf || !nome || !email || !planoId || !billingType || !ciclo) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: cpf, nome, email, planoId, billingType, ciclo.' 
        });
      }

      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);

      // 1. Buscar plano
      const planoDoc = await db.collection('planos').doc(planoId).get();
      if (!planoDoc.exists) {
        return res.status(404).json({ error: 'Plano não encontrado.' });
      }
      const planoData = planoDoc.data();
      const valorPlano = Number(planoData?.preco || 0);
      if (valorPlano <= 0) {
        return res.status(400).json({ error: 'Plano sem valor definido.' });
      }

      // 2. Buscar ou criar beneficiário no Rapidoc
      const { buscarBeneficiarioRapidocPorCpf, cadastrarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
      let beneficiarioRapidoc: any = null;
      let rapidocUuid = beneficiarioUuid || '';
      
      try {
        const rapidocResp = await buscarBeneficiarioRapidocPorCpf(cpf);
        beneficiarioRapidoc = rapidocResp?.beneficiary;
        if (beneficiarioRapidoc?.uuid) {
          rapidocUuid = beneficiarioRapidoc.uuid;
        }
      } catch (error: any) {
        // Se não encontrar, cria novo beneficiário no Rapidoc
        console.log('Beneficiário não encontrado no Rapidoc, criando novo...');
        try {
          const cpfNormalizado = String(cpf).replace(/\D/g, '');
          const rapidocPayload: any = {
            nome,
            email,
            cpf: cpfNormalizado,
            birthday: dataNascimento || '',
            phone: telefone || '',
            zipCode: cep || '',
            address: endereco || '',
            city: cidade || '',
            state: estado || '',
          };
          
          // Adicionar planos se houver dados do plano
          if (planoData?.uuidRapidocPlano) {
            rapidocPayload.plans = [{
              paymentType: planoData.paymentType || 'S',
              plan: { uuid: planoData.uuidRapidocPlano }
            }];
          }
          
          const rapidocCreateResp = await cadastrarBeneficiarioRapidoc(rapidocPayload);
          if (rapidocCreateResp?.uuid) {
            rapidocUuid = rapidocCreateResp.uuid;
            beneficiarioRapidoc = { uuid: rapidocUuid, ...rapidocPayload };
          }
        } catch (createError: any) {
          console.warn('Erro ao criar beneficiário no Rapidoc:', createError?.message);
          // Continua mesmo assim, pode criar depois
        }
      }

      // 3. Verificar se usuário já existe
      const usuarioRef = db.collection('usuarios').doc(cpf);
      const usuarioDoc = await usuarioRef.get();
      if (usuarioDoc.exists) {
        return res.status(409).json({ error: 'Usuário já existe no Firestore.' });
      }

      // Verificar se já existe no Firebase Auth
      try {
        await auth.getUser(cpf);
        return res.status(409).json({ error: 'Usuário já existe no Firebase Auth.' });
      } catch {
        // Usuário não existe, pode continuar
      }

      // 4. Criar cliente no Asaas
      const { criarClienteAsaas, criarAssinaturaAsaas } = await import('../services/asaas.service.js');
      const clienteAsaas = await criarClienteAsaas({ 
        nome, 
        email, 
        cpf: cpf.replace(/\D/g, '') 
      });

      // 5. Criar assinatura no Asaas
      const assinaturaAsaas = await criarAssinaturaAsaas({
        customer: clienteAsaas.id,
        value: valorPlano,
        cycle: ciclo,
        billingType,
        description: `Assinatura ${planoData?.tipo || 'Consulta Médicos Online'}`
      });

      // 6. Gerar senha temporária
      const gerarSenhaTemporaria = (tamanho = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let senha = '';
        for (let i = 0; i < tamanho; i++) {
          senha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return senha;
      };
      const senhaTemporaria = gerarSenhaTemporaria();

      // 7. Criar usuário no Firebase Auth
      const cpfNormalizado = cpf.replace(/\D/g, '');
      let userRecord;
      try {
        userRecord = await auth.createUser({
          uid: cpfNormalizado,
          email,
          password: senhaTemporaria,
          displayName: nome,
        });
      } catch (error: any) {
        // Se falhar ao criar no Auth, tenta limpar o que foi criado no Asaas
        try {
          await import('../services/asaas.service.js').then(m => 
            m.cancelarAssinaturaAsaas(assinaturaAsaas.id).catch(() => {})
          );
        } catch {}
        if (error.code === 'auth/email-already-exists' || error.code === 'auth/uid-already-exists') {
          return res.status(409).json({ error: 'Usuário já existe no Firebase Auth.' });
        }
        throw error;
      }

      // 8. Salvar usuário no Firestore
      const usuarioData: any = {
        cpf: cpfNormalizado,
        nome,
        email,
        criadoEm: new Date().toISOString(),
        idAssinaturaAtual: assinaturaAsaas.id,
        rapidocBeneficiaryUuid: rapidocUuid,
        primeiroAcesso: false, // Será marcado como true quando o usuário fizer login pela primeira vez
      };
      
      // Adicionar dados do Rapidoc se disponíveis
      if (beneficiarioRapidoc) {
        if (beneficiarioRapidoc.birthday) usuarioData.dataNascimento = beneficiarioRapidoc.birthday;
        if (beneficiarioRapidoc.phone) usuarioData.telefone = beneficiarioRapidoc.phone;
      }

      await usuarioRef.set(usuarioData);

      // 9. Salvar assinatura no Firestore
      const assinaturaData: any = {
        idAssinatura: assinaturaAsaas.id,
        cpfUsuario: cpfNormalizado,
        planoId,
        status: 'ATIVA',
        valor: valorPlano,
        ciclo,
        formaPagamento: billingType,
        dataInicio: new Date().toISOString().split('T')[0],
        criadoEm: new Date().toISOString(),
      };
      await db.collection('assinaturas').doc(assinaturaAsaas.id).set(assinaturaData);

      return res.status(201).json({
        message: 'Usuário criado com sucesso.',
        usuario: {
          cpf: cpfNormalizado,
          nome,
          email,
          senhaTemporaria, // IMPORTANTE: retornar senha temporária para o admin
        },
        plano: {
          id: planoId,
          tipo: planoData?.tipo,
          descricao: planoData?.descricao,
          valor: valorPlano,
        },
        assinatura: {
          id: assinaturaAsaas.id,
          status: assinaturaAsaas.status,
          valor: valorPlano,
        },
        clienteAsaas: {
          id: clienteAsaas.id,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ 
        error: error?.message || 'Erro ao criar usuário completo.' 
      });
    }
  }

  // Gerar nova senha para um cliente
  static async gerarNovaSenha(req: Request, res: Response) {
    try {
      const { cpf } = req.body;

      if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório.' });
      }

      const db = getFirestore(firebaseApp);
      const auth = getAuth(firebaseApp);

      // Normalizar CPF
      const cpfNormalizado = String(cpf).replace(/\D/g, '');
      if (cpfNormalizado.length !== 11) {
        return res.status(400).json({ error: 'CPF inválido.' });
      }

      // 1. Buscar usuário no Firestore
      const usuarioRef = db.collection('usuarios').doc(cpfNormalizado);
      const usuarioDoc = await usuarioRef.get();
      
      if (!usuarioDoc.exists) {
        return res.status(404).json({ error: 'Usuário não encontrado no Firestore.' });
      }

      const usuarioData = usuarioDoc.data();
      const email = usuarioData?.email;

      if (!email) {
        return res.status(400).json({ error: 'Usuário não possui email cadastrado.' });
      }

      // 2. Verificar se usuário existe no Firebase Auth
      let userRecord;
      try {
        userRecord = await auth.getUser(cpfNormalizado);
      } catch (error: any) {
        // Se não encontrar pelo UID (CPF), tenta buscar pelo email
        try {
          userRecord = await auth.getUserByEmail(email);
        } catch {
          return res.status(404).json({ error: 'Usuário não encontrado no Firebase Auth.' });
        }
      }

      // 3. Gerar senha temporária
      const gerarSenhaTemporaria = (tamanho = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let senha = '';
        for (let i = 0; i < tamanho; i++) {
          senha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return senha;
      };
      const senhaTemporaria = gerarSenhaTemporaria();

      // 4. Atualizar senha no Firebase Auth
      try {
        await auth.updateUser(userRecord.uid, {
          password: senhaTemporaria,
        });
      } catch (error: any) {
        return res.status(500).json({ 
          error: `Erro ao atualizar senha: ${error?.message || 'Erro desconhecido'}` 
        });
      }

      return res.status(200).json({
        message: 'Nova senha gerada com sucesso.',
        usuario: {
          cpf: cpfNormalizado,
          nome: usuarioData?.nome || 'Sem nome',
          email: email,
        },
        senhaTemporaria,
      });
    } catch (error: any) {
      return res.status(500).json({ 
        error: error?.message || 'Erro ao gerar nova senha.' 
      });
    }
  }

  // Ativar beneficiário no Rapidoc
  static async ativarBeneficiarioRapidoc(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const { buscarBeneficiarioRapidocPorCpf, atualizarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
      const r = await buscarBeneficiarioRapidocPorCpf(cpf);
      const beneficiario = r?.beneficiary;
      if (!beneficiario || !beneficiario.uuid) {
        return res.status(404).json({ error: 'Beneficiário não encontrado no Rapidoc.' });
      }

      try {
        const resp = await atualizarBeneficiarioRapidoc(beneficiario.uuid, { isActive: true });
        if (!resp || resp.success === false) {
          return res.status(400).json({ error: resp?.message || 'Falha ao ativar beneficiário no Rapidoc.', detail: resp });
        }
        return res.status(200).json({ ok: true, beneficiaryUuid: beneficiario.uuid });
      } catch (e: any) {
        return res.status(400).json({ error: 'Erro ao ativar beneficiário no Rapidoc.', detail: e?.response?.data || e?.message });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao ativar beneficiário.' });
    }
  }

  // Inativar beneficiário no Rapidoc
  static async inativarBeneficiarioRapidoc(req: Request, res: Response) {
    try {
      const { cpf } = req.params as { cpf?: string };
      if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório.' });

      const { buscarBeneficiarioRapidocPorCpf, inativarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
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

        // Opcional: refletir inatividade no Firestore
        try {
          const db = getFirestore(firebaseApp);
          const snap = await db.collection('beneficiarios').where('cpf', '==', String(cpf).replace(/\D/g, '')).limit(1).get();
          if (!snap.empty) {
            await snap.docs[0]!.ref.set({ isActive: false, updatedAt: new Date().toISOString() }, { merge: true });
          }
        } catch {}

        return res.status(200).json({ ok: true, beneficiaryUuid: beneficiario.uuid });
      } catch (e: any) {
        return res.status(400).json({ error: 'Erro ao inativar beneficiário no Rapidoc.', detail: e?.response?.data || e?.message });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao inativar beneficiário.' });
    }
  }

  // Cadastrar nova vida (beneficiário) com opção de cortesia
  static async cadastrarVida(req: Request, res: Response) {
    try {
      const { cpfTitular } = req.params as { cpfTitular?: string };
      const { 
        nome, cpf, birthDate, email, phone, zipCode, endereco, cidade, estado, 
        planoId, paymentType, serviceType, cortesia = false 
      } = req.body;

      if (!cpfTitular) {
        return res.status(400).json({ error: 'CPF do titular é obrigatório.' });
      }
      if (!nome || !cpf || !birthDate || !email) {
        return res.status(400).json({ error: 'Campos obrigatórios: nome, cpf, birthDate, email.' });
      }

      const db = getFirestore(firebaseApp);
      const cpfNormalizado = String(cpf).replace(/\D/g, '');
      const cpfTitularNormalizado = String(cpfTitular).replace(/\D/g, '');

      // Verificar se beneficiário já existe
      const beneficiarioSnap = await db.collection('beneficiarios').where('cpf', '==', cpfNormalizado).limit(1).get();
      if (!beneficiarioSnap.empty) {
        return res.status(409).json({ error: 'Beneficiário já cadastrado.' });
      }

      // Buscar plano se fornecido
      let planoData: any = null;
      if (planoId) {
        const planoDoc = await db.collection('planos').doc(planoId).get();
        if (!planoDoc.exists) {
          return res.status(404).json({ error: 'Plano não encontrado.' });
        }
        planoData = planoDoc.data();
      }

      // 1. Criar beneficiário no Rapidoc
      const { cadastrarBeneficiarioRapidoc } = await import('../services/rapidoc.service.js');
      const rapidocPayload: any = {
        nome,
        cpf: cpfNormalizado,
        birthday: birthDate,
        email,
        phone,
        zipCode,
        address: endereco,
        city: cidade,
        state: estado,
        holder: cpfTitularNormalizado
      };

      // Adicionar plans se houver plano e paymentType/serviceType
      if (planoData && (paymentType || serviceType)) {
        const planEntry: any = {};
        if (serviceType) planEntry.plan = { uuid: serviceType };
        if (paymentType) planEntry.paymentType = paymentType;
        rapidocPayload.plans = [planEntry];
      }

      const rapidocResp = await cadastrarBeneficiarioRapidoc(rapidocPayload);
      if (!rapidocResp || rapidocResp.success === false) {
        return res.status(400).json({ error: rapidocResp?.message || 'Erro ao criar beneficiário no Rapidoc.' });
      }

      // 2. Salvar no Firestore
      const docData: any = {
        nome,
        cpf: cpfNormalizado,
        birthDate,
        holder: cpfTitularNormalizado,
        email,
        phone,
        zipCode,
        address: endereco,
        city: cidade,
        state: estado,
        paymentType,
        serviceType,
        cortesia: cortesia === true,
        createdAt: new Date().toISOString(),
      };
      if (rapidocResp.uuid) {
        docData.rapidocUuid = rapidocResp.uuid;
      }
      if (planoId) {
        docData.planoId = planoId;
      }

      const createdRef = await db.collection('beneficiarios').add(docData);

      // 3. Se não for cortesia, criar assinatura no Asaas
      let assinaturaAsaas = null;
      if (!cortesia && planoData && planoData.preco) {
        try {
          const { criarClienteAsaas, criarAssinaturaAsaas } = await import('../services/asaas.service.js');
          
          // Verificar se cliente já existe no Asaas
          let clienteAsaas;
          try {
            const { verificarAssinaturaPorCpf } = await import('../services/asaas.service.js');
            const check = await verificarAssinaturaPorCpf(cpfNormalizado);
            if (check.cliente) {
              clienteAsaas = { id: check.cliente.id };
            } else {
              clienteAsaas = await criarClienteAsaas({ nome, email, cpf: cpfNormalizado, telefone: phone });
            }
          } catch {
            clienteAsaas = await criarClienteAsaas({ nome, email, cpf: cpfNormalizado, telefone: phone });
          }

          assinaturaAsaas = await criarAssinaturaAsaas({
            customer: clienteAsaas.id,
            value: Number(planoData.preco),
            cycle: planoData.periodicidade === 'MENSAL' ? 'MONTHLY' : 'MONTHLY',
            billingType: 'BOLETO',
            description: `Assinatura ${planoData.tipo || 'Consulta Médicos Online'}`
          });

          // Salvar assinatura no Firestore
          const assinaturaData: any = {
            idAssinatura: assinaturaAsaas.id,
            cpfUsuario: cpfNormalizado,
            planoId,
            status: 'ATIVA',
            valor: Number(planoData.preco),
            ciclo: planoData.periodicidade === 'MENSAL' ? 'MONTHLY' : 'MONTHLY',
            formaPagamento: 'BOLETO',
            dataInicio: new Date().toISOString().split('T')[0],
            criadoEm: new Date().toISOString(),
          };
          await db.collection('assinaturas').doc(assinaturaAsaas.id).set(assinaturaData);
        } catch (error: any) {
          console.error('Erro ao criar assinatura no Asaas:', error);
          // Continua mesmo se falhar a assinatura
        }
      }

      return res.status(201).json({
        message: cortesia ? 'Vida cadastrada como cortesia com sucesso.' : 'Vida cadastrada com sucesso.',
        beneficiario: {
          id: createdRef.id,
          nome,
          cpf: cpfNormalizado,
          cortesia: cortesia === true,
        },
        rapidoc: {
          uuid: rapidocResp.uuid,
        },
        assinatura: assinaturaAsaas ? {
          id: assinaturaAsaas.id,
          status: assinaturaAsaas.status,
        } : null,
      });
    } catch (error: any) {
      return res.status(500).json({ 
        error: error?.message || 'Erro ao cadastrar vida.' 
      });
    }
  }
}
