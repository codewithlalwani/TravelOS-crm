import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBookingWorkspace } from "@/services/bookingQueryService";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import countryCodes from "@/app/utils/country-code.json";
import { GUEST_TITLE_OPTIONS } from "@/lib/booking/hotelOptions";
import { DRIVER_TITLE_OPTIONS } from "@/lib/booking/carOptions";
import { updateFlightBookingAction, updateHotelBookingAction, updateCarBookingAction } from "../../actions";
import { EditFlightBookingForm, type EditFlightBookingInitialData } from "./EditFlightBookingForm";
import { EditHotelBookingForm, type EditHotelBookingInitialData } from "./EditHotelBookingForm";
import { EditCarBookingForm, type EditCarBookingInitialData } from "./EditCarBookingForm";

interface CountryCode {
  name: string;
  dial_code: string;
  code: string;
}

const COUNTRY_NAME_BY_CODE = new Map((countryCodes as CountryCode[]).map((c) => [c.code, c.name]));

function countryName(code: string | null | undefined): string {
  if (!code) return "";
  return COUNTRY_NAME_BY_CODE.get(code) ?? code;
}

function splitName(fullName: string): { firstName: string; middleName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(" "), lastName: parts[parts.length - 1] };
}

function splitContactName(
  fullName: string,
  titleOptions: readonly string[] = GUEST_TITLE_OPTIONS
): { title: string; firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  let title = "";
  if (parts.length > 1 && titleOptions.includes(parts[0])) {
    title = parts.shift()!;
  }
  if (parts.length === 0) return { title, firstName: "", lastName: "" };
  if (parts.length === 1) return { title, firstName: parts[0], lastName: "" };
  return { title, firstName: parts[0], lastName: parts[parts.length - 1] };
}

