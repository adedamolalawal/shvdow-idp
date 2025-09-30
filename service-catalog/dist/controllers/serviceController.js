"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceController = void 0;
const sequelize_1 = require("sequelize");
const Service_1 = require("../models/Service");
const HealthCheck_1 = require("../models/HealthCheck");
const types_1 = require("../types");
const database_1 = require("../database/database");
class ServiceController {
    // Get all services with optional filtering
    static async getAllServices(req, res) {
        try {
            const query = req.query;
            const whereClause = {};
            // Build where clause based on query parameters
            if (query.query) {
                whereClause[sequelize_1.Op.or] = [
                    { name: { [sequelize_1.Op.like]: `%${query.query}%` } },
                    { description: { [sequelize_1.Op.like]: `%${query.query}%` } },
                ];
            }
            if (query.owner) {
                whereClause.owner = query.owner;
            }
            if (query.team) {
                whereClause.team = query.team;
            }
            if (query.status) {
                whereClause.status = query.status;
            }
            if (query.tags && query.tags.length > 0) {
                whereClause.tags = {
                    [sequelize_1.Op.contains]: query.tags,
                };
            }
            const services = await Service_1.Service.findAndCountAll({
                where: whereClause,
                limit: query.limit || 20,
                offset: query.offset || 0,
                order: [['updatedAt', 'DESC']],
                include: [
                    {
                        model: HealthCheck_1.HealthCheck,
                        as: 'healthChecks',
                        limit: 1,
                        order: [['timestamp', 'DESC']],
                        required: false,
                    },
                ],
            });
            res.json({
                services: services.rows,
                total: services.count,
                limit: query.limit || 20,
                offset: query.offset || 0,
            });
        }
        catch (error) {
            database_1.logger.error('Error fetching services:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch services',
            });
        }
    }
    // Get service by ID
    static async getServiceById(req, res) {
        try {
            const { id } = req.params;
            const service = await Service_1.Service.findByPk(id, {
                include: [
                    {
                        model: HealthCheck_1.HealthCheck,
                        as: 'healthChecks',
                        limit: 10,
                        order: [['timestamp', 'DESC']],
                        required: false,
                    },
                ],
            });
            if (!service) {
                return res.status(404).json({
                    error: 'Service not found',
                });
            }
            res.json(service);
        }
        catch (error) {
            database_1.logger.error('Error fetching service:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch service',
            });
        }
    }
    // Create new service
    static async createService(req, res) {
        try {
            const serviceData = req.body;
            // Check if service with same name already exists
            const existingService = await Service_1.Service.findOne({
                where: { name: serviceData.name },
            });
            if (existingService) {
                return res.status(409).json({
                    error: 'Service already exists',
                    message: `Service with name '${serviceData.name}' already exists`,
                });
            }
            const service = await Service_1.Service.create({
                ...serviceData,
                status: types_1.ServiceStatus.UNKNOWN,
                tags: serviceData.tags || [],
                dependencies: serviceData.dependencies || [],
            });
            database_1.logger.info(`Service created: ${service.name} (${service.id})`);
            res.status(201).json(service);
        }
        catch (error) {
            database_1.logger.error('Error creating service:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to create service',
            });
        }
    }
    // Update service
    static async updateService(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const service = await Service_1.Service.findByPk(id);
            if (!service) {
                return res.status(404).json({
                    error: 'Service not found',
                });
            }
            // Check if name is being updated and if it conflicts
            if (updateData.name && updateData.name !== service.name) {
                const existingService = await Service_1.Service.findOne({
                    where: { name: updateData.name },
                });
                if (existingService) {
                    return res.status(409).json({
                        error: 'Service name already exists',
                        message: `Service with name '${updateData.name}' already exists`,
                    });
                }
            }
            await service.update(updateData);
            database_1.logger.info(`Service updated: ${service.name} (${service.id})`);
            res.json(service);
        }
        catch (error) {
            database_1.logger.error('Error updating service:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to update service',
            });
        }
    }
    // Delete service
    static async deleteService(req, res) {
        try {
            const { id } = req.params;
            const service = await Service_1.Service.findByPk(id);
            if (!service) {
                return res.status(404).json({
                    error: 'Service not found',
                });
            }
            await service.destroy();
            database_1.logger.info(`Service deleted: ${service.name} (${service.id})`);
            res.status(204).send();
        }
        catch (error) {
            database_1.logger.error('Error deleting service:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to delete service',
            });
        }
    }
    // Get service health status
    static async getServiceHealth(req, res) {
        try {
            const { id } = req.params;
            const service = await Service_1.Service.findByPk(id);
            if (!service) {
                return res.status(404).json({
                    error: 'Service not found',
                });
            }
            const latestHealthCheck = await HealthCheck_1.HealthCheck.findOne({
                where: { serviceId: id },
                order: [['timestamp', 'DESC']],
            });
            res.json({
                serviceId: id,
                serviceName: service.name,
                status: service.status,
                lastHealthCheck: latestHealthCheck,
            });
        }
        catch (error) {
            database_1.logger.error('Error fetching service health:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch service health',
            });
        }
    }
    // Get service statistics
    static async getServiceStats(req, res) {
        try {
            const totalServices = await Service_1.Service.count();
            const servicesByStatus = await Service_1.Service.findAll({
                attributes: ['status', [Service_1.Service.sequelize.fn('COUNT', '*'), 'count']],
                group: ['status'],
                raw: true,
            });
            const servicesByTeam = await Service_1.Service.findAll({
                attributes: ['team', [Service_1.Service.sequelize.fn('COUNT', '*'), 'count']],
                group: ['team'],
                order: [[Service_1.Service.sequelize.fn('COUNT', '*'), 'DESC']],
                limit: 10,
                raw: true,
            });
            res.json({
                total: totalServices,
                byStatus: servicesByStatus,
                byTeam: servicesByTeam,
            });
        }
        catch (error) {
            database_1.logger.error('Error fetching service stats:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch service statistics',
            });
        }
    }
}
exports.ServiceController = ServiceController;
//# sourceMappingURL=serviceController.js.map