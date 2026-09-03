import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/index.js';
import { seedDatabase } from './db/seedData.js';
import apiRouter from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Discharge-Readiness & Bed-Turnover Coordination Server', timestamp: new Date().toISOString() });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDb();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Hospital Bed Coordination API Server running on port ${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log(` API Base:     http://localhost:${PORT}/api/dashboard`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
};

startServer();
