const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Simple admin authentication middleware
 * In production, this should be replaced with a proper user management system
 */
class AdminAuth {
  constructor() {
    this.adminCredentials = {
      username: config.admin.username,
      passwordHash: bcrypt.hashSync(config.admin.password, 10)
    };
  }

  /**
   * Authenticate admin credentials
   * @param {string} username 
   * @param {string} password 
   * @returns {boolean}
   */
  async authenticate(username, password) {
    try {
      if (username !== this.adminCredentials.username) {
        return false;
      }

      return await bcrypt.compare(password, this.adminCredentials.passwordHash);
    } catch (error) {
      console.error('Error authenticating admin:', error);
      return false;
    }
  }

  /**
   * Generate admin JWT token
   * @param {string} username 
   * @returns {string}
   */
  generateToken(username) {
    return jwt.sign(
      { 
        username, 
        role: 'admin',
        type: 'admin_token'
      },
      config.admin.jwtSecret,
      { 
        expiresIn: '24h',
        issuer: 'shvdow-idp',
        audience: 'admin'
      }
    );
  }

  /**
   * Verify admin JWT token
   * @param {string} token 
   * @returns {object|null}
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.admin.jwtSecret, {
        issuer: 'shvdow-idp',
        audience: 'admin'
      });

      if (decoded.type !== 'admin_token' || decoded.role !== 'admin') {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Error verifying admin token:', error);
      return null;
    }
  }

  /**
   * Express middleware to protect admin routes
   */
  requireAuth() {
    return (req, res, next) => {
      try {
        // Check for token in Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Admin authentication required',
            code: 'MISSING_TOKEN'
          });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = this.verifyToken(token);

        if (!decoded) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid or expired admin token',
            code: 'INVALID_TOKEN'
          });
        }

        // Add admin info to request object
        req.admin = {
          username: decoded.username,
          role: decoded.role
        };

        next();
      } catch (error) {
        console.error('Error in admin auth middleware:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Optional middleware for admin routes (allows both authenticated and unauthenticated access)
   */
  optionalAuth() {
    return (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = this.verifyToken(token);
          
          if (decoded) {
            req.admin = {
              username: decoded.username,
              role: decoded.role
            };
          }
        }

        next();
      } catch (error) {
        console.error('Error in optional admin auth:', error);
        // Continue without authentication
        next();
      }
    };
  }

  /**
   * Middleware to check if user is authenticated admin (for conditional responses)
   */
  isAuthenticated(req) {
    return req.admin && req.admin.role === 'admin';
  }
}

// Export singleton instance
module.exports = new AdminAuth();
