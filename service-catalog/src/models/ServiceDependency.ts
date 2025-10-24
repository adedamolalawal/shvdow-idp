import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { ServiceDependency as IServiceDependency, DependencyType } from '../types';

interface ServiceDependencyCreationAttributes extends Optional<IServiceDependency, 'id' | 'createdAt'> {}

export class ServiceDependency extends Model<IServiceDependency, ServiceDependencyCreationAttributes> implements IServiceDependency {
  public id!: string;
  public serviceId!: string;
  public dependsOnServiceId!: string;
  public dependencyType!: DependencyType;
  public isRequired!: boolean;
  public description?: string;

  // Timestamps
  public readonly createdAt!: Date;
}

ServiceDependency.init(
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
    dependsOnServiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'services',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    dependencyType: {
      type: DataTypes.ENUM(...Object.values(DependencyType)),
      allowNull: false,
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ServiceDependency',
    tableName: 'service_dependencies',
    timestamps: false,
    indexes: [
      {
        fields: ['serviceId'],
      },
      {
        fields: ['dependsOnServiceId'],
      },
      {
        fields: ['serviceId', 'dependsOnServiceId'],
        unique: true,
      },
    ],
  }
);
