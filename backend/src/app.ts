import adminRoutes from './routes/admin.routes.js';
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';
import firstAccessRoutes from './routes/firstAccess.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import firestoreRoutes from './routes/firestore.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import assinaturaRoutes from './routes/assinatura.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import planosRoutes from './routes/planos.routes.js';
import planosDashboardRoutes from './routes/planosDashboard.routes.js';
import authRoutes from './routes/auth.routes.js';
import faturasRoutes from './routes/faturas.routes.js';
import agendamentoRoutes from './routes/agendamento.routes.js';
import beneficiarioRoutes from './routes/beneficiario.routes.js';
import especialidadesRoutes from './routes/especialidades.routes.js';
import { auditLogger } from './middlewares/audit.middleware.js';

const app = express();
app.use(cors());

// Middlewares globais
app.use(express.json());
app.use(auditLogger);

// Rota raiz simples
app.get('/', (_req, res) => {
	res.send('Essa é a API do Consulta Médicos Online.');
});

// Agrupa rotas da API
app.use('/api', healthRoutes);
app.use('/api', diagnosticsRoutes);
app.use('/api', firstAccessRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', firestoreRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', assinaturaRoutes);
app.use('/api', usuarioRoutes);
app.use('/api', adminRoutes);
app.use('/api', planosRoutes);
app.use('/api', planosDashboardRoutes);
app.use('/api', faturasRoutes);
app.use('/api', agendamentoRoutes);
app.use('/api', beneficiarioRoutes);

app.use('/api', authRoutes);

export default app;

