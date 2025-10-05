import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { ServiceMetrics as IServiceMetrics } from '../types';

interface ServiceMetricsCreationAttributes extends Optional<IServiceMetrics, 'id'> {}

export class ServiceMetrics extends Model<IServiceMetrics, ServiceMetricsCreationAttributes> implements IServiceMetrics {
  public id!: string;
  public serviceId!: string;
  public timestamp!: Date;
  public availability!: number;
  public responseTime!: number;
  public errorRate!: number;
  public throughput!: number;
  public cpuUsage?: number;
  public memoryUsage?: number;
  public diskUsage?: number;
}

ServiceMetrics.init(
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
        model: 'services',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    availability: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    errorRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    throughput: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    cpuUsage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    memoryUsage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    diskUsage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
  },
  {
    sequelize,
    modelName: 'ServiceMetrics',
    tableName: 'service_metrics',
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
