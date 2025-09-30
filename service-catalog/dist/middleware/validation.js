"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUUID = exports.validateSearchQuery = exports.validateServiceUpdate = exports.validateServiceCreate = void 0;
const joi_1 = __importDefault(require("joi"));
const deploymentInfoSchema = joi_1.default.object({
    environment: joi_1.default.string().required(),
    namespace: joi_1.default.string().optional(),
    cluster: joi_1.default.string().optional(),
    replicas: joi_1.default.number().integer().min(0).optional(),
    resources: joi_1.default.object({
        cpu: joi_1.default.string().optional(),
        memory: joi_1.default.string().optional(),
        storage: joi_1.default.string().optional(),
    }).optional(),
});
const serviceCreateSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().min(1).max(1000).required(),
    version: joi_1.default.string().required(),
    owner: joi_1.default.string().required(),
    team: joi_1.default.string().required(),
    repositoryUrl: joi_1.default.string().uri().optional(),
    documentationUrl: joi_1.default.string().uri().optional(),
    healthEndpoint: joi_1.default.string().uri().optional(),
    tags: joi_1.default.array().items(joi_1.default.string()).default([]),
    dependencies: joi_1.default.array().items(joi_1.default.string()).default([]),
    deploymentInfo: deploymentInfoSchema.required(),
});
const serviceUpdateSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).optional(),
    description: joi_1.default.string().min(1).max(1000).optional(),
    version: joi_1.default.string().optional(),
    owner: joi_1.default.string().optional(),
    team: joi_1.default.string().optional(),
    repositoryUrl: joi_1.default.string().uri().optional(),
    documentationUrl: joi_1.default.string().uri().optional(),
    healthEndpoint: joi_1.default.string().uri().optional(),
    status: joi_1.default.string().valid('healthy', 'unhealthy', 'degraded', 'unknown', 'maintenance').optional(),
    tags: joi_1.default.array().items(joi_1.default.string()).optional(),
    dependencies: joi_1.default.array().items(joi_1.default.string()).optional(),
    deploymentInfo: deploymentInfoSchema.optional(),
});
const searchQuerySchema = joi_1.default.object({
    query: joi_1.default.string().optional(),
    owner: joi_1.default.string().optional(),
    team: joi_1.default.string().optional(),
    status: joi_1.default.string().valid('healthy', 'unhealthy', 'degraded', 'unknown', 'maintenance').optional(),
    tags: joi_1.default.array().items(joi_1.default.string()).optional(),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    offset: joi_1.default.number().integer().min(0).default(0),
});
const validateServiceCreate = (req, res, next) => {
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
exports.validateServiceCreate = validateServiceCreate;
const validateServiceUpdate = (req, res, next) => {
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
exports.validateServiceUpdate = validateServiceUpdate;
const validateSearchQuery = (req, res, next) => {
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
exports.validateSearchQuery = validateSearchQuery;
const validateUUID = (req, res, next) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({
            error: 'Invalid service ID format',
        });
    }
    next();
};
exports.validateUUID = validateUUID;
//# sourceMappingURL=validation.js.map