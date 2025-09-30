"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const winston_1 = __importDefault(require("winston"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' })
    ]
});
let redisClient = null;
logger.info('Redis disabled - running in stateless mode');
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (redisClient) {
            try {
                const isBlacklisted = await redisClient.get(`blacklist:${token}`);
                if (isBlacklisted) {
                    return res.status(401).json({ error: 'Token has been revoked' });
                }
            }
            catch (error) {
                logger.warn('Redis check failed, continuing without blacklist check:', error);
            }
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        logger.error('Token verification failed', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const token = jsonwebtoken_1.default.sign({
            userId: 'mock-user-id',
            username,
            roles: ['developer'],
            permissions: ['read', 'write']
        }, JWT_SECRET, { expiresIn: '24h' });
        if (redisClient) {
            try {
                await redisClient.setEx(`session:${username}`, 86400, token);
            }
            catch (error) {
                logger.warn('Failed to store session in Redis:', error);
            }
        }
        res.json({
            token,
            user: {
                id: 'mock-user-id',
                username,
                roles: ['developer']
            }
        });
    }
    catch (error) {
        logger.error('Login error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/auth/logout', authenticateToken, async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (redisClient) {
            try {
                await redisClient.setEx(`blacklist:${token}`, 86400, 'true');
                await redisClient.del(`session:${req.user.username}`);
            }
            catch (error) {
                logger.warn('Failed to update Redis during logout:', error);
            }
        }
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        logger.error('Logout error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
const serviceRoutes = [
    {
        path: '/api/gitops',
        target: process.env.GITOPS_SERVICE_URL || 'http://gitops-core:8080',
        auth: true
    },
    {
        path: '/api/cicd',
        target: process.env.CICD_SERVICE_URL || 'http://cicd-engine:8080',
        auth: true
    },
    {
        path: '/api/services',
        target: process.env.SERVICE_CATALOG_URL || 'http://localhost:8081',
        auth: true
    },
    {
        path: '/api/metrics',
        target: process.env.METRICS_SERVICE_URL || 'http://metrics-collector:8080',
        auth: true
    },
    {
        path: '/api/alerts',
        target: process.env.ALERT_SERVICE_URL || 'http://alert-engine:8080',
        auth: true
    },
    {
        path: '/api/teams',
        target: process.env.TEAM_SERVICE_URL || 'http://team-management:8080',
        auth: true
    },
    {
        path: '/api/docs',
        target: process.env.DOCS_SERVICE_URL || 'http://docs-engine:8080',
        auth: true
    }
];
serviceRoutes.forEach(route => {
    const middleware = route.auth ? [authenticateToken] : [];
    app.use(route.path, ...middleware, (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: route.target,
        changeOrigin: true,
        pathRewrite: {
            [`^${route.path}`]: ''
        },
        onError: (err, req, res) => {
            logger.error(`Proxy error for ${route.path}:`, err);
            res.status(502).json({ error: 'Service temporarily unavailable' });
        },
        onProxyReq: (proxyReq, req) => {
            if (req.user) {
                proxyReq.setHeader('X-User-ID', req.user.userId);
                proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles));
                proxyReq.setHeader('X-User-Permissions', JSON.stringify(req.user.permissions));
            }
        }
    }));
});
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        requestId: req.id
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    if (redisClient) {
        try {
            await redisClient.quit();
        }
        catch (error) {
            logger.warn('Error closing Redis connection:', error);
        }
    }
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    if (redisClient) {
        try {
            await redisClient.quit();
        }
        catch (error) {
            logger.warn('Error closing Redis connection:', error);
        }
    }
    process.exit(0);
});
app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map