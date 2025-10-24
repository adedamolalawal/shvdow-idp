import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Service } from '../models/Service';
import { HealthCheck } from '../models/HealthCheck';
import { ServiceCreateRequest, ServiceUpdateRequest, ServiceSearchQuery, ServiceStatus } from '../types';
import { logger } from '../database/database';

export class ServiceController {
  // Get all services with optional filtering
  static async getAllServices(req: Request, res: Response) {
    try {
      const query = req.query as ServiceSearchQuery;
      const whereClause: any = {};

      // Build where clause based on query parameters
      if (query.query) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${query.query}%` } },
          { description: { [Op.like]: `%${query.query}%` } },
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
          [Op.contains]: query.tags,
        };
      }

      const services = await Service.findAndCountAll({
        where: whereClause,
        limit: query.limit || 20,
        offset: query.offset || 0,
        order: [['updatedAt', 'DESC']],
        include: [
          {
            model: HealthCheck,
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
    } catch (error) {
      logger.error('Error fetching services:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch services',
      });
    }
  }

  // Get service by ID
  static async getServiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id, {
        include: [
          {
            model: HealthCheck,
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
    } catch (error) {
      logger.error('Error fetching service:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service',
      });
    }
  }

  // Create new service
  static async createService(req: Request, res: Response) {
    try {
      const serviceData: ServiceCreateRequest = req.body;

      // Check if service with same name already exists
      const existingService = await Service.findOne({
        where: { name: serviceData.name },
      });

      if (existingService) {
        return res.status(409).json({
          error: 'Service already exists',
          message: `Service with name '${serviceData.name}' already exists`,
        });
      }

      const service = await Service.create({
        ...serviceData,
        status: ServiceStatus.UNKNOWN,
        tags: serviceData.tags || [],
        dependencies: serviceData.dependencies || [],
      });

      logger.info(`Service created: ${service.name} (${service.id})`);

      res.status(201).json(service);
    } catch (error) {
      logger.error('Error creating service:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create service',
      });
    }
  }

  // Update service
  static async updateService(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: ServiceUpdateRequest = req.body;

      const service = await Service.findByPk(id);

      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      // Check if name is being updated and if it conflicts
      if (updateData.name && updateData.name !== service.name) {
        const existingService = await Service.findOne({
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

      logger.info(`Service updated: ${service.name} (${service.id})`);

      res.json(service);
    } catch (error) {
      logger.error('Error updating service:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update service',
      });
    }
  }

  // Delete service
  static async deleteService(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id);

      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      await service.destroy();

      logger.info(`Service deleted: ${service.name} (${service.id})`);

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting service:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete service',
      });
    }
  }

  // Get service health status
  static async getServiceHealth(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id);

      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      const latestHealthCheck = await HealthCheck.findOne({
        where: { serviceId: id },
        order: [['timestamp', 'DESC']],
      });

      res.json({
        serviceId: id,
        serviceName: service.name,
        status: service.status,
        lastHealthCheck: latestHealthCheck,
      });
    } catch (error) {
      logger.error('Error fetching service health:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service health',
      });
    }
  }

  // Get service statistics
  static async getServiceStats(req: Request, res: Response) {
    try {
      const totalServices = await Service.count();
      const servicesByStatus = await Service.findAll({
        attributes: ['status', [Service.sequelize!.fn('COUNT', '*'), 'count']],
        group: ['status'],
        raw: true,
      });

      const servicesByTeam = await Service.findAll({
        attributes: ['team', [Service.sequelize!.fn('COUNT', '*'), 'count']],
        group: ['team'],
        order: [[Service.sequelize!.fn('COUNT', '*'), 'DESC']],
        limit: 10,
        raw: true,
      });

      res.json({
        total: totalServices,
        byStatus: servicesByStatus,
        byTeam: servicesByTeam,
      });
    } catch (error) {
      logger.error('Error fetching service stats:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service statistics',
      });
    }
  }
}
