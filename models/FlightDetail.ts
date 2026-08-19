import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class FlightDetail extends Model<InferAttributes<FlightDetail>, InferCreationAttributes<FlightDetail>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare pnr: string;
  declare origin: string;
  declare destination: string;
  declare travelDate: string;
  declare cabinClass: string | null;
  declare gds: string | null;
  declare ticketingSupplier: string | null;
  declare tripType: string | null;
  declare journeyType: string | null;
  declare fareType: string | null;
  declare ticketingDeadline: string | null;
  declare ticketingDeadlineTime: string | null;
  declare supplierReference: string | null;
  declare buyCurrency: CreationOptional<string>;
  declare sellCurrency: CreationOptional<string>;
  declare rateRemarks: string | null;
  declare specialRequest: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

FlightDetail.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: "booking_id" },
    pnr: { type: DataTypes.STRING, allowNull: false },
    origin: { type: DataTypes.STRING, allowNull: false },
    destination: { type: DataTypes.STRING, allowNull: false },
    travelDate: { type: DataTypes.DATEONLY, allowNull: false, field: "travel_date" },
    cabinClass: { type: DataTypes.STRING, allowNull: true, field: "cabin_class" },
    gds: { type: DataTypes.STRING, allowNull: true },
    ticketingSupplier: { type: DataTypes.STRING, allowNull: true, field: "ticketing_supplier" },
    tripType: { type: DataTypes.STRING, allowNull: true, field: "trip_type" },
    journeyType: { type: DataTypes.STRING, allowNull: true, field: "journey_type" },
    fareType: { type: DataTypes.STRING, allowNull: true, field: "fare_type" },
    ticketingDeadline: { type: DataTypes.DATEONLY, allowNull: true, field: "ticketing_deadline" },
    ticketingDeadlineTime: { type: DataTypes.STRING, allowNull: true, field: "ticketing_deadline_time" },
    supplierReference: { type: DataTypes.STRING, allowNull: true, field: "supplier_reference" },
    buyCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD", field: "buy_currency" },
    sellCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD", field: "sell_currency" },
    rateRemarks: { type: DataTypes.TEXT, allowNull: true, field: "rate_remarks" },
    specialRequest: { type: DataTypes.TEXT, allowNull: true, field: "special_request" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "flight_details", modelName: "FlightDetail" }
);
