import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class HotelDetail extends Model<InferAttributes<HotelDetail>, InferCreationAttributes<HotelDetail>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare hotelName: string;
  declare address: string;
  /** Hotel's own city/country (ISO code), separate from the payer's billing address — sent as PayGlocal's lodgingData city/country. */
  declare city: string | null;
  declare country: string | null;
  declare checkIn: string;
  declare checkOut: string;
  declare roomType: string;
  declare guests: CreationOptional<number>;
  declare ratePerNight: string | null;
  declare taxesAndFees: string | null;
  declare confirmationNo: string;
  declare hotelRating: string | null;
  /** PayGlocal lodgingData cancellation policy code, e.g. "NC" — see CANCELLATION_POLICY_OPTIONS. */
  declare cancellationPolicy: string | null;
  declare specialRequest: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

HotelDetail.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: "booking_id" },
    hotelName: { type: DataTypes.STRING, allowNull: false, field: "hotel_name" },
    address: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    checkIn: { type: DataTypes.DATEONLY, allowNull: false, field: "check_in" },
    checkOut: { type: DataTypes.DATEONLY, allowNull: false, field: "check_out" },
    roomType: { type: DataTypes.STRING, allowNull: false, field: "room_type" },
    guests: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    ratePerNight: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "rate_per_night" },
    taxesAndFees: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "taxes_and_fees" },
    confirmationNo: { type: DataTypes.STRING, allowNull: false, field: "confirmation_no" },
    hotelRating: { type: DataTypes.DECIMAL(2, 1), allowNull: true, field: "hotel_rating" },
    cancellationPolicy: { type: DataTypes.STRING, allowNull: true, field: "cancellation_policy" },
    specialRequest: { type: DataTypes.TEXT, allowNull: true, field: "special_request" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "hotel_details", modelName: "HotelDetail" }
);
