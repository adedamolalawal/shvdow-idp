import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { ServiceTemplate as IServiceTemplate, ServiceType } from '../types';

interface ServiceTemplateCreationAttributes extends Optional<IServiceTemplate, 'id' | 'createdAt' | 'updatedAt'> {}

export class ServiceTemplate extends Model<IServiceTemplate, ServiceTemplateCreationAttributes> implements IServiceTemplate {
  public id!: string;
  public name!: string;
  public description!: string;
  public serviceType!: ServiceType;
  public defaultTags!: string[];
  public requiredFields!: string[];
  public template!: any;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ServiceTemplate.init(
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
        len: [1, 500],
      },
    },
    serviceType: {
      type: DataTypes.ENUM(...Object.values(ServiceType)),
      allowNull: false,
    },
    defaultTags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray: {
          msg: 'Default tags must be an array',
          args: true,
        },
      },
    },
    requiredFields: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArray: {
          msg: 'Required fields must be an array',
          args: true,
        },
      },
    },
    template: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        isValidTemplate(value: any) {
          if (!value || typeof value !== 'object') {
            throw new Error('Template must be an object');
          }
        },
      },
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
    modelName: 'ServiceTemplate',
    tableName: 'service_templates',
    indexes: [
      {
        fields: ['name'],
        unique: true,
      },
      {
        fields: ['serviceType'],
      },
    ],
  }
);
