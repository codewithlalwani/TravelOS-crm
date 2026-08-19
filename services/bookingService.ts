import { Op } from "sequelize";
import { Booking, statusAtLeast } from "../models/Booking";
import { Customer } from "../models/Customer";
import { Passenger, type PaxType } from "../models/Passenger";
import { PAX_TYPE_LABEL } from "../lib/booking/paxTypes";
import { FlightDetail } from "../models/FlightDetail";
import { HotelDetail } from "../models/HotelDetail";
import { CarDetail } from "../models/CarDetail";
import { FlightSegment } from "../models/FlightSegment";
import { BookingFare } from "../models/BookingFare";
import { TicketAuthorization } from "../models/TicketAuthorization";
import { PaymentLink } from "../models/PaymentLink";
import { RiskEngineSubmission } from "../models/RiskEngineSubmission";
import { Payment } from "../models/Payment";
import { BookingDocument, PRIMARY_DOC_TYPE_BY_BOOKING_TYPE, PRIMARY_DOC_LABEL } from "../models/BookingDocument";
import { Invoice } from "../models/Invoice";
import { EmailLog } from "../models/EmailLog";
import { paymentGateway } from "../lib/payments/PayGlocalAdapter";
import type {
  PaymentWebhookPayload,
  RiskEngineSubmissionResult,
  CreatePaymentLinkTravelData,
} from "../lib/payments/PaymentGatewayAdapter";
import { generateUniqueShortCode, buildShortPayUrl } from "../lib/payments/shortLink";
import { sendEmail } from "../lib/email/EmailAdapter";
import { ticketAuthorizationEmail, primaryDocumentEmail, invoiceEmail, paymentLinkEmail } from "../lib/email/templates";
import { countryNameFromCode } from "../lib/geo/countryName";
import { saveUploadedFile, readStoredFile, storedFileUrl } from "../lib/storage/FileStorageAdapter";
import { generateInvoicePdf } from "../lib/invoices/generateInvoicePdf";
import { logActivity } from "./activityService";
import { logAuditEvent } from "./auditLogService";
import type { ActivityEventType } from "../models/ActivityTimelineEntry";
import type { AuditEventType } from "../models/AuditLog";
import { emailLogoUrl, providerLogosForNames } from "./providerLogoService";

const BOOKING_REF_PREFIX = "MFS9";

async function addProviderLogosToEmailDetails(
  bookingType: "flight" | "hotel" | "car" | "train" | "cruise",
  segments?: Array<{ airline: string; logoUrl?: string | null }>,
  hotel?: { hotelName: string; logoUrl?: string | null } | null,
  car?: { supplier: string; logoUrl?: string | null } | null
) {
  const category = bookingType === "train" ? "rail" : bookingType === "car" ? "car_rental" : bookingType;
  const names = segments?.map((segment) => segment.airline) ?? (hotel ? [hotel.hotelName] : car ? [car.supplier] : []);
  const logos = await providerLogosForNames(category, names);

  for (const segment of segments || []) segment.logoUrl = emailLogoUrl(logos[segment.airline]?.url);
  if (hotel) hotel.logoUrl = emailLogoUrl(logos[hotel.hotelName]?.url);
  if (car) car.logoUrl = emailLogoUrl(logos[car.supplier]?.url);
}

/** Business events that get recorded both on the booking's activity timeline and in the audit log. */
type BookingLifecycleEvent = Extract<ActivityEventType, AuditEventType>;

async function logBookingEvent(
  bookingId: number,
  eventType: BookingLifecycleEvent,
  description: string,
  actorId: number | null
) {
  await logActivity(bookingId, eventType, description, actorId);
  await logAuditEvent({ eventType, description, actorId, bookingId });
}

async function generateBookingRef(): Promise<string> {
  const last = await Booking.findOne({
    where: { bookingRef: { [Op.like]: `${BOOKING_REF_PREFIX}-%` } },
    order: [["id", "DESC"]],
  });

  let nextNumber = 1;
  if (last) {
    const match = last.bookingRef.match(/^MFS9-(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }

  return `${BOOKING_REF_PREFIX}-${String(nextNumber).padStart(7, "0")}`;
}

export interface CreateFlightBookingParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddressStreet1?: string;
  customerAddressCity?: string;
  customerAddressState?: string;
  customerAddressCountry?: string;
  agentId: number;
  pnr: string;
  origin: string;
  destination: string;
  cabinClass: string;
  gds: string;
  ticketingSupplier: string;
  tripType: string;
  journeyType: string;
  fareType: string;
  ticketingDeadline?: string;
  ticketingDeadlineTime?: string;
  supplierReference?: string;
  buyCurrency: string;
  sellCurrency: string;
  rateRemarks?: string;
  specialRequest?: string;
  segments: Array<{
    flightNumber?: string;
    airline: string;
    airlinePnr?: string;
    depAirport: string;
    depCity?: string;
    depCountry?: string;
    depDate: string;
    depTime?: string;
    depTerminal?: string;
    arrAirport: string;
    arrCity?: string;
    arrCountry?: string;
    arrDate?: string;
    arrTime?: string;
    arrTerminal?: string;
    bookingClass?: string;
    cabinClass?: string;
    status?: string;
    operatedBy?: string;
  }>;
  passengers: Array<{
    title?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender?: string;
    paxType: PaxType;
    dob?: string;
    passportNo?: string;
  }>;
  fares: Array<{ paxType: PaxType; baseFare: number; tax: number; net: number }>;
}

export async function createFlightBooking(params: CreateFlightBookingParams) {
  const [customer, created] = await Customer.findOrCreate({
    where: { email: params.customerEmail },
    defaults: {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone || null,
      addressStreet1: params.customerAddressStreet1 || null,
      addressCity: params.customerAddressCity || null,
      addressState: params.customerAddressState || null,
      addressCountry: params.customerAddressCountry || null,
    },
  });
  if (!created) {
    await customer.update({
      name: params.customerName,
      phone: params.customerPhone || null,
      addressStreet1: params.customerAddressStreet1 || null,
      addressCity: params.customerAddressCity || null,
      addressState: params.customerAddressState || null,
      addressCountry: params.customerAddressCountry || null,
    });
  }

  const grossByPaxType = new Map<PaxType, number>();
  const netByPaxType = new Map<PaxType, number>();
  for (const f of params.fares) {
    grossByPaxType.set(f.paxType, f.baseFare + f.tax);
    netByPaxType.set(f.paxType, f.net);
  }
  const totalAmount = params.passengers.reduce(
    (sum, p) => sum + (grossByPaxType.get(p.paxType) ?? 0),
    0
  );
  const netAmount = params.passengers.reduce(
    (sum, p) => sum + (netByPaxType.get(p.paxType) ?? 0),
    0
  );
  const mcoAmount = totalAmount - netAmount;

  const booking = await Booking.create({
    bookingRef: await generateBookingRef(),
    type: "flight",
    customerId: customer.id,
    agentId: params.agentId,
    status: "created",
    totalAmount: totalAmount.toFixed(2),
    netAmount: netAmount.toFixed(2),
    mcoAmount: mcoAmount.toFixed(2),
    currency: params.sellCurrency,
  });

  await FlightDetail.create({
    bookingId: booking.id,
    pnr: params.pnr,
    origin: params.origin,
    destination: params.destination,
    travelDate: params.segments[0].depDate,
    cabinClass: params.cabinClass,
    gds: params.gds,
    ticketingSupplier: params.ticketingSupplier,
    tripType: params.tripType,
    journeyType: params.journeyType,
    fareType: params.fareType,
    ticketingDeadline: params.ticketingDeadline || null,
    ticketingDeadlineTime: params.ticketingDeadlineTime || null,
    supplierReference: params.supplierReference || null,
    buyCurrency: params.buyCurrency,
    sellCurrency: params.sellCurrency,
    rateRemarks: params.rateRemarks || null,
    specialRequest: params.specialRequest || null,
  });

  for (const [index, s] of params.segments.entries()) {
    await FlightSegment.create({
      bookingId: booking.id,
      sequence: index,
      flightNumber: s.flightNumber || null,
      airline: s.airline,
      airlinePnr: s.airlinePnr || null,
      depAirport: s.depAirport,
      depCity: s.depCity || null,
      depCountry: s.depCountry || null,
      depDate: s.depDate,
      depTime: s.depTime || null,
      depTerminal: s.depTerminal || null,
      arrAirport: s.arrAirport,
      arrCity: s.arrCity || null,
      arrCountry: s.arrCountry || null,
      arrDate: s.arrDate || null,
      arrTime: s.arrTime || null,
      arrTerminal: s.arrTerminal || null,
      bookingClass: s.bookingClass || null,
      cabinClass: s.cabinClass || null,
      status: s.status || "HK",
      operatedBy: s.operatedBy || null,
    });
  }

  for (const p of params.passengers) {
    await Passenger.create({
      bookingId: booking.id,
      title: p.title || null,
      firstName: p.firstName,
      middleName: p.middleName || null,
      lastName: p.lastName,
      gender: p.gender || null,
      paxType: p.paxType,
      dob: p.dob || null,
      passportNo: p.passportNo || null,
    });
  }

  for (const f of params.fares) {
    const gross = f.baseFare + f.tax;
    const mco = gross - f.net;
    await BookingFare.create({
      bookingId: booking.id,
      paxType: f.paxType,
      baseFare: f.baseFare.toFixed(2),
      tax: f.tax.toFixed(2),
      gross: gross.toFixed(2),
      net: f.net.toFixed(2),
      mco: mco.toFixed(2),
    });
  }

  await logBookingEvent(booking.id, "booking_created", "Booking created", params.agentId);

  return booking;
}

export interface CreateRailBookingParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  agentId: number;
  operator: "VIA Rail" | "Amtrak";
  tripType: "One Way" | "Round Trip" | "Multi City";
  legs: Array<{
    originCode: string;
    originName: string;
    destinationCode: string;
    destinationName: string;
    departureDate: string;
  }>;
  travelers: number;
  currency: string;
  totalAmount: number;
  netAmount: number;
}

