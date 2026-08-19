import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { Booking } from "./Booking";
import type { PaymentLink } from "./PaymentLink";

export type PaymentStatus = "pending" | "success" | "failed";

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare paymentLinkId: number;
  declare transactionId: string | null;
  declare gatewayReferenceNumber: string | null;
  declare amountPaid: string | null;
  declare currency: string | null;
  declare paymentMethod: string | null;
  declare paidAt: Date | null;
  declare status: CreationOptional<PaymentStatus>;
  /** Full raw gateway payload (e.g. PayGlocal's webhook/callback body) for audit and display of fields the vendor-neutral columns above don't cover, like country/cardBrand/cardType. */
  declare gatewayResponse: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Populated only when eager-loaded via `include` — not real columns.
  declare booking?: NonAttribute<Booking>;
  declare paymentLink?: NonAttribute<PaymentLink>;
}

Payment.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    paymentLinkId: { type: DataTypes.INTEGER, allowNull: false, field: "payment_link_id" },
    transactionId: { type: DataTypes.STRING, allowNull: true, field: "transaction_id" },
    gatewayReferenceNumber: { type: DataTypes.STRING, allowNull: true, field: "gateway_reference_number" },
    amountPaid: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "amount_paid" },
    currency: { type: DataTypes.STRING(3), allowNull: true },
    paymentMethod: { type: DataTypes.STRING, allowNull: true, field: "payment_method" },
    paidAt: { type: DataTypes.DATE, allowNull: true, field: "paid_at" },
    status: {
      type: DataTypes.ENUM("pending", "success", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    gatewayResponse: { type: DataTypes.JSON, allowNull: true, field: "gateway_response" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "payments", modelName: "Payment" }
);
