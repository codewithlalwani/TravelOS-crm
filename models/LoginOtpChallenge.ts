import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class LoginOtpChallenge extends Model<InferAttributes<LoginOtpChallenge>, InferCreationAttributes<LoginOtpChallenge>> {
  declare id: string;
  declare userId: number;
  declare codeHash: string;
  declare remember: CreationOptional<boolean>;
  declare nextPath: CreationOptional<string>;
  declare ipAddress: CreationOptional<string | null>;
  declare ipCountry: CreationOptional<string | null>;
  declare ipCity: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare attempts: CreationOptional<number>;
  declare expiresAt: Date;
  declare consumedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
}

LoginOtpChallenge.init({
  id: { type: DataTypes.UUID, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
  codeHash: { type: DataTypes.STRING, allowNull: false, field: "code_hash" },
  remember: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  nextPath: { type: DataTypes.STRING, allowNull: false, defaultValue: "/dashboard", field: "next_path" },
  ipAddress: { type: DataTypes.STRING, allowNull: true, field: "ip_address" },
  ipCountry: { type: DataTypes.STRING, allowNull: true, field: "ip_country" },
  ipCity: { type: DataTypes.STRING, allowNull: true, field: "ip_city" },
  userAgent: { type: DataTypes.TEXT, allowNull: true, field: "user_agent" },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: "expires_at" },
  consumedAt: { type: DataTypes.DATE, allowNull: true, field: "consumed_at" },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "created_at" },
}, { sequelize, tableName: "login_otp_challenges", modelName: "LoginOtpChallenge", timestamps: false });
