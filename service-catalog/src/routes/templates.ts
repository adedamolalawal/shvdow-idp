import { Router } from 'express';
import { TemplateController } from '../controllers/templateController';

const router = Router();

// Template routes
router.get('/', TemplateController.getAllTemplates);
router.get('/:id', TemplateController.getTemplateById);
router.post('/', TemplateController.createTemplate);
router.put('/:id', TemplateController.updateTemplate);
router.delete('/:id', TemplateController.deleteTemplate);

// Create service from template
router.post('/:id/create-service', TemplateController.createServiceFromTemplate);

export default router;
