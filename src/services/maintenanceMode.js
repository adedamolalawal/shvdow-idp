const database = require('../config/database');

class MaintenanceModeService {
  constructor() {
    this.db = database.getDb();
  }

  /**
   * Get current maintenance mode status
   * @returns {Promise<{isEnabled: boolean, message: string}>}
   */
  async getStatus() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT key, value 
        FROM system_status 
        WHERE key IN ('maintenance_mode', 'maintenance_message')
      `;

      this.db.all(query, (err, rows) => {
        if (err) {
          console.error('Error getting maintenance status:', err);
          // Fail-safe: return operational status if database error
          resolve({
            isEnabled: false,
            message: 'System is operational'
          });
          return;
        }

        const status = {};
        rows.forEach(row => {
          status[row.key] = row.value;
        });

        resolve({
          isEnabled: status.maintenance_mode === 'true',
          message: status.maintenance_message || 'System is currently under maintenance'
        });
      });
    });
  }

  /**
   * Enable maintenance mode
   * @param {string} message - Optional custom maintenance message
   * @returns {Promise<boolean>}
   */
  async enable(message = null) {
    return new Promise((resolve, reject) => {
      const updateQueries = [
        {
          sql: 'UPDATE system_status SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
          params: ['true', 'maintenance_mode']
        }
      ];

      if (message) {
        updateQueries.push({
          sql: 'UPDATE system_status SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
          params: [message, 'maintenance_message']
        });
      }

      // Execute updates in transaction
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        let completed = 0;
        let hasError = false;

        updateQueries.forEach(query => {
          this.db.run(query.sql, query.params, (err) => {
            if (err && !hasError) {
              hasError = true;
              this.db.run('ROLLBACK');
              console.error('Error enabling maintenance mode:', err);
              reject(err);
              return;
            }

            completed++;
            if (completed === updateQueries.length && !hasError) {
              this.db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  console.error('Error committing maintenance mode change:', commitErr);
                  reject(commitErr);
                } else {
                  console.log('Maintenance mode enabled');
                  resolve(true);
                }
              });
            }
          });
        });
      });
    });
  }

  /**
   * Disable maintenance mode
   * @returns {Promise<boolean>}
   */
  async disable() {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE system_status SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?';
      
      this.db.run(query, ['false', 'maintenance_mode'], (err) => {
        if (err) {
          console.error('Error disabling maintenance mode:', err);
          reject(err);
          return;
        }

        console.log('Maintenance mode disabled');
        resolve(true);
      });
    });
  }

  /**
   * Update maintenance message without changing mode status
   * @param {string} message - New maintenance message
   * @returns {Promise<boolean>}
   */
  async updateMessage(message) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE system_status SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?';
      
      this.db.run(query, [message, 'maintenance_message'], (err) => {
        if (err) {
          console.error('Error updating maintenance message:', err);
          reject(err);
          return;
        }

        console.log('Maintenance message updated');
        resolve(true);
      });
    });
  }

  /**
   * Get maintenance mode history/logs
   * @returns {Promise<Array>}
   */
  async getHistory() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT key, value, updated_at 
        FROM system_status 
        WHERE key IN ('maintenance_mode', 'maintenance_message')
        ORDER BY updated_at DESC
        LIMIT 50
      `;

      this.db.all(query, (err, rows) => {
        if (err) {
          console.error('Error getting maintenance history:', err);
          reject(err);
          return;
        }

        resolve(rows);
      });
    });
  }
}

module.exports = new MaintenanceModeService();
