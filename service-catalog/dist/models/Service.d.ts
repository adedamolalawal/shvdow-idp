import { Model, Optional } from 'sequelize';
import { ServiceMetadata, ServiceStatus, DeploymentInfo } from '../types';
interface ServiceCreationAttributes extends Optional<ServiceMetadata, 'id' | 'createdAt' | 'updatedAt' | 'lastHealthCheck'> {
}
export declare class Service extends Model<ServiceMetadata, ServiceCreationAttributes> implements ServiceMetadata {
    id: string;
    name: string;
    description: string;
    version: string;
    owner: string;
    team: string;
    repositoryUrl?: string;
    documentationUrl?: string;
    healthEndpoint?: string;
    status: ServiceStatus;
    tags: string[];
    dependencies: string[];
    deploymentInfo: DeploymentInfo;
    lastHealthCheck?: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export {};
//# sourceMappingURL=Service.d.ts.map