import { Sequelize } from 'sequelize';
import path from 'path';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'service-catalog.log' })
  ]
});

// Initialize SQLite database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../data/service-catalog.db'),
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: false,
  }
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Unable to connect to database:', error);
    throw error;
  }
};

export { sequelize, logger };

