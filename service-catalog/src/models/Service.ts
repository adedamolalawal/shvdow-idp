import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { ServiceMetadata, ServiceStatus, DeploymentInfo, ServiceType, ServiceLifecycle, ServiceSLA, ServiceContacts } from '../types';

interface ServiceCreationAttributes extends Optional<ServiceMetadata, 'id' | 'createdAt' | 'updatedAt' | 'lastHealthCheck'> {}

export class Service extends Model<ServiceMetadata, ServiceCreationAttributes> implements ServiceMetadata {
  public id!: string;
  public name!: string;
  public description!: string;
  public version!: string;
  public owner!: string;
  public team!: string;
  public repositoryUrl?: string;
  public documentationUrl?: string;
  public healthEndpoint?: string;
  public status!: ServiceStatus;
  public tags!: string[];
  public dependencies!: string[];
  public deploymentInfo!: DeploymentInfo;
  public serviceType!: ServiceType;
  public lifecycle!: ServiceLifecycle;
  public sla?: ServiceSLA;
  public contacts!: ServiceContacts;
  public metadata!: Record<string, any>;
  public lastHealthCheck?: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Service.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    team: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    repositoryUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    documentationUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    healthEndpoint: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ServiceStatus)),
      allowNull: false,
      defaultValue: ServiceStatus.UNKNOWN,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray: {
          msg: 'Tags must be an array',
          args: true,
        },
      },
    },
    dependencies: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray: {
          msg: 'Dependencies must be an array',
          args: true,
        },
      },
    },
    deploymentInfo: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        isValidDeploymentInfo(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Deployment info must be an object');
          }
          if (!value.environment) {
            throw new Error('Deployment environment is required');
          }
        },
      },
    },
    serviceType: {
      type: DataTypes.ENUM(...Object.values(ServiceType)),
      allowNull: false,
      defaultValue: ServiceType.OTHER,
    },
    lifecycle: {
      type: DataTypes.ENUM(...Object.values(ServiceLifecycle)),
      allowNull: false,
      defaultValue: ServiceLifecycle.DEVELOPMENT,
    },
    sla: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidSLA(value: any) {
          if (value && typeof value === 'object') {
            if (typeof value.availability !== 'number' || value.availability < 0 || value.availability > 100) {
              throw new Error('SLA availability must be a number between 0 and 100');
            }
            if (typeof value.responseTime !== 'number' || value.responseTime < 0) {
              throw new Error('SLA response time must be a positive number');
            }
            if (typeof value.errorRate !== 'number' || value.errorRate < 0 || value.errorRate > 100) {
              throw new Error('SLA error rate must be a number between 0 and 100');
            }
          }
        },
      },
    },
    contacts: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidContacts(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Contacts must be an object');
          }
          if (!value.owner || typeof value.owner !== 'string') {
            throw new Error('Contacts must have an owner field');
          }
          if (value.maintainers && !Array.isArray(value.maintainers)) {
            throw new Error('Maintainers must be an array');
          }
        },
      },
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidMetadata(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Metadata must be an object');
          }
        },
      },
    },
    lastHealthCheck: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Service',
    tableName: 'services',
    indexes: [
      {
        fields: ['name'],
        unique: true,
      },
      {
        fields: ['owner'],
      },
      {
        fields: ['team'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['serviceType'],
      },
      {
        fields: ['lifecycle'],
      },
    ],
  }
);
