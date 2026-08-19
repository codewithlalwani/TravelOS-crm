import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class LoginHistory extends Model<InferAttributes<LoginHistory>, InferCreationAttributes<LoginHistory>> {
  declare id: CreationOptional<number>;
  declare userId: CreationOptional<number | null>;
  declare ipAddress: string | null;
  declare loginId: string;
  declare loginStatus: boolean;
  declare loginTime: CreationOptional<Date>;
  declare logoutTime: CreationOptional<Date | null>;
  declare ipCountry: string | null;
  declare ipCity: string | null;
  declare failureReason: string | null;
}

LoginHistory.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true, field: "user_id" },
  ipAddress: { type: DataTypes.STRING, allowNull: true, field: "ip_address" },
  loginId: { type: DataTypes.STRING, allowNull: false, field: "login_id" },
  loginStatus: { type: DataTypes.BOOLEAN, allowNull: false, field: "login_status" },
  loginTime: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "login_time" },
  logoutTime: { type: DataTypes.DATE, allowNull: true, field: "logout_time" },
  ipCountry: { type: DataTypes.STRING, allowNull: true, field: "ip_country" },
  ipCity: { type: DataTypes.STRING, allowNull: true, field: "ip_city" },
  failureReason: { type: DataTypes.STRING, allowNull: true, field: "failure_reason" },
}, { sequelize, tableName: "login_histories", modelName: "LoginHistory", timestamps: false });
