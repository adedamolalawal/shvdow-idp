import { ServiceType, ServiceLifecycle } from '../types';

export const sampleTemplates = [
  {
    name: 'REST API Service',
    description: 'Template for creating a standard REST API service with common configurations',
    serviceType: ServiceType.API,
    defaultTags: ['api', 'rest', 'http'],
    requiredFields: ['name', 'description', 'version', 'owner', 'team', 'repositoryUrl'],
    template: {
      serviceType: ServiceType.API,
      lifecycle: ServiceLifecycle.DEVELOPMENT,
      deploymentInfo: {
        environment: 'development',
        namespace: 'default',
        replicas: 2,
        resources: {
          cpu: '500m',
          memory: '512Mi',
        },
      },
      sla: {
        availability: 99.9,
        responseTime: 200,
        errorRate: 1.0,
        throughput: 1000,
      },
      contacts: {
        owner: '',
        maintainers: [],
        slack: '#api-team',
      },
      metadata: {
        framework: 'express',
        language: 'typescript',
        database: 'postgresql',
      },
    },
  },
  {
    name: 'Web Application',
    description: 'Template for frontend web applications with CDN and static hosting',
    serviceType: ServiceType.WEB_SERVICE,
    defaultTags: ['web', 'frontend', 'spa'],
    requiredFields: ['name', 'description', 'version', 'owner', 'team', 'repositoryUrl'],
    template: {
      serviceType: ServiceType.WEB_SERVICE,
      lifecycle: ServiceLifecycle.DEVELOPMENT,
      deploymentInfo: {
        environment: 'development',
        namespace: 'frontend',
        replicas: 3,
        resources: {
          cpu: '100m',
          memory: '128Mi',
        },
      },
      sla: {
        availability: 99.5,
        responseTime: 100,
        errorRate: 0.5,
        throughput: 5000,
      },
      contacts: {
        owner: '',
        maintainers: [],
        slack: '#frontend-team',
      },
      metadata: {
        framework: 'react',
        buildTool: 'webpack',
        cdn: 'cloudfront',
      },
    },
  },
  {
    name: 'Database Service',
    description: 'Template for database services with backup and monitoring configurations',
    serviceType: ServiceType.DATABASE,
    defaultTags: ['database', 'storage', 'persistent'],
    requiredFields: ['name', 'description', 'version', 'owner', 'team'],
    template: {
      serviceType: ServiceType.DATABASE,
      lifecycle: ServiceLifecycle.PRODUCTION,
      deploymentInfo: {
        environment: 'production',
        namespace: 'databases',
        replicas: 1,
        resources: {
          cpu: '2000m',
          memory: '4Gi',
          storage: '100Gi',
        },
      },
      sla: {
        availability: 99.99,
        responseTime: 50,
        errorRate: 0.1,
      },
      contacts: {
        owner: '',
        maintainers: [],
        oncall: '',
        slack: '#database-team',
      },
      metadata: {
        engine: 'postgresql',
        version: '14',
        backupSchedule: '0 2 * * *',
        monitoring: true,
      },
    },
  },
  {
    name: 'Message Queue',
    description: 'Template for message queue services with clustering and persistence',
    serviceType: ServiceType.MESSAGE_QUEUE,
    defaultTags: ['messaging', 'queue', 'async'],
    requiredFields: ['name', 'description', 'version', 'owner', 'team'],
    template: {
      serviceType: ServiceType.MESSAGE_QUEUE,
      lifecycle: ServiceLifecycle.PRODUCTION,
      deploymentInfo: {
        environment: 'production',
        namespace: 'messaging',
        replicas: 3,
        resources: {
          cpu: '1000m',
          memory: '2Gi',
          storage: '50Gi',
        },
      },
      sla: {
        availability: 99.9,
        responseTime: 10,
        errorRate: 0.5,
        throughput: 10000,
      },
      contacts: {
        owner: '',
        maintainers: [],
        oncall: '',
        slack: '#messaging-team',
      },
      metadata: {
        engine: 'rabbitmq',
        clustering: true,
        persistence: true,
        deadLetterQueue: true,
      },
    },
  },
  {
    name: 'Cache Service',
    description: 'Template for caching services with clustering and monitoring',
    serviceType: ServiceType.CACHE,
    defaultTags: ['cache', 'redis', 'performance'],
    requiredFields: ['name', 'description', 'version', 'owner', 'team'],
    template: {
      serviceType: ServiceType.CACHE,
      lifecycle: ServiceLifecycle.PRODUCTION,
      deploymentInfo: {
        environment: 'production',
        namespace: 'cache',
        replicas: 3,
        resources: {
          cpu: '500m',
          memory: '1Gi',
        },
      },
      sla: {
        availability: 99.9,
        responseTime: 5,
        errorRate: 0.1,
        throughput: 50000,
      },
      contacts: {
        owner: '',
        maintainers: [],
        slack: '#infrastructure-team',
      },
      metadata: {
        engine: 'redis',
        clustering: true,
        persistence: false,
        evictionPolicy: 'allkeys-lru',
      },
    },
  },
  {
    name: 'Monitoring Service',
    description: 'Template for monitoring and observability services',
    serviceType: ServiceType.MONITORING,
    defaultTags: ['monitoring', 'observability', 'metrics'],
    requiredFields: ['name', 'description', 'version', 'owner', 'team'],
    template: {
      serviceType: ServiceType.MONITORING,
      lifecycle: ServiceLifecycle.PRODUCTION,
      deploymentInfo: {
        environment: 'production',
        namespace: 'monitoring',
        replicas: 2,
        resources: {
          cpu: '1000m',
          memory: '2Gi',
          storage: '200Gi',
        },
      },
      sla: {
        availability: 99.9,
        responseTime: 100,
        errorRate: 0.5,
      },
      contacts: {
        owner: '',
        maintainers: [],
        oncall: '',
        slack: '#sre-team',
      },
      metadata: {
        type: 'prometheus',
        retention: '30d',
        scrapeInterval: '15s',
        alerting: true,
      },
    },
  },
];
