import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class CarDetail extends Model<InferAttributes<CarDetail>, InferCreationAttributes<CarDetail>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare pickupLocation: string;
  declare pickupCity: string | null;
  declare pickupCountry: string | null;
  declare pickupState: string | null;
  declare pickupStationType: string;
  declare pickupStation: string | null;
  declare pickupDateTime: Date;
  declare dropoffDifferentLocation: CreationOptional<boolean>;
  declare dropoffLocation: string;
  declare dropoffCity: string | null;
  declare dropoffCountry: string | null;
  declare dropoffState: string | null;
  declare dropoffStationType: string;
  declare dropoffStation: string | null;
  declare dropoffDateTime: Date;
  declare pickupMeetingPoint: string | null;
  declare meetingPoint: string | null;
  declare rateRemarks: string | null;
  declare specialRequest: string | null;
  declare bookingStatus: string;
  declare supplierRef: string;
  declare supplierType: CreationOptional<string>;
  declare supplier: string;
  declare vehicleCode: string | null;
  declare vehicleName: string | null;
  declare maxPax: number | null;
  declare maxLuggage: number | null;
  declare noOfVehicles: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CarDetail.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: "booking_id" },
    pickupLocation: { type: DataTypes.STRING, allowNull: false, field: "pickup_location" },
    pickupCity: { type: DataTypes.STRING, allowNull: true, field: "pickup_city" },
    pickupCountry: { type: DataTypes.STRING, allowNull: true, field: "pickup_country" },
    pickupState: { type: DataTypes.STRING, allowNull: true, field: "pickup_state" },
    pickupStationType: { type: DataTypes.STRING, allowNull: false, field: "pickup_station_type" },
    pickupStation: { type: DataTypes.STRING, allowNull: true, field: "pickup_station" },
    pickupDateTime: { type: DataTypes.DATE, allowNull: false, field: "pickup_date_time" },
    dropoffDifferentLocation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "dropoff_different_location",
    },
    dropoffLocation: { type: DataTypes.STRING, allowNull: false, field: "dropoff_location" },
    dropoffCity: { type: DataTypes.STRING, allowNull: true, field: "dropoff_city" },
    dropoffCountry: { type: DataTypes.STRING, allowNull: true, field: "dropoff_country" },
    dropoffState: { type: DataTypes.STRING, allowNull: true, field: "dropoff_state" },
    dropoffStationType: { type: DataTypes.STRING, allowNull: false, field: "dropoff_station_type" },
    dropoffStation: { type: DataTypes.STRING, allowNull: true, field: "dropoff_station" },
    dropoffDateTime: { type: DataTypes.DATE, allowNull: false, field: "dropoff_date_time" },
    pickupMeetingPoint: { type: DataTypes.TEXT, allowNull: true, field: "pickup_meeting_point" },
    meetingPoint: { type: DataTypes.TEXT, allowNull: true, field: "meeting_point" },
    rateRemarks: { type: DataTypes.TEXT, allowNull: true, field: "rate_remarks" },
    specialRequest: { type: DataTypes.TEXT, allowNull: true, field: "special_request" },
    bookingStatus: { type: DataTypes.STRING, allowNull: false, field: "booking_status" },
    supplierRef: { type: DataTypes.STRING, allowNull: false, field: "supplier_ref" },
    supplierType: { type: DataTypes.STRING, allowNull: false, defaultValue: "Offline", field: "supplier_type" },
    supplier: { type: DataTypes.STRING, allowNull: false },
    vehicleCode: { type: DataTypes.STRING, allowNull: true, field: "vehicle_code" },
    vehicleName: { type: DataTypes.STRING, allowNull: true, field: "vehicle_name" },
    maxPax: { type: DataTypes.INTEGER, allowNull: true, field: "max_pax" },
    maxLuggage: { type: DataTypes.INTEGER, allowNull: true, field: "max_luggage" },
    noOfVehicles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: "no_of_vehicles" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "car_details", modelName: "CarDetail" }
);
