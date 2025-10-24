"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Service = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../database/database");
const types_1 = require("../types");
class Service extends sequelize_1.Model {
}
exports.Service = Service;
Service.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [1, 100],
        },
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 1000],
        },
    },
    version: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    owner: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    team: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    repositoryUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    documentationUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    healthEndpoint: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.ServiceStatus)),
        allowNull: false,
        defaultValue: types_1.ServiceStatus.UNKNOWN,
    },
    tags: {
        type: sequelize_1.DataTypes.JSON,
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
        type: sequelize_1.DataTypes.JSON,
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
        type: sequelize_1.DataTypes.JSON,
        allowNull: false,
        validate: {
            isValidDeploymentInfo(value) {
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
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
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
});
//# sourceMappingURL=Service.js.map