import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { ServiceMetadata, ServiceStatus, DeploymentInfo } from '../types';

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
    ],
  }
);
