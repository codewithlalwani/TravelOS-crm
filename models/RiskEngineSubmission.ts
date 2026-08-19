import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export class RiskEngineSubmission extends Model<
  InferAttributes<RiskEngineSubmission>,
  InferCreationAttributes<RiskEngineSubmission>
> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare paymentLinkId: number;
  declare payloadJson: Record<string, unknown>;
  declare submittedAt: Date | null;
  declare responseJson: Record<string, unknown> | null;
  declare status: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RiskEngineSubmission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    paymentLinkId: { type: DataTypes.INTEGER, allowNull: false, field: "payment_link_id" },
    payloadJson: { type: DataTypes.JSON, allowNull: false, field: "payload_json" },
    submittedAt: { type: DataTypes.DATE, allowNull: true, field: "submitted_at" },
    responseJson: { type: DataTypes.JSON, allowNull: true, field: "response_json" },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "submitted" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "risk_engine_submissions", modelName: "RiskEngineSubmission" }
);
