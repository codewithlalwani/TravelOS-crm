import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import type { Customer } from "./Customer";
import type { User } from "./User";
import type { Passenger } from "./Passenger";
import type { FlightDetail } from "./FlightDetail";
import type { HotelDetail } from "./HotelDetail";
import type { CarDetail } from "./CarDetail";
import type { FlightSegment } from "./FlightSegment";
import type { BookingFare } from "./BookingFare";
import type { TicketAuthorization } from "./TicketAuthorization";
import type { PaymentLink } from "./PaymentLink";
import type { Payment } from "./Payment";
import type { RiskEngineSubmission } from "./RiskEngineSubmission";
import type { BookingDocument } from "./BookingDocument";
import type { Invoice } from "./Invoice";
import type { ActivityTimelineEntry } from "./ActivityTimelineEntry";
import type { BookingNote } from "./BookingNote";

export type BookingType = "flight" | "hotel" | "car" | "train" | "cruise";

export type BookingStatus =
  | "created"
  | "auth_sent"
  | "authorized"
  | "payment_link_created"
  | "payment_received"
  | "primary_doc_uploaded"
  | "primary_doc_sent"
  | "invoiced"
  | "completed";

export const BOOKING_STATUS_ORDER: BookingStatus[] = [
  "created",
  "auth_sent",
  "authorized",
  "payment_link_created",
  "payment_received",
  "primary_doc_uploaded",
  "primary_doc_sent",
  "invoiced",
  "completed",
];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  created: "New",
  auth_sent: "Authorization Sent",
  authorized: "Authorized",
  payment_link_created: "Payment Link Sent",
  payment_received: "Payment Received",
  primary_doc_uploaded: "Document Uploaded",
  primary_doc_sent: "Document Sent",
  invoiced: "Invoiced",
  completed: "Completed",
};

export function statusAtLeast(status: BookingStatus, target: BookingStatus): boolean {
  return BOOKING_STATUS_ORDER.indexOf(status) >= BOOKING_STATUS_ORDER.indexOf(target);
}

export const BOOKING_TYPE_LABEL: Record<BookingType, string> = {
  flight: "Flight",
  hotel: "Hotel",
  car: "Car Rental",
  train: "Train",
  cruise: "Cruise",
};

export class Booking extends Model<InferAttributes<Booking>, InferCreationAttributes<Booking>> {
  declare id: CreationOptional<number>;
  declare bookingRef: string;
  declare type: BookingType;
  declare customerId: number;
  declare agentId: number;
  declare status: CreationOptional<BookingStatus>;
  declare totalAmount: string | null;
  declare netAmount: string | null;
  declare mcoAmount: string | null;
  declare currency: CreationOptional<string>;
  declare cancelledAt: Date | null;
  declare cancelledReason: string | null;
  declare cancelledByName: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Populated only when eager-loaded via `include` — not real columns.
  declare customer?: NonAttribute<Customer>;
  declare agent?: NonAttribute<User>;
  declare passengers?: NonAttribute<Passenger[]>;
  declare flightDetail?: NonAttribute<FlightDetail>;
  declare hotelDetail?: NonAttribute<HotelDetail>;
  declare carDetail?: NonAttribute<CarDetail>;
  declare segments?: NonAttribute<FlightSegment[]>;
  declare fares?: NonAttribute<BookingFare[]>;
  declare ticketAuthorization?: NonAttribute<TicketAuthorization>;
  declare paymentLinks?: NonAttribute<PaymentLink[]>;
  declare payments?: NonAttribute<Payment[]>;
  declare riskEngineSubmissions?: NonAttribute<RiskEngineSubmission[]>;
  declare documents?: NonAttribute<BookingDocument[]>;
  declare invoices?: NonAttribute<Invoice[]>;
  declare activityTimeline?: NonAttribute<ActivityTimelineEntry[]>;
  declare notes?: NonAttribute<BookingNote[]>;
}

Booking.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookingRef: { type: DataTypes.STRING, allowNull: false, unique: true, field: "booking_ref" },
    type: { type: DataTypes.ENUM("flight", "hotel", "car", "train", "cruise"), allowNull: false },
    customerId: { type: DataTypes.INTEGER, allowNull: false, field: "customer_id" },
    agentId: { type: DataTypes.INTEGER, allowNull: false, field: "agent_id" },
    status: {
      type: DataTypes.ENUM(...BOOKING_STATUS_ORDER),
      allowNull: false,
      defaultValue: "created",
    },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "total_amount" },
    netAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "net_amount" },
    mcoAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "mco_amount" },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD" },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: "cancelled_at" },
    cancelledReason: { type: DataTypes.TEXT, allowNull: true, field: "cancelled_reason" },
    cancelledByName: { type: DataTypes.STRING, allowNull: true, field: "cancelled_by_name" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "bookings", modelName: "Booking" }
);
