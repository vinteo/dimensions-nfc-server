import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { initNfcSubscriptions } from './state/nfc-store.js';
import nfcRouter from './routes/nfc.js';
import healthRouter from './routes/health.js';
import { logger } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// Initialize the NFC Event listeners and memory stores
initNfcSubscriptions();

// Standard middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors());
app.use(express.json());

// Logger middleware
app.use(logger);

// Mount API Routers
app.use('/api', healthRouter);
app.use('/api/nfc', nfcRouter);

// Ensure uploads directory exists in root
import fs from 'fs';
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Serve uploaded assets statically
app.use('/uploads', express.static(uploadsPath));

// Serve static compiled frontend files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// For SPA routing, fallback index.html for any non-API routes
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If frontend is not built, just let express return 404
      next();
    }
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
