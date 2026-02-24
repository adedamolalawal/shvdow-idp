const maintenanceModeService = require('../services/maintenanceMode');
const { body, validationResult } = require('express-validator');

class MaintenanceController {
  /**
   * Get current maintenance mode status
   */
  async getStatus(req, res) {
    try {
      const status = await maintenanceModeService.getStatus();
      
      res.json({
        success: true,
        data: {
          maintenanceMode: status.isEnabled,
          message: status.message,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting maintenance status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get maintenance status',
        code: 'STATUS_ERROR'
      });
    }
  }

  /**
   * Enable maintenance mode
   */
  async enable(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid request data',
          details: errors.array(),
          code: 'VALIDATION_ERROR'
        });
      }

      const { message } = req.body;
      const success = await maintenanceModeService.enable(message);

      if (success) {
        const status = await maintenanceModeService.getStatus();
        
        res.json({
          success: true,
          message: 'Maintenance mode enabled successfully',
          data: {
            maintenanceMode: status.isEnabled,
            message: status.message,
            enabledBy: req.admin.username,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to enable maintenance mode',
          code: 'ENABLE_ERROR'
        });
      }
    } catch (error) {
      console.error('Error enabling maintenance mode:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to enable maintenance mode',
        code: 'ENABLE_ERROR'
      });
    }
  }

  /**
   * Disable maintenance mode
   */
  async disable(req, res) {
    try {
      const success = await maintenanceModeService.disable();

      if (success) {
        res.json({
          success: true,
          message: 'Maintenance mode disabled successfully',
          data: {
            maintenanceMode: false,
            disabledBy: req.admin.username,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to disable maintenance mode',
          code: 'DISABLE_ERROR'
        });
      }
    } catch (error) {
      console.error('Error disabling maintenance mode:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to disable maintenance mode',
        code: 'DISABLE_ERROR'
      });
    }
  }

  /**
   * Update maintenance message
   */
  async updateMessage(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid request data',
          details: errors.array(),
          code: 'VALIDATION_ERROR'
        });
      }

      const { message } = req.body;
      const success = await maintenanceModeService.updateMessage(message);

      if (success) {
        const status = await maintenanceModeService.getStatus();
        
        res.json({
          success: true,
          message: 'Maintenance message updated successfully',
          data: {
            maintenanceMode: status.isEnabled,
            message: status.message,
            updatedBy: req.admin.username,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to update maintenance message',
          code: 'UPDATE_ERROR'
        });
      }
    } catch (error) {
      console.error('Error updating maintenance message:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update maintenance message',
        code: 'UPDATE_ERROR'
      });
    }
  }

  /**
   * Get maintenance mode history
   */
  async getHistory(req, res) {
    try {
      const history = await maintenanceModeService.getHistory();
      
      res.json({
        success: true,
        data: {
          history,
          count: history.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting maintenance history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get maintenance history',
        code: 'HISTORY_ERROR'
      });
    }
  }

  /**
   * Toggle maintenance mode (enable if disabled, disable if enabled)
   */
  async toggle(req, res) {
    try {
      const currentStatus = await maintenanceModeService.getStatus();
      
      if (currentStatus.isEnabled) {
        // Currently enabled, so disable it
        return this.disable(req, res);
      } else {
        // Currently disabled, so enable it
        const { message } = req.body;
        req.body = { message }; // Ensure message is in body for enable method
        return this.enable(req, res);
      }
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to toggle maintenance mode',
        code: 'TOGGLE_ERROR'
      });
    }
  }
}

// Validation rules
const enableValidation = [
  body('message')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be a string between 1 and 500 characters')
];

const updateMessageValidation = [
  body('message')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message is required and must be between 1 and 500 characters')
];

module.exports = {
  controller: new MaintenanceController(),
  validation: {
    enable: enableValidation,
    updateMessage: updateMessageValidation
  }
};
