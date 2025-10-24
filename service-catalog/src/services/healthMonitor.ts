import axios from 'axios';
import cron from 'node-cron';
import { Op } from 'sequelize';
import { Service } from '../models/Service';
import { HealthCheck } from '../models/HealthCheck';
import { ServiceStatus } from '../types';
import { logger } from '../database/database';

export class HealthMonitor {
  private static instance: HealthMonitor;
  private isRunning = false;

  private constructor() {}

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  // Start the health monitoring cron job
  start(): void {
    if (this.isRunning) {
      logger.warn('Health monitor is already running');
      return;
    }

    // Run health checks every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.runHealthChecks();
    });

    // Run initial health check
    setTimeout(() => {
      this.runHealthChecks();
    }, 10000); // Wait 10 seconds after startup

    this.isRunning = true;
    logger.info('Health monitor started - running every 5 minutes');
  }

  // Stop the health monitoring
  stop(): void {
    this.isRunning = false;
    logger.info('Health monitor stopped');
  }

  // Run health checks for all services with health endpoints
  private async runHealthChecks(): Promise<void> {
    try {
      const services = await Service.findAll();
      
      // Filter services that have health endpoints
      const servicesWithHealthEndpoints = services.filter(service => 
        service.healthEndpoint && service.healthEndpoint.trim() !== ''
      );

      logger.info(`Running health checks for ${servicesWithHealthEndpoints.length} services`);

      const healthCheckPromises = servicesWithHealthEndpoints.map(service => 
        this.checkServiceHealth(service)
      );

      await Promise.allSettled(healthCheckPromises);
    } catch (error) {
      logger.error('Error running health checks:', error);
    }
  }

  // Check health for a single service
  private async checkServiceHealth(service: Service): Promise<void> {
    if (!service.healthEndpoint) {
      return;
    }

    const startTime = Date.now();
    let status = ServiceStatus.UNKNOWN;
    let statusCode: number | undefined;
    let message: string | undefined;

    try {
      const response = await axios.get(service.healthEndpoint, {
        timeout: 10000, // 10 second timeout
        validateStatus: () => true, // Don't throw on non-2xx status codes
      });

      statusCode = response.status;
      const responseTime = Date.now() - startTime;

      // Determine status based on HTTP status code
      if (response.status >= 200 && response.status < 300) {
        status = ServiceStatus.HEALTHY;
        message = 'Health check passed';
      } else if (response.status >= 500) {
        status = ServiceStatus.UNHEALTHY;
        message = `Server error: ${response.status}`;
      } else {
        status = ServiceStatus.DEGRADED;
        message = `Unexpected status: ${response.status}`;
      }

      // Create health check record
      await HealthCheck.create({
        serviceId: service.id,
        status,
        responseTime,
        statusCode,
        message,
        timestamp: new Date(),
      });

      // Update service status if it has changed
      if (service.status !== status) {
        await service.update({
          status,
          lastHealthCheck: new Date(),
        });
        logger.info(`Service ${service.name} status changed from ${service.status} to ${status}`);
      } else {
        await service.update({
          lastHealthCheck: new Date(),
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      status = ServiceStatus.UNHEALTHY;
      message = error.code === 'ECONNREFUSED' 
        ? 'Connection refused' 
        : error.message || 'Health check failed';

      // Create health check record for failed check
      await HealthCheck.create({
        serviceId: service.id,
        status,
        responseTime,
        message,
        timestamp: new Date(),
      });

      // Update service status
      if (service.status !== status) {
        await service.update({
          status,
          lastHealthCheck: new Date(),
        });
        logger.warn(`Service ${service.name} health check failed: ${message}`);
      } else {
        await service.update({
          lastHealthCheck: new Date(),
        });
      }
    }
  }

  // Manually trigger health check for a specific service
  async checkService(serviceId: string): Promise<void> {
    try {
      const service = await Service.findByPk(serviceId);
      if (!service) {
        throw new Error('Service not found');
      }

      if (!service.healthEndpoint) {
        throw new Error('Service has no health endpoint configured');
      }

      await this.checkServiceHealth(service);
      logger.info(`Manual health check completed for service: ${service.name}`);
    } catch (error) {
      logger.error(`Error in manual health check for service ${serviceId}:`, error);
      throw error;
    }
  }

  // Get health check history for a service
  async getHealthHistory(serviceId: string, limit = 50): Promise<HealthCheck[]> {
    return await HealthCheck.findAll({
      where: { serviceId },
      order: [['timestamp', 'DESC']],
      limit,
    });
  }

  // Clean up old health check records (keep last 1000 per service)
  async cleanupOldHealthChecks(): Promise<void> {
    try {
      const services = await Service.findAll();
      
      for (const service of services) {
        const healthChecks = await HealthCheck.findAll({
          where: { serviceId: service.id },
          order: [['timestamp', 'DESC']],
          offset: 1000, // Keep the latest 1000 records
        });

        if (healthChecks.length > 0) {
          const idsToDelete = healthChecks.map(hc => hc.id);
          await HealthCheck.destroy({
            where: {
              id: idsToDelete,
            },
          });
          logger.info(`Cleaned up ${healthChecks.length} old health check records for service ${service.name}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old health checks:', error);
    }
  }
}
