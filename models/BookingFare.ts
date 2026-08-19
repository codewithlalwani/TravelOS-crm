import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import { PAX_TYPES, type PaxType } from "./Passenger";

export class BookingFare extends Model<InferAttributes<BookingFare>, InferCreationAttributes<BookingFare>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare paxType: PaxType;
  declare baseFare: CreationOptional<string>;
  declare tax: CreationOptional<string>;
  declare gross: CreationOptional<string>;
  declare net: CreationOptional<string>;
  declare mco: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

BookingFare.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    paxType: { type: DataTypes.ENUM(...PAX_TYPES), allowNull: false, field: "pax_type" },
    baseFare: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, field: "base_fare" },
    tax: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    gross: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    net: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    mco: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "booking_fares", modelName: "BookingFare" }
);
