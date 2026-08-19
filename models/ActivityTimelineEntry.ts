import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { User } from "./User";

export type ActivityEventType =
  | "booking_created"
  | "booking_updated"
  | "booking_cancelled"
  | "booking_viewed"
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

export class ActivityTimelineEntry extends Model<
  InferAttributes<ActivityTimelineEntry>,
  InferCreationAttributes<ActivityTimelineEntry>
> {
  declare id: CreationOptional<number>;
  declare bookingId: number;
  declare eventType: ActivityEventType;
  declare description: string;
  declare actorId: number | null;
  declare actorEmail: string | null;
  declare actorRole: string | null;
  declare occurredAt: CreationOptional<Date>;

  declare actor?: NonAttribute<User>;
}

ActivityTimelineEntry.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingId: { type: DataTypes.INTEGER, allowNull: false, field: "booking_id" },
    eventType: {
      type: DataTypes.ENUM(
        "booking_created",
        "booking_updated",
        "booking_cancelled",
        "booking_viewed",
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
    actorRole: { type: DataTypes.STRING, allowNull: true, field: "actor_role" },
    occurredAt: { type: DataTypes.DATE, field: "occurred_at", defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "activity_timeline_entries", modelName: "ActivityTimelineEntry", timestamps: false }
);
