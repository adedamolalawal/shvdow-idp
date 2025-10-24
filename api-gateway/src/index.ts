import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Redis client for session management (disabled for now)
let redisClient: any = null;
logger.info('Redis disabled - running in stateless mode');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Authentication middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if token is blacklisted in Redis (if available)
    if (redisClient) {
      try {
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }
      } catch (error) {
        logger.warn('Redis check failed, continuing without blacklist check:', error);
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Authentication endpoints
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // TODO: Implement actual authentication logic
    // For now, create a mock token
    const token = jwt.sign(
      { 
        userId: 'mock-user-id',
        username,
        roles: ['developer'],
        permissions: ['read', 'write']
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store session in Redis (if available)
    if (redisClient) {
      try {
        await redisClient.setEx(`session:${username}`, 86400, token);
      } catch (error) {
        logger.warn('Failed to store session in Redis:', error);
      }
    }

    res.json({
      token,
      user: {
        id: 'mock-user-id',
        username,
        roles: ['developer']
      }
    });
  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/logout', authenticateToken, async (req: any, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    // Add token to blacklist and remove session (if Redis is available)
    if (redisClient) {
      try {
        await redisClient.setEx(`blacklist:${token}`, 86400, 'true');
        await redisClient.del(`session:${req.user.username}`);
      } catch (error) {
        logger.warn('Failed to update Redis during logout:', error);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Service proxy configurations
const serviceRoutes = [
  {
    path: '/api/gitops',
    target: process.env.GITOPS_SERVICE_URL || 'http://gitops-core:8080',
    auth: true
  },
  {
    path: '/api/cicd',
    target: process.env.CICD_SERVICE_URL || 'http://cicd-engine:8080',
    auth: true
  },
  {
    path: '/api/services',
    target: process.env.SERVICE_CATALOG_URL || 'http://localhost:8081',
    auth: true
  },
  {
    path: '/api/metrics',
    target: process.env.METRICS_SERVICE_URL || 'http://metrics-collector:8080',
    auth: true
  },
  {
    path: '/api/alerts',
    target: process.env.ALERT_SERVICE_URL || 'http://alert-engine:8080',
    auth: true
  },
  {
    path: '/api/teams',
    target: process.env.TEAM_SERVICE_URL || 'http://team-management:8080',
    auth: true
  },
  {
    path: '/api/docs',
    target: process.env.DOCS_SERVICE_URL || 'http://docs-engine:8080',
    auth: true
  }
];

// Setup proxy routes
serviceRoutes.forEach(route => {
  const middleware = route.auth ? [authenticateToken] : [];
  
  app.use(route.path, ...middleware, createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    pathRewrite: {
      [`^${route.path}`]: ''
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${route.path}:`, err);
      res.status(502).json({ error: 'Service temporarily unavailable' });
    },
    onProxyReq: (proxyReq, req: any) => {
      // Add user context to proxied requests
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.userId);
        proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles));
        proxyReq.setHeader('X-User-Permissions', JSON.stringify(req.user.permissions));
      }
    }
  }));
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      logger.warn('Error closing Redis connection:', error);
    }
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      logger.warn('Error closing Redis connection:', error);
    }
  }
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

export default app;
