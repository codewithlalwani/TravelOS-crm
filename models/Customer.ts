import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class Customer extends Model<InferAttributes<Customer>, InferCreationAttributes<Customer>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare addressStreet1: string | null;
  declare addressCity: string | null;
  declare addressState: string | null;
  declare addressCountry: string | null;
  declare gstNumber: string | null;
  declare gstCompanyName: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Customer.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    addressStreet1: { type: DataTypes.STRING, allowNull: true, field: "address_street1" },
    addressCity: { type: DataTypes.STRING, allowNull: true, field: "address_city" },
    addressState: { type: DataTypes.STRING, allowNull: true, field: "address_state" },
    addressCountry: { type: DataTypes.STRING, allowNull: true, field: "address_country" },
    gstNumber: { type: DataTypes.STRING, allowNull: true, field: "gst_number" },
    gstCompanyName: { type: DataTypes.STRING, allowNull: true, field: "gst_company_name" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "customers", modelName: "Customer" }
);
