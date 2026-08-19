import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { User } from "./User";

export class BookingNote extends Model<InferAttributes<BookingNote>, InferCreationAttributes<BookingNote>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare content: string;
  declare createdBy: number | null;
  declare updatedBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare author?: NonAttribute<User>;
  declare editor?: NonAttribute<User>;
}

BookingNote.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    content: { type: DataTypes.TEXT, allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: "created_by" },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: "updated_by" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "booking_notes", modelName: "BookingNote" }
);
