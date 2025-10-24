import { Sequelize } from 'sequelize';
import winston from 'winston';
declare const logger: winston.Logger;
declare const sequelize: Sequelize;
export declare const initializeDatabase: () => Promise<void>;
export { sequelize, logger };
//# sourceMappingURL=database.d.ts.map