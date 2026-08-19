import { User } from "./User";
import { Role } from "./Role";
import { Permission } from "./Permission";
import { RolePermission } from "./RolePermission";
import { Customer } from "./Customer";
import { Booking } from "./Booking";
import { Passenger } from "./Passenger";
import { FlightDetail } from "./FlightDetail";
import { HotelDetail } from "./HotelDetail";
import { CarDetail } from "./CarDetail";
import { FlightSegment } from "./FlightSegment";
import { BookingFare } from "./BookingFare";
import { TicketAuthorization } from "./TicketAuthorization";
import { PaymentLink } from "./PaymentLink";
import { RiskEngineSubmission } from "./RiskEngineSubmission";
import { Payment } from "./Payment";
import { BookingDocument } from "./BookingDocument";
import { Invoice } from "./Invoice";
import { EmailLog } from "./EmailLog";
import { ActivityTimelineEntry } from "./ActivityTimelineEntry";
import { AuditLog } from "./AuditLog";
import { BookingNote } from "./BookingNote";
import { UserAccessLocation } from "./UserAccessLocation";
import { LoginHistory } from "./LoginHistory";
import { AdminNotification } from "./AdminNotification";
import { TravelProviderLogo } from "./TravelProviderLogo";
import { LoginOtpChallenge } from "./LoginOtpChallenge";

// Next.js can evaluate this module more than once in development while keeping the
// same Sequelize model constructors alive. Register the association graph only once.
if (!User.associations.createdUsers) {
// Users
User.hasMany(User, { foreignKey: "createdBy", as: "createdUsers" });
User.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

// Roles / permissions
Role.hasMany(User, { foreignKey: "roleId", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "roleRecord" });
User.hasMany(UserAccessLocation, { foreignKey: "userId", as: "accessLocations" });
UserAccessLocation.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(LoginHistory, { foreignKey: "userId", as: "loginHistories" });
LoginHistory.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(LoginOtpChallenge, { foreignKey: "userId", as: "loginOtpChallenges" });
LoginOtpChallenge.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(AdminNotification, { foreignKey: "recipientUserId", as: "notifications" });
AdminNotification.belongsTo(User, { foreignKey: "recipientUserId", as: "recipient" });
User.hasMany(AdminNotification, { foreignKey: "actorUserId", as: "triggeredNotifications" });
AdminNotification.belongsTo(User, { foreignKey: "actorUserId", as: "actor" });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: "roleId", otherKey: "permissionId", as: "permissions" });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: "permissionId", otherKey: "roleId", as: "roles" });

User.hasMany(Booking, { foreignKey: "agentId", as: "bookings" });
Booking.belongsTo(User, { foreignKey: "agentId", as: "agent" });

// Customers
Customer.hasMany(Booking, { foreignKey: "customerId", as: "bookings" });
Booking.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

// Passengers
Booking.hasMany(Passenger, { foreignKey: "bookingId", as: "passengers" });
Passenger.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Type-specific details (one-to-one; only the table matching booking.type is ever populated)
Booking.hasOne(FlightDetail, { foreignKey: "bookingId", as: "flightDetail" });
FlightDetail.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

Booking.hasOne(HotelDetail, { foreignKey: "bookingId", as: "hotelDetail" });
HotelDetail.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

Booking.hasOne(CarDetail, { foreignKey: "bookingId", as: "carDetail" });
CarDetail.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Flight segments (one or more legs per flight booking)
Booking.hasMany(FlightSegment, { foreignKey: "bookingId", as: "segments" });
FlightSegment.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Per-passenger-type fare breakdown
Booking.hasMany(BookingFare, { foreignKey: "bookingId", as: "fares" });
BookingFare.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Ticket authorization
Booking.hasOne(TicketAuthorization, { foreignKey: "bookingId", as: "ticketAuthorization" });
TicketAuthorization.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Payment links -> risk engine submissions / payments
Booking.hasMany(PaymentLink, { foreignKey: "bookingId", as: "paymentLinks" });
PaymentLink.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

PaymentLink.hasMany(RiskEngineSubmission, { foreignKey: "paymentLinkId", as: "riskEngineSubmissions" });
RiskEngineSubmission.belongsTo(PaymentLink, { foreignKey: "paymentLinkId", as: "paymentLink" });
Booking.hasMany(RiskEngineSubmission, { foreignKey: "bookingId", as: "riskEngineSubmissions" });
RiskEngineSubmission.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

PaymentLink.hasMany(Payment, { foreignKey: "paymentLinkId", as: "payments" });
Payment.belongsTo(PaymentLink, { foreignKey: "paymentLinkId", as: "paymentLink" });
Booking.hasMany(Payment, { foreignKey: "bookingId", as: "payments" });
Payment.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Documents
Booking.hasMany(BookingDocument, { foreignKey: "bookingId", as: "documents" });
BookingDocument.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });
User.hasMany(BookingDocument, { foreignKey: "uploadedBy", as: "uploadedDocuments" });
BookingDocument.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });

// Invoices
Booking.hasMany(Invoice, { foreignKey: "bookingId", as: "invoices" });
Invoice.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Email logs
Booking.hasMany(EmailLog, { foreignKey: "bookingId", as: "emailLogs" });
EmailLog.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });

// Activity timeline
Booking.hasMany(ActivityTimelineEntry, { foreignKey: "bookingId", as: "activityTimeline" });
ActivityTimelineEntry.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });
User.hasMany(ActivityTimelineEntry, { foreignKey: "actorId", as: "activityEntries" });
ActivityTimelineEntry.belongsTo(User, { foreignKey: "actorId", as: "actor" });

// Booking notes
Booking.hasMany(BookingNote, { foreignKey: "bookingId", as: "notes" });
BookingNote.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });
User.hasMany(BookingNote, { foreignKey: "createdBy", as: "authoredNotes" });
BookingNote.belongsTo(User, { foreignKey: "createdBy", as: "author" });
User.hasMany(BookingNote, { foreignKey: "updatedBy", as: "editedNotes" });
BookingNote.belongsTo(User, { foreignKey: "updatedBy", as: "editor" });

// Audit log
User.hasMany(AuditLog, { foreignKey: "actorId", as: "auditEntriesAsActor" });
AuditLog.belongsTo(User, { foreignKey: "actorId", as: "actor" });
User.hasMany(AuditLog, { foreignKey: "targetUserId", as: "auditEntriesAsTarget" });
AuditLog.belongsTo(User, { foreignKey: "targetUserId", as: "targetUser" });
Booking.hasMany(AuditLog, { foreignKey: "bookingId", as: "auditLogs" });
AuditLog.belongsTo(Booking, { foreignKey: "bookingId", as: "booking" });
}

export {
  User,
  Role,
  Permission,
  RolePermission,
  Customer,
  Booking,
  Passenger,
  FlightDetail,
  HotelDetail,
  CarDetail,
  FlightSegment,
  BookingFare,
  TicketAuthorization,
  PaymentLink,
  RiskEngineSubmission,
  Payment,
  BookingDocument,
  Invoice,
  EmailLog,
  ActivityTimelineEntry,
  AuditLog,
  BookingNote,
  UserAccessLocation,
  LoginHistory,
  AdminNotification,
  TravelProviderLogo,
  LoginOtpChallenge,
};
