"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceController_1 = require("../controllers/serviceController");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// GET /services - Get all services with optional filtering
router.get('/', validation_1.validateSearchQuery, serviceController_1.ServiceController.getAllServices);
// GET /services/stats - Get service statistics
router.get('/stats', serviceController_1.ServiceController.getServiceStats);
// GET /services/:id - Get service by ID
router.get('/:id', validation_1.validateUUID, serviceController_1.ServiceController.getServiceById);
// POST /services - Create new service
router.post('/', validation_1.validateServiceCreate, serviceController_1.ServiceController.createService);
// PUT /services/:id - Update service
router.put('/:id', validation_1.validateUUID, validation_1.validateServiceUpdate, serviceController_1.ServiceController.updateService);
// DELETE /services/:id - Delete service
router.delete('/:id', validation_1.validateUUID, serviceController_1.ServiceController.deleteService);
// GET /services/:id/health - Get service health status
router.get('/:id/health', validation_1.validateUUID, serviceController_1.ServiceController.getServiceHealth);
exports.default = router;
//# sourceMappingURL=services.js.map