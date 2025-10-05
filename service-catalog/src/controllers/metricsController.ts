import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { ServiceMetrics } from '../models/ServiceMetrics';
import { Service } from '../models/Service';
import { ServiceAnalytics } from '../types';
import { logger } from '../database/database';

export class MetricsController {
  // Get metrics for a service
  static async getServiceMetrics(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const { 
        period = '24h',
        limit = 100,
        offset = 0 
      } = req.query;

      // Check if service exists
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      // Calculate time range based on period
      const now = new Date();
      let startTime: Date;

      switch (period) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const metrics = await ServiceMetrics.findAndCountAll({
        where: {
          serviceId,
          timestamp: {
            [Op.gte]: startTime,
          },
        },
        order: [['timestamp', 'DESC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        serviceId,
        period,
        metrics: metrics.rows,
        total: metrics.count,
        timeRange: {
          start: startTime,
          end: now,
        },
      });
    } catch (error) {
      logger.error('Error fetching service metrics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service metrics',
      });
    }
  }

  // Record new metrics for a service
  static async recordMetrics(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const metricsData = req.body;

      // Check if service exists
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      // Validate required fields
      const requiredFields = ['availability', 'responseTime', 'errorRate', 'throughput'];
      for (const field of requiredFields) {
        if (metricsData[field] === undefined || metricsData[field] === null) {
          return res.status(400).json({
            error: 'Validation error',
            message: `${field} is required`,
          });
        }
      }

      const metrics = await ServiceMetrics.create({
        serviceId,
        ...metricsData,
      });

      res.status(201).json(metrics);
    } catch (error) {
      logger.error('Error recording metrics:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid data',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to record metrics',
      });
    }
  }

  // Get analytics for a service
  static async getServiceAnalytics(req: Request, res: Response) {
    try {
      const { serviceId } = req.params;
      const { period = '24h' } = req.query;

      // Check if service exists
      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({
          error: 'Service not found',
        });
      }

      // Calculate time range
      const now = new Date();
      let startTime: Date;
      let intervalMinutes: number;

      switch (period) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          intervalMinutes = 5; // 5-minute intervals
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          intervalMinutes = 60; // 1-hour intervals
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          intervalMinutes = 360; // 6-hour intervals
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          intervalMinutes = 1440; // 24-hour intervals
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          intervalMinutes = 60;
      }

      // Get metrics for the period
      const metrics = await ServiceMetrics.findAll({
        where: {
          serviceId,
          timestamp: {
            [Op.gte]: startTime,
          },
        },
        order: [['timestamp', 'ASC']],
      });

      if (metrics.length === 0) {
        return res.json({
          serviceId,
          period,
          metrics: {
            totalRequests: 0,
            averageResponseTime: 0,
            errorRate: 0,
            availability: 0,
            peakThroughput: 0,
          },
          trends: {
            responseTime: [],
            errorRate: [],
            throughput: [],
          },
          incidents: [],
        });
      }

      // Calculate aggregated metrics
      const totalMetrics = metrics.length;
      const totalRequests = metrics.reduce((sum, m) => sum + m.throughput, 0);
      const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalMetrics;
      const averageErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / totalMetrics;
      const averageAvailability = metrics.reduce((sum, m) => sum + m.availability, 0) / totalMetrics;
      const peakThroughput = Math.max(...metrics.map(m => m.throughput));

      // Generate trend data by grouping metrics into intervals
      const trends = {
        responseTime: [] as number[],
        errorRate: [] as number[],
        throughput: [] as number[],
      };

      // Group metrics by time intervals
      const intervalMs = intervalMinutes * 60 * 1000;
      const intervals = Math.ceil((now.getTime() - startTime.getTime()) / intervalMs);

      for (let i = 0; i < intervals; i++) {
        const intervalStart = new Date(startTime.getTime() + i * intervalMs);
        const intervalEnd = new Date(startTime.getTime() + (i + 1) * intervalMs);

        const intervalMetrics = metrics.filter(m => 
          m.timestamp >= intervalStart && m.timestamp < intervalEnd
        );

        if (intervalMetrics.length > 0) {
          const avgResponseTime = intervalMetrics.reduce((sum, m) => sum + m.responseTime, 0) / intervalMetrics.length;
          const avgErrorRate = intervalMetrics.reduce((sum, m) => sum + m.errorRate, 0) / intervalMetrics.length;
          const avgThroughput = intervalMetrics.reduce((sum, m) => sum + m.throughput, 0) / intervalMetrics.length;

          trends.responseTime.push(Math.round(avgResponseTime));
          trends.errorRate.push(Math.round(avgErrorRate * 100) / 100);
          trends.throughput.push(Math.round(avgThroughput * 100) / 100);
        } else {
          trends.responseTime.push(0);
          trends.errorRate.push(0);
          trends.throughput.push(0);
        }
      }

      const analytics: ServiceAnalytics = {
        serviceId,
        period: period as string,
        metrics: {
          totalRequests: Math.round(totalRequests),
          averageResponseTime: Math.round(averageResponseTime),
          errorRate: Math.round(averageErrorRate * 100) / 100,
          availability: Math.round(averageAvailability * 100) / 100,
          peakThroughput: Math.round(peakThroughput * 100) / 100,
        },
        trends,
        incidents: [], // TODO: Fetch from ServiceIncident model
      };

      res.json(analytics);
    } catch (error) {
      logger.error('Error fetching service analytics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service analytics',
      });
    }
  }

  // Get metrics summary for all services
  static async getAllServicesMetrics(req: Request, res: Response) {
    try {
      const { period = '24h' } = req.query;

      // Calculate time range
      const now = new Date();
      let startTime: Date;

      switch (period) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get all services with their latest metrics
      const services = await Service.findAll({
        attributes: ['id', 'name', 'status', 'serviceType', 'lifecycle'],
        include: [
          {
            model: ServiceMetrics,
            as: 'metrics',
            where: {
              timestamp: {
                [Op.gte]: startTime,
              },
            },
            required: false,
            limit: 1,
            order: [['timestamp', 'DESC']],
          },
        ],
      });

      const summary = services.map(service => {
        const latestMetrics = service.metrics?.[0];
        
        return {
          serviceId: service.id,
          serviceName: service.name,
          status: service.status,
          serviceType: service.serviceType,
          lifecycle: service.lifecycle,
          metrics: latestMetrics ? {
            availability: latestMetrics.availability,
            responseTime: latestMetrics.responseTime,
            errorRate: latestMetrics.errorRate,
            throughput: latestMetrics.throughput,
            timestamp: latestMetrics.timestamp,
          } : null,
        };
      });

      res.json({
        period,
        services: summary,
        total: services.length,
        timeRange: {
          start: startTime,
          end: now,
        },
      });
    } catch (error) {
      logger.error('Error fetching all services metrics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch services metrics',
      });
    }
  }
}
