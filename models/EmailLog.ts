import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export type EmailTemplateType = "ticket_authorization" | "primary_document" | "invoice" | "payment_link";

export class EmailLog extends Model<InferAttributes<EmailLog>, InferCreationAttributes<EmailLog>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare templateType: EmailTemplateType;
  declare toEmail: string;
  declare subject: string;
  declare body: string;
  declare sentAt: CreationOptional<Date>;
  declare status: CreationOptional<"sent" | "failed">;
  declare createdAt: CreationOptional<Date>;
}

EmailLog.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    templateType: {
      type: DataTypes.ENUM("ticket_authorization", "primary_document", "invoice", "payment_link"),
      allowNull: false,
      field: "template_type",
    },
    toEmail: { type: DataTypes.STRING, allowNull: false, field: "to_email" },
    subject: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    sentAt: { type: DataTypes.DATE, field: "sent_at", defaultValue: DataTypes.NOW },
    status: { type: DataTypes.ENUM("sent", "failed"), allowNull: false, defaultValue: "sent" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
  },
  { sequelize, tableName: "email_logs", modelName: "EmailLog", updatedAt: false }
);