/**
 * Rail currently reuses the mature segment/passenger/fare storage used by flights. The booking is
 * typed as `train`, so it follows the same authorization, payment, document and invoice pipeline.
 */
export async function createRailBooking(params: CreateRailBookingParams) {
  const [firstName, ...lastParts] = params.customerName.trim().split(/\s+/);
  const lastName = lastParts.join(" ") || "Traveler";
  const grossPerTraveler = params.totalAmount / params.travelers;
  const netPerTraveler = params.netAmount / params.travelers;
  const firstLeg = params.legs[0];
  const lastLeg = params.legs[params.legs.length - 1];

  const booking = await createFlightBooking({
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    agentId: params.agentId,
    pnr: "PENDING",
    origin: firstLeg.originCode,
    destination: params.tripType === "Round Trip" ? firstLeg.destinationCode : lastLeg.destinationCode,
    cabinClass: "Economy",
    gds: params.operator,
    ticketingSupplier: params.operator,
    tripType: params.tripType,
    journeyType: "Domestic",
    fareType: "PUBLISHED",
    buyCurrency: params.currency,
    sellCurrency: params.currency,
    rateRemarks: params.legs.map((leg) => `${leg.originName} to ${leg.destinationName}`).join("; "),
    segments: params.legs.map((leg) => ({
      airline: params.operator,
      depAirport: leg.originCode,
      depCity: leg.originName,
      depCountry: "CA",
      depDate: leg.departureDate,
      arrAirport: leg.destinationCode,
      arrCity: leg.destinationName,
      arrCountry: "CA",
      cabinClass: "Economy",
      status: "HK",
    })),
    passengers: Array.from({ length: params.travelers }, (_, index) => ({
      firstName: index === 0 ? firstName : `Traveler ${index + 1}`,
      lastName: index === 0 ? lastName : params.customerName,
      paxType: "ADT" as const,
    })),
    fares: [{ paxType: "ADT", baseFare: grossPerTraveler, tax: 0, net: netPerTraveler }],
  });

  await booking.update({ type: "train" });
  return booking;
}

export type UpdateFlightBookingParams = Omit<CreateFlightBookingParams, "agentId">;

export async function updateFlightBooking(bookingId: number, params: UpdateFlightBookingParams, actorId: number) {
  const booking = await loadBookingOrThrow(bookingId);
  if (booking.type !== "flight") throw new Error("This booking is not a flight booking");

  const customer = await Customer.findByPk(booking.customerId);
  if (!customer) throw new Error("Customer not found");
  await customer.update({
    name: params.customerName,
    email: params.customerEmail,
    phone: params.customerPhone || null,
    addressStreet1: params.customerAddressStreet1 || null,
    addressCity: params.customerAddressCity || null,
    addressState: params.customerAddressState || null,
    addressCountry: params.customerAddressCountry || null,
  });

  const grossByPaxType = new Map<PaxType, number>();
  const netByPaxType = new Map<PaxType, number>();
  for (const f of params.fares) {
    grossByPaxType.set(f.paxType, f.baseFare + f.tax);
    netByPaxType.set(f.paxType, f.net);
  }
  const totalAmount = params.passengers.reduce(
    (sum, p) => sum + (grossByPaxType.get(p.paxType) ?? 0),
    0
  );
  const netAmount = params.passengers.reduce(
    (sum, p) => sum + (netByPaxType.get(p.paxType) ?? 0),
    0
  );
  const mcoAmount = totalAmount - netAmount;

  await booking.update({
    totalAmount: totalAmount.toFixed(2),
    netAmount: netAmount.toFixed(2),
    mcoAmount: mcoAmount.toFixed(2),
    currency: params.sellCurrency,
  });

  const flightDetail = await FlightDetail.findOne({ where: { bookingId } });
  if (!flightDetail) throw new Error("Flight detail not found");
  await flightDetail.update({
    pnr: params.pnr,
    origin: params.origin,
    destination: params.destination,
    travelDate: params.segments[0].depDate,
    cabinClass: params.cabinClass,
    gds: params.gds,
    ticketingSupplier: params.ticketingSupplier,
    tripType: params.tripType,
    journeyType: params.journeyType,
    fareType: params.fareType,
    ticketingDeadline: params.ticketingDeadline || null,
    ticketingDeadlineTime: params.ticketingDeadlineTime || null,
    supplierReference: params.supplierReference || null,
    buyCurrency: params.buyCurrency,
    sellCurrency: params.sellCurrency,
    rateRemarks: params.rateRemarks || null,
    specialRequest: params.specialRequest || null,
  });

  // Segments/passengers/fares are replaced wholesale rather than diffed — the edit form
  // lets rows be freely added/removed client-side, so there's no stable id to reconcile
  // against, and nothing else in the schema holds a foreign key onto these rows.
  await FlightSegment.destroy({ where: { bookingId } });
  for (const [index, s] of params.segments.entries()) {
    await FlightSegment.create({
      bookingId,
      sequence: index,
      flightNumber: s.flightNumber || null,
      airline: s.airline,
      airlinePnr: s.airlinePnr || null,
      depAirport: s.depAirport,
      depCity: s.depCity || null,
      depCountry: s.depCountry || null,
      depDate: s.depDate,
      depTime: s.depTime || null,
      depTerminal: s.depTerminal || null,
      arrAirport: s.arrAirport,
      arrCity: s.arrCity || null,
      arrCountry: s.arrCountry || null,
      arrDate: s.arrDate || null,
      arrTime: s.arrTime || null,
      arrTerminal: s.arrTerminal || null,
      bookingClass: s.bookingClass || null,
      cabinClass: s.cabinClass || null,
      status: s.status || "HK",
      operatedBy: s.operatedBy || null,
    });
  }

  await Passenger.destroy({ where: { bookingId } });
  for (const p of params.passengers) {
    await Passenger.create({
      bookingId,
      title: p.title || null,
      firstName: p.firstName,
      middleName: p.middleName || null,
      lastName: p.lastName,
      gender: p.gender || null,
      paxType: p.paxType,
      dob: p.dob || null,
      passportNo: p.passportNo || null,
    });
  }

  await BookingFare.destroy({ where: { bookingId } });
  for (const f of params.fares) {
    const gross = f.baseFare + f.tax;
    const mco = gross - f.net;
    await BookingFare.create({
      bookingId,
      paxType: f.paxType,
      baseFare: f.baseFare.toFixed(2),
      tax: f.tax.toFixed(2),
      gross: gross.toFixed(2),
      net: f.net.toFixed(2),
      mco: mco.toFixed(2),
    });
  }

  await logBookingEvent(booking.id, "booking_updated", "Booking details updated", actorId);

  return booking;
}

export interface CreateHotelBookingParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddressStreet1?: string;
  customerAddressCity?: string;
  customerAddressState?: string;
  customerAddressCountry?: string;
  gstNumber?: string;
  gstCompanyName?: string;
  agentId: number;
  hotelName: string;
  address: string;
  /** The hotel's own city and ISO country code — sent to the gateway's risk engine. */
  city?: string;
  country?: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  guests: number;
  ratePerNight?: number;
  taxesAndFees?: number;
  confirmationNo: string;
  hotelRating?: number;
  cancellationPolicy?: string;
  specialRequest?: string;
  currency: string;
  grossAmount?: number;
  netAmount?: number;
  guestList: Array<{
    title?: string;
    firstName: string;
    lastName: string;
    dob?: string;
  }>;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const inDate = new Date(`${checkIn}T00:00:00Z`);
  const outDate = new Date(`${checkOut}T00:00:00Z`);
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

