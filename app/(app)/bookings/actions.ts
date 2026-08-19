"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import type { PermissionKey } from "@/lib/auth/permissions";
import { PAX_TYPES, type PaxType } from "@/models/Passenger";
import {
  createFlightBooking,
  createRailBooking,
  updateFlightBooking,
  createHotelBooking,
  updateHotelBooking,
  createCarBooking,
  updateCarBooking,
  sendTicketAuthorization,
  recordCustomerAuthorization,
  sendPaymentLinkEmail,
  recordManualPayment,
  uploadPrimaryDocument,
  uploadSupportingDocument,
  sendPrimaryDocument,
  generateInvoiceForBooking,
  sendInvoiceForBooking,
  updateInvoiceForBooking,
  cancelBooking,
} from "@/services/bookingService";
import { addBookingNote, updateBookingNote, deleteBookingNote } from "@/services/bookingNoteService";
import { getBookingType } from "@/services/bookingQueryService";

async function requirePermission(permission: PermissionKey) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, permission)) throw new Error("Not authorized");
  return session!;
}

async function requireBookingViewSession(bookingId: number) {
  const type = await getBookingType(bookingId);
  const permission: PermissionKey =
    type === "hotel" ? "hotels.view" : type === "car" ? "cars.view" : "flights.view";
  return requirePermission(permission);
}

function fail(bookingId: number | string, message: string): never {
  redirect(`/bookings/${bookingId}?error=${encodeURIComponent(message)}`);
}

function fieldFail(message: string): never {
  redirect(`/bookings/new?error=${encodeURIComponent(message)}`);
}

function editFieldFail(bookingId: number | string, message: string): never {
  redirect(`/bookings/${bookingId}/edit?error=${encodeURIComponent(message)}`);
}

function parseSegmentsFromForm(formData: FormData, onInvalid: (message: string) => never) {
  const str = (name: string) => String(formData.get(name) || "").trim();

  const segmentIds = str("segmentIds").split(",").filter(Boolean);
  const segments: NonNullable<Parameters<typeof createFlightBooking>[0]>["segments"] = [];
  for (const id of segmentIds) {
    const flightNumber = str(`segment_flightNumber_${id}`);
    const airline = str(`segment_airline_${id}`);
    const status = str(`segment_status_${id}`);
    const depAirport = str(`segment_depAirport_${id}`);
    const depCity = str(`segment_depCity_${id}`);
    const depCountry = str(`segment_depCountry_${id}`);
    const depDate = str(`segment_depDate_${id}`);
    const depTime = str(`segment_depTime_${id}`);
    const arrAirport = str(`segment_arrAirport_${id}`);
    const arrCity = str(`segment_arrCity_${id}`);
    const arrCountry = str(`segment_arrCountry_${id}`);
    const arrDate = str(`segment_arrDate_${id}`);
    const arrTime = str(`segment_arrTime_${id}`);
    const cabinClass = str(`segment_cabinClass_${id}`);
    const values = [
      flightNumber,
      airline,
      status,
      depAirport,
      depCity,
      depCountry,
      depDate,
      depTime,
      arrAirport,
      arrCity,
      arrCountry,
      arrDate,
      arrTime,
      cabinClass,
    ];
    if (values.every((v) => !v)) continue;
    if (values.some((v) => !v)) {
      onInvalid(`Segment ${segments.length + 1}: all flight details are required`);
    }
    segments.push({
      flightNumber,
      airline,
      depAirport,
      depCity,
      depCountry,
      depDate,
      depTime,
      arrAirport,
      arrCity,
      arrCountry,
      arrDate,
      arrTime,
      cabinClass,
      status,
    });
  }
  if (segments.length === 0) {
    onInvalid("At least one flight segment is required");
  }
  return segments;
}

function parsePassengersFromForm(formData: FormData, onInvalid: (message: string) => never) {
  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const passengerIds = str("passengerIds").split(",").filter(Boolean);
  const passengers: NonNullable<Parameters<typeof createFlightBooking>[0]>["passengers"] = [];
  for (const id of passengerIds) {
    const firstName = str(`passenger_firstName_${id}`);
    const lastName = str(`passenger_lastName_${id}`);
    if (!firstName && !lastName) continue;
    if (!firstName || !lastName) {
      onInvalid(`Passenger ${passengers.length + 1}: first and last name are required`);
    }
    const paxTypeRaw = str(`passenger_type_${id}`);
    const paxType: PaxType = (PAX_TYPES as string[]).includes(paxTypeRaw) ? (paxTypeRaw as PaxType) : "ADT";
    passengers.push({
      title: opt(`passenger_title_${id}`),
      firstName,
      middleName: opt(`passenger_middleName_${id}`),
      lastName,
      gender: opt(`passenger_gender_${id}`),
      paxType,
      dob: opt(`passenger_dob_${id}`),
      passportNo: opt(`passenger_passportNo_${id}`),
    });
  }
  if (passengers.length === 0) {
    onInvalid("At least one passenger is required");
  }
  return passengers;
}

