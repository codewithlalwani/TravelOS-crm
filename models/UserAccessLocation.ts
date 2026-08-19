import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class UserAccessLocation extends Model<InferAttributes<UserAccessLocation>, InferCreationAttributes<UserAccessLocation>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare label: string;
  declare placeId: string;
  declare latitude: number;
  declare longitude: number;
  declare radiusKm: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

UserAccessLocation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
  label: { type: DataTypes.STRING, allowNull: false },
  placeId: { type: DataTypes.STRING, allowNull: false, field: "place_id" },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  radiusKm: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 25, field: "radius_km" },
  createdAt: { type: DataTypes.DATE, field: "created_at" },
  updatedAt: { type: DataTypes.DATE, field: "updated_at" },
}, { sequelize, tableName: "user_access_locations", modelName: "UserAccessLocation" });