export async function createHotelBooking(params: CreateHotelBookingParams) {
  const [customer, created] = await Customer.findOrCreate({
    where: { email: params.customerEmail },
    defaults: {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone || null,
      addressStreet1: params.customerAddressStreet1 || null,
      addressCity: params.customerAddressCity || null,
      addressState: params.customerAddressState || null,
      addressCountry: params.customerAddressCountry || null,
      gstNumber: params.gstNumber || null,
      gstCompanyName: params.gstCompanyName || null,
    },
  });
  if (!created) {
    await customer.update({
      name: params.customerName,
      phone: params.customerPhone || null,
      addressStreet1: params.customerAddressStreet1 || null,
      addressCity: params.customerAddressCity || null,
      addressState: params.customerAddressState || null,
      addressCountry: params.customerAddressCountry || null,
      gstNumber: params.gstNumber || null,
      gstCompanyName: params.gstCompanyName || null,
    });
  }

  const nights = nightsBetween(params.checkIn, params.checkOut);
  const roomCharge = (params.ratePerNight ?? 0) * nights;
  const totalAmount = params.grossAmount ?? (roomCharge + (params.taxesAndFees ?? 0));
  const netAmount = params.netAmount;
  const mcoAmount = netAmount != null ? totalAmount - netAmount : undefined;

  const booking = await Booking.create({
    bookingRef: await generateBookingRef(),
    type: "hotel",
    customerId: customer.id,
    agentId: params.agentId,
    status: "created",
    totalAmount: totalAmount.toFixed(2),
    netAmount: netAmount != null ? netAmount.toFixed(2) : null,
    mcoAmount: mcoAmount != null ? mcoAmount.toFixed(2) : null,
    currency: params.currency,
  });

  await HotelDetail.create({
    bookingId: booking.id,
    hotelName: params.hotelName,
    address: params.address,
    city: params.city || null,
    country: params.country || null,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    roomType: params.roomType,
    guests: params.guests,
    ratePerNight: params.ratePerNight != null ? params.ratePerNight.toFixed(2) : null,
    taxesAndFees: params.taxesAndFees != null ? params.taxesAndFees.toFixed(2) : null,
    confirmationNo: params.confirmationNo,
    hotelRating: params.hotelRating != null ? params.hotelRating.toFixed(1) : null,
    cancellationPolicy: params.cancellationPolicy || null,
    specialRequest: params.specialRequest || null,
  });

  for (const g of params.guestList) {
    await Passenger.create({
      bookingId: booking.id,
      title: g.title || null,
      firstName: g.firstName,
      lastName: g.lastName,
      paxType: "ADT",
      dob: g.dob || null,
    });
  }

  await logBookingEvent(booking.id, "booking_created", "Booking created", params.agentId);

  return booking;
}

export type UpdateHotelBookingParams = Omit<CreateHotelBookingParams, "agentId">;

export async function updateHotelBooking(bookingId: number, params: UpdateHotelBookingParams, actorId: number) {
  const booking = await loadBookingOrThrow(bookingId);
  if (booking.type !== "hotel") throw new Error("This booking is not a hotel booking");

  const customer = await Customer.findByPk(booking.customerId);
  if (!customer) throw new Error("Customer not found");
  await customer.update({
    name: params.customerName,
    email: params.customerEmail,
    phone: params.customerPhone || null,
    addressStreet1: params.customerAddressStreet1 || null,
    addressCity: params.customerAddressCity || null,
    addressState: params.customerAddressState || null,
    addressCountry: params.customerAddressCountry || null,
    gstNumber: params.gstNumber || null,
    gstCompanyName: params.gstCompanyName || null,
  });

  const nights = nightsBetween(params.checkIn, params.checkOut);
  const roomCharge = (params.ratePerNight ?? 0) * nights;
  const totalAmount = params.grossAmount ?? (roomCharge + (params.taxesAndFees ?? 0));
  const netAmount = params.netAmount;
  const mcoAmount = netAmount != null ? totalAmount - netAmount : undefined;

  await booking.update({
    totalAmount: totalAmount.toFixed(2),
    netAmount: netAmount != null ? netAmount.toFixed(2) : null,
    mcoAmount: mcoAmount != null ? mcoAmount.toFixed(2) : null,
    currency: params.currency,
  });

  const hotelDetail = await HotelDetail.findOne({ where: { bookingId } });
  if (!hotelDetail) throw new Error("Hotel detail not found");
  await hotelDetail.update({
    hotelName: params.hotelName,
    address: params.address,
    city: params.city || null,
    country: params.country || null,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    roomType: params.roomType,
    guests: params.guests,
    ratePerNight: params.ratePerNight != null ? params.ratePerNight.toFixed(2) : null,
    taxesAndFees: params.taxesAndFees != null ? params.taxesAndFees.toFixed(2) : null,
    confirmationNo: params.confirmationNo,
    hotelRating: params.hotelRating != null ? params.hotelRating.toFixed(1) : null,
    cancellationPolicy: params.cancellationPolicy || null,
    specialRequest: params.specialRequest || null,
  });

  // Guest list is replaced wholesale rather than diffed, matching the flight booking's
  // segments/passengers handling — the edit form allows free add/remove client-side.
  await Passenger.destroy({ where: { bookingId } });
  for (const g of params.guestList) {
    await Passenger.create({
      bookingId,
      title: g.title || null,
      firstName: g.firstName,
      lastName: g.lastName,
      paxType: "ADT",
      dob: g.dob || null,
    });
  }

  await logBookingEvent(booking.id, "booking_updated", "Booking details updated", actorId);

  return booking;
}

export interface CreateCarBookingParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddressStreet1?: string;
  customerAddressCity?: string;
  customerAddressState?: string;
  customerAddressCountry?: string;
  agentId: number;
  pickupLocation: string;
  pickupCity?: string;
  pickupCountry?: string;
  pickupState?: string;
  pickupStationType: string;
  pickupStation?: string;
  pickupDateTime: string;
  dropoffDifferentLocation: boolean;
  dropoffLocation: string;
  dropoffCity?: string;
  dropoffCountry?: string;
  dropoffState?: string;
  dropoffStationType: string;
  dropoffStation?: string;
  dropoffDateTime: string;
  pickupMeetingPoint?: string;
  meetingPoint?: string;
  rateRemarks?: string;
  specialRequest?: string;
  bookingStatus: string;
  supplierRef: string;
  supplierType: string;
  supplier: string;
  vehicleCode?: string;
  vehicleName?: string;
  maxPax?: number;
  maxLuggage?: number;
  noOfVehicles: number;
  currency: string;
  grossAmount?: number;
  netAmount?: number;
  driverList: Array<{
    title?: string;
    firstName: string;
    lastName: string;
    dob?: string;
  }>;
}

export async function createCarBooking(params: CreateCarBookingParams) {
  const [customer, created] = await Customer.findOrCreate({
    where: { email: params.customerEmail },
    defaults: {
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone || null,
      addressStreet1: params.customerAddressStreet1 || null,
      addressCity: params.customerAddressCity || null,
      addressState: params.customerAddressState || null,
      addressCountry: params.customerAddressCountry || null,
    },
  });
  if (!created) {
    await customer.update({
      name: params.customerName,
      phone: params.customerPhone || null,
      addressStreet1: params.customerAddressStreet1 || null,
      addressCity: params.customerAddressCity || null,
      addressState: params.customerAddressState || null,
      addressCountry: params.customerAddressCountry || null,
    });
  }

  const totalAmount = params.grossAmount ?? 0;
  const netAmount = params.netAmount;
  const mcoAmount = netAmount != null ? totalAmount - netAmount : undefined;

  const booking = await Booking.create({
    bookingRef: await generateBookingRef(),
    type: "car",
    customerId: customer.id,
    agentId: params.agentId,
    status: "created",
    totalAmount: totalAmount.toFixed(2),
    netAmount: netAmount != null ? netAmount.toFixed(2) : null,
    mcoAmount: mcoAmount != null ? mcoAmount.toFixed(2) : null,
    currency: params.currency,
  });

  await CarDetail.create({
    bookingId: booking.id,
    pickupLocation: params.pickupLocation,
    pickupCity: params.pickupCity || null,
    pickupCountry: params.pickupCountry || null,
    pickupState: params.pickupState || null,
    pickupStationType: params.pickupStationType,
    pickupStation: params.pickupStation || null,
    pickupDateTime: new Date(params.pickupDateTime),
    dropoffDifferentLocation: params.dropoffDifferentLocation,
    dropoffLocation: params.dropoffLocation,
    dropoffCity: params.dropoffCity || null,
    dropoffCountry: params.dropoffCountry || null,
    dropoffState: params.dropoffState || null,
    dropoffStationType: params.dropoffStationType,
    dropoffStation: params.dropoffStation || null,
    dropoffDateTime: new Date(params.dropoffDateTime),
    pickupMeetingPoint: params.pickupMeetingPoint || null,
    meetingPoint: params.meetingPoint || null,
    rateRemarks: params.rateRemarks || null,
    specialRequest: params.specialRequest || null,
    bookingStatus: params.bookingStatus,
    supplierRef: params.supplierRef,
    supplierType: params.supplierType,
    supplier: params.supplier,
    vehicleCode: params.vehicleCode || null,
    vehicleName: params.vehicleName || null,
    maxPax: params.maxPax ?? null,
    maxLuggage: params.maxLuggage ?? null,
    noOfVehicles: params.noOfVehicles,
  });

  for (const d of params.driverList) {
    await Passenger.create({
      bookingId: booking.id,
      title: d.title || null,
      firstName: d.firstName,
      lastName: d.lastName,
      paxType: "ADT",
      dob: d.dob || null,
    });
  }

  await logBookingEvent(booking.id, "booking_created", "Booking created", params.agentId);

  return booking;
}

