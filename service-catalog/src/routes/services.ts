import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import {
  validateServiceCreate,
  validateServiceUpdate,
  validateSearchQuery,
  validateUUID,
} from '../middleware/validation';

const router = Router();

// GET /services - Get all services with optional filtering
router.get('/', validateSearchQuery, ServiceController.getAllServices);

// GET /services/stats - Get service statistics
router.get('/stats', ServiceController.getServiceStats);

// GET /services/:id - Get service by ID
router.get('/:id', validateUUID, ServiceController.getServiceById);

// POST /services - Create new service
router.post('/', validateServiceCreate, ServiceController.createService);

// PUT /services/:id - Update service
router.put('/:id', validateUUID, validateServiceUpdate, ServiceController.updateService);

// DELETE /services/:id - Delete service
router.delete('/:id', validateUUID, ServiceController.deleteService);

// GET /services/:id/health - Get service health status
router.get('/:id/health', validateUUID, ServiceController.getServiceHealth);

export default router;

