import express from 'express';
import healthRoutes from './routes/health.routes.js';
import diagnosticsRoutes from './routes/diagnostics.routes.js';

const app = express();

// Middlewares globais
app.use(express.json());

// Rota raiz simples
app.get('/', (_req, res) => {
	res.send('Hello, World!');
});

// Agrupa rotas da API
app.use('/api', healthRoutes);
app.use('/api', diagnosticsRoutes);

export default app;

