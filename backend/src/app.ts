import express from 'express';
import healthRoutes from './routes/health.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';
import firstAccessRoutes from './routes/firstAccess.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import firestoreRoutes from './routes/firestore.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import assinaturaRoutes from './routes/assinatura.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';

const app = express();

// Middlewares globais
app.use(express.json());

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

export default app;

