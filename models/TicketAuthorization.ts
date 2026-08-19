import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export type AuthorizationStatus = "pending" | "authorized" | "declined";

export interface ChargeLine {
  label: string;
  amount: number;
}

export class TicketAuthorization extends Model<
  InferAttributes<TicketAuthorization>,
  InferCreationAttributes<TicketAuthorization>
> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare emailSentAt: Date | null;
  declare emailBody: string | null;
  declare customerReplyText: string | null;
  declare customerReplyReceivedAt: Date | null;
  declare status: CreationOptional<AuthorizationStatus>;
  declare authorizedAmount: string | null;
  declare authorizationDate: string | null;
  declare charges: ChargeLine[] | null;
  declare refundAmount: string | null;
  declare eSignatureName: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TicketAuthorization.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: "booking_id" },
    emailSentAt: { type: DataTypes.DATE, allowNull: true, field: "email_sent_at" },
    emailBody: { type: DataTypes.TEXT, allowNull: true, field: "email_body" },
    customerReplyText: { type: DataTypes.TEXT, allowNull: true, field: "customer_reply_text" },
    customerReplyReceivedAt: { type: DataTypes.DATE, allowNull: true, field: "customer_reply_received_at" },
    status: {
      type: DataTypes.ENUM("pending", "authorized", "declined"),
      allowNull: false,
      defaultValue: "pending",
    },
    authorizedAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "authorized_amount" },
    authorizationDate: { type: DataTypes.DATEONLY, allowNull: true, field: "authorization_date" },
    charges: { type: DataTypes.JSON, allowNull: true },
    refundAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "refund_amount" },
    eSignatureName: { type: DataTypes.STRING, allowNull: true, field: "e_signature_name" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "ticket_authorizations", modelName: "TicketAuthorization" }
);
