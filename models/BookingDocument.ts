import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { User } from "./User";

export type DocType =
  | "ticket"
  | "hotel_voucher"
  | "car_voucher"
  | "train_ticket"
  | "cruise_document"
  | "invoice"
  | "passport"
  | "visa"
  | "other";

export class BookingDocument extends Model<
  InferAttributes<BookingDocument>,
  InferCreationAttributes<BookingDocument>
> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare docType: DocType;
  declare isPrimary: CreationOptional<boolean>;
  declare fileUrl: string;
  declare uploadedAt: CreationOptional<Date>;
  declare uploadedBy: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare uploader?: NonAttribute<User>;
}

BookingDocument.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    docType: {
      type: DataTypes.ENUM(
        "ticket",
        "hotel_voucher",
        "car_voucher",
        "train_ticket",
        "cruise_document",
        "invoice",
        "passport",
        "visa",
        "other"
      ),
      allowNull: false,
      field: "doc_type",
    },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_primary" },
    fileUrl: { type: DataTypes.STRING, allowNull: false, field: "file_url" },
    uploadedAt: { type: DataTypes.DATE, allowNull: false, field: "uploaded_at" },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: false, field: "uploaded_by" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "booking_documents", modelName: "BookingDocument" }
);

export const PRIMARY_DOC_TYPE_BY_BOOKING_TYPE: Record<string, DocType> = {
  flight: "ticket",
  hotel: "hotel_voucher",
  car: "car_voucher",
  train: "train_ticket",
  cruise: "cruise_document",
};

export const PRIMARY_DOC_LABEL: Record<DocType, string> = {
  ticket: "Ticket",
  hotel_voucher: "Hotel Voucher",
  car_voucher: "Car Rental Voucher",
  train_ticket: "Train Ticket",
  cruise_document: "Cruise Document",
  invoice: "Invoice",
  passport: "Passport Copy",
  visa: "Visa Document",
  other: "Other Document",
};
