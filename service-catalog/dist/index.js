"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("./database/database");
const healthMonitor_1 = require("./services/healthMonitor");
const services_1 = __importDefault(require("./routes/services"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8081;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    database_1.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
});
// Health check endpoint for the service itself
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'service-catalog',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// API routes
app.use('/services', services_1.default);
app.use('/', services_1.default); // Also handle root path for proxy
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    database_1.logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
    });
});
// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        await (0, database_1.initializeDatabase)();
        // Start health monitoring
        const healthMonitor = healthMonitor_1.HealthMonitor.getInstance();
        healthMonitor.start();
        // Start server
        app.listen(PORT, () => {
            database_1.logger.info(`Service Catalog service running on port ${PORT}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            database_1.logger.info('SIGTERM received, shutting down gracefully');
            healthMonitor.stop();
            process.exit(0);
        });
        process.on('SIGINT', () => {
            database_1.logger.info('SIGINT received, shutting down gracefully');
            healthMonitor.stop();
            process.exit(0);
        });
    }
    catch (error) {
        database_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map