export type UpdateCarBookingParams = Omit<CreateCarBookingParams, "agentId">;

export async function updateCarBooking(bookingId: number, params: UpdateCarBookingParams, actorId: number) {
  const booking = await loadBookingOrThrow(bookingId);
  if (booking.type !== "car") throw new Error("This booking is not a car booking");

  const customer = await Customer.findByPk(booking.customerId);
  if (!customer) throw new Error("Customer not found");
  await customer.update({
    name: params.customerName,
    email: params.customerEmail,
    phone: params.customerPhone || null,
    addressStreet1: params.customerAddressStreet1 || null,
    addressCity: params.customerAddressCity || null,
    addressState: params.customerAddressState || null,
    addressCountry: params.customerAddressCountry || null,
  });

  const totalAmount = params.grossAmount ?? 0;
  const netAmount = params.netAmount;
  const mcoAmount = netAmount != null ? totalAmount - netAmount : undefined;

  await booking.update({
    totalAmount: totalAmount.toFixed(2),
    netAmount: netAmount != null ? netAmount.toFixed(2) : null,
    mcoAmount: mcoAmount != null ? mcoAmount.toFixed(2) : null,
    currency: params.currency,
  });

  const carDetail = await CarDetail.findOne({ where: { bookingId } });
  if (!carDetail) throw new Error("Car detail not found");
  await carDetail.update({
    pickupLocation: params.pickupLocation,
    pickupCity: params.pickupCity || null,
    pickupCountry: params.pickupCountry || null,
    pickupState: params.pickupState || null,
    pickupStationType: params.pickupStationType,
    pickupStation: params.pickupStation || null,
    pickupDateTime: new Date(params.pickupDateTime),
    dropoffDifferentLocation: params.dropoffDifferentLocation,
    dropoffLocation: params.dropoffLocation,
    dropoffCity: params.dropoffCity || null,
    dropoffCountry: params.dropoffCountry || null,
    dropoffState: params.dropoffState || null,
    dropoffStationType: params.dropoffStationType,
    dropoffStation: params.dropoffStation || null,
    dropoffDateTime: new Date(params.dropoffDateTime),
    pickupMeetingPoint: params.pickupMeetingPoint || null,
    meetingPoint: params.meetingPoint || null,
    rateRemarks: params.rateRemarks || null,
    specialRequest: params.specialRequest || null,
    bookingStatus: params.bookingStatus,
    supplierRef: params.supplierRef,
    supplierType: params.supplierType,
    supplier: params.supplier,
    vehicleCode: params.vehicleCode || null,
    vehicleName: params.vehicleName || null,
    maxPax: params.maxPax ?? null,
    maxLuggage: params.maxLuggage ?? null,
    noOfVehicles: params.noOfVehicles,
  });

  // Driver list is replaced wholesale rather than diffed, matching the hotel guest handling —
  // the edit form allows free add/remove client-side.
  await Passenger.destroy({ where: { bookingId } });
  for (const d of params.driverList) {
    await Passenger.create({
      bookingId,
      title: d.title || null,
      firstName: d.firstName,
      lastName: d.lastName,
      paxType: "ADT",
      dob: d.dob || null,
    });
  }

  await logBookingEvent(booking.id, "booking_updated", "Booking details updated", actorId);

  return booking;
}

async function loadBookingOrThrow(bookingId: number) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  return booking;
}

export async function cancelBooking(bookingId: number, reason: string, actorId: number, actorName: string) {
  const booking = await loadBookingOrThrow(bookingId);
  if (booking.cancelledAt) throw new Error("Booking is already cancelled");

  await booking.update({
    cancelledAt: new Date(),
    cancelledReason: reason,
    cancelledByName: actorName,
  });

  await logBookingEvent(booking.id, "booking_cancelled", `Booking cancelled: ${reason}`, actorId);

  return booking;
}

async function emailStatusLabels(booking: Booking) {
  const primaryDocType = PRIMARY_DOC_TYPE_BY_BOOKING_TYPE[booking.type];
  const primaryDoc = await BookingDocument.findOne({ where: { bookingId: booking.id, docType: primaryDocType, isPrimary: true } });
  return {
    paymentStatusLabel: statusAtLeast(booking.status, "payment_received") ? "Received" : "Submitted",
    eTicketStatusLabel: primaryDoc ? "Issued" : "Pending",
  };
}

/** Full hotel detail payload (name, address, dates, room, confirmation no., rate/taxes, special request) for email templates. */
async function hotelDetailForEmail(bookingId: number, currency?: string) {
  const hotelDetail = await HotelDetail.findOne({ where: { bookingId } });
  if (!hotelDetail) return undefined;
  const fmt = (v: string | null) => (v == null ? null : currency ? `${currency} ${Number(v).toFixed(2)}` : v);
  return {
    hotelName: hotelDetail.hotelName,
    address: hotelDetail.address,
    checkIn: hotelDetail.checkIn,
    checkOut: hotelDetail.checkOut,
    roomType: hotelDetail.roomType,
    guests: hotelDetail.guests,
    confirmationNo: hotelDetail.confirmationNo,
    hotelRating: hotelDetail.hotelRating,
    ratePerNight: fmt(hotelDetail.ratePerNight),
    taxesAndFees: fmt(hotelDetail.taxesAndFees),
    specialRequest: hotelDetail.specialRequest,
  };
}

/**
 * Full car rental payload (pickup/dropoff location incl. city + country, stations, dates,
 * supplier, vehicle, capacity, meeting point and remarks) for email templates.
 */
async function carDetailForEmail(bookingId: number) {
  const carDetail = await CarDetail.findOne({ where: { bookingId } });
  if (!carDetail) return undefined;
  return {
    pickupLocation: carDetail.pickupLocation,
    pickupCity: carDetail.pickupCity,
    pickupCountry: countryNameFromCode(carDetail.pickupCountry),
    pickupState: carDetail.pickupState,
    pickupStationType: carDetail.pickupStationType,
    pickupStation: carDetail.pickupStation,
    pickupDateTime: carDetail.pickupDateTime,
    dropoffLocation: carDetail.dropoffLocation,
    dropoffCity: carDetail.dropoffCity,
    dropoffCountry: countryNameFromCode(carDetail.dropoffCountry),
    dropoffState: carDetail.dropoffState,
    dropoffStationType: carDetail.dropoffStationType,
    dropoffStation: carDetail.dropoffStation,
    dropoffDateTime: carDetail.dropoffDateTime,
    pickupMeetingPoint: carDetail.pickupMeetingPoint,
    meetingPoint: carDetail.meetingPoint,
    bookingStatus: carDetail.bookingStatus,
    supplier: carDetail.supplier,
    supplierType: carDetail.supplierType,
    supplierRef: carDetail.supplierRef,
    vehicleCode: carDetail.vehicleCode,
    vehicleName: carDetail.vehicleName,
    maxPax: carDetail.maxPax,
    maxLuggage: carDetail.maxLuggage,
    noOfVehicles: carDetail.noOfVehicles,
    rateRemarks: carDetail.rateRemarks,
    specialRequest: carDetail.specialRequest,
  };
}

export interface SendTicketAuthorizationDetails {
  note?: string;
  authorizedAmount: number;
  authorizationDate: string;
  charges: Array<{ label: string; amount: number }>;
  refundAmount?: number;
  eSignatureName: string;
}