function parseFaresFromForm(formData: FormData, paxTypesUsed: PaxType[]) {
  return paxTypesUsed.map((paxType) => ({
    paxType,
    baseFare: Number(formData.get(`fare_baseFare_${paxType}`)) || 0,
    tax: Number(formData.get(`fare_tax_${paxType}`)) || 0,
    net: Number(formData.get(`fare_net_${paxType}`)) || 0,
  }));
}

function hotelFieldFail(message: string): never {
  redirect(`/bookings/new/hotel?error=${encodeURIComponent(message)}`);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRecipients(formData: FormData, bookingId: number): string[] {
  const recipients = formData
    .getAll("recipients")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    fail(bookingId, "At least one recipient email is required");
  }
  const invalid = recipients.find((r) => !EMAIL_RE.test(r));
  if (invalid) {
    fail(bookingId, `"${invalid}" is not a valid email address`);
  }
  return recipients;
}

export async function createFlightBookingAction(formData: FormData) {
  const session = await requirePermission("flights.create");

  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const segments = parseSegmentsFromForm(formData, fieldFail);
  const passengers = parsePassengersFromForm(formData, fieldFail);
  const paxTypesUsed = Array.from(new Set(passengers.map((p) => p.paxType)));
  const fares = parseFaresFromForm(formData, paxTypesUsed);

  const customerFirstName = str("customerFirstName");
  const customerLastName = str("customerLastName");
  if (!customerFirstName || !customerLastName) {
    fieldFail("Customer first and last name are required");
  }
  const customerName = [customerFirstName, str("customerMiddleName"), customerLastName].filter(Boolean).join(" ");

  const booking = await createFlightBooking({
    customerName,
    customerEmail: str("customerEmail"),
    customerPhone: opt("customerPhone"),
    customerAddressStreet1: opt("customerAddressStreet1"),
    customerAddressCity: opt("customerAddressCity"),
    customerAddressState: opt("customerAddressState"),
    customerAddressCountry: opt("customerAddressCountry"),
    agentId: session.userId,
    pnr: str("pnr"),
    origin: str("origin"),
    destination: str("destination"),
    cabinClass: str("cabinClass"),
    gds: str("gds"),
    ticketingSupplier: str("ticketingSupplier"),
    tripType: str("tripType"),
    journeyType: str("journeyType"),
    fareType: str("fareType"),
    ticketingDeadline: opt("ticketingDeadline"),
    ticketingDeadlineTime: opt("ticketingDeadlineTime"),
    supplierReference: opt("supplierReference"),
    buyCurrency: str("buyCurrency") || "USD",
    sellCurrency: str("sellCurrency") || "USD",
    rateRemarks: opt("rateRemarks"),
    specialRequest: opt("specialRequest"),
    segments,
    passengers,
    fares,
  });

  revalidatePath("/bookings/flights");
  redirect(`/bookings/${booking.id}`);
}

