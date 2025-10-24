import { Router } from 'express';
import { DependencyController } from '../controllers/dependencyController';

const router = Router();

// Dependency routes
router.get('/graph', DependencyController.getDependencyGraph);
router.get('/services/:serviceId/dependencies', DependencyController.getServiceDependencies);
router.get('/services/:serviceId/dependents', DependencyController.getServiceDependents);
router.post('/', DependencyController.createDependency);
router.put('/:id', DependencyController.updateDependency);
router.delete('/:id', DependencyController.deleteDependency);

export default router;
