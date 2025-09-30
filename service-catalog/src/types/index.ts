export interface ServiceMetadata {
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
  createdAt: Date;
  updatedAt: Date;
  lastHealthCheck?: Date;
}

export interface DeploymentInfo {
  environment: string;
  namespace?: string;
  cluster?: string;
  replicas?: number;
  resources?: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu?: string;
  memory?: string;
  storage?: string;
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown',
  MAINTENANCE = 'maintenance'
}

export interface HealthCheckResult {
  id: string;
  serviceId: string;
  status: ServiceStatus;
  responseTime: number;
  statusCode?: number;
  message?: string;
  timestamp: Date;
}

export interface ServiceSearchQuery {
  query?: string;
  owner?: string;
  team?: string;
  status?: ServiceStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ServiceCreateRequest {
  name: string;
  description: string;
  version: string;
  owner: string;
  team: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  healthEndpoint?: string;
  tags?: string[];
  dependencies?: string[];
  deploymentInfo: DeploymentInfo;
}

export interface ServiceUpdateRequest extends Partial<ServiceCreateRequest> {
  status?: ServiceStatus;
}

