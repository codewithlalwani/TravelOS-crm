import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export class Invoice extends Model<InferAttributes<Invoice>, InferCreationAttributes<Invoice>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare invoiceNo: string;
  declare amount: string;
  declare currency: CreationOptional<string>;
  declare generatedAt: CreationOptional<Date>;
  declare pdfUrl: string | null;
  declare lineItems: CreationOptional<InvoiceLineItem[] | null>;
  declare sentAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Invoice.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    invoiceNo: { type: DataTypes.STRING, allowNull: false, unique: true, field: "invoice_no" },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD" },
    generatedAt: { type: DataTypes.DATE, field: "generated_at" },
    pdfUrl: { type: DataTypes.STRING, allowNull: true, field: "pdf_url" },
    lineItems: { type: DataTypes.JSON, allowNull: true, field: "line_items" },
    sentAt: { type: DataTypes.DATE, allowNull: true, field: "sent_at" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "invoices", modelName: "Invoice" }
);
