import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();

// Metrics routes
router.get('/services', MetricsController.getAllServicesMetrics);
router.get('/services/:serviceId', MetricsController.getServiceMetrics);
router.post('/services/:serviceId', MetricsController.recordMetrics);
router.get('/services/:serviceId/analytics', MetricsController.getServiceAnalytics);

export default router;