export async function sendTicketAuthorization(
  bookingId: number,
  actorId: number,
  details: SendTicketAuthorizationDetails,
  recipients?: string[]
) {
  const booking = await loadBookingOrThrow(bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  const passengers = await Passenger.findAll({ where: { bookingId } });
  if (!customer) throw new Error("Customer not found");
  const toEmails = recipients && recipients.length > 0 ? recipients : [customer.email];

  const { eTicketStatusLabel } = await emailStatusLabels(booking);

  let pnr: string | null | undefined;
  let segments: Parameters<typeof ticketAuthorizationEmail>[0]["segments"];
  let hotel: Parameters<typeof ticketAuthorizationEmail>[0]["hotel"];
  let car: Parameters<typeof ticketAuthorizationEmail>[0]["car"];
  let flightTripType: string | null | undefined;
  let flightDestination: string | null | undefined;

  if (booking.type === "flight" || booking.type === "train") {
    const flightDetail = await FlightDetail.findOne({ where: { bookingId } });
    const segmentRows = await FlightSegment.findAll({ where: { bookingId }, order: [["sequence", "ASC"]] });
    pnr = flightDetail?.pnr;
    flightTripType = flightDetail?.tripType;
    flightDestination = flightDetail?.destination;
    segments = segmentRows.map((s) => ({
      airline: s.airline,
      flightNumber: s.flightNumber,
      operatedBy: s.operatedBy,
      depAirport: s.depAirport,
      depCity: s.depCity,
      depCountry: s.depCountry,
      depTerminal: s.depTerminal,
      depDate: s.depDate,
      depTime: s.depTime,
      arrAirport: s.arrAirport,
      arrCity: s.arrCity,
      arrCountry: s.arrCountry,
      arrTerminal: s.arrTerminal,
      arrDate: s.arrDate,
      arrTime: s.arrTime,
      cabinClass: s.cabinClass,
      bookingClass: s.bookingClass,
      airlinePnr: s.airlinePnr,
    }));
  } else if (booking.type === "hotel") {
    hotel = await hotelDetailForEmail(bookingId, booking.currency);
  } else if (booking.type === "car") {
    car = await carDetailForEmail(bookingId);
  }

  await addProviderLogosToEmailDetails(booking.type, segments, hotel, car);

  const { subject, html } = ticketAuthorizationEmail({
    customerName: customer.name,
    bookingRef: booking.bookingRef,
    bookingType: booking.type,
    currency: booking.currency,
    createdAt: booking.createdAt,
    paymentStatusLabel: "Pending",
    eTicketStatusLabel,
    authorizedAmount: details.authorizedAmount,
    authorizationDate: details.authorizationDate,
    charges: details.charges,
    refundAmount: details.refundAmount,
    eSignatureName: details.eSignatureName,
    note: details.note,
    pnr,
    passengers: passengers.map((p) => ({
      name: [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
      paxType: p.paxType,
      dob: p.dob,
    })),
    segments,
    tripType: flightTripType,
    destination: flightDestination,
    hotel,
    car,
  });

  const result = await sendEmail({ to: toEmails, subject, html });

  const [auth] = await TicketAuthorization.findOrCreate({
    where: { bookingId },
    defaults: { bookingId, emailSentAt: new Date(), emailBody: html, status: "pending" },
  });
  await auth.update({
    emailSentAt: new Date(),
    emailBody: html,
    status: "pending",
    authorizedAmount: details.authorizedAmount.toFixed(2),
    authorizationDate: details.authorizationDate,
    charges: details.charges,
    refundAmount: details.refundAmount != null ? details.refundAmount.toFixed(2) : null,
    eSignatureName: details.eSignatureName,
  });

  await EmailLog.create({
    bookingId,
    templateType: "ticket_authorization",
    toEmail: toEmails.join(", "),
    subject,
    body: html,
    status: result.status,
  });

  await booking.update({ status: "auth_sent" });
  await logBookingEvent(bookingId, "auth_email_sent", `Ticket authorization email sent to ${toEmails.join(", ")}`, actorId);

  return auth;
}

export async function recordCustomerAuthorization(
  bookingId: number,
  authorized: boolean,
  replyText: string,
  actorId: number
) {
  const booking = await loadBookingOrThrow(bookingId);
  const auth = await TicketAuthorization.findOne({ where: { bookingId } });
  if (!auth) throw new Error("No authorization request has been sent for this booking yet");

  await auth.update({
    customerReplyText: replyText,
    customerReplyReceivedAt: new Date(),
    status: authorized ? "authorized" : "declined",
  });

  if (authorized) {
    await booking.update({ status: "authorized" });
  }

  await logBookingEvent(
    bookingId,
    "auth_received",
    authorized ? "Customer authorized ticket issuance" : "Customer declined authorization",
    actorId
  );

  return auth;
}

/**
 * Builds the vendor-neutral travel block the payment gateway turns into its risk data — flight
 * itineraries, hotel stays and car pickups each map to a different gateway shape. Returns undefined
 * for booking types the gateway has no shape for, and for flights with no segments to describe.
 */
function buildTravelForPaymentLink(
  booking: Booking,
  customer: Customer,
  passengers: Passenger[],
  flightDetail: FlightDetail | null,
  segments: FlightSegment[],
  hotelDetail: HotelDetail | null,
  carDetail: CarDetail | null
): CreatePaymentLinkTravelData | undefined {
  const paxNames = passengers.map((p) => ({
    firstName: p.firstName,
    middleName: p.middleName,
    lastName: p.lastName,
  }));
  const [customerFirstName, ...customerLastName] = customer.name.trim().split(/\s+/);
  const customerAsPassenger = {
    firstName: customerFirstName || customer.name,
    lastName: customerLastName.join(" ") || customerFirstName || customer.name,
  };

  if (booking.type === "flight") {
    if (!flightDetail || segments.length === 0) return undefined;
    return {
      type: "flight",
      tripType: flightDetail.tripType || "One Way",
      reservationDate: booking.createdAt,
      pnr: flightDetail.pnr,
      destination: flightDetail.destination,
      legs: segments.map((s) => ({
        flightNumber: s.flightNumber,
        airline: s.airline,
        depAirport: s.depAirport,
        depCity: s.depCity,
        depCountry: s.depCountry,
        depDate: s.depDate,
        depTime: s.depTime,
        arrAirport: s.arrAirport,
        arrCity: s.arrCity,
        arrCountry: s.arrCountry,
        arrDate: s.arrDate,
        arrTime: s.arrTime,
        cabinClass: s.cabinClass,
      })),
      // PayGlocal expects passengerData for travel risk scoring. Older bookings can have no
      // passenger rows, so retain useful data by falling back to the booking contact.
      passengers: paxNames.length > 0 ? paxNames : [customerAsPassenger],
    };
  }

  if (booking.type === "train") {
    if (!flightDetail || segments.length === 0) return undefined;
    return {
      type: "rail",
      reservationDate: booking.createdAt,
      reservationNumber: flightDetail.pnr,
      operator: flightDetail.gds || flightDetail.ticketingSupplier || segments[0].airline,
      legs: segments.map((s) => ({
        trainNumber: s.flightNumber,
        departureStationCode: s.depAirport,
        departureCity: s.depCity,
        departureCountry: s.depCountry,
        departureDate: s.depDate,
        departureTime: s.depTime,
        arrivalStationCode: s.arrAirport,
        arrivalCity: s.arrCity,
        arrivalCountry: s.arrCountry,
        arrivalDate: s.arrDate,
        arrivalTime: s.arrTime,
        serviceClass: s.cabinClass,
      })),
      passengers: paxNames.length > 0 ? paxNames : [customerAsPassenger],
    };
  }

  if (booking.type === "hotel") {
    if (!hotelDetail) return undefined;
    return {
      type: "hotel",
      lodgingName: hotelDetail.hotelName,
      checkInDate: hotelDetail.checkIn,
      checkOutDate: hotelDetail.checkOut,
      city: hotelDetail.city,
      country: hotelDetail.country,
      rating: hotelDetail.hotelRating,
      cancellationPolicy: hotelDetail.cancellationPolicy,
    };
  }

  if (booking.type === "car") {
    if (!carDetail) return undefined;
    // Driver rows are optional on a car booking, so fall back to the paying customer's own name.
    return {
      type: "car",
      pickupDateTime: carDetail.pickupDateTime,
      passengers:
        paxNames.length > 0
          ? paxNames
          : [customerAsPassenger],
    };
  }

  return undefined;
}

export async function createPaymentLinkAndSubmitRisk(
  bookingId: number,
  amount: number,
  currency: string,
  actorId: number
) {
  const booking = await loadBookingOrThrow(bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  const passengers = await Passenger.findAll({ where: { bookingId } });
  const flightDetail = await FlightDetail.findOne({ where: { bookingId } });
  const segments = await FlightSegment.findAll({ where: { bookingId }, order: [["sequence", "ASC"]] });
  const hotelDetail = booking.type === "hotel" ? await HotelDetail.findOne({ where: { bookingId } }) : null;
  const carDetail = booking.type === "car" ? await CarDetail.findOne({ where: { bookingId } }) : null;
  if (!customer) throw new Error("Customer not found");

  const { gatewayLinkId, linkUrl } = await paymentGateway.createPaymentLink({
    bookingRef: booking.bookingRef,
    amount,
    currency,
    customerName: customer.name,
    customerEmail: customer.email,
    billingAddress: {
      street1: customer.addressStreet1,
      city: customer.addressCity,
      state: customer.addressState,
      country: customer.addressCountry,
    },
    travel: buildTravelForPaymentLink(booking, customer, passengers, flightDetail, segments, hotelDetail, carDetail),
  });

  const shortCode = await generateUniqueShortCode();

  const paymentLink = await PaymentLink.create({
    bookingId,
    amount: amount.toFixed(2),
    currency,
    gatewayProvider: "payglocal",
    gatewayLinkId,
    linkUrl,
    shortCode,
    status: "created",
  });

  await logBookingEvent(bookingId, "payment_link_created", `Payment link created for ${currency} ${amount.toFixed(2)}`, actorId);
  await booking.update({ status: "payment_link_created" });

  const riskPayload = {
    bookingRef: booking.bookingRef,
    amount,
    currency,
    booking: {
      id: booking.id,
      type: booking.type,
      status: booking.status,
      totalAmount: booking.totalAmount,
      netAmount: booking.netAmount,
      mcoAmount: booking.mcoAmount,
      currency: booking.currency,
      createdAt: booking.createdAt,
    },
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addressStreet1: customer.addressStreet1,
      addressCity: customer.addressCity,
      addressState: customer.addressState,
      addressCountry: customer.addressCountry,
      gstNumber: customer.gstNumber,
      gstCompanyName: customer.gstCompanyName,
    },
    passengers: passengers.map((p) => ({
      title: p.title,
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      name: [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
      gender: p.gender,
      paxType: p.paxType,
      dob: p.dob,
      passportNo: p.passportNo,
    })),
    travel: booking.type === "flight" && flightDetail
      ? {
          type: "flight",
          pnr: flightDetail.pnr,
          origin: flightDetail.origin,
          destination: flightDetail.destination,
          travelDate: flightDetail.travelDate,
          cabinClass: flightDetail.cabinClass,
          gds: flightDetail.gds,
          ticketingSupplier: flightDetail.ticketingSupplier,
          tripType: flightDetail.tripType,
          journeyType: flightDetail.journeyType,
          fareType: flightDetail.fareType,
          ticketingDeadline: flightDetail.ticketingDeadline,
          ticketingDeadlineTime: flightDetail.ticketingDeadlineTime,
          supplierReference: flightDetail.supplierReference,
          buyCurrency: flightDetail.buyCurrency,
          sellCurrency: flightDetail.sellCurrency,
          rateRemarks: flightDetail.rateRemarks,
          specialRequest: flightDetail.specialRequest,
          segments: segments.map((s) => ({
            sequence: s.sequence,
            flightNumber: s.flightNumber,
            airline: s.airline,
            airlinePnr: s.airlinePnr,
            depAirport: s.depAirport,
            depCity: s.depCity,
            depCountry: s.depCountry,
            depDate: s.depDate,
            depTime: s.depTime,
            depTerminal: s.depTerminal,
            arrAirport: s.arrAirport,
            arrCity: s.arrCity,
            arrCountry: s.arrCountry,
            arrDate: s.arrDate,
            arrTime: s.arrTime,
            arrTerminal: s.arrTerminal,
            bookingClass: s.bookingClass,
            cabinClass: s.cabinClass,
            status: s.status,
            operatedBy: s.operatedBy,
          })),
        }
      : booking.type === "train" && flightDetail
        ? {
            type: "rail",
            reservationNumber: flightDetail.pnr,
            operator: flightDetail.gds || flightDetail.ticketingSupplier,
            origin: flightDetail.origin,
            destination: flightDetail.destination,
            travelDate: flightDetail.travelDate,
            serviceClass: flightDetail.cabinClass,
            segments: segments.map((s) => ({
              sequence: s.sequence,
              trainNumber: s.flightNumber,
              operator: s.airline,
              departureStationCode: s.depAirport,
              departureCity: s.depCity,
              departureCountry: s.depCountry,
              departureDate: s.depDate,
              departureTime: s.depTime,
              arrivalStationCode: s.arrAirport,
              arrivalCity: s.arrCity,
              arrivalCountry: s.arrCountry,
              arrivalDate: s.arrDate,
              arrivalTime: s.arrTime,
              serviceClass: s.cabinClass,
              status: s.status,
            })),
          }
      : booking.type === "hotel" && hotelDetail
        ? {
            type: "hotel",
            hotelName: hotelDetail.hotelName,
            address: hotelDetail.address,
            city: hotelDetail.city,
            country: hotelDetail.country,
            checkIn: hotelDetail.checkIn,
            checkOut: hotelDetail.checkOut,
            roomType: hotelDetail.roomType,
            guests: hotelDetail.guests,
            ratePerNight: hotelDetail.ratePerNight,
            taxesAndFees: hotelDetail.taxesAndFees,
            confirmationNo: hotelDetail.confirmationNo,
            hotelRating: hotelDetail.hotelRating,
            cancellationPolicy: hotelDetail.cancellationPolicy,
            specialRequest: hotelDetail.specialRequest,
          }
        : booking.type === "car" && carDetail
          ? {
              type: "car",
              pickupLocation: carDetail.pickupLocation,
              pickupCity: carDetail.pickupCity,
              pickupCountry: carDetail.pickupCountry,
              pickupState: carDetail.pickupState,
              pickupStationType: carDetail.pickupStationType,
              pickupStation: carDetail.pickupStation,
              pickupDateTime: carDetail.pickupDateTime,
              dropoffDifferentLocation: carDetail.dropoffDifferentLocation,
              dropoffLocation: carDetail.dropoffLocation,
              dropoffCity: carDetail.dropoffCity,
              dropoffCountry: carDetail.dropoffCountry,
              dropoffState: carDetail.dropoffState,
              dropoffStationType: carDetail.dropoffStationType,
              dropoffStation: carDetail.dropoffStation,
              dropoffDateTime: carDetail.dropoffDateTime,
              pickupMeetingPoint: carDetail.pickupMeetingPoint,
              meetingPoint: carDetail.meetingPoint,
              rateRemarks: carDetail.rateRemarks,
              specialRequest: carDetail.specialRequest,
              bookingStatus: carDetail.bookingStatus,
              supplierRef: carDetail.supplierRef,
              supplierType: carDetail.supplierType,
              supplier: carDetail.supplier,
              vehicleCode: carDetail.vehicleCode,
              vehicleName: carDetail.vehicleName,
              maxPax: carDetail.maxPax,
              maxLuggage: carDetail.maxLuggage,
              noOfVehicles: carDetail.noOfVehicles,
            }
      : { type: booking.type },
  };

  // Risk Engine's live API contract isn't implemented yet — don't let that block a payment link
  // that PayGlocal already accepted; record the gap instead so it's visible on the booking.
  let riskResult: RiskEngineSubmissionResult;
  try {
    riskResult = await paymentGateway.submitToRiskEngine(riskPayload);
  } catch (err) {
    riskResult = {
      status: "not_submitted",
      raw: { error: err instanceof Error ? err.message : "Risk Engine submission failed" },
    };
  }

  await RiskEngineSubmission.create({
    bookingId,
    paymentLinkId: paymentLink.id,
    payloadJson: riskPayload,
    submittedAt: riskResult.status === "not_submitted" ? null : new Date(),
    responseJson: riskResult.raw,
    status: riskResult.status,
  });

  return { paymentLink, riskResult };
}

export async function sendPaymentLinkEmail(bookingId: number, actorId: number, recipients?: string[]) {
  const booking = await loadBookingOrThrow(bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  const paymentLink = await PaymentLink.findOne({ where: { bookingId }, order: [["createdAt", "DESC"]] });
  if (!customer) throw new Error("Customer not found");
  if (!paymentLink || !paymentLink.linkUrl) throw new Error("No payment link has been created yet");
  const toEmails = recipients && recipients.length > 0 ? recipients : [customer.email];

  const shareableLinkUrl = paymentLink.shortCode ? buildShortPayUrl(paymentLink.shortCode) : paymentLink.linkUrl;
  const { eTicketStatusLabel } = await emailStatusLabels(booking);

  let segments: Parameters<typeof paymentLinkEmail>[0]["segments"];
  let hotel: Parameters<typeof paymentLinkEmail>[0]["hotel"];
  let car: Parameters<typeof paymentLinkEmail>[0]["car"];
  let flightTripType: string | null | undefined;
  let flightDestination: string | null | undefined;
  if (booking.type === "flight" || booking.type === "train") {
    const flightDetail = await FlightDetail.findOne({ where: { bookingId } });
    flightTripType = flightDetail?.tripType;
    flightDestination = flightDetail?.destination;
    const segmentRows = await FlightSegment.findAll({ where: { bookingId }, order: [["sequence", "ASC"]] });
    segments = segmentRows.map((s) => ({
      airline: s.airline,
      flightNumber: s.flightNumber,
      operatedBy: s.operatedBy,
      depAirport: s.depAirport,
      depCity: s.depCity,
      depCountry: s.depCountry,
      depDate: s.depDate,
      depTime: s.depTime,
      depTerminal: s.depTerminal,
      arrAirport: s.arrAirport,
      arrCity: s.arrCity,
      arrCountry: s.arrCountry,
      arrDate: s.arrDate,
      arrTime: s.arrTime,
      arrTerminal: s.arrTerminal,
    }));
  } else if (booking.type === "hotel") {
    hotel = await hotelDetailForEmail(bookingId, paymentLink.currency);
  } else if (booking.type === "car") {
    car = await carDetailForEmail(bookingId);
  }

  await addProviderLogosToEmailDetails(booking.type, segments, hotel, car);

  const { subject, html } = paymentLinkEmail({
    bookingType: booking.type,
    customerName: customer.name,
    bookingRef: booking.bookingRef,
    amount: Number(paymentLink.amount),
    currency: paymentLink.currency,
    linkUrl: shareableLinkUrl,
    createdAt: booking.createdAt,
    paymentStatusLabel: "Pending",
    eTicketStatusLabel,
    segments,
    tripType: flightTripType,
    destination: flightDestination,
    hotel,
    car,
  });

  const result = await sendEmail({ to: toEmails, subject, html });

  await EmailLog.create({
    bookingId,
    templateType: "payment_link",
    toEmail: toEmails.join(", "),
    subject,
    body: html,
    status: result.status,
  });

  await paymentLink.update({ emailSentAt: new Date() });
  await logBookingEvent(bookingId, "payment_link_shared", `Payment link emailed to ${toEmails.join(", ")}`, actorId);

  return result;
}

export interface RecordManualPaymentParams {
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  gatewayReferenceNumber?: string;
  paidAt?: string;
}

export async function recordManualPayment(bookingId: number, params: RecordManualPaymentParams, actorId: number) {
  const booking = await loadBookingOrThrow(bookingId);

  const paymentLink = await PaymentLink.create({
    bookingId,
    amount: params.amount.toFixed(2),
    currency: params.currency,
    gatewayProvider: "manual",
    gatewayLinkId: null,
    linkUrl: null,
    status: "used",
  });

  const payment = await Payment.create({
    bookingId,
    paymentLinkId: paymentLink.id,
    transactionId: params.transactionId,
    gatewayReferenceNumber: params.gatewayReferenceNumber || null,
    amountPaid: params.amount.toFixed(2),
    currency: params.currency,
    paymentMethod: params.paymentMethod,
    paidAt: params.paidAt ? new Date(params.paidAt) : new Date(),
    status: "success",
  });

  await booking.update({ status: "payment_received" });
  await logBookingEvent(
    bookingId,
    "payment_received",
    `Manual payment of ${params.currency} ${params.amount.toFixed(2)} recorded (${params.paymentMethod}, txn ${params.transactionId})`,
    actorId
  );

  return payment;
}

export async function handlePaymentWebhook(rawBody: string, signatureHeader: string | null) {
  const valid = await paymentGateway.verifyWebhookSignature(rawBody, signatureHeader);
  if (!valid) throw new Error("Invalid webhook signature");

  const payload: PaymentWebhookPayload = await paymentGateway.parseWebhookPayload(rawBody);
  const paymentLink = await PaymentLink.findOne({ where: { gatewayLinkId: payload.gatewayLinkId } });
  if (!paymentLink) throw new Error("Unknown payment link");

  const booking = await loadBookingOrThrow(paymentLink.bookingId);

  // PayGlocal doesn't reliably echo amount/currency back on every webhook/callback event (the
  // "SENT_FOR_CAPTURE" notification in particular has been observed omitting both) — fall back to
  // what the payment link itself was created for rather than persisting a bogus 0.00/empty
  // currency. Same workaround already applied to the browser-redirect path in
  // app/api/payglocal/webhook/route.ts.
  const amountPaid = payload.amountPaid || Number(paymentLink.amount);
  const currency = payload.currency || paymentLink.currency;

  const payment = await Payment.create({
    bookingId: booking.id,
    paymentLinkId: paymentLink.id,
    transactionId: payload.transactionId,
    gatewayReferenceNumber: payload.gatewayReferenceNumber,
    amountPaid: amountPaid.toFixed(2),
    currency,
    paymentMethod: payload.paymentMethod,
    paidAt: new Date(payload.paidAt),
    status: payload.status,
    gatewayResponse: payload.raw ?? null,
  });

  if (payload.status === "success") {
    await paymentLink.update({ status: "used" });
    await booking.update({ status: "payment_received" });

    // PayGlocal only settles in USD today (see PayGlocalAdapter.createPaymentLink), so a link
    // created in the booking's own currency (e.g. INR) will always be reported back here as USD.
    // Surface that explicitly rather than leaving PaymentLink/Payment silently disagreeing.
    const linkCurrency = (paymentLink.currency || "").toUpperCase();
    const gatewayCurrency = (payload.currency || "").toUpperCase();
    const linkAmount = Number(paymentLink.amount);
    const currencyMismatch = Boolean(linkCurrency && gatewayCurrency && linkCurrency !== gatewayCurrency);
    const amountMismatch =
      Number.isFinite(linkAmount) && payload.amountPaid > 0 && Math.abs(payload.amountPaid - linkAmount) > 0.01;
    const reconciliationNote =
      currencyMismatch || amountMismatch
        ? ` — NOTE: payment link was created for ${paymentLink.currency} ${linkAmount.toFixed(2)}; reconcile against the amount actually charged.`
        : "";

    await logBookingEvent(
      booking.id,
      "payment_received",
      `Payment of ${currency} ${amountPaid.toFixed(2)} received (ref ${payload.gatewayReferenceNumber})${reconciliationNote}`,
      null
    );
  }

  return { booking, payment, paymentLink };
}

export async function uploadPrimaryDocument(bookingId: number, file: { name: string; buffer: Buffer }, actorId: number) {
  const booking = await loadBookingOrThrow(bookingId);
  const docType = PRIMARY_DOC_TYPE_BY_BOOKING_TYPE[booking.type];

  const stored = await saveUploadedFile(bookingId, file.name, file.buffer);
  const doc = await BookingDocument.create({
    bookingId,
    docType,
    isPrimary: true,
    fileUrl: stored.relativePath,
    uploadedAt: new Date(),
    uploadedBy: actorId,
  });

  await booking.update({ status: "primary_doc_uploaded" });
  await logBookingEvent(bookingId, "primary_doc_uploaded", `${PRIMARY_DOC_LABEL[docType]} uploaded`, actorId);

  return doc;
}

export async function uploadSupportingDocument(
  bookingId: number,
  docType: "passport" | "visa" | "other",
  file: { name: string; buffer: Buffer },
  actorId: number
) {
  await loadBookingOrThrow(bookingId);
  const stored = await saveUploadedFile(bookingId, file.name, file.buffer);
  return BookingDocument.create({
    bookingId,
    docType,
    isPrimary: false,
    fileUrl: stored.relativePath,
    uploadedAt: new Date(),
    uploadedBy: actorId,
  });
}

export async function sendPrimaryDocument(bookingId: number, actorId: number, recipients?: string[]) {
  const booking = await loadBookingOrThrow(bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  const docType = PRIMARY_DOC_TYPE_BY_BOOKING_TYPE[booking.type];
  const doc = await BookingDocument.findOne({ where: { bookingId, docType, isPrimary: true }, order: [["uploadedAt", "DESC"]] });
  if (!customer) throw new Error("Customer not found");
  if (!doc) throw new Error(`No ${PRIMARY_DOC_LABEL[docType]} has been uploaded yet`);
  const toEmails = recipients && recipients.length > 0 ? recipients : [customer.email];

  const fileBuffer = await readStoredFile(doc.fileUrl);

  let pnr: string | undefined;
  let passengers: Array<{ name: string; paxType: string; dob?: string | null; passportNo?: string | null }> | undefined;
  let segments: Parameters<typeof primaryDocumentEmail>[0]["segments"];
  let hotel: Parameters<typeof primaryDocumentEmail>[0]["hotel"];
  let car: Parameters<typeof primaryDocumentEmail>[0]["car"];
  let flightTripType: string | null | undefined;
  let flightDestination: string | null | undefined;

  if (booking.type === "flight" || booking.type === "train") {
    const flightDetail = await FlightDetail.findOne({ where: { bookingId } });
    const paxRows = await Passenger.findAll({ where: { bookingId } });
    const segmentRows = await FlightSegment.findAll({ where: { bookingId }, order: [["sequence", "ASC"]] });

    pnr = flightDetail?.pnr;
    flightTripType = flightDetail?.tripType;
    flightDestination = flightDetail?.destination;
    passengers = paxRows.map((p) => ({
      name: [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
      paxType: p.paxType,
      dob: p.dob,
      passportNo: p.passportNo,
    }));
    segments = segmentRows.map((s) => ({
      airline: s.airline,
      flightNumber: s.flightNumber,
      operatedBy: s.operatedBy,
      depAirport: s.depAirport,
      depCity: s.depCity,
      depCountry: s.depCountry,
      depDate: s.depDate,
      depTime: s.depTime,
      depTerminal: s.depTerminal,
      arrAirport: s.arrAirport,
      arrCity: s.arrCity,
      arrCountry: s.arrCountry,
      arrDate: s.arrDate,
      arrTime: s.arrTime,
      arrTerminal: s.arrTerminal,
      cabinClass: s.cabinClass,
      bookingClass: s.bookingClass,
      status: s.status,
    }));
  } else if (booking.type === "hotel" || booking.type === "car") {
    const paxRows = await Passenger.findAll({ where: { bookingId } });
    passengers = paxRows.map((p) => ({
      name: [p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
      paxType: p.paxType,
      dob: p.dob,
    }));
    if (booking.type === "hotel") {
      hotel = await hotelDetailForEmail(bookingId, booking.currency);
    } else {
      car = await carDetailForEmail(bookingId);
    }
  }

  const { paymentStatusLabel, eTicketStatusLabel } = await emailStatusLabels(booking);
  const paymentRows = await Payment.findAll({ where: { bookingId, status: "success" }, order: [["paidAt", "ASC"]] });
  const payments = paymentRows.map((p) => ({
    amountPaid: Number(p.amountPaid || 0),
    paymentMethod: p.paymentMethod,
    paidAt: p.paidAt,
    transactionId: p.transactionId,
    gatewayReferenceNumber: p.gatewayReferenceNumber,
  }));

  await addProviderLogosToEmailDetails(booking.type, segments, hotel, car);

  const { subject, html } = primaryDocumentEmail({
    bookingType: booking.type,
    customerName: customer.name,
    bookingRef: booking.bookingRef,
    docLabel: PRIMARY_DOC_LABEL[docType],
    pnr,
    passengers,
    segments,
    tripType: flightTripType,
    destination: flightDestination,
    hotel,
    car,
    currency: booking.currency,
    payments,
    createdAt: booking.createdAt,
    paymentStatusLabel,
    eTicketStatusLabel,
  });

  const result = await sendEmail({
    to: toEmails,
    subject,
    html,
    attachments: [{ filename: doc.fileUrl.split("/").pop() || "document.pdf", content: fileBuffer }],
  });

  await EmailLog.create({
    bookingId,
    templateType: "primary_document",
    toEmail: toEmails.join(", "),
    subject,
    body: html,
    status: result.status,
  });

  await booking.update({ status: "primary_doc_sent" });
  await logBookingEvent(bookingId, "primary_doc_sent", `${PRIMARY_DOC_LABEL[docType]} emailed to ${toEmails.join(", ")}`, actorId);

  return result;
}

export async function generateInvoiceForBooking(bookingId: number, actorId: number) {
  const booking = await loadBookingOrThrow(bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  const paymentLink = await PaymentLink.findOne({ where: { bookingId }, order: [["createdAt", "DESC"]] });
  if (!customer) throw new Error("Customer not found");
  if (!paymentLink) throw new Error("No payment link found for this booking");

  // Booking's first invoice keeps the plain INV-{ref} number; any additional ones get a -2, -3, ... suffix.
  const existingCount = await Invoice.count({ where: { bookingId } });
  const invoiceNo = existingCount === 0 ? `INV-${booking.bookingRef}` : `INV-${booking.bookingRef}-${existingCount + 1}`;
  const currency = paymentLink.currency;
  const generatedAt = new Date();

  const fares = await BookingFare.findAll({ where: { bookingId } });
  const passengers = await Passenger.findAll({ where: { bookingId } });
  const flightDetail = booking.type === "flight" ? await FlightDetail.findOne({ where: { bookingId } }) : null;
  const carDetail = booking.type === "car" ? await CarDetail.findOne({ where: { bookingId } }) : null;

  const paxCountByType = new Map<PaxType, number>();
  for (const p of passengers) {
    paxCountByType.set(p.paxType, (paxCountByType.get(p.paxType) ?? 0) + 1);
  }

  const bookingLabel = flightDetail
    ? `Flight Booking ${booking.bookingRef} — PNR ${flightDetail.pnr}`
    : carDetail
    ? `Car Rental Booking ${booking.bookingRef} — ${
        carDetail.vehicleName || carDetail.vehicleCode || "Vehicle"
      }, ${[
        carDetail.pickupLocation,
        carDetail.pickupCity,
        carDetail.pickupState,
        countryNameFromCode(carDetail.pickupCountry),
      ]
        .filter(Boolean)
        .join(", ")} → ${[
        carDetail.dropoffLocation,
        carDetail.dropoffCity,
        carDetail.dropoffState,
        countryNameFromCode(carDetail.dropoffCountry),
      ]
        .filter(Boolean)
        .join(", ")} (Ref ${carDetail.supplierRef})`
    : `${booking.type.charAt(0).toUpperCase()}${booking.type.slice(1)} Booking ${booking.bookingRef}`;

  const lineItems =
    fares.length > 0
      ? fares.map((f) => {
          const quantity = paxCountByType.get(f.paxType) ?? 1;
          const rate = Number(f.gross);
          return {
            description: `${bookingLabel} — ${PAX_TYPE_LABEL[f.paxType]} x${quantity}`,
            quantity,
            rate,
            amount: quantity * rate,
          };
        })
      : [{ description: bookingLabel, quantity: 1, rate: Number(paymentLink.amount), amount: Number(paymentLink.amount) }];

  const amount = lineItems.reduce((sum, li) => sum + li.amount, 0);

  const pdfBuffer = await generateInvoicePdf({
    invoiceNo,
    bookingRef: booking.bookingRef,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    currency,
    generatedAt,
    dueDate: generatedAt,
    lineItems,
  });

  const stored = await saveUploadedFile(bookingId, `${invoiceNo}.pdf`, pdfBuffer);

  const invoice = await Invoice.create({
    bookingId,
    invoiceNo,
    amount: amount.toFixed(2),
    currency,
    generatedAt,
    pdfUrl: stored.relativePath,
    lineItems,
  });

  await booking.update({ status: "invoiced" });
  await logBookingEvent(bookingId, "invoice_generated", `Invoice ${invoiceNo} generated`, actorId);

  return invoice;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  rate: number;
}

export async function updateInvoiceForBooking(
  invoiceId: number,
  actorId: number,
  updates: { lineItems: InvoiceLineItemInput[]; currency?: string }
) {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.sentAt) throw new Error("Cannot edit an invoice that has already been sent");
  if (updates.lineItems.length === 0) throw new Error("At least one line item is required");

  const booking = await loadBookingOrThrow(invoice.bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  if (!customer) throw new Error("Customer not found");

  const currency = updates.currency || invoice.currency;
  const lineItems = updates.lineItems.map((li) => ({
    description: li.description,
    quantity: li.quantity,
    rate: li.rate,
    amount: li.quantity * li.rate,
  }));
  const amount = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const generatedAt = invoice.generatedAt;

  const pdfBuffer = await generateInvoicePdf({
    invoiceNo: invoice.invoiceNo,
    bookingRef: booking.bookingRef,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    currency,
    generatedAt,
    dueDate: generatedAt,
    lineItems,
  });

  const stored = await saveUploadedFile(invoice.bookingId, `${invoice.invoiceNo}.pdf`, pdfBuffer);

  await invoice.update({
    amount: amount.toFixed(2),
    currency,
    pdfUrl: stored.relativePath,
    lineItems,
  });

  await logBookingEvent(invoice.bookingId, "invoice_updated", `Invoice ${invoice.invoiceNo} updated`, actorId);

  return invoice;
}

export async function sendInvoiceForBooking(bookingId: number, actorId: number, recipients?: string[], invoiceId?: number) {
  const booking = await loadBookingOrThrow(bookingId);
  const customer = await Customer.findByPk(booking.customerId);
  const invoice = invoiceId
    ? await Invoice.findOne({ where: { id: invoiceId, bookingId } })
    : await Invoice.findOne({ where: { bookingId }, order: [["generatedAt", "DESC"]] });
  if (!customer) throw new Error("Customer not found");
  if (!invoice || !invoice.pdfUrl) throw new Error("No invoice has been generated yet");
  const toEmails = recipients && recipients.length > 0 ? recipients : [customer.email];

  const fileBuffer = await readStoredFile(invoice.pdfUrl);
  const { eTicketStatusLabel } = await emailStatusLabels(booking);

  let segments: Parameters<typeof invoiceEmail>[0]["segments"];
  let hotel: Parameters<typeof invoiceEmail>[0]["hotel"];
  let car: Parameters<typeof invoiceEmail>[0]["car"];
  let flightTripType: string | null | undefined;
  let flightDestination: string | null | undefined;
  if (booking.type === "flight" || booking.type === "train") {
    const flightDetail = await FlightDetail.findOne({ where: { bookingId } });
    flightTripType = flightDetail?.tripType;
    flightDestination = flightDetail?.destination;
    const segmentRows = await FlightSegment.findAll({ where: { bookingId }, order: [["sequence", "ASC"]] });
    segments = segmentRows.map((s) => ({
      airline: s.airline,
      flightNumber: s.flightNumber,
      operatedBy: s.operatedBy,
      depAirport: s.depAirport,
      depCity: s.depCity,
      depCountry: s.depCountry,
      depDate: s.depDate,
      depTime: s.depTime,
      depTerminal: s.depTerminal,
      arrAirport: s.arrAirport,
      arrCity: s.arrCity,
      arrCountry: s.arrCountry,
      arrDate: s.arrDate,
      arrTime: s.arrTime,
      arrTerminal: s.arrTerminal,
    }));
  } else if (booking.type === "hotel") {
    hotel = await hotelDetailForEmail(bookingId, invoice.currency);
  } else if (booking.type === "car") {
    car = await carDetailForEmail(bookingId);
  }

  await addProviderLogosToEmailDetails(booking.type, segments, hotel, car);

  const { subject, html } = invoiceEmail({
    bookingType: booking.type,
    customerName: customer.name,
    bookingRef: booking.bookingRef,
    invoiceNo: invoice.invoiceNo,
    createdAt: booking.createdAt,
    paymentStatusLabel: "Done",
    eTicketStatusLabel,
    segments,
    tripType: flightTripType,
    destination: flightDestination,
    hotel,
    car,
  });

  const result = await sendEmail({
    to: toEmails,
    subject,
    html,
    attachments: [{ filename: `${invoice.invoiceNo}.pdf`, content: fileBuffer }],
  });

  await EmailLog.create({
    bookingId,
    templateType: "invoice",
    toEmail: toEmails.join(", "),
    subject,
    body: html,
    status: result.status,
  });

  await invoice.update({ sentAt: new Date() });
  await booking.update({ status: "completed" });
  await logBookingEvent(bookingId, "invoice_sent", `Invoice ${invoice.invoiceNo} emailed to ${toEmails.join(", ")}`, actorId);

  return result;
}

export { storedFileUrl };