/** Renders a stored DATETIME back into the `YYYY-MM-DDTHH:mm` a datetime-local input expects. */
function toDateTimeLocalValue(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(
    value.getMinutes()
  )}`;
}

function splitPhone(phone: string | null | undefined): { countryCode: string; mobile: string } {
  const trimmed = (phone || "").trim();
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) return { countryCode: match[1], mobile: match[2] };
  return { countryCode: "+91", mobile: trimmed };
}

export default async function EditBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);

  const { bookingId } = await params;
  const { error } = await searchParams;

  const booking = await getBookingWorkspace(Number(bookingId));
  if (!booking) notFound();

  if (booking.type === "hotel") {
    if (!can(perms, "hotels.create")) redirect(defaultPathFor(perms));
    if (!booking.hotelDetail) notFound();

    const { title, firstName, lastName } = splitContactName(booking.customer?.name || "");
    const { countryCode, mobile } = splitPhone(booking.customer?.phone);
    const guests = [...(booking.passengers || [])].sort((a, b) => a.id - b.id);

    const initialData: EditHotelBookingInitialData = {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      contact: {
        title: title || "Mr",
        firstName,
        lastName,
        email: booking.customer?.email || "",
        countryCode,
        mobile,
      },
      customerAddress: {
        street1: booking.customer?.addressStreet1 || "",
        city: booking.customer?.addressCity || "",
        state: booking.customer?.addressState || "",
        countryCode: booking.customer?.addressCountry || "",
        countryName: countryName(booking.customer?.addressCountry),
      },
      gst: {
        enabled: Boolean(booking.customer?.gstNumber || booking.customer?.gstCompanyName),
        number: booking.customer?.gstNumber || "",
        companyName: booking.customer?.gstCompanyName || "",
      },
      guests: guests.map((g) => ({
        id: g.id,
        title: g.title || "Mr",
        firstName: g.firstName,
        lastName: g.lastName,
      })),
      hotel: {
        hotelName: booking.hotelDetail.hotelName,
        address: booking.hotelDetail.address,
        city: booking.hotelDetail.city || "",
        countryCode: booking.hotelDetail.country || "",
        countryName: countryName(booking.hotelDetail.country),
        roomType: booking.hotelDetail.roomType,
        checkIn: booking.hotelDetail.checkIn,
        checkOut: booking.hotelDetail.checkOut,
        guests: booking.hotelDetail.guests,
        confirmationNo: booking.hotelDetail.confirmationNo,
        hotelRating: booking.hotelDetail.hotelRating || "",
        cancellationPolicy: booking.hotelDetail.cancellationPolicy || "",
        specialRequest: booking.hotelDetail.specialRequest || "",
      },
      pricing: {
        currency: booking.currency || "USD",
        grossAmount: Number(booking.totalAmount) || 0,
        netAmount: Number(booking.netAmount) || 0,
      },
    };

    return (
      <div>
        <Link href={`/bookings/${booking.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to {booking.bookingRef}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Edit Hotel Booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update guest and hotel details for {booking.bookingRef}.
        </p>

        {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <EditHotelBookingForm action={updateHotelBookingAction} initialData={initialData} />
      </div>
    );
  }

  if (booking.type === "car") {
    if (!can(perms, "cars.create")) redirect(defaultPathFor(perms));
    if (!booking.carDetail) notFound();

    const { title, firstName, lastName } = splitContactName(booking.customer?.name || "", DRIVER_TITLE_OPTIONS);
    const { countryCode, mobile } = splitPhone(booking.customer?.phone);
    const drivers = [...(booking.passengers || [])].sort((a, b) => a.id - b.id);
    const car = booking.carDetail;

    const initialData: EditCarBookingInitialData = {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      contact: {
        title: title || "Mr",
        firstName,
        lastName,
        email: booking.customer?.email || "",
        countryCode,
        mobile,
      },
      customerAddress: {
        street1: booking.customer?.addressStreet1 || "",
        city: booking.customer?.addressCity || "",
        state: booking.customer?.addressState || "",
        countryCode: booking.customer?.addressCountry || "",
        countryName: countryName(booking.customer?.addressCountry),
      },
      drivers: drivers.map((d) => ({
        id: d.id,
        title: d.title || "Mr",
        firstName: d.firstName,
        lastName: d.lastName,
      })),
      car: {
        pickupLocation: car.pickupLocation,
        pickupCity: car.pickupCity || "",
        pickupCountryCode: car.pickupCountry || "",
        pickupCountryName: countryName(car.pickupCountry),
        pickupState: car.pickupState || "",
        pickupStationType: car.pickupStationType,
        pickupStation: car.pickupStation || "",
        pickupDateTime: toDateTimeLocalValue(car.pickupDateTime),
        dropoffDifferentLocation: car.dropoffDifferentLocation,
        dropoffLocation: car.dropoffLocation,
        dropoffCity: car.dropoffCity || "",
        dropoffCountryCode: car.dropoffCountry || "",
        dropoffCountryName: countryName(car.dropoffCountry),
        dropoffState: car.dropoffState || "",
        dropoffStationType: car.dropoffStationType,
        dropoffStation: car.dropoffStation || "",
        dropoffDateTime: toDateTimeLocalValue(car.dropoffDateTime),
        pickupMeetingPoint: car.pickupMeetingPoint || "",
        meetingPoint: car.meetingPoint || "",
        rateRemarks: car.rateRemarks || "",
        specialRequest: car.specialRequest || "",
        bookingStatus: car.bookingStatus,
        supplierRef: car.supplierRef,
        supplierType: car.supplierType,
        supplier: car.supplier,
        vehicleCode: car.vehicleCode || "",
        vehicleName: car.vehicleName || "",
        maxPax: car.maxPax != null ? String(car.maxPax) : "",
        maxLuggage: car.maxLuggage != null ? String(car.maxLuggage) : "",
        noOfVehicles: car.noOfVehicles,
      },
      pricing: {
        currency: booking.currency || "USD",
        grossAmount: Number(booking.totalAmount) || 0,
        netAmount: Number(booking.netAmount) || 0,
      },
    };

    return (
      <div>
        <Link href={`/bookings/${booking.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to {booking.bookingRef}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Edit Car Booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update driver and car rental details for {booking.bookingRef}.
        </p>

        {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <EditCarBookingForm action={updateCarBookingAction} initialData={initialData} />
      </div>
    );
  }

  if (!can(perms, "flights.create")) redirect(defaultPathFor(perms));
  if (booking.type !== "flight" || !booking.flightDetail) notFound();

  const { firstName, middleName, lastName } = splitName(booking.customer?.name || "");

  const initialData: EditFlightBookingInitialData = {
    bookingId: booking.id,
    bookingRef: booking.bookingRef,
    customer: {
      firstName,
      middleName,
      lastName,
      email: booking.customer?.email || "",
      phone: booking.customer?.phone || "",
      addressStreet1: booking.customer?.addressStreet1 || "",
      addressCity: booking.customer?.addressCity || "",
      addressState: booking.customer?.addressState || "",
      addressCountryCode: booking.customer?.addressCountry || "",
      addressCountryName: countryName(booking.customer?.addressCountry),
    },
    flight: {
      pnr: booking.flightDetail.pnr,
      origin: booking.flightDetail.origin,
      destination: booking.flightDetail.destination,
      cabinClass: booking.flightDetail.cabinClass || "",
      gds: booking.flightDetail.gds || "Supplier",
      ticketingSupplier: booking.flightDetail.ticketingSupplier || "",
      tripType: booking.flightDetail.tripType || "One Way",
      journeyType: booking.flightDetail.journeyType || "Domestic",
      fareType: booking.flightDetail.fareType || "PUBLISHED",
      ticketingDeadline: booking.flightDetail.ticketingDeadline || "",
      ticketingDeadlineTime: booking.flightDetail.ticketingDeadlineTime || "23:59",
      supplierReference: booking.flightDetail.supplierReference || "",
      buyCurrency: booking.flightDetail.buyCurrency || "USD",
      sellCurrency: booking.flightDetail.sellCurrency || "USD",
      rateRemarks: booking.flightDetail.rateRemarks || "",
      specialRequest: booking.flightDetail.specialRequest || "",
    },
    segments: (booking.segments || []).map((s) => ({
      id: s.id,
      flightNumber: s.flightNumber || "",
      airline: s.airline,
      status: s.status || "HK",
      depAirport: s.depAirport,
      depCity: s.depCity || "",
      depCountryCode: s.depCountry || "",
      depCountryName: countryName(s.depCountry),
      depDate: s.depDate,
      depTime: s.depTime || "",
      arrAirport: s.arrAirport,
      arrCity: s.arrCity || "",
      arrCountryCode: s.arrCountry || "",
      arrCountryName: countryName(s.arrCountry),
      arrDate: s.arrDate || "",
      arrTime: s.arrTime || "",
      cabinClass: s.cabinClass || "",
    })),
    passengers: (booking.passengers || []).map((p) => ({
      id: p.id,
      paxType: p.paxType,
      title: p.title || "Mr",
      firstName: p.firstName,
      middleName: p.middleName || "",
      lastName: p.lastName,
      gender: p.gender || "Male",
      dob: p.dob || "",
      passportNo: p.passportNo || "",
    })),
    fares: (booking.fares || []).map((f) => ({
      paxType: f.paxType,
      baseFare: Number(f.baseFare),
      net: Number(f.net),
    })),
  };

  return (
    <div>
      <Link href={`/bookings/${booking.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to {booking.bookingRef}
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Edit Flight Booking</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update customer, flight, passenger and fare details for {booking.bookingRef}.
      </p>

      {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <EditFlightBookingForm action={updateFlightBookingAction} initialData={initialData} />
    </div>
  );
}
