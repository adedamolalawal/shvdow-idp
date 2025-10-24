import { Model, Optional } from 'sequelize';
import { HealthCheckResult, ServiceStatus } from '../types';
interface HealthCheckCreationAttributes extends Optional<HealthCheckResult, 'id'> {
}
export declare class HealthCheck extends Model<HealthCheckResult, HealthCheckCreationAttributes> implements HealthCheckResult {
    id: string;
    serviceId: string;
    status: ServiceStatus;
    responseTime: number;
    statusCode?: number;
    message?: string;
    timestamp: Date;
}
export {};
//# sourceMappingURL=HealthCheck.d.ts.map