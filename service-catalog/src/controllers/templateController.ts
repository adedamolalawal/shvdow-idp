import { Request, Response } from 'express';
import { ServiceTemplate } from '../models/ServiceTemplate';
import { ServiceType } from '../types';
import { logger } from '../database/database';

export class TemplateController {
  // Get all service templates
  static async getAllTemplates(req: Request, res: Response) {
    try {
      const { serviceType } = req.query;
      const whereClause: any = {};

      if (serviceType && Object.values(ServiceType).includes(serviceType as ServiceType)) {
        whereClause.serviceType = serviceType;
      }

      const templates = await ServiceTemplate.findAll({
        where: whereClause,
        order: [['name', 'ASC']],
      });

      res.json({
        templates,
        total: templates.length,
      });
    } catch (error) {
      logger.error('Error fetching templates:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch templates',
      });
    }
  }

  // Get template by ID
  static async getTemplateById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await ServiceTemplate.findByPk(id);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
        });
      }

      res.json(template);
    } catch (error) {
      logger.error('Error fetching template:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch template',
      });
    }
  }

  // Create new template
  static async createTemplate(req: Request, res: Response) {
    try {
      const templateData = req.body;

      // Validate required fields
      const requiredFields = ['name', 'description', 'serviceType', 'template'];
      for (const field of requiredFields) {
        if (!templateData[field]) {
          return res.status(400).json({
            error: 'Validation error',
            message: `${field} is required`,
          });
        }
      }

      // Validate service type
      if (!Object.values(ServiceType).includes(templateData.serviceType)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid service type',
        });
      }

      const template = await ServiceTemplate.create(templateData);

      res.status(201).json(template);
    } catch (error) {
      logger.error('Error creating template:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid data',
        });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Template with this name already exists',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create template',
      });
    }
  }

  // Update template
  static async updateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const template = await ServiceTemplate.findByPk(id);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
        });
      }

      // Validate service type if provided
      if (updateData.serviceType && !Object.values(ServiceType).includes(updateData.serviceType)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid service type',
        });
      }

      await template.update(updateData);

      res.json(template);
    } catch (error) {
      logger.error('Error updating template:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid data',
        });
      }

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Template with this name already exists',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update template',
      });
    }
  }

  // Delete template
  static async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await ServiceTemplate.findByPk(id);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
        });
      }

      await template.destroy();

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting template:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete template',
      });
    }
  }

  // Create service from template
  static async createServiceFromTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const serviceData = req.body;

      const template = await ServiceTemplate.findByPk(id);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
        });
      }

      // Merge template data with provided service data
      const mergedData = {
        ...template.template,
        ...serviceData,
        serviceType: template.serviceType,
        tags: [...(template.defaultTags || []), ...(serviceData.tags || [])],
      };

      // Validate required fields from template
      for (const field of template.requiredFields) {
        if (!mergedData[field]) {
          return res.status(400).json({
            error: 'Validation error',
            message: `${field} is required for this template`,
          });
        }
      }

      res.json({
        templateId: template.id,
        templateName: template.name,
        serviceData: mergedData,
        message: 'Service data prepared from template. Use POST /api/services to create the service.',
      });
    } catch (error) {
      logger.error('Error creating service from template:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create service from template',
      });
    }
  }
}
