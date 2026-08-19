import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { User } from "./User";
import type { Booking } from "./Booking";

export type AuditEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "user_created"
  | "user_activated"
  | "user_deactivated"
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "booking_created"
  | "booking_updated"
  | "booking_cancelled"
  | "auth_email_sent"
  | "auth_received"
  | "payment_link_created"
  | "payment_link_shared"
  | "payment_received"
  | "primary_doc_uploaded"
  | "primary_doc_sent"
  | "invoice_generated"
  | "invoice_sent"
  | "invoice_updated"
  | "note_added"
  | "note_updated"
  | "note_deleted";

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare eventType: AuditEventType;
  declare description: string;
  declare actorId: number | null;
  declare actorEmail: string | null;
  declare targetUserId: number | null;
  declare bookingId: number | null;
  declare ipAddress: string | null;
  declare metadata: Record<string, unknown> | null;
  declare occurredAt: CreationOptional<Date>;

  declare actor?: NonAttribute<User>;
  declare targetUser?: NonAttribute<User>;
  declare booking?: NonAttribute<Booking>;
}

AuditLog.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    eventType: {
      type: DataTypes.ENUM(
        "login_success",
        "login_failed",
        "logout",
        "user_created",
        "user_activated",
        "user_deactivated",
        "role_created",
        "role_updated",
        "role_deleted",
        "booking_created",
        "booking_updated",
        "booking_cancelled",
        "auth_email_sent",
        "auth_received",
        "payment_link_created",
        "payment_link_shared",
        "payment_received",
        "primary_doc_uploaded",
        "primary_doc_sent",
        "invoice_generated",
        "invoice_sent",
        "invoice_updated",
        "note_added",
        "note_updated",
        "note_deleted"
      ),
      allowNull: false,
      field: "event_type",
    },
    description: { type: DataTypes.STRING, allowNull: false },
    actorId: { type: DataTypes.INTEGER, allowNull: true, field: "actor_id" },
    actorEmail: { type: DataTypes.STRING, allowNull: true, field: "actor_email" },
    targetUserId: { type: DataTypes.INTEGER, allowNull: true, field: "target_user_id" },
    bookingId: { type: DataTypes.INTEGER, allowNull: true, field: "booking_id" },
    ipAddress: { type: DataTypes.STRING, allowNull: true, field: "ip_address" },
    metadata: { type: DataTypes.JSON, allowNull: true },
    occurredAt: { type: DataTypes.DATE, field: "occurred_at", defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "audit_logs", modelName: "AuditLog", timestamps: false }
);
