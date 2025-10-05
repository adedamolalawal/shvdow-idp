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
  serviceType: ServiceType;
  lifecycle: ServiceLifecycle;
  sla?: ServiceSLA;
  contacts: ServiceContacts;
  metadata: Record<string, any>;
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

// New enhanced types
export enum ServiceType {
  API = 'api',
  WEB_SERVICE = 'web-service',
  DATABASE = 'database',
  MESSAGE_QUEUE = 'message-queue',
  CACHE = 'cache',
  STORAGE = 'storage',
  MONITORING = 'monitoring',
  SECURITY = 'security',
  INFRASTRUCTURE = 'infrastructure',
  LIBRARY = 'library',
  TOOL = 'tool',
  OTHER = 'other'
}

export enum ServiceLifecycle {
  PLANNING = 'planning',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
  DEPRECATED = 'deprecated',
  RETIRED = 'retired'
}

export interface ServiceSLA {
  availability: number; // percentage (e.g., 99.9)
  responseTime: number; // milliseconds
  errorRate: number; // percentage
  throughput?: number; // requests per second
}

export interface ServiceContacts {
  owner: string;
  maintainers: string[];
  oncall?: string;
  slack?: string;
  email?: string;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  serviceType: ServiceType;
  defaultTags: string[];
  requiredFields: string[];
  template: Partial<ServiceCreateRequest>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceDependency {
  id: string;
  serviceId: string;
  dependsOnServiceId: string;
  dependencyType: DependencyType;
  isRequired: boolean;
  description?: string;
  createdAt: Date;
}

export enum DependencyType {
  RUNTIME = 'runtime',
  BUILD = 'build',
  DATA = 'data',
  NETWORK = 'network',
  CONFIGURATION = 'configuration'
}

export interface ServiceMetrics {
  id: string;
  serviceId: string;
  timestamp: Date;
  availability: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
}

export interface ServiceIncident {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startTime: Date;
  endTime?: Date;
  assignee?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved'
}

export interface ServiceAnalytics {
  serviceId: string;
  period: string; // '24h', '7d', '30d'
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    availability: number;
    peakThroughput: number;
  };
  trends: {
    responseTime: number[]; // array of values over time
    errorRate: number[];
    throughput: number[];
  };
  incidents: ServiceIncident[];
}
