import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase, logger } from './database/database';
import { HealthMonitor } from './services/healthMonitor';
import serviceRoutes from './routes/services';

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint for the service itself
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'service-catalog',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/services', serviceRoutes);
app.use('/', serviceRoutes); // Also handle root path for proxy

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start health monitoring
    const healthMonitor = HealthMonitor.getInstance();
    healthMonitor.start();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Service Catalog service running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      healthMonitor.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      healthMonitor.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
