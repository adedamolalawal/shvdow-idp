"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const Service_1 = require("../models/Service");
const HealthCheck_1 = require("../models/HealthCheck");
const types_1 = require("../types");
const database_1 = require("../database/database");
class HealthMonitor {
    constructor() {
        this.isRunning = false;
    }
    static getInstance() {
        if (!HealthMonitor.instance) {
            HealthMonitor.instance = new HealthMonitor();
        }
        return HealthMonitor.instance;
    }
    // Start the health monitoring cron job
    start() {
        if (this.isRunning) {
            database_1.logger.warn('Health monitor is already running');
            return;
        }
        // Run health checks every 5 minutes
        node_cron_1.default.schedule('*/5 * * * *', async () => {
            await this.runHealthChecks();
        });
        // Run initial health check
        setTimeout(() => {
            this.runHealthChecks();
        }, 10000); // Wait 10 seconds after startup
        this.isRunning = true;
        database_1.logger.info('Health monitor started - running every 5 minutes');
    }
    // Stop the health monitoring
    stop() {
        this.isRunning = false;
        database_1.logger.info('Health monitor stopped');
    }
    // Run health checks for all services with health endpoints
    async runHealthChecks() {
        try {
            const services = await Service_1.Service.findAll();
            // Filter services that have health endpoints
            const servicesWithHealthEndpoints = services.filter(service => service.healthEndpoint && service.healthEndpoint.trim() !== '');
            database_1.logger.info(`Running health checks for ${servicesWithHealthEndpoints.length} services`);
            const healthCheckPromises = servicesWithHealthEndpoints.map(service => this.checkServiceHealth(service));
            await Promise.allSettled(healthCheckPromises);
        }
        catch (error) {
            database_1.logger.error('Error running health checks:', error);
        }
    }
    // Check health for a single service
    async checkServiceHealth(service) {
        if (!service.healthEndpoint) {
            return;
        }
        const startTime = Date.now();
        let status = types_1.ServiceStatus.UNKNOWN;
        let statusCode;
        let message;
        try {
            const response = await axios_1.default.get(service.healthEndpoint, {
                timeout: 10000, // 10 second timeout
                validateStatus: () => true, // Don't throw on non-2xx status codes
            });
            statusCode = response.status;
            const responseTime = Date.now() - startTime;
            // Determine status based on HTTP status code
            if (response.status >= 200 && response.status < 300) {
                status = types_1.ServiceStatus.HEALTHY;
                message = 'Health check passed';
            }
            else if (response.status >= 500) {
                status = types_1.ServiceStatus.UNHEALTHY;
                message = `Server error: ${response.status}`;
            }
            else {
                status = types_1.ServiceStatus.DEGRADED;
                message = `Unexpected status: ${response.status}`;
            }
            // Create health check record
            await HealthCheck_1.HealthCheck.create({
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
                database_1.logger.info(`Service ${service.name} status changed from ${service.status} to ${status}`);
            }
            else {
                await service.update({
                    lastHealthCheck: new Date(),
                });
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            status = types_1.ServiceStatus.UNHEALTHY;
            message = error.code === 'ECONNREFUSED'
                ? 'Connection refused'
                : error.message || 'Health check failed';
            // Create health check record for failed check
            await HealthCheck_1.HealthCheck.create({
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
                database_1.logger.warn(`Service ${service.name} health check failed: ${message}`);
            }
            else {
                await service.update({
                    lastHealthCheck: new Date(),
                });
            }
        }
    }
    // Manually trigger health check for a specific service
    async checkService(serviceId) {
        try {
            const service = await Service_1.Service.findByPk(serviceId);
            if (!service) {
                throw new Error('Service not found');
            }
            if (!service.healthEndpoint) {
                throw new Error('Service has no health endpoint configured');
            }
            await this.checkServiceHealth(service);
            database_1.logger.info(`Manual health check completed for service: ${service.name}`);
        }
        catch (error) {
            database_1.logger.error(`Error in manual health check for service ${serviceId}:`, error);
            throw error;
        }
    }
    // Get health check history for a service
    async getHealthHistory(serviceId, limit = 50) {
        return await HealthCheck_1.HealthCheck.findAll({
            where: { serviceId },
            order: [['timestamp', 'DESC']],
            limit,
        });
    }
    // Clean up old health check records (keep last 1000 per service)
    async cleanupOldHealthChecks() {
        try {
            const services = await Service_1.Service.findAll();
            for (const service of services) {
                const healthChecks = await HealthCheck_1.HealthCheck.findAll({
                    where: { serviceId: service.id },
                    order: [['timestamp', 'DESC']],
                    offset: 1000, // Keep the latest 1000 records
                });
                if (healthChecks.length > 0) {
                    const idsToDelete = healthChecks.map(hc => hc.id);
                    await HealthCheck_1.HealthCheck.destroy({
                        where: {
                            id: idsToDelete,
                        },
                    });
                    database_1.logger.info(`Cleaned up ${healthChecks.length} old health check records for service ${service.name}`);
                }
            }
        }
        catch (error) {
            database_1.logger.error('Error cleaning up old health checks:', error);
        }
    }
}
exports.HealthMonitor = HealthMonitor;
//# sourceMappingURL=healthMonitor.js.map