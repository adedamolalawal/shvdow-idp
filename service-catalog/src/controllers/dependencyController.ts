import { Request, Response } from 'express';
import { ServiceDependency } from '../models/ServiceDependency';
import { Service } from '../models/Service';
import { DependencyType } from '../types';
import { logger } from '../database/database';

export class DependencyController {
  // Get dependencies for a service
  static async getServiceDependencies(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;

      // Check if service exists
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      const dependencies = await ServiceDependency.findAll({
        where: { serviceId },
        include: [
          {
            model: Service,
            as: 'dependsOnService',
            attributes: ['id', 'name', 'description', 'status', 'serviceType'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.json({
        serviceId,
        dependencies,
        total: dependencies.length,
      });
    } catch (error) {
      logger.error('Error fetching service dependencies:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service dependencies',
      });
    }
  }

  // Get services that depend on a specific service
  static async getServiceDependents(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;

      // Check if service exists
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      const dependents = await ServiceDependency.findAll({
        where: { dependsOnServiceId: serviceId },
        include: [
          {
            model: Service,
            as: 'service',
            attributes: ['id', 'name', 'description', 'status', 'serviceType'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.json({
        serviceId,
        dependents,
        total: dependents.length,
      });
    } catch (error) {
      logger.error('Error fetching service dependents:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service dependents',
      });
    }
  }

  // Create a new dependency
  static async createDependency(req: Request, res: Response) {
    try {
      const dependencyData = req.body;

      // Validate required fields
      const requiredFields = ['serviceId', 'dependsOnServiceId', 'dependencyType'];
      for (const field of requiredFields) {
        if (!dependencyData[field]) {
          return res.status(400).json({
            error: 'Validation error',
            message: `${field} is required`,
          });
        }
      }

      // Validate dependency type
      if (!Object.values(DependencyType).includes(dependencyData.dependencyType)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid dependency type',
        });
      }

      // Check if both services exist
      const [service, dependsOnService] = await Promise.all([
        Service.findByPk(dependencyData.serviceId),
        Service.findByPk(dependencyData.dependsOnServiceId),
      ]);

      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
          message: 'Source service does not exist',
        });
      }

      if (!dependsOnService) {
        return res.status(404).json({
          error: 'Service not found',
          message: 'Target service does not exist',
        });
      }

      // Prevent self-dependency
      if (dependencyData.serviceId === dependencyData.dependsOnServiceId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Service cannot depend on itself',
        });
      }

      // Check for circular dependencies (basic check)
      const existingDependency = await ServiceDependency.findOne({
        where: {
          serviceId: dependencyData.dependsOnServiceId,
          dependsOnServiceId: dependencyData.serviceId,
        },
      });

      if (existingDependency) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'This would create a circular dependency',
        });
      }

      const dependency = await ServiceDependency.create(dependencyData);

      // Include related service information in response
      const createdDependency = await ServiceDependency.findByPk(dependency.id, {
        include: [
          {
            model: Service,
            as: 'service',
            attributes: ['id', 'name', 'description', 'status', 'serviceType'],
          },
          {
            model: Service,
            as: 'dependsOnService',
            attributes: ['id', 'name', 'description', 'status', 'serviceType'],
          },
        ],
      });

      res.status(201).json(createdDependency);
    } catch (error) {
      logger.error('Error creating dependency:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid data',
        });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This dependency already exists',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create dependency',
      });
    }
  }

  // Update a dependency
  static async updateDependency(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const dependency = await ServiceDependency.findByPk(id);

      if (!dependency) {
        return res.status(404).json({
          error: 'Dependency not found',
        });
      }

      // Validate dependency type if provided
      if (updateData.dependencyType && !Object.values(DependencyType).includes(updateData.dependencyType)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid dependency type',
        });
      }

      await dependency.update(updateData);

      // Include related service information in response
      const updatedDependency = await ServiceDependency.findByPk(dependency.id, {
        include: [
          {
            model: Service,
            as: 'service',
            attributes: ['id', 'name', 'description', 'status', 'serviceType'],
          },
          {
            model: Service,
            as: 'dependsOnService',
            attributes: ['id', 'name', 'description', 'status', 'serviceType'],
          },
        ],
      });

      res.json(updatedDependency);
    } catch (error) {
      logger.error('Error updating dependency:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid data',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update dependency',
      });
    }
  }

  // Delete a dependency
  static async deleteDependency(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const dependency = await ServiceDependency.findByPk(id);

      if (!dependency) {
        return res.status(404).json({
          error: 'Dependency not found',
        });
      }

      await dependency.destroy();

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting dependency:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete dependency',
      });
    }
  }

  // Get dependency graph for visualization
  static async getDependencyGraph(req: Request, res: Response) {
    try {
      const { depth = 3 } = req.query;
      const maxDepth = Math.min(parseInt(depth as string) || 3, 10); // Limit depth to prevent infinite loops

      // Get all services and dependencies
      const [services, dependencies] = await Promise.all([
        Service.findAll({
          attributes: ['id', 'name', 'description', 'status', 'serviceType', 'lifecycle'],
        }),
        ServiceDependency.findAll({
          attributes: ['id', 'serviceId', 'dependsOnServiceId', 'dependencyType', 'isRequired'],
        }),
      ]);

      // Build graph structure
      const nodes = services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        status: service.status,
        serviceType: service.serviceType,
        lifecycle: service.lifecycle,
      }));

      const edges = dependencies.map(dep => ({
        id: dep.id,
        source: dep.serviceId,
        target: dep.dependsOnServiceId,
        type: dep.dependencyType,
        required: dep.isRequired,
      }));

      res.json({
        nodes,
        edges,
        metadata: {
          totalServices: services.length,
          totalDependencies: dependencies.length,
          maxDepth,
        },
      });
    } catch (error) {
      logger.error('Error fetching dependency graph:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch dependency graph',
      });
    }
  }
}