export async function createRailBookingAction(formData: FormData) {
  const session = await requirePermission("flights.create");
  const str = (name: string) => String(formData.get(name) || "").trim();
  const travelers = Math.min(9, Math.max(1, Number(str("travelers")) || 1));
  const totalAmount = Number(str("totalAmount"));
  const netAmount = Number(str("netAmount"));
  const operator = str("operator") === "Amtrak" ? "Amtrak" : "VIA Rail";
  const tripType = ["One Way", "Round Trip", "Multi City"].includes(str("tripType"))
    ? str("tripType") as "One Way" | "Round Trip" | "Multi City"
    : "One Way";
  let legs: Array<{ originCode: string; originName: string; destinationCode: string; destinationName: string; departureDate: string }> = [];
  try {
    const parsed = JSON.parse(str("railLegs"));
    if (Array.isArray(parsed)) {
      legs = parsed.map((leg) => ({
        originCode: String(leg.originCode || "").trim(),
        originName: String(leg.originName || "").trim(),
        destinationCode: String(leg.destinationCode || "").trim(),
        destinationName: String(leg.destinationName || "").trim(),
        departureDate: String(leg.departureDate || "").trim(),
      }));
    }
  } catch {
    // The validation below handles malformed itinerary data.
  }

  const invalidLegCount = tripType === "One Way" ? legs.length !== 1 : tripType === "Round Trip" ? legs.length !== 2 : legs.length < 2 || legs.length > 10;
  const invalidLeg = legs.some((leg, index) =>
    !leg.originCode ||
    !leg.destinationCode ||
    leg.originCode === leg.destinationCode ||
    !/^\d{4}-\d{2}-\d{2}$/.test(leg.departureDate) ||
    (index > 0 && leg.departureDate < legs[index - 1].departureDate)
  );
  if (invalidLegCount || invalidLeg) {
    redirect(`/bookings/new/rail?mode=new&error=${encodeURIComponent(`Complete all ${tripType.toLowerCase()} journey details`)}`);
  }
  if (!str("customerName") || !str("customerEmail")) {
    redirect(`/bookings/new/rail?mode=new&error=${encodeURIComponent("Customer name and email are required")}`);
  }
  if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(netAmount) || netAmount < 0) {
    redirect(`/bookings/new/rail?mode=new&error=${encodeURIComponent("Enter valid selling and net prices")}`);
  }

  const booking = await createRailBooking({
    customerName: str("customerName"),
    customerEmail: str("customerEmail"),
    customerPhone: str("customerPhone") || undefined,
    agentId: session.userId,
    operator,
    tripType,
    legs,
    travelers,
    currency: str("currency") || "CAD",
    totalAmount,
    netAmount,
  });

  revalidatePath("/bookings/all");
  redirect(`/bookings/${booking.id}?tab=authorization`);
}

export async function updateFlightBookingAction(formData: FormData) {
  const session = await requirePermission("flights.create");
  const bookingId = Number(formData.get("bookingId"));
  const onInvalid = (message: string): never => editFieldFail(bookingId, message);

  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const segments = parseSegmentsFromForm(formData, onInvalid);
  const passengers = parsePassengersFromForm(formData, onInvalid);
  const paxTypesUsed = Array.from(new Set(passengers.map((p) => p.paxType)));
  const fares = parseFaresFromForm(formData, paxTypesUsed);

  const customerFirstName = str("customerFirstName");
  const customerLastName = str("customerLastName");
  if (!customerFirstName || !customerLastName) {
    onInvalid("Customer first and last name are required");
  }
  const customerName = [customerFirstName, str("customerMiddleName"), customerLastName].filter(Boolean).join(" ");

  try {
    await updateFlightBooking(
      bookingId,
      {
        customerName,
        customerEmail: str("customerEmail"),
        customerPhone: opt("customerPhone"),
        customerAddressStreet1: opt("customerAddressStreet1"),
        customerAddressCity: opt("customerAddressCity"),
        customerAddressState: opt("customerAddressState"),
        customerAddressCountry: opt("customerAddressCountry"),
        pnr: str("pnr"),
        origin: str("origin"),
        destination: str("destination"),
        cabinClass: str("cabinClass"),
        gds: str("gds"),
        ticketingSupplier: str("ticketingSupplier"),
        tripType: str("tripType"),
        journeyType: str("journeyType"),
        fareType: str("fareType"),
        ticketingDeadline: opt("ticketingDeadline"),
        ticketingDeadlineTime: opt("ticketingDeadlineTime"),
        supplierReference: opt("supplierReference"),
        buyCurrency: str("buyCurrency") || "USD",
        sellCurrency: str("sellCurrency") || "USD",
        rateRemarks: opt("rateRemarks"),
        specialRequest: opt("specialRequest"),
        segments,
        passengers,
        fares,
      },
      session.userId
    );
  } catch (err) {
    editFieldFail(bookingId, err instanceof Error ? err.message : "Could not update booking");
  }

  revalidatePath("/bookings/flights");
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}

