const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { controller: maintenanceController, validation } = require('../controllers/maintenanceController');
const rateLimit = require('express-rate-limit');

// Rate limiting for admin routes
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many admin requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin login rate limiting (more restrictive)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many login attempts from this IP, please try again later.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all admin routes
router.use(adminRateLimit);

/**
 * Admin Authentication Routes
 */

// Admin login
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const isAuthenticated = await adminAuth.authenticate(username, password);

    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = adminAuth.generateToken(username);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        username,
        role: 'admin',
        expiresIn: '24h',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Verify admin token
router.get('/verify', adminAuth.requireAuth(), (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      username: req.admin.username,
      role: req.admin.role,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Maintenance Mode Management Routes
 */

// Get maintenance mode status
router.get('/maintenance/status', adminAuth.optionalAuth(), maintenanceController.getStatus);

// Enable maintenance mode
router.post('/maintenance/enable', 
  adminAuth.requireAuth(), 
  validation.enable, 
  maintenanceController.enable
);

// Disable maintenance mode
router.post('/maintenance/disable', 
  adminAuth.requireAuth(), 
  maintenanceController.disable
);

// Update maintenance message
router.put('/maintenance/message', 
  adminAuth.requireAuth(), 
  validation.updateMessage, 
  maintenanceController.updateMessage
);

// Toggle maintenance mode
router.post('/maintenance/toggle', 
  adminAuth.requireAuth(), 
  validation.enable, 
  maintenanceController.toggle
);

// Get maintenance mode history
router.get('/maintenance/history', 
  adminAuth.requireAuth(), 
  maintenanceController.getHistory
);

/**
 * System Information Routes
 */

// Get system health
router.get('/health', adminAuth.optionalAuth(), (req, res) => {
  const isAdmin = adminAuth.isAuthenticated(req);
  
  const basicHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../../package.json').version
  };

  if (isAdmin) {
    // Provide detailed health info for authenticated admins
    basicHealth.detailed = {
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  res.json({
    success: true,
    data: basicHealth
  });
});

// Get system info (admin only)
router.get('/system', adminAuth.requireAuth(), (req, res) => {
  res.json({
    success: true,
    data: {
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      application: {
        name: require('../../package.json').name,
        version: require('../../package.json').version,
        description: require('../../package.json').description
      },
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Error handling middleware for admin routes
 */
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An error occurred in admin route',
    code: 'ADMIN_ROUTE_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
