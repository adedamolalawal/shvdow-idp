import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database/database';
import { ServiceIncident as IServiceIncident, IncidentSeverity, IncidentStatus } from '../types';

interface ServiceIncidentCreationAttributes extends Optional<IServiceIncident, 'id' | 'createdAt' | 'updatedAt' | 'endTime' | 'assignee'> {}

export class ServiceIncident extends Model<IServiceIncident, ServiceIncidentCreationAttributes> implements IServiceIncident {
  public id!: string;
  public serviceId!: string;
  public title!: string;
  public description!: string;
  public severity!: IncidentSeverity;
  public status!: IncidentStatus;
  public startTime!: Date;
  public endTime?: Date;
  public assignee?: string;
  public tags!: string[];

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ServiceIncident.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(IncidentSeverity)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(IncidentStatus)),
      allowNull: false,
      defaultValue: IncidentStatus.OPEN,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assignee: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: 'ServiceIncident',
    tableName: 'service_incidents',
    indexes: [
      {
        fields: ['serviceId'],
      },
      {
        fields: ['severity'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['startTime'],
      },
      {
        fields: ['assignee'],
      },
    ],
  }
);
