import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ServiceCreateRequest, ServiceUpdateRequest } from '../types';

const deploymentInfoSchema = Joi.object({
  environment: Joi.string().required(),
  namespace: Joi.string().optional(),
  cluster: Joi.string().optional(),
  replicas: Joi.number().integer().min(0).optional(),
  resources: Joi.object({
    cpu: Joi.string().optional(),
    memory: Joi.string().optional(),
    storage: Joi.string().optional(),
  }).optional(),
});

const serviceCreateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(1).max(1000).required(),
  version: Joi.string().required(),
  owner: Joi.string().required(),
  team: Joi.string().required(),
  repositoryUrl: Joi.string().uri().optional(),
  documentationUrl: Joi.string().uri().optional(),
  healthEndpoint: Joi.string().uri().optional(),
  tags: Joi.array().items(Joi.string()).default([]),
  dependencies: Joi.array().items(Joi.string()).default([]),
  deploymentInfo: deploymentInfoSchema.required(),
});

const serviceUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().min(1).max(1000).optional(),
  version: Joi.string().optional(),
  owner: Joi.string().optional(),
  team: Joi.string().optional(),
  repositoryUrl: Joi.string().uri().optional(),
  documentationUrl: Joi.string().uri().optional(),
  healthEndpoint: Joi.string().uri().optional(),
  status: Joi.string().valid('healthy', 'unhealthy', 'degraded', 'unknown', 'maintenance').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  dependencies: Joi.array().items(Joi.string()).optional(),
  deploymentInfo: deploymentInfoSchema.optional(),
});

const searchQuerySchema = Joi.object({
  query: Joi.string().optional(),
  owner: Joi.string().optional(),
  team: Joi.string().optional(),
  status: Joi.string().valid('healthy', 'unhealthy', 'degraded', 'unknown', 'maintenance').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

export const validateServiceCreate = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = serviceCreateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }
  
  req.body = value;
  next();
};

export const validateServiceUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = serviceUpdateSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }
  
  req.body = value;
  next();
};

export const validateSearchQuery = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = searchQuerySchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }
  
  req.query = value;
  next();
};

export const validateUUID = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      error: 'Invalid service ID format',
    });
  }
  
  next();
};

