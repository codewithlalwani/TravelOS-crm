import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export type PaymentLinkStatus = "created" | "expired" | "used" | "cancelled";

export class PaymentLink extends Model<InferAttributes<PaymentLink>, InferCreationAttributes<PaymentLink>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare amount: string;
  declare currency: CreationOptional<string>;
  declare gatewayProvider: CreationOptional<string>;
  declare gatewayLinkId: string | null;
  declare linkUrl: string | null;
  declare shortCode: string | null;
  declare status: CreationOptional<PaymentLinkStatus>;
  declare emailSentAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PaymentLink.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD" },
    gatewayProvider: { type: DataTypes.STRING, allowNull: false, defaultValue: "payglocal", field: "gateway_provider" },
    gatewayLinkId: { type: DataTypes.STRING, allowNull: true, field: "gateway_link_id" },
    linkUrl: { type: DataTypes.TEXT, allowNull: true, field: "link_url" },
    shortCode: { type: DataTypes.STRING(10), allowNull: true, unique: true, field: "short_code" },
    status: {
      type: DataTypes.ENUM("created", "expired", "used", "cancelled"),
      allowNull: false,
      defaultValue: "created",
    },
    emailSentAt: { type: DataTypes.DATE, allowNull: true, field: "email_sent_at" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "payment_links", modelName: "PaymentLink" }
);
