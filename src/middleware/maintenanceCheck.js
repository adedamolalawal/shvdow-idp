const maintenanceModeService = require('../services/maintenanceMode');

/**
 * Middleware to check if system is in maintenance mode
 * Allows admin routes to bypass maintenance mode
 */
const maintenanceCheck = async (req, res, next) => {
  try {
    // Allow admin routes to bypass maintenance mode
    if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) {
      return next();
    }

    // Allow health check endpoints
    if (req.path === '/health' || req.path === '/status') {
      return next();
    }

    // Check maintenance mode status
    const status = await maintenanceModeService.getStatus();

    if (status.isEnabled) {
      // System is in maintenance mode
      const maintenanceResponse = {
        error: 'Service Unavailable',
        message: status.message,
        maintenanceMode: true,
        timestamp: new Date().toISOString(),
        retryAfter: '3600' // Suggest retry after 1 hour
      };

      // Set appropriate headers
      res.set({
        'Retry-After': '3600',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Return 503 Service Unavailable
      return res.status(503).json(maintenanceResponse);
    }

    // System is operational, continue to next middleware
    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    
    // Fail-safe: if we can't check maintenance status, allow the request
    // This ensures the system remains operational even if maintenance check fails
    console.warn('Maintenance check failed, allowing request to proceed');
    next();
  }
};

/**
 * Middleware specifically for API routes that need JSON responses
 */
const apiMaintenanceCheck = async (req, res, next) => {
  try {
    // Allow admin API routes
    if (req.path.startsWith('/api/admin')) {
      return next();
    }

    // Allow health check endpoints
    if (req.path === '/api/health' || req.path === '/api/status') {
      return next();
    }

    const status = await maintenanceModeService.getStatus();

    if (status.isEnabled) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: status.message,
        maintenanceMode: true,
        timestamp: new Date().toISOString(),
        code: 'MAINTENANCE_MODE'
      });
    }

    next();
  } catch (error) {
    console.error('Error in API maintenance check:', error);
    // Fail-safe: allow request to proceed
    next();
  }
};

/**
 * Middleware for web routes that need HTML responses
 */
const webMaintenanceCheck = async (req, res, next) => {
  try {
    // Allow admin web routes
    if (req.path.startsWith('/admin')) {
      return next();
    }

    const status = await maintenanceModeService.getStatus();

    if (status.isEnabled) {
      const maintenanceHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>System Maintenance</title>
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
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 10px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
              margin: 2rem;
            }
            .icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #333;
              margin-bottom: 1rem;
              font-size: 2rem;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 2rem;
            }
            .timestamp {
              color: #999;
              font-size: 0.9rem;
              margin-top: 2rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🔧</div>
            <h1>System Maintenance</h1>
            <p>${status.message}</p>
            <p>We apologize for any inconvenience. Please try again later.</p>
            <div class="timestamp">
              Last updated: ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
        </html>
      `;

      res.set({
        'Retry-After': '3600',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'text/html'
      });

      return res.status(503).send(maintenanceHtml);
    }

    next();
  } catch (error) {
    console.error('Error in web maintenance check:', error);
    // Fail-safe: allow request to proceed
    next();
  }
};

module.exports = {
  maintenanceCheck,
  apiMaintenanceCheck,
  webMaintenanceCheck
};