export async function createHotelBookingAction(formData: FormData) {
  const session = await requirePermission("hotels.create");

  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const contactTitle = opt("contactTitle");
  const contactFirstName = str("contactFirstName");
  const contactLastName = str("contactLastName");
  const contactEmail = str("contactEmail");
  const contactCountryCode = str("contactCountryCode") || "+91";
  const contactMobile = str("contactMobile");
  if (!contactFirstName || !contactLastName || !contactEmail || !contactMobile) {
    hotelFieldFail("Guest contact name, email and mobile number are required");
  }

  const gstEnabled = str("gstEnabled") === "1";
  const gstNumber = gstEnabled ? opt("gstNumber") : undefined;
  const gstCompanyName = gstEnabled ? opt("gstCompanyName") : undefined;

  const guestList = parseHotelGuestsFromForm(formData, hotelFieldFail);

  const hotelName = str("hotelName");
  const address = str("address");
  const city = str("city");
  const roomType = str("roomType");
  const checkIn = str("checkIn");
  const checkOut = str("checkOut");
  const confirmationNo = str("confirmationNo");
  if (!hotelName || !address || !city || !roomType || !checkIn || !checkOut || !confirmationNo) {
    hotelFieldFail(
      "Hotel name, address, city, room type, check-in/check-out dates and confirmation number are required"
    );
  }
  if (checkOut <= checkIn) {
    hotelFieldFail("Check-out date must be after the check-in date");
  }

  const guests = Math.max(1, Number(str("guests")) || guestList.length);
  const grossAmount = str("grossAmount") ? Number(str("grossAmount")) : undefined;
  const hotelRatingRaw = str("hotelRating");
  const hotelRating = hotelRatingRaw ? Number(hotelRatingRaw) : undefined;

  const booking = await createHotelBooking({
    customerName: [contactTitle, contactFirstName, contactLastName].filter(Boolean).join(" "),
    customerEmail: contactEmail,
    customerPhone: `${contactCountryCode} ${contactMobile}`,
    customerAddressStreet1: opt("customerAddressStreet1"),
    customerAddressCity: opt("customerAddressCity"),
    customerAddressState: opt("customerAddressState"),
    customerAddressCountry: opt("customerAddressCountry"),
    gstNumber,
    gstCompanyName,
    agentId: session.userId,
    hotelName,
    address,
    city,
    country: opt("country"),
    checkIn,
    checkOut,
    roomType,
    guests,
    confirmationNo,
    hotelRating,
    cancellationPolicy: opt("cancellationPolicy"),
    specialRequest: opt("specialRequest"),
    currency: str("currency") || "USD",
    grossAmount,
    netAmount: str("netAmount") ? Number(str("netAmount")) : undefined,
    guestList,
  });

  revalidatePath("/bookings/hotels");
  redirect(`/bookings/${booking.id}`);
}

function parseHotelGuestsFromForm(formData: FormData, onInvalid: (message: string) => never) {
  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const guestMode = str("guestMode") === "someone_else" ? "someone_else" : "myself";
  const contactTitle = opt("contactTitle");
  const contactFirstName = str("contactFirstName");
  const contactLastName = str("contactLastName");

  const guestList: Array<{ title?: string; firstName: string; lastName: string }> = [];
  if (guestMode === "someone_else") {
    const guest0FirstName = str("guest0FirstName");
    const guest0LastName = str("guest0LastName");
    if (!guest0FirstName || !guest0LastName) {
      onInvalid("The staying guest's first and last name are required");
    }
    guestList.push({ title: opt("guest0Title"), firstName: guest0FirstName, lastName: guest0LastName });
  } else {
    guestList.push({ title: contactTitle, firstName: contactFirstName, lastName: contactLastName });
  }

  const guestIds = str("guestIds").split(",").filter(Boolean);
  for (const id of guestIds) {
    const firstName = str(`guest_firstName_${id}`);
    const lastName = str(`guest_lastName_${id}`);
    if (!firstName && !lastName) continue;
    if (!firstName || !lastName) {
      onInvalid(`Guest ${guestList.length + 1}: first and last name are required`);
    }
    guestList.push({ title: opt(`guest_title_${id}`), firstName, lastName });
  }

  return guestList;
}

