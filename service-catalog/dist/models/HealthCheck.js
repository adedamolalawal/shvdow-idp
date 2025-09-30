"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheck = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../database/database");
const types_1 = require("../types");
const Service_1 = require("./Service");
class HealthCheck extends sequelize_1.Model {
}
exports.HealthCheck = HealthCheck;
HealthCheck.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    serviceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Service_1.Service,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.ServiceStatus)),
        allowNull: false,
    },
    responseTime: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    statusCode: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 100,
            max: 599,
        },
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.sequelize,
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
});
// Define associations
Service_1.Service.hasMany(HealthCheck, {
    foreignKey: 'serviceId',
    as: 'healthChecks',
});
HealthCheck.belongsTo(Service_1.Service, {
    foreignKey: 'serviceId',
    as: 'service',
});
//# sourceMappingURL=HealthCheck.js.map