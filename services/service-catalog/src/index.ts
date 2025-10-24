import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, format, transports } from 'winston';

const app = express();
const port = process.env.PORT || 8083;

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
  ],
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'service-catalog',
    timestamp: new Date().toISOString() 
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP service_catalog_services_total Total number of services
# TYPE service_catalog_services_total gauge
service_catalog_services_total 4

# HELP service_catalog_requests_total Total number of requests
# TYPE service_catalog_requests_total counter
service_catalog_requests_total 0
  `);
});

// API routes
app.get('/api/services', (req, res) => {
  res.json({ 
    services: [
      { id: 1, name: 'api-gateway', status: 'healthy', version: '1.0.0' },
      { id: 2, name: 'user-service', status: 'healthy', version: '1.2.3' },
      { id: 3, name: 'payment-service', status: 'warning', version: '2.1.0' },
      { id: 4, name: 'notification-service', status: 'healthy', version: '1.5.2' }
    ],
    message: 'Service Catalog is running!' 
  });
});

app.post('/api/services', (req, res) => {
  res.json({ 
    message: 'Service registration endpoint - implementation coming soon!',
    data: req.body 
  });
});

app.listen(port, () => {
  logger.info(`Service Catalog service listening on port ${port}`);
});