export async function updateHotelBookingAction(formData: FormData) {
  const session = await requirePermission("hotels.create");
  const bookingId = Number(formData.get("bookingId"));
  const onInvalid = (message: string): never => editFieldFail(bookingId, message);

  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const contactTitle = opt("contactTitle");
  const contactFirstName = str("contactFirstName");
  const contactLastName = str("contactLastName");
  const contactEmail = str("contactEmail");
  const contactCountryCode = str("contactCountryCode") || "+91";
  const contactMobile = str("contactMobile");
  if (!contactFirstName || !contactLastName || !contactEmail || !contactMobile) {
    onInvalid("Guest contact name, email and mobile number are required");
  }

  const gstEnabled = str("gstEnabled") === "1";
  const gstNumber = gstEnabled ? opt("gstNumber") : undefined;
  const gstCompanyName = gstEnabled ? opt("gstCompanyName") : undefined;

  const guestList = parseHotelGuestsFromForm(formData, onInvalid);

  const hotelName = str("hotelName");
  const address = str("address");
  const roomType = str("roomType");
  const checkIn = str("checkIn");
  const checkOut = str("checkOut");
  const confirmationNo = str("confirmationNo");
  if (!hotelName || !address || !roomType || !checkIn || !checkOut || !confirmationNo) {
    onInvalid("Hotel name, address, room type, check-in/check-out dates and confirmation number are required");
  }
  if (checkOut <= checkIn) {
    onInvalid("Check-out date must be after the check-in date");
  }

  const guests = Math.max(1, Number(str("guests")) || guestList.length);
  const grossAmount = str("grossAmount") ? Number(str("grossAmount")) : undefined;
  const hotelRatingRaw = str("hotelRating");
  const hotelRating = hotelRatingRaw ? Number(hotelRatingRaw) : undefined;

  try {
    await updateHotelBooking(
      bookingId,
      {
        customerName: [contactTitle, contactFirstName, contactLastName].filter(Boolean).join(" "),
        customerEmail: contactEmail,
        customerPhone: `${contactCountryCode} ${contactMobile}`,
        customerAddressStreet1: opt("customerAddressStreet1"),
        customerAddressCity: opt("customerAddressCity"),
        customerAddressState: opt("customerAddressState"),
        customerAddressCountry: opt("customerAddressCountry"),
        gstNumber,
        gstCompanyName,
        hotelName,
        address,
        city: opt("city"),
        country: opt("country"),
        checkIn,
        checkOut,
        roomType,
        guests,
        confirmationNo,
        hotelRating,
        cancellationPolicy: opt("cancellationPolicy"),
        specialRequest: opt("specialRequest"),
        currency: str("currency") || "USD",
        grossAmount,
        netAmount: str("netAmount") ? Number(str("netAmount")) : undefined,
        guestList,
      },
      session.userId
    );
  } catch (err) {
    editFieldFail(bookingId, err instanceof Error ? err.message : "Could not update booking");
  }

  revalidatePath("/bookings/hotels");
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}

export interface CarBookingFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Shared field parsing/validation for the create and edit car booking actions, so both screens
 * enforce the same rules and return the same `fieldErrors` shape back to the wizard.
 */
