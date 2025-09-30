import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { HealthCheckResult, ServiceStatus } from '../types';
import { Service } from './Service';

interface HealthCheckCreationAttributes extends Optional<HealthCheckResult, 'id'> {}

export class HealthCheck extends Model<HealthCheckResult, HealthCheckCreationAttributes> implements HealthCheckResult {
  public id!: string;
  public serviceId!: string;
  public status!: ServiceStatus;
  public responseTime!: number;
  public statusCode?: number;
  public message?: string;
  public timestamp!: Date;
}

HealthCheck.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Service,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ServiceStatus)),
      allowNull: false,
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 100,
        max: 599,
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'HealthCheck',
    tableName: 'health_checks',
    timestamps: false,
    indexes: [
      {
        fields: ['serviceId'],
      },
      {
        fields: ['timestamp'],
      },
      {
        fields: ['serviceId', 'timestamp'],
      },
    ],
  }
);

// Define associations
Service.hasMany(HealthCheck, {
  foreignKey: 'serviceId',
  as: 'healthChecks',
});

HealthCheck.belongsTo(Service, {
  foreignKey: 'serviceId',
  as: 'service',
});

