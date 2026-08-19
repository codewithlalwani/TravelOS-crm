import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import { PAX_TYPES, type PaxType } from "../lib/booking/paxTypes";

export { PAX_TYPES, PAX_TYPE_LABEL, type PaxType } from "../lib/booking/paxTypes";

export class Passenger extends Model<InferAttributes<Passenger>, InferCreationAttributes<Passenger>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare title: string | null;
  declare firstName: string;
  declare middleName: string | null;
  declare lastName: string;
  declare gender: string | null;
  declare paxType: CreationOptional<PaxType>;
  declare dob: string | null;
  declare passportNo: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Passenger.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    title: { type: DataTypes.STRING, allowNull: true },
    firstName: { type: DataTypes.STRING, allowNull: false, field: "first_name" },
    middleName: { type: DataTypes.STRING, allowNull: true, field: "middle_name" },
    lastName: { type: DataTypes.STRING, allowNull: false, field: "last_name" },
    gender: { type: DataTypes.STRING, allowNull: true },
    paxType: { type: DataTypes.ENUM(...PAX_TYPES), allowNull: false, defaultValue: "ADT", field: "pax_type" },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    passportNo: { type: DataTypes.STRING, allowNull: true, field: "passport_no" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "passengers", modelName: "Passenger" }
);