function parseCarBookingForm(formData: FormData) {
  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const fieldErrors: Record<string, string> = {};
  const requireField = (name: string, message: string) => {
    if (!str(name)) fieldErrors[name] = message;
  };

  const driverMode = str("driverMode") === "someone_else" ? "someone_else" : "myself";

  const contactTitle = opt("contactTitle");
  const contactFirstName = str("contactFirstName");
  const contactLastName = str("contactLastName");
  const contactEmail = str("contactEmail");
  const contactCountryCode = str("contactCountryCode") || "+91";
  const contactMobile = str("contactMobile");
  requireField("contactFirstName", "First name is required");
  requireField("contactLastName", "Last name is required");
  requireField("contactEmail", "Email address is required");
  requireField("contactMobile", "Mobile number is required");

  const driverList: Array<{ title?: string; firstName: string; lastName: string }> = [];
  if (driverMode === "someone_else") {
    const driver0FirstName = str("driver0FirstName");
    const driver0LastName = str("driver0LastName");
    requireField("driver0FirstName", "Driver's first name is required");
    requireField("driver0LastName", "Driver's last name is required");
    if (driver0FirstName && driver0LastName) {
      driverList.push({ title: opt("driver0Title"), firstName: driver0FirstName, lastName: driver0LastName });
    }
  } else if (contactFirstName && contactLastName) {
    driverList.push({ title: contactTitle, firstName: contactFirstName, lastName: contactLastName });
  }

  const driverIds = str("driverIds").split(",").filter(Boolean);
  for (const id of driverIds) {
    const firstName = str(`driver_firstName_${id}`);
    const lastName = str(`driver_lastName_${id}`);
    if (!firstName && !lastName) continue;
    if (!firstName) fieldErrors[`driver_firstName_${id}`] = "First name is required";
    if (!lastName) fieldErrors[`driver_lastName_${id}`] = "Last name is required";
    if (firstName && lastName) {
      driverList.push({ title: opt(`driver_title_${id}`), firstName, lastName });
    }
  }

  const pickupLocation = str("pickupLocation");
  const pickupCity = str("pickupCity");
  const pickupCountry = opt("pickupCountry");
  const pickupState = opt("pickupState");
  const pickupStationType = str("pickupStationType") || "City";
  const pickupDateTime = str("pickupDateTime");
  const dropoffDifferentLocation = str("dropoffDifferentLocation") === "1";
  const dropoffLocation = dropoffDifferentLocation ? str("dropoffLocation") : pickupLocation;
  // When the dropoff isn't a different location the wizard doesn't render those fields at all,
  // so the pickup values stand in — the voucher and emails still get a full dropoff address.
  const dropoffCity = dropoffDifferentLocation ? str("dropoffCity") : pickupCity;
  const dropoffCountry = dropoffDifferentLocation ? opt("dropoffCountry") : pickupCountry;
  const dropoffState = dropoffDifferentLocation ? opt("dropoffState") : pickupState;
  const dropoffStationType = dropoffDifferentLocation
    ? str("dropoffStationType") || "City"
    : str("dropoffStationType") || pickupStationType;
  const dropoffDateTime = str("dropoffDateTime");
  const currency = str("currency") || "USD";
  const bookingStatus = str("bookingStatus");
  const supplierRef = str("supplierRef");
  const supplierType = str("supplierType") || "Offline";
  const supplier = str("supplier");

  requireField("pickupLocation", "Pickup location is required");
  requireField("pickupCity", "Pickup city is required");
  requireField("pickupDateTime", "Pickup date & time is required");
  if (dropoffDifferentLocation) {
    requireField("dropoffLocation", "Dropoff location is required");
    requireField("dropoffCity", "Dropoff city is required");
  }
  requireField("dropoffDateTime", "Dropoff date & time is required");
  requireField("bookingStatus", "Booking status is required");
  requireField("supplierRef", "Supplier reference is required");
  requireField("supplier", "Supplier is required");

  if (pickupDateTime && dropoffDateTime && dropoffDateTime <= pickupDateTime) {
    fieldErrors.dropoffDateTime = "Dropoff date & time must be after the pickup date & time";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const maxPaxRaw = str("maxPax");
  const maxLuggageRaw = str("maxLuggage");

  return {
    fieldErrors: null,
    values: {
      customerName: [contactTitle, contactFirstName, contactLastName].filter(Boolean).join(" "),
      customerEmail: contactEmail,
      customerPhone: `${contactCountryCode} ${contactMobile}`,
      customerAddressStreet1: opt("customerAddressStreet1"),
      customerAddressCity: opt("customerAddressCity"),
      customerAddressState: opt("customerAddressState"),
      customerAddressCountry: opt("customerAddressCountry"),
      pickupLocation,
      pickupCity,
      pickupCountry,
      pickupState,
      pickupStationType,
      pickupStation: opt("pickupStation"),
      pickupDateTime,
      dropoffDifferentLocation,
      dropoffLocation,
      dropoffCity,
      dropoffCountry,
      dropoffState,
      dropoffStationType,
      dropoffStation: opt("dropoffStation"),
      dropoffDateTime,
      pickupMeetingPoint: opt("pickupMeetingPoint"),
      meetingPoint: opt("meetingPoint"),
      rateRemarks: opt("rateRemarks"),
      specialRequest: opt("specialRequest"),
      bookingStatus,
      supplierRef,
      supplierType,
      supplier,
      vehicleCode: opt("vehicleCode"),
      vehicleName: opt("vehicleName"),
      maxPax: maxPaxRaw ? Number(maxPaxRaw) : undefined,
      maxLuggage: maxLuggageRaw ? Number(maxLuggageRaw) : undefined,
      noOfVehicles: Math.max(1, Number(str("noOfVehicles")) || 1),
      currency,
      grossAmount: Number(str("grossAmount")) || undefined,
      netAmount: str("netAmount") ? Number(str("netAmount")) : undefined,
      driverList,
    },
  } as const;
}

export async function createCarBookingAction(
  _prevState: CarBookingFormState,
  formData: FormData
): Promise<CarBookingFormState> {
  const session = await requirePermission("cars.create");

  const parsed = parseCarBookingForm(formData);
  if (parsed.fieldErrors) {
    return { error: "Please fix the highlighted fields and try again.", fieldErrors: parsed.fieldErrors };
  }

  const booking = await createCarBooking({ ...parsed.values, agentId: session.userId });

  revalidatePath("/bookings/cars");
  redirect(`/bookings/${booking.id}`);
}

export async function updateCarBookingAction(
  _prevState: CarBookingFormState,
  formData: FormData
): Promise<CarBookingFormState> {
  const session = await requirePermission("cars.create");
  const bookingId = Number(formData.get("bookingId"));

  const parsed = parseCarBookingForm(formData);
  if (parsed.fieldErrors) {
    return { error: "Please fix the highlighted fields and try again.", fieldErrors: parsed.fieldErrors };
  }

  try {
    await updateCarBooking(bookingId, parsed.values, session.userId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update booking" };
  }

  revalidatePath("/bookings/cars");
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}

export async function sendAuthorizationAction(formData: FormData) {
  const session = await requirePermission("bookings.authorize");
  const bookingId = Number(formData.get("bookingId"));
  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const note = opt("body");
  const authorizedAmount = Number(str("authorizedAmount"));
  const authorizationDate = str("authorizationDate");
  const eSignatureName = str("eSignatureName");
  const refundAmountRaw = opt("refundAmount");
  const refundAmount = refundAmountRaw ? Number(refundAmountRaw) : undefined;

  const chargeIds = str("chargeIds").split(",").filter(Boolean);
  const charges: Array<{ label: string; amount: number }> = [];
  for (const id of chargeIds) {
    const label = str(`charge_label_${id}`);
    const amountRaw = str(`charge_amount_${id}`);
    if (!label && !amountRaw) continue;
    if (!label || !amountRaw) {
      fail(bookingId, `Charge ${charges.length + 1}: label and amount are both required`);
    }
    charges.push({ label, amount: Number(amountRaw) });
  }

  if (!authorizedAmount || !authorizationDate || !eSignatureName || charges.length === 0) {
    fail(bookingId, "Authorized amount, authorization date, e-signature name and at least one charge are required");
  }

  const recipients = parseRecipients(formData, bookingId);

  try {
    await sendTicketAuthorization(
      bookingId,
      session.userId,
      {
        note,
        authorizedAmount,
        authorizationDate,
        charges,
        refundAmount,
        eSignatureName,
      },
      recipients
    );
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not send authorization email");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function recordAuthorizationAction(formData: FormData) {
  const session = await requirePermission("bookings.authorize");
  const bookingId = Number(formData.get("bookingId"));
  const authorized = formData.get("decision") === "authorized";
  const replyText = String(formData.get("replyText") || "");
  try {
    await recordCustomerAuthorization(bookingId, authorized, replyText, session.userId);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not record customer authorization");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function sendPaymentLinkAction(formData: FormData) {
  const session = await requirePermission("bookings.payment");
  const bookingId = Number(formData.get("bookingId"));
  const recipients = parseRecipients(formData, bookingId);
  try {
    await sendPaymentLinkEmail(bookingId, session.userId, recipients);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not send payment link email");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function recordManualPaymentAction(formData: FormData) {
  const session = await requirePermission("bookings.payment");
  const bookingId = Number(formData.get("bookingId"));
  const str = (name: string) => String(formData.get(name) || "").trim();
  const opt = (name: string) => str(name) || undefined;

  const amount = Number(str("amount"));
  const currency = str("currency") || "USD";
  const paymentMethod = str("paymentMethod");
  const transactionId = str("transactionId");
  const gatewayReferenceNumber = opt("gatewayReferenceNumber");
  const paidAt = opt("paidAt");

  if (!amount || amount <= 0 || !paymentMethod || !transactionId) {
    fail(bookingId, "Amount, payment method and transaction ID are required");
  }

  try {
    await recordManualPayment(bookingId, { amount, currency, paymentMethod, transactionId, gatewayReferenceNumber, paidAt }, session.userId);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not record manual payment");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function uploadPrimaryDocumentAction(formData: FormData) {
  const session = await requirePermission("bookings.documents");
  const bookingId = Number(formData.get("bookingId"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    fail(bookingId, "Please choose a file to upload");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await uploadPrimaryDocument(bookingId, { name: file.name, buffer }, session.userId);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not upload document");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function uploadSupportingDocumentAction(formData: FormData) {
  const session = await requirePermission("bookings.documents");
  const bookingId = Number(formData.get("bookingId"));
  const docType = formData.get("docType") === "visa" ? "visa" : formData.get("docType") === "other" ? "other" : "passport";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    fail(bookingId, "Please choose a file to upload");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await uploadSupportingDocument(bookingId, docType, { name: file.name, buffer }, session.userId);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not upload document");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function sendPrimaryDocumentAction(formData: FormData) {
  const session = await requirePermission("bookings.documents");
  const bookingId = Number(formData.get("bookingId"));
  const recipients = parseRecipients(formData, bookingId);
  try {
    await sendPrimaryDocument(bookingId, session.userId, recipients);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not send document");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function generateInvoiceAction(formData: FormData) {
  const session = await requirePermission("bookings.invoice");
  const bookingId = Number(formData.get("bookingId"));
  try {
    await generateInvoiceForBooking(bookingId, session.userId);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not generate invoice");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function sendInvoiceAction(formData: FormData) {
  const session = await requirePermission("bookings.invoice");
  const bookingId = Number(formData.get("bookingId"));
  const invoiceId = Number(formData.get("invoiceId"));
  const recipients = parseRecipients(formData, bookingId);
  try {
    await sendInvoiceForBooking(bookingId, session.userId, recipients, invoiceId);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not send invoice");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function updateInvoiceAction(formData: FormData) {
  const session = await requirePermission("bookings.invoice");
  const bookingId = Number(formData.get("bookingId"));
  const invoiceId = Number(formData.get("invoiceId"));
  const currency = String(formData.get("currency") || "").trim().toUpperCase();

  const descriptions = formData.getAll("lineItemDescription").map((v) => String(v).trim());
  const quantities = formData.getAll("lineItemQuantity").map((v) => Number(v));
  const rates = formData.getAll("lineItemRate").map((v) => Number(v));

  const lineItems = descriptions
    .map((description, i) => ({ description, quantity: quantities[i], rate: rates[i] }))
    .filter((li) => li.description.length > 0);

  if (lineItems.length === 0) {
    fail(bookingId, "At least one line item with a description is required");
  }
  if (lineItems.some((li) => !Number.isFinite(li.quantity) || li.quantity <= 0 || !Number.isFinite(li.rate) || li.rate < 0)) {
    fail(bookingId, "Line items must have a valid quantity and rate");
  }

  try {
    await updateInvoiceForBooking(invoiceId, session.userId, { lineItems, currency: currency || undefined });
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not update invoice");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function cancelBookingAction(formData: FormData) {
  const session = await requirePermission("bookings.cancel");
  const bookingId = Number(formData.get("bookingId"));
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) {
    fail(bookingId, "A cancellation reason is required");
  }

  try {
    await cancelBooking(bookingId, reason, session.userId, session.name);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not cancel booking");
  }

  revalidatePath("/bookings/flights");
  revalidatePath("/bookings/hotels");
  revalidatePath("/bookings/cars");
  revalidatePath(`/bookings/${bookingId}`);
}

export async function addBookingNoteAction(formData: FormData) {
  const bookingId = Number(formData.get("bookingId"));
  const session = await requireBookingViewSession(bookingId);
  const content = String(formData.get("content") || "").trim();
  if (!content) {
    fail(bookingId, "Note content is required");
  }
  try {
    await addBookingNote(bookingId, content, session.userId, session.email);
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not add note");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function updateBookingNoteAction(formData: FormData) {
  const bookingId = Number(formData.get("bookingId"));
  const session = await requireBookingViewSession(bookingId);
  const noteId = Number(formData.get("noteId"));
  const content = String(formData.get("content") || "").trim();
  if (!content) {
    fail(bookingId, "Note content is required");
  }
  try {
    await updateBookingNote(noteId, content, session.userId, session.email, ["admin", "manager"].includes(session.roleKey));
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not update note");
  }
  revalidatePath(`/bookings/${bookingId}`);
}

export async function deleteBookingNoteAction(formData: FormData) {
  const bookingId = Number(formData.get("bookingId"));
  const session = await requireBookingViewSession(bookingId);
  const noteId = Number(formData.get("noteId"));
  try {
    await deleteBookingNote(noteId, session.userId, session.email, ["admin", "manager"].includes(session.roleKey));
  } catch (err) {
    fail(bookingId, err instanceof Error ? err.message : "Could not delete note");
  }
  revalidatePath(`/bookings/${bookingId}`);
}
