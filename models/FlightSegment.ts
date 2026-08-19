import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class FlightSegment extends Model<InferAttributes<FlightSegment>, InferCreationAttributes<FlightSegment>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare sequence: CreationOptional<number>;
  declare flightNumber: string | null;
  declare airline: string;
  declare airlinePnr: string | null;
  declare depAirport: string;
  declare depCity: string | null;
  declare depCountry: string | null;
  declare depDate: string;
  declare depTime: string | null;
  declare depTerminal: string | null;
  declare arrAirport: string;
  declare arrCity: string | null;
  declare arrCountry: string | null;
  declare arrDate: string | null;
  declare arrTime: string | null;
  declare arrTerminal: string | null;
  declare bookingClass: string | null;
  declare cabinClass: string | null;
  declare status: CreationOptional<string>;
  declare operatedBy: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

FlightSegment.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    flightNumber: { type: DataTypes.STRING, allowNull: true, field: "flight_number" },
    airline: { type: DataTypes.STRING, allowNull: false },
    airlinePnr: { type: DataTypes.STRING, allowNull: true, field: "airline_pnr" },
    depAirport: { type: DataTypes.STRING, allowNull: false, field: "dep_airport" },
    depCity: { type: DataTypes.STRING, allowNull: true, field: "dep_city" },
    depCountry: { type: DataTypes.STRING, allowNull: true, field: "dep_country" },
    depDate: { type: DataTypes.DATEONLY, allowNull: false, field: "dep_date" },
    depTime: { type: DataTypes.STRING, allowNull: true, field: "dep_time" },
    depTerminal: { type: DataTypes.STRING, allowNull: true, field: "dep_terminal" },
    arrAirport: { type: DataTypes.STRING, allowNull: false, field: "arr_airport" },
    arrCity: { type: DataTypes.STRING, allowNull: true, field: "arr_city" },
    arrCountry: { type: DataTypes.STRING, allowNull: true, field: "arr_country" },
    arrDate: { type: DataTypes.DATEONLY, allowNull: true, field: "arr_date" },
    arrTime: { type: DataTypes.STRING, allowNull: true, field: "arr_time" },
    arrTerminal: { type: DataTypes.STRING, allowNull: true, field: "arr_terminal" },
    bookingClass: { type: DataTypes.STRING, allowNull: true, field: "booking_class" },
    cabinClass: { type: DataTypes.STRING, allowNull: true, field: "cabin_class" },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "HK" },
    operatedBy: { type: DataTypes.STRING, allowNull: true, field: "operated_by" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "flight_segments", modelName: "FlightSegment" }
);
