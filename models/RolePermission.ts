import { DataTypes, Model, InferAttributes, InferCreationAttributes } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class RolePermission extends Model<InferAttributes<RolePermission>, InferCreationAttributes<RolePermission>> {
  declare roleId: number;
  declare permissionId: number;
}

RolePermission.init(
  {
    roleId: { type: DataTypes.INTEGER, allowNull: false, field: "role_id", primaryKey: true },
    permissionId: { type: DataTypes.INTEGER, allowNull: false, field: "permission_id", primaryKey: true },
  },
  { sequelize, tableName: "role_permissions", modelName: "RolePermission", timestamps: false }
);
