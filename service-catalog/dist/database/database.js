"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.sequelize = exports.initializeDatabase = void 0;
const sequelize_1 = require("sequelize");
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'service-catalog.log' })
    ]
});
exports.logger = logger;
// Initialize SQLite database
const sequelize = new sequelize_1.Sequelize({
    dialect: 'sqlite',
    storage: path_1.default.join(__dirname, '../../data/service-catalog.db'),
    logging: (msg) => logger.debug(msg),
    define: {
        timestamps: true,
        underscored: false,
    }
});
exports.sequelize = sequelize;
const initializeDatabase = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        // Sync all models
        await sequelize.sync({ alter: true });
        logger.info('Database models synchronized');
    }
    catch (error) {
        logger.error('Unable to connect to database:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
//# sourceMappingURL=database.js.map