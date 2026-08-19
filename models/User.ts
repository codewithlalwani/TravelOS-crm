import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { Role } from "./Role";
import type { UserAccessLocation } from "./UserAccessLocation";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare roleId: number;
  declare accessLocation: CreationOptional<string | null>;
  declare accessPlaceId: CreationOptional<string | null>;
  declare accessLatitude: CreationOptional<number | null>;
  declare accessLongitude: CreationOptional<number | null>;
  declare accessRadiusKm: CreationOptional<number>;
  declare lastLoginLatitude: CreationOptional<number | null>;
  declare lastLoginLongitude: CreationOptional<number | null>;
  declare lastLoginAccuracy: CreationOptional<number | null>;
  declare lastLoginLocationAt: CreationOptional<Date | null>;
  declare lastLoginIpLatitude: CreationOptional<number | null>;
  declare lastLoginIpLongitude: CreationOptional<number | null>;
  declare lastLoginLocationMethod: CreationOptional<string | null>;
  declare lastLoginDistanceKm: CreationOptional<number | null>;
  declare isActive: CreationOptional<boolean>;
  declare twoFactorEnabled: CreationOptional<boolean>;
  declare createdBy: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare roleRecord?: NonAttribute<Role>;
  declare creator?: NonAttribute<User>;
  declare accessLocations?: NonAttribute<UserAccessLocation[]>;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false, field: "password_hash" },
    roleId: { type: DataTypes.INTEGER, allowNull: false, field: "role_id" },
    accessLocation: { type: DataTypes.STRING, allowNull: true, field: "access_location" },
    accessPlaceId: { type: DataTypes.STRING, allowNull: true, field: "access_place_id" },
    accessLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "access_latitude" },
    accessLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "access_longitude" },
    accessRadiusKm: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 25, field: "access_radius_km" },
    lastLoginLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "last_login_latitude" },
    lastLoginLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "last_login_longitude" },
    lastLoginAccuracy: { type: DataTypes.FLOAT, allowNull: true, field: "last_login_accuracy" },
    lastLoginLocationAt: { type: DataTypes.DATE, allowNull: true, field: "last_login_location_at" },
    lastLoginIpLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "last_login_ip_latitude" },
    lastLoginIpLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, field: "last_login_ip_longitude" },
    lastLoginLocationMethod: { type: DataTypes.STRING, allowNull: true, field: "last_login_location_method" },
    lastLoginDistanceKm: { type: DataTypes.FLOAT, allowNull: true, field: "last_login_distance_km" },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "is_active" },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "two_factor_enabled" },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "created_by" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "users", modelName: "User" }
);
