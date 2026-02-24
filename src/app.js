const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const database = require('./config/database');
const { apiMaintenanceCheck, webMaintenanceCheck } = require('./middleware/maintenanceCheck');

// Import routes
const adminRoutes = require('./routes/admin');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Rate limiting
const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalRateLimit);

// Logging
if (config.server.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static admin files (bypass maintenance mode for admin interface)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Health check endpoint (always available)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version
  });
});

// Status endpoint (always available)
app.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    service: 'shvdow-idp',
    timestamp: new Date().toISOString()
  });
});

// Admin API routes (bypass maintenance mode)
app.use('/api/admin', adminRoutes);

// Apply maintenance mode check to all other API routes
app.use('/api', apiMaintenanceCheck);

// Basic API routes for IDP functionality
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Shvdow Identity Provider',
      version: require('../package.json').version,
      description: 'Identity Provider with Admin-Controlled Maintenance Mode',
      timestamp: new Date().toISOString()
    }
  });
});

// Placeholder auth routes (basic IDP functionality)
app.post('/api/auth/login', (req, res) => {
  // This is a placeholder for actual authentication logic
  res.json({
    success: false,
    error: 'Not Implemented',
    message: 'Authentication endpoints are not yet implemented',
    code: 'NOT_IMPLEMENTED'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    success: false,
    error: 'Not Implemented',
    message: 'Profile endpoints are not yet implemented',
    code: 'NOT_IMPLEMENTED'
  });
});

// Apply maintenance mode check to web routes
app.use(webMaintenanceCheck);

// Serve main application (placeholder)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Shvdow IDP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 3rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .links { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .link {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          text-decoration: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .link:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .status {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(40, 167, 69, 0.2);
          border-radius: 10px;
          border: 1px solid rgba(40, 167, 69, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Shvdow IDP</h1>
        <p>Identity Provider with Admin-Controlled Maintenance Mode</p>
        <div class="links">
          <a href="/admin" class="link">🔧 Admin Panel</a>
          <a href="/api/info" class="link">📋 API Info</a>
          <a href="/health" class="link">💚 Health Check</a>
        </div>
        <div class="status">
          ✅ System is operational
        </div>
      </div>
    </body>
    </html>
  `);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.server.nodeEnv === 'development' ? error.message : 'Something went wrong',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  database.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  database.close();
  process.exit(0);
});

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`🚀 Shvdow IDP server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, server };
