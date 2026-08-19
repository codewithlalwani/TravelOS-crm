import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export interface LoginNotificationDetails {
  name: string;
  email: string;
  role: string;
  ipAddress: string | null;
  location: string | null;
  userAgent: string | null;
  loginTime: string;
}

export class AdminNotification extends Model<InferAttributes<AdminNotification>, InferCreationAttributes<AdminNotification>> {
  declare id: CreationOptional<number>;
  declare recipientUserId: number;
  declare actorUserId: CreationOptional<number | null>;
  declare type: string;
  declare title: string;
  declare message: string;
  declare details: CreationOptional<LoginNotificationDetails | null>;
  declare readAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AdminNotification.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipientUserId: { type: DataTypes.INTEGER, allowNull: false, field: "recipient_user_id" },
  actorUserId: { type: DataTypes.INTEGER, allowNull: true, field: "actor_user_id" },
  type: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  details: { type: DataTypes.JSON, allowNull: true },
  readAt: { type: DataTypes.DATE, allowNull: true, field: "read_at" },
  createdAt: { type: DataTypes.DATE, field: "created_at" },
  updatedAt: { type: DataTypes.DATE, field: "updated_at" },
}, { sequelize, tableName: "admin_notifications", modelName: "AdminNotification" });